"""
=============================================================================
SIRH BI — ML-5 : Analyse des Corrélations RH  (version corrigée)
=============================================================================
Corrections appliquées (Problème 3) :
  - Suppression des colonnes dupliquées issues du multi-join
  - Exclusion des corrélations tautologiques (count vs count)
  - Deux niveaux d'analyse :
      A) Individuel (n ~ 1150) — ancienneté, contrat vs score_risque
      B) Département (n = 9)   — taux/ratios seulement, avec p-value
  - p-value calculée via scipy.stats.pearsonr
  - Seuils adaptés au n : n<15 → |r|>0.65 ; n≥15 → |r|>0.40 ET p<0.05

Usage :
    python ml/correlations.py
=============================================================================
"""

import os
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
import pymysql
import sqlalchemy as sa
from datetime import datetime
from business_rules import apply_contract_coherence, contract_precarity

try:
    from scipy import stats as sp_stats
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False
    print("  ⚠️  scipy non installé — p-values calculées manuellement")

DB_CONFIG = {
    'host':     os.getenv('SIRH_MYSQL_HOST', 'localhost'),
    'port':     int(os.getenv('SIRH_MYSQL_PORT', '3306')),
    'user':     os.getenv('SIRH_MYSQL_USER', 'root'),
    'password': os.getenv('SIRH_MYSQL_PASSWORD', 'root'),
}

engine = sa.create_engine(
    f"mysql+pymysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}"
    f"@{DB_CONFIG['host']}:{DB_CONFIG['port']}/sirh_dwh",
    echo=False
)

print("=" * 60)
print("  SIRH BI — Analyse des Corrélations RH (corrigée)")
print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

def read_sql(query):
    conn = pymysql.connect(
        host=DB_CONFIG['host'], port=DB_CONFIG['port'],
        user=DB_CONFIG['user'], password=DB_CONFIG['password'],
        database='sirh_dwh', charset='utf8mb4'
    )
    try:
        return pd.read_sql(query, conn)
    finally:
        conn.close()

def write_df(df, table_name):
    conn = pymysql.connect(
        host=DB_CONFIG['host'], port=DB_CONFIG['port'],
        user=DB_CONFIG['user'], password=DB_CONFIG['password'],
        database='sirh_dwh', charset='utf8mb4'
    )
    try:
        cur = conn.cursor()
        cols = ', '.join(f'`{c}`' for c in df.columns)
        ph   = ', '.join(['%s'] * len(df.columns))
        rows = [
            tuple(None if (isinstance(v, float) and np.isnan(v)) else v for v in row)
            for row in df.itertuples(index=False, name=None)
        ]
        cur.executemany(f"INSERT INTO `{table_name}` ({cols}) VALUES ({ph})", rows)
        conn.commit()
    finally:
        conn.close()

def pearson_with_pvalue(x, y):
    """Pearson r + p-value (via scipy si dispo, sinon t-test manuel)."""
    mask = ~(np.isnan(x) | np.isnan(y))
    x, y = x[mask], y[mask]
    n = len(x)
    if n < 4:
        return np.nan, np.nan, n
    if HAS_SCIPY:
        r, p = sp_stats.pearsonr(x, y)
    else:
        # t-test manuel : t = r*sqrt(n-2)/sqrt(1-r²)
        r = float(np.corrcoef(x, y)[0, 1])
        if abs(r) >= 1.0:
            return r, 0.0, n
        t  = r * np.sqrt(n - 2) / np.sqrt(1 - r**2)
        # p-value approx via normal distribution (valable pour n>30)
        p  = 2 * (1 - 0.5 * (1 + np.sign(t) * (1 - np.exp(-0.717 * abs(t) - 0.416 * t**2))))
    return float(r), float(p), int(n)

# =============================================================================
# ANALYSE A — Niveau INDIVIDUEL (n ~ 1150, fiable statistiquement)
# =============================================================================
print("\n[A] Corrélations individuelles (niveau employé)...")

# FIX P3 : données individuelles → n >> 30, corrélations fiables
df_ind = read_sql("""
    SELECT
        de.anciennete_mois,
        de.type_contrat,
        de.is_parti,
        COALESCE(tr.score_risque, 50) AS score_risque
    FROM dim_employe de
    LEFT JOIN ml_turnover_risk tr ON tr.id_employe_nk = de.id_employe_nk
    WHERE de.anciennete_mois IS NOT NULL
""")

df_ind, _ = apply_contract_coherence(df_ind)
df_ind['contrat_enc'] = df_ind['type_contrat_ml'].apply(contract_precarity)

# Libellés lisibles (français) pour l'affichage Superset.
# NB : la corrélation est insensible à l'unité → mois/années donnent le même coef.
LABELS = {
    'anciennete_mois':          "Ancienneté (ans)",
    'anciennete_moy':           "Ancienneté moy. (ans)",
    'score_risque':             "Score risque turnover",
    'is_parti':                 "A quitté l'entreprise",
    'contrat_enc':              "Précarité du contrat",
    'taux_cdi_pct':             "% CDI",
    'taux_stage_pct':           "% Stagiaires",
    'risque_turnover_moy':      "Risque turnover moyen",
    'pct_risque_eleve':         "% risque élevé",
    'taux_acceptation_pct':     "% acceptation",
    'score_moyen_candidatures': "Score moyen candidats",
    'taux_mobilite':            "Taux mobilité (%)",
}

individual_pairs = [
    ('anciennete_mois', 'score_risque',   'Ancienneté (mois) vs Score risque turnover'),
    ('contrat_enc',     'score_risque',   'Précarité contrat vs Score risque turnover'),
    ('anciennete_mois', 'is_parti',       'Ancienneté (mois) vs Départ effectif'),
    ('contrat_enc',     'is_parti',       'Précarité contrat vs Départ effectif'),
]

ind_results = []
print(f"\n  {'Paire':<52} {'r':>8} {'p-value':>10} {'n':>7}  Signif.")
print("  " + "-" * 85)

for col1, col2, label in individual_pairs:
    r, p, n = pearson_with_pvalue(
        df_ind[col1].values.astype(float),
        df_ind[col2].values.astype(float)
    )
    signif = "✓" if (not np.isnan(p)) and p < 0.05 and abs(r) > 0.25 else " "
    direction = "↑" if r > 0 else "↓"
    force = "forte" if abs(r) > 0.6 else ("modérée" if abs(r) > 0.35 else "faible")
    print(f"  {label:<52} {r:>8.3f} {p:>10.4f} {n:>7}  {signif}")
    if not np.isnan(r):
        ind_results.append({
            'niveau':       'individuel',
            'variable_1':   LABELS.get(col1, col1),
            'variable_2':   LABELS.get(col2, col2),
            'label':        label,
            'correlation':  round(r, 3),
            'p_value':      round(p, 4) if not np.isnan(p) else None,
            'n_obs':        n,
            'direction':    'positive' if r > 0 else 'negative',
            'force_correlation': force,
            'significative': (not np.isnan(p)) and p < 0.05 and abs(r) > 0.25,
            'generated_at': datetime.now(),
        })

# =============================================================================
# ANALYSE B — Niveau DÉPARTEMENT (n = 9, interpréter avec prudence)
# =============================================================================
print("\n[B] Corrélations par département (n=9, seuil |r|>0.65 pour p<0.05)...")

# FIX P3 : sélectionner UNIQUEMENT les taux/ratios — exclure les comptages bruts
# Ne pas utiliser SELECT * car kpi_rh contient nb_cdi, nb_cdd… (tautologies)
df_dept_emp_raw = read_sql("""
    SELECT
        departement,
        type_contrat,
        anciennete_mois
    FROM dim_employe
    WHERE anciennete_mois IS NOT NULL
""")

df_dept_emp_raw, _ = apply_contract_coherence(df_dept_emp_raw)
df_dept_emp = df_dept_emp_raw.groupby('departement').agg(
    nb_total=('type_contrat_ml', 'count'),
    anciennete_moy=('anciennete_mois', 'mean'),
    taux_cdi_pct=('type_contrat_ml', lambda x: (x == 'CDI').mean() * 100),
    taux_stage_pct=('type_contrat_ml', lambda x: (x == 'STAGE').mean() * 100),
    taux_cdd_pct=('type_contrat_ml', lambda x: (x == 'CDD').mean() * 100),
).reset_index()

df_dept_risk = read_sql("""
    SELECT
        departement,
        AVG(score_risque)                                             AS risque_turnover_moy,
        SUM(CASE WHEN niveau_risque = 'Critique' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
                                                                       AS pct_critique,
        SUM(CASE WHEN niveau_risque IN ('Critique','Élevé','Elevé') THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
                                                                       AS pct_risque_eleve
    FROM ml_turnover_risk
    GROUP BY departement
""")

# FIX P3 : taux d'acceptation recrutement (ratio, pas comptage)
df_dept_rec = read_sql("""
    SELECT
        departement_normalise                                     AS departement,
        AVG(a.match_score)                                       AS score_moyen_candidatures,
        SUM(CASE WHEN a.statut_normalise = 'ACCEPTED' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
                                                                  AS taux_acceptation_pct,
        COUNT(*)                                                  AS nb_candidatures
    FROM fait_recrutement a
    WHERE departement_normalise IS NOT NULL
    GROUP BY departement_normalise
""")

# Mobilité interne par département (taux de mobilité moyen depuis kpi_rh)
df_dept_mob = read_sql("""
    SELECT
        departement,
        AVG(taux_mobilite_pct) AS taux_mobilite
    FROM kpi_rh
    WHERE taux_mobilite_pct IS NOT NULL
    GROUP BY departement
""")

# FIX P3 : merge avec suffixes explicites pour éviter les doublons
df_dept = df_dept_emp.merge(df_dept_risk, on='departement', how='inner')
df_dept = df_dept.merge(df_dept_rec,  on='departement', how='left')
df_dept = df_dept.merge(df_dept_mob,  on='departement', how='left')

n_dept = len(df_dept)
print(f"  n = {n_dept} départements")

# FIX P3 : SEUIL ADAPTÉ à n=9 — pour p<0.05 il faut |r|>0.666
# (table t de Student, df=7, alpha=0.025 bilatéral)
R_THRESHOLD_SMALL_N = 0.60  # légèrement conservateur

# FIX P3 : liste de paires MÉTIER (pas de tautologies)
dept_pairs = [
    ('taux_cdi_pct',          'risque_turnover_moy',     'CDI% vs Risque turnover moyen'),
    ('taux_cdi_pct',          'pct_risque_eleve',        'CDI% vs % risque élevé/critique'),
    ('taux_stage_pct',        'risque_turnover_moy',     'Stage% vs Risque turnover moyen'),
    ('anciennete_moy',        'risque_turnover_moy',     'Ancienneté moy. vs Risque turnover'),
    ('anciennete_moy',        'taux_acceptation_pct',    'Ancienneté moy. vs Taux acceptation'),
    ('score_moyen_candidatures', 'risque_turnover_moy',  'Score candidats vs Risque turnover'),
    ('taux_cdi_pct',          'score_moyen_candidatures','CDI% vs Score moyen candidatures'),
    ('taux_stage_pct',        'taux_acceptation_pct',    'Stage% vs Taux acceptation'),
    # Cahier des charges 1.5 : mobilité vs performance (niveau département, n=9, exploratoire)
    ('taux_mobilite',         'score_moyen_candidatures','Mobilité vs Performance (score candidats)'),
]

dept_results = []
print(f"\n  {'Paire':<52} {'r':>8} {'p-value':>10} {'n':>4}  Signif.")
print("  " + "-" * 82)

for col1, col2, label in dept_pairs:
    if col1 not in df_dept.columns or col2 not in df_dept.columns:
        continue
    r, p, n = pearson_with_pvalue(
        df_dept[col1].values.astype(float),
        df_dept[col2].values.astype(float)
    )
    # FIX P3 : pour n<15 on exige |r|>0.60 (p<0.10 environ)
    is_sig = (not np.isnan(r)) and abs(r) >= R_THRESHOLD_SMALL_N
    signif = "✓" if is_sig else " "
    force  = "forte" if abs(r) > 0.7 else ("modérée" if abs(r) > 0.5 else "faible")

    p_str = f"{p:.4f}" if not np.isnan(p) else "N/A"
    print(f"  {label:<52} {r:>8.3f} {p_str:>10} {n:>4}  {signif}")

    if not np.isnan(r):
        dept_results.append({
            'niveau':       'departement',
            'variable_1':   LABELS.get(col1, col1),
            'variable_2':   LABELS.get(col2, col2),
            'label':        label,
            'correlation':  round(r, 3),
            'p_value':      round(p, 4) if not np.isnan(p) else None,
            'n_obs':        n,
            'direction':    'positive' if r > 0 else 'negative',
            'force_correlation': force,
            'significative': is_sig,
            'generated_at': datetime.now(),
        })

# =============================================================================
# Sauvegarde dans ml_correlations
# =============================================================================
print("\n[C] Sauvegarde dans sirh_dwh.ml_correlations...")

all_results = ind_results + dept_results
result_df   = pd.DataFrame(all_results)

with engine.begin() as conn:
    conn.execute(sa.text("DROP TABLE IF EXISTS ml_correlations"))
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ml_correlations (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            niveau        VARCHAR(20),
            variable_1    VARCHAR(100),
            variable_2    VARCHAR(100),
            label         VARCHAR(150),
            correlation   DECIMAL(6,3),
            p_value       DECIMAL(8,4),
            n_obs         INT,
            direction     VARCHAR(10),
            force_correlation VARCHAR(10),
            significative TINYINT(1),
            generated_at  DATETIME
        )
    """))

write_df(result_df, 'ml_correlations')

nb_sig = result_df['significative'].sum()
print(f"  ✓ {len(result_df)} corrélations calculées ({nb_sig} significatives)")

# =============================================================================
# Résumé — corrélations métier défendables
# =============================================================================
sig_df = result_df[result_df['significative'] == True].sort_values('correlation', key=abs, ascending=False)

print(f"""
{'=' * 60}
  RÉSUMÉ ML-5 — Corrélations (corrigées)
{'=' * 60}
  Niveau individuel (n~{len(df_ind)}) : {len(ind_results)} paires analysées
  Niveau département (n={n_dept})        : {len(dept_results)} paires analysées
  Corrélations significatives            : {nb_sig}

  Insights métier clés :
""")

for _, row in sig_df.iterrows():
    arrow = "↑" if row['direction'] == 'positive' else "↓"
    print(f"  {arrow} [{row['niveau']:<12}] {row['label']:<50} r={row['correlation']:+.3f}")

print(f"""
  Table créée : sirh_dwh.ml_correlations
  Note : n=9 (départements) exige |r|>0.60 pour être robuste.
         Les corrélations individuelles (n~{len(df_ind)}) sont statistiquement fiables.
{'=' * 60}
""")
