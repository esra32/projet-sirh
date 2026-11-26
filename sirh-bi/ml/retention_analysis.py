"""
=============================================================================
SIRH BI — Analyse de la Rétention des Talents
=============================================================================
Source  : ml_turnover_risk + ml_employee_segments + dim_employe
Output  : sirh_dwh.ml_retention_analysis

Usage :
    python ml/retention_analysis.py
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
print("  SIRH BI — Analyse de la Rétention des Talents")
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

df_risk = read_sql("""
    SELECT id_employe_nk, nom_complet, departement,
           type_contrat, anciennete_mois, score_risque, niveau_risque
    FROM ml_turnover_risk
""")

df_seg = read_sql("""
    SELECT id_employe_nk, segment, hp_niveau
    FROM ml_high_potentials
""")

df = df_risk.merge(df_seg, on='id_employe_nk', how='left')
df['hp_niveau'] = df['hp_niveau'].fillna('Standard')
df['segment']   = df['segment'].fillna('Non classifié')

print(f"  ✓ {len(df)} employés chargés")

# =============================================================================
# 2. Score de rétention
# =============================================================================
print("\n[2] Calcul du score de rétention...")

def compute_retention_score(row):
    # Score rétention = inverse du risque turnover + bonus HP
    base_score = 100 - row['score_risque']

    # Bonus High Potential
    hp_bonus = {
        'High Potential':    10,
        'Potentiel Confirmé': 5,
        'À Surveiller':       0,
        'Standard':           0,
    }
    base_score += hp_bonus.get(row['hp_niveau'], 0)

    # Bonus ancienneté (fidélité prouvée)
    if row['anciennete_mois'] >= 60:
        base_score += 8
    elif row['anciennete_mois'] >= 36:
        base_score += 4

    return round(min(base_score, 100), 1)

df['score_retention'] = df.apply(compute_retention_score, axis=1)

def retention_niveau(score):
    if score >= 75:   return 'Très fidèle'
    elif score >= 55: return 'Fidèle'
    elif score >= 35: return 'Fragile'
    else:             return 'À risque immédiat'

df['retention_niveau'] = df['score_retention'].apply(retention_niveau)

# Priorité d'action RH
def priorite_rh(row):
    risque = str(row.get('niveau_risque', '')).strip()

    if row['hp_niveau'] == 'High Potential' and risque == 'Critique':
        return 'URGENT — Talent clé à risque'
    elif row['hp_niveau'] == 'High Potential' and risque in ['Élevé', 'Elevé']:
        return 'Surveillance talent clé'
    elif row['retention_niveau'] == 'À risque immédiat':
        return 'ACTION REQUISE'
    elif row['retention_niveau'] == 'Fragile':
        return 'Surveillance'
    else:
        return 'Stable'

df['priorite_rh'] = df.apply(priorite_rh, axis=1)

print(f"\n  Niveaux de rétention :")
for niveau, count in df['retention_niveau'].value_counts().items():
    pct = count / len(df) * 100
    print(f"  {niveau:<22} : {count:>4} ({pct:.1f}%)")

print(f"\n  Priorités RH :")
for priorite, count in df['priorite_rh'].value_counts().items():
    print(f"  {priorite:<30} : {count:>4}")

# =============================================================================
# 3. Analyse par département
# =============================================================================
print("\n[3] Analyse par département...")

dept_stats = df.groupby('departement').agg(
    score_retention_moy=('score_retention', 'mean'),
    nb_a_risque=('retention_niveau', lambda x: (x == 'À risque immédiat').sum()),
    nb_fragile=('retention_niveau', lambda x: (x == 'Fragile').sum()),
    nb_hp_risque=('priorite_rh', lambda x: (x == 'URGENT — Talent clé à risque').sum()),
    nb_total=('id_employe_nk', 'count')
).round(1).reset_index()

print(f"\n  {'Département':<35} {'Score Rét.':<12} {'À risque':<10} {'HP risque'}")
print("  " + "-" * 70)
for _, row in dept_stats.sort_values('score_retention_moy').iterrows():
    print(f"  {row['departement']:<35} {row['score_retention_moy']:<12.1f} "
          f"{int(row['nb_a_risque']):<10} {int(row['nb_hp_risque'])}")

# =============================================================================
# 4. Sauvegarde
# =============================================================================
print("\n[4] Sauvegarde dans sirh_dwh.ml_retention_analysis...")

result_df = df[[
    'id_employe_nk', 'nom_complet', 'departement', 'type_contrat',
    'anciennete_mois', 'segment', 'hp_niveau', 'score_risque',
    'score_retention', 'retention_niveau', 'priorite_rh'
]].copy()
result_df['generated_at'] = datetime.now()

with engine.begin() as conn:
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ml_retention_analysis (
            id_employe_nk    VARCHAR(36) PRIMARY KEY,
            nom_complet      VARCHAR(255),
            departement      VARCHAR(100),
            type_contrat     VARCHAR(50),
            anciennete_mois  INT,
            segment          VARCHAR(50),
            hp_niveau        VARCHAR(30),
            score_risque     DECIMAL(5,1),
            score_retention  DECIMAL(5,1),
            retention_niveau VARCHAR(30),
            priorite_rh      VARCHAR(50),
            generated_at     DATETIME
        )
    """))
    conn.execute(sa.text("TRUNCATE TABLE ml_retention_analysis"))

write_df(result_df, 'ml_retention_analysis')
print(f"  ✓ {len(result_df)} lignes insérées dans ml_retention_analysis")

# =============================================================================
# 5. Résumé
# =============================================================================
urgent = (df['priorite_rh'] == 'URGENT — Talent clé à risque').sum()
print(f"""
{'=' * 60}
  RÉSUMÉ — Rétention des Talents
{'=' * 60}
  Employés analysés  : {len(df)}
  Score moyen        : {df['score_retention'].mean():.1f}/100
  Alertes URGENT     : {urgent} talents clés à risque

  Table créée : sirh_dwh.ml_retention_analysis
{'=' * 60}
""")
