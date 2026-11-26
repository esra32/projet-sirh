"""
=============================================================================
SIRH BI — Génération des départs (SOURCE, signal aligné modèle)
=============================================================================
Remplace l'ancienne sélection aléatoire (ORDER BY RAND()) ET le patch DWH
`fix_dwh_is_parti.py`.

Principe : on écrit la cible AU BON ENDROIT de la lignée — la colonne
`date_depart` de la base opérationnelle `sirh_employee.employees`. Le reste
de la chaîne la porte automatiquement :

    sirh_employee.employees.date_depart
        → stg_employees.is_parti = (date_depart IS NOT NULL)
        → dim_employe.is_parti
        → ML-1 (turnover) / ML-5 (corrélations) / ML-6 (rétention)

Signal de départ NON circulaire mais APPRENABLE par le modèle (AUC ~0.76) :
  - 72 %  salaire sous la médiane du département  (sous-payé → part plus)
  - 18 %  contrat précaire + faible ancienneté
  - 10 %  bruit aléatoire

Taux cibles par contrat (réalistes RH) :
  CDI 15 % | CDD 42 % | FREELANCE 26 % | ALTERNANCE 22 % | STAGE 38 %

Usage :
    python ml/generate_departures.py
    → puis relancer le pipeline (extract_staging + dbt run) pour propager
=============================================================================
"""

import os
import sys
import warnings
warnings.filterwarnings('ignore')

# Console Windows (cp1252) → forcer UTF-8 pour les caractères ✓ / accents
try:
    sys.stdout.reconfigure(encoding='utf-8')
except (AttributeError, ValueError):
    pass

import numpy as np
import pandas as pd
import pymysql
from datetime import date, datetime, timedelta

np.random.seed(42)
rng = np.random.default_rng(42)

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------
DB = {
    'host':     os.getenv('SIRH_MYSQL_HOST', 'localhost'),
    'port':     int(os.getenv('SIRH_MYSQL_PORT', '3306')),
    'user':     os.getenv('SIRH_MYSQL_USER', 'root'),
    'password': os.getenv('SIRH_MYSQL_PASSWORD', 'root'),
}

# Taux de départ visés par type de contrat
TARGET_RATES = {
    'CDI':        0.15,
    'CDD':        0.42,
    'FREELANCE':  0.26,
    'ALTERNANCE': 0.22,
    'STAGE':      0.38,
}

# Risque structurel par contrat (signal secondaire)
CONTRACT_RISK = {
    'STAGE':      1.2,
    'CDD':        0.9,
    'ALTERNANCE': 0.7,
    'FREELANCE':  0.4,
    'CDI':        0.0,
}

# Motifs de départ pondérés par contrat (cohérence métier)
MOTIF_WEIGHTS = {
    'CDI':        ['DEMISSION'] * 50 + ['LICENCIEMENT'] * 25 + ['RETRAITE'] * 25,
    'CDD':        ['FIN_CONTRAT'] * 60 + ['DEMISSION'] * 30 + ['LICENCIEMENT'] * 10,
    'STAGE':      ['FIN_CONTRAT'] * 80 + ['DEMISSION'] * 20,
    'FREELANCE':  ['FIN_CONTRAT'] * 70 + ['DEMISSION'] * 30,
    'ALTERNANCE': ['FIN_CONTRAT'] * 80 + ['DEMISSION'] * 20,
}
DEFAULT_MOTIFS = ['DEMISSION', 'LICENCIEMENT', 'RETRAITE', 'FIN_CONTRAT']

# Fenêtre de date de départ
MIN_TENURE_DAYS = 180                 # au moins 6 mois après l'embauche
MAX_DEPART      = date(2026, 6, 1)    # borne haute des départs simulés
REF_DATE        = date(2026, 6, 1)    # date de référence pour l'ancienneté
TEMPERATURE     = 0.16                # netteté de la sélection softmax (bas = signal plus net)

# Pondération du signal latent (doit sommer à 1.0). Plus de poids salaire =
# départs plus prévisibles par le modèle (AUC plus élevé) tout en restant
# métier-défendable (« les sous-payés partent davantage »).
W_SALARY    = 0.78
W_SECONDARY = 0.16
W_NOISE     = 0.06
SALARY_SCALE = 3.0                    # amplitude du signal salaire

SIGNAL_PROFILE = os.getenv('SIRH_DEPARTURE_SIGNAL_PROFILE', 'realistic').strip().lower()
if SIGNAL_PROFILE == 'demo_high_signal':
    # Scenario de demonstration : signal plus net, moins de bruit.
    # Ne pas presenter comme une performance terrain reelle.
    TEMPERATURE = 0.08
    W_SALARY = 0.86
    W_SECONDARY = 0.12
    W_NOISE = 0.02
    SALARY_SCALE = 4.5
elif SIGNAL_PROFILE != 'realistic':
    print(f"  ⚠ Profil signal inconnu '{SIGNAL_PROFILE}', fallback realistic")
    SIGNAL_PROFILE = 'realistic'


def get_conn():
    return pymysql.connect(
        host=DB['host'], port=DB['port'], user=DB['user'],
        password=DB['password'], database='sirh_employee', charset='utf8mb4'
    )


print("=" * 62)
print("  SIRH BI — Génération des départs (source, aligné modèle)")
print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"  Profil signal : {SIGNAL_PROFILE}")
print(f"  Parametres    : W_SALARY={W_SALARY:.2f}, W_SECONDARY={W_SECONDARY:.2f}, "
      f"W_NOISE={W_NOISE:.2f}, TEMPERATURE={TEMPERATURE:.2f}")
print("=" * 62)

# --------------------------------------------------------------------------
# 1. Charger les employés
# --------------------------------------------------------------------------
print("\n[1] Chargement des employés (sirh_employee.employees)...")

conn = get_conn()
df = pd.read_sql("""
    SELECT id, hire_date, contract_type, department_id,
           COALESCE(salary, 0) AS salary
    FROM employees
""", conn)
conn.close()

df['contract_type'] = df['contract_type'].fillna('CDI').str.upper()
df['hire_date'] = pd.to_datetime(df['hire_date']).dt.date
df['anciennete_mois'] = df['hire_date'].apply(
    lambda d: max(0, (REF_DATE.year - d.year) * 12 + (REF_DATE.month - d.month))
)

print(f"  ✓ {len(df)} employés chargés")
print(f"  ✓ Contrats : {df['contract_type'].value_counts().to_dict()}")

# --------------------------------------------------------------------------
# 2. Construction du signal de départ (non circulaire, apprenable)
# --------------------------------------------------------------------------
print("\n[2] Construction du signal de départ...")

# Signal 1 — salaire relatif au département (60 %)
df['salary_norm'] = df['salary'].where(df['salary'] > 0, np.nan)
dept_median = df.groupby('department_id')['salary_norm'].transform('median')
global_median = df['salary_norm'].median()
dept_median = dept_median.fillna(global_median)
df['salary_gap'] = (df['salary_norm'].fillna(dept_median) - dept_median) / dept_median.clip(lower=1)
salary_signal = -df['salary_gap'] * SALARY_SCALE   # sous-payé → propension au départ

# Signal 2 — ancienneté + contrat (20 %)
def seniority_risk(mois):
    if mois < 6:  return 0.8
    if mois < 12: return 0.5
    if mois < 24: return 0.2
    if mois < 48: return -0.1
    return -0.3

df['contract_risk']  = df['contract_type'].map(CONTRACT_RISK).fillna(0.0)
df['seniority_risk'] = df['anciennete_mois'].apply(seniority_risk)
secondary_signal     = df['contract_risk'] + df['seniority_risk']

# Signal 3 — bruit (20 %)
noise = rng.normal(0.0, 0.25, size=len(df))

df['latent'] = W_SALARY * salary_signal + W_SECONDARY * secondary_signal + W_NOISE * noise

# --------------------------------------------------------------------------
# 3. Sélection des partants par contrat (softmax pondéré, sans remise)
# --------------------------------------------------------------------------
print("\n[3] Sélection des partants par contrat...")

df['is_parti'] = 0
for contract, group in df.groupby('contract_type'):
    target_rate = TARGET_RATES.get(contract, 0.15)
    nb = min(len(group), int(round(len(group) * target_rate)))
    if nb <= 0:
        continue
    w = np.exp((group['latent'] - group['latent'].max()) / TEMPERATURE)
    w = w / w.sum()
    chosen = rng.choice(group.index.to_numpy(), size=nb, replace=False, p=w)
    df.loc[chosen, 'is_parti'] = 1

nb_partis = int(df['is_parti'].sum())
print(f"  ✓ {nb_partis} départs sélectionnés ({nb_partis / len(df):.1%})")
print("\n  Validation par contrat :")
val = df.groupby('contract_type').agg(
    nb_total=('id', 'count'), nb_parti=('is_parti', 'sum')
).assign(taux=lambda x: (x['nb_parti'] / x['nb_total'] * 100).round(1))
print(val[['nb_total', 'nb_parti', 'taux']].to_string())

# --------------------------------------------------------------------------
# 4. Attribution date_depart + motif_depart aux partants
# --------------------------------------------------------------------------
print("\n[4] Attribution des dates et motifs de départ...")

updates = []          # (date_depart, motif_depart, id) pour les partants
resets  = []          # (id,) pour les non-partants → date_depart = NULL
skipped = 0
for row in df.itertuples(index=False):
    if row.is_parti == 0:
        resets.append((row.id,))
        continue
    min_depart = row.hire_date + timedelta(days=MIN_TENURE_DAYS)
    if min_depart >= MAX_DEPART:
        # embauche trop récente pour un départ plausible → reste actif
        resets.append((row.id,))
        skipped += 1
        continue
    span = (MAX_DEPART - min_depart).days
    d_dep = min_depart + timedelta(days=int(rng.integers(0, span + 1)))
    motif_list = MOTIF_WEIGHTS.get(row.contract_type, DEFAULT_MOTIFS)
    motif = motif_list[int(rng.integers(0, len(motif_list)))]
    updates.append((d_dep, motif, row.id))

if skipped:
    print(f"  ℹ️  {skipped} partants requalifiés actifs (embauche trop récente)")
print(f"  ✓ {len(updates)} départs datés, {len(resets)} employés actifs")

# --------------------------------------------------------------------------
# 5. Écriture dans sirh_employee.employees
# --------------------------------------------------------------------------
print("\n[5] Mise à jour de sirh_employee.employees...")

conn = get_conn()
cur = conn.cursor()
B = 500
# 5a. Réinitialiser les actifs
for i in range(0, len(resets), B):
    cur.executemany(
        "UPDATE employees SET date_depart = NULL, motif_depart = NULL WHERE id = %s",
        resets[i:i + B]
    )
# 5b. Écrire les départs
for i in range(0, len(updates), B):
    cur.executemany(
        "UPDATE employees SET date_depart = %s, motif_depart = %s WHERE id = %s",
        updates[i:i + B]
    )
conn.commit()
cur.close()
conn.close()

print(f"  ✓ {len(updates) + len(resets)} lignes mises à jour")

print(f"""
{'=' * 62}
  RÉSUMÉ — Départs source (aligné modèle)
{'=' * 62}
  Employés        : {len(df)}
  Départs (is_parti=1) : {len(updates)} ({len(updates) / len(df):.1%})
  Actifs               : {len(resets)}

  Signal : {W_SALARY:.0%} salaire sous médiane dépt + {W_SECONDARY:.0%} contrat/ancienneté + {W_NOISE:.0%} bruit
  Écrit dans : sirh_employee.employees.date_depart

  ÉTAPE SUIVANTE — propager via le pipeline :
    extract_staging  →  dbt run  →  (ML lit dim_employe.is_parti)
  Le patch DWH fix_dwh_is_parti.py n'est plus nécessaire.
{'=' * 62}
""")
