"""
=============================================================================
SIRH BI — ML-3 : Identification des High Potentials
=============================================================================
Logique : combinaison segment ML-2 + match_score recrutement + compétences rares
Source  : ml_employee_segments + fait_recrutement + fait_gap_competences
Output  : sirh_dwh.ml_high_potentials

Usage :
    python ml/high_potentials.py
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
from business_rules import apply_contract_coherence, print_contract_coherence_report

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
print("  SIRH BI — Identification High Potentials")
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

# =============================================================================
# 1. Chargement
# =============================================================================
print("\n[1] Chargement des données...")

df_seg = read_sql("""
    SELECT id_employe_nk, nom_complet, departement,
           type_contrat, anciennete_mois, segment
    FROM ml_employee_segments
""")

df_rec = read_sql("""
    SELECT id_employe_nk, AVG(match_score) AS score_moyen_recrutement
    FROM (
        SELECT de.id_employe_nk, fr.match_score
        FROM fait_recrutement fr
        JOIN dim_employe de ON de.email = fr.applicant_email
        WHERE fr.match_score IS NOT NULL
    ) t
    GROUP BY id_employe_nk
""")

df_gap = read_sql("""
    SELECT competence, statut
    FROM fait_gap_competences
    WHERE statut = 'Gap critique'
""")

competences_rares = set(df_gap['competence'].str.lower().tolist())
print(f"  ✓ {len(df_seg)} employés segmentés")
print(f"  ✓ {len(df_rec)} avec score recrutement")
print(f"  ✓ {len(competences_rares)} compétences en gap critique")

df_seg, contract_fix_summary = apply_contract_coherence(df_seg)
print_contract_coherence_report(contract_fix_summary)

# =============================================================================
# 2. Calcul du score High Potential
# =============================================================================
print("\n[2] Calcul du score High Potential...")

df = df_seg.merge(df_rec, on='id_employe_nk', how='left')
df['score_moyen_recrutement'] = df['score_moyen_recrutement'].fillna(50)

# Règles de scoring
def compute_hp_score(row):
    score = 0

    # FIX P2 : nouveaux labels de segmentation (uniques, sans suffixe numérique)
    segment_scores = {
        'Talent Entrant':          38,
        'Nouveau Collaborateur':   34,
        'Jeune Talent':            40,
        'Junior en Développement': 40,
        'Profil Confirmé':         30,
        'Collaborateur Confirmé':  28,
        'Profil Intermédiaire':    28,
        'Senior Confirmé':         18,
        'Expert Stable':           12,
        'Expert Stratégique':      12,
        'Vétéran Clé':              8,
        'Expert Institutionnel':     6,
        'Mémoire Organisationnelle': 5,
        'Consultant Long Terme':    14,
        'Expert Externe':           12,
        'Freelance Stratégique':    16,
    }
    score += segment_scores.get(row['segment'], 20)  # fallback 20 si segment inconnu

    # Critère 2 — Score recrutement (30 pts max)
    score += min(30, row['score_moyen_recrutement'] * 0.3)

    # Critère 3 — Ancienneté courte = potentiel de croissance (20 pts max)
    if row['anciennete_mois'] < 24:
        score += 20
    elif row['anciennete_mois'] < 48:
        score += 12
    elif row['anciennete_mois'] < 72:
        score += 6

    # Critère 4 — Contrat CDI = stabilité (10 pts)
    if row['type_contrat_ml'] == 'CDI':
        score += 10

    return round(min(score, 100), 1)

df['hp_score'] = df.apply(compute_hp_score, axis=1)

hp_p97 = float(np.percentile(df['hp_score'], 97))   # top 3%
hp_p85 = float(np.percentile(df['hp_score'], 85))   # top 15%
hp_p50 = float(np.percentile(df['hp_score'], 50))   # top 50%

def hp_niveau(score):
    if score >= hp_p97: return 'High Potential'
    if score >= hp_p85: return 'Potentiel Confirmé'
    if score >= hp_p50: return 'À Surveiller'
    return 'Standard'

df['hp_niveau'] = df['hp_score'].apply(hp_niveau)

print(f"\n  Seuils High Potential calibrés :")
print(f"  High Potential     ≥ {hp_p97:.1f} (top  3%)")
print(f"  Potentiel Confirmé ≥ {hp_p85:.1f} (top 15%)")
print(f"  À Surveiller       ≥ {hp_p50:.1f} (top 50%)")

print(f"\n  Distribution High Potentials :")
for niveau, count in df['hp_niveau'].value_counts().items():
    pct = count / len(df) * 100
    print(f"  {niveau:<22} : {count:>4} ({pct:.1f}%)")

# =============================================================================
# 3. Sauvegarde
# =============================================================================
print("\n[3] Sauvegarde dans sirh_dwh.ml_high_potentials...")

result_df = df[[
    'id_employe_nk', 'nom_complet', 'departement',
    'type_contrat_ml', 'anciennete_mois', 'segment',
    'score_moyen_recrutement', 'hp_score', 'hp_niveau'
]].copy()
result_df['generated_at'] = datetime.now()
result_df.rename(columns={'type_contrat_ml': 'type_contrat'}, inplace=True)

with engine.begin() as conn:
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ml_high_potentials (
            id_employe_nk            VARCHAR(36) PRIMARY KEY,
            nom_complet              VARCHAR(255),
            departement              VARCHAR(100),
            type_contrat             VARCHAR(50),
            anciennete_mois          INT,
            segment                  VARCHAR(50),
            score_moyen_recrutement  DECIMAL(5,1),
            hp_score                 DECIMAL(5,1),
            hp_niveau                VARCHAR(30),
            generated_at             DATETIME
        )
    """))
    conn.execute(sa.text("TRUNCATE TABLE ml_high_potentials"))

write_df(result_df, 'ml_high_potentials')
print(f"  ✓ {len(result_df)} lignes insérées dans ml_high_potentials")

# =============================================================================
# 4. Résumé
# =============================================================================
hp_count = (df['hp_niveau'] == 'High Potential').sum()
print(f"""
{'=' * 60}
  RÉSUMÉ ML-3 — High Potentials
{'=' * 60}
  Employés analysés  : {len(df)}
  High Potentials    : {hp_count} ({hp_count/len(df)*100:.1f}%)

  Niveaux :
""")
for niveau, count in df['hp_niveau'].value_counts().items():
    pct = count / len(df) * 100
    print(f"    {niveau:<22} : {count:>4} ({pct:.1f}%)")

print(f"""
  Table créée : sirh_dwh.ml_high_potentials
{'=' * 60}
""")
