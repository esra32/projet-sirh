"""
=============================================================================
SIRH BI — ML-2 : Segmentation des Employés (K-Means Clustering)
=============================================================================
Modèle : K-Means (4 clusters)
Source : sirh_dwh.dim_employe
Output : sirh_dwh.ml_employee_segments

Usage :
    python ml/segmentation_model.py
=============================================================================
"""

import os
import warnings
warnings.filterwarnings('ignore')
os.environ.setdefault('LOKY_MAX_CPU_COUNT', '1')

import pandas as pd
import numpy as np
import pymysql
import sqlalchemy as sa
from datetime import datetime

from sklearn.cluster import KMeans
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import silhouette_score
from business_rules import apply_contract_coherence, print_contract_coherence_report

# =============================================================================
# Configuration
# =============================================================================
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

print("=" * 60)
print("  SIRH BI — Segmentation Employés (K-Means)")
print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

# =============================================================================
# 1. Chargement
# =============================================================================
print("\n[1] Chargement des données...")

df = read_sql("""
    SELECT
        id_employe_nk,
        nom_complet,
        type_contrat,
        anciennete_mois,
        departement,
        poste,
        profil_fidelisation,
        COALESCE(salaire, 0) AS salaire
    FROM dim_employe
    WHERE is_parti = 0
      AND anciennete_mois IS NOT NULL
""")

print(f"  ✓ {len(df)} employés actifs chargés")

df, contract_fix_summary = apply_contract_coherence(df)
print_contract_coherence_report(contract_fix_summary)

# =============================================================================
# 2. Feature Engineering
# =============================================================================
print("\n[2] Préparation des features...")

le_contrat = LabelEncoder()
le_profil  = LabelEncoder()

df['contrat_enc'] = le_contrat.fit_transform(df['type_contrat_ml'].fillna('CDI'))
df['profil_enc']  = le_profil.fit_transform(df['profil_fidelisation'].fillna('Nouveau'))

# Salaire normalisé par rapport à la médiane du département
median_sal = df[df['salaire'] > 0]['salaire'].median()
df['salaire_filled'] = df['salaire'].where(df['salaire'] > 0, median_sal)
dept_med = df.groupby('departement')['salaire_filled'].transform('median')
df['salaire_ratio'] = (df['salaire_filled'] / dept_med).round(3)

FEATURES = ['anciennete_mois', 'contrat_enc', 'profil_enc']

X = df[FEATURES].copy()
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# =============================================================================
# 3. Choix du nombre de clusters (méthode du coude)
# =============================================================================
print("\n[3] Détermination du nombre optimal de clusters...")

inertias   = []
silhouettes = []
K_range = range(2, 8)

for k in K_range:
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    km.fit(X_scaled)
    inertias.append(km.inertia_)
    silhouettes.append(silhouette_score(X_scaled, km.labels_))

best_k = K_range[np.argmax(silhouettes)]
print(f"  ✓ Meilleur k = {best_k} (silhouette score = {max(silhouettes):.3f})")

# =============================================================================
# 4. Entraînement K-Means final
# =============================================================================
print(f"\n[4] Entraînement K-Means avec k={best_k}...")

kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
df['cluster'] = kmeans.fit_predict(X_scaled)

# =============================================================================
# 5. Labellisation automatique des clusters
# =============================================================================
print("\n[5] Labellisation des clusters...")

cluster_stats = df.groupby('cluster').agg(
    anciennete_moy=('anciennete_mois', 'mean'),
    anciennete_med=('anciennete_mois', 'median'),
    nb_employes=('id_employe_nk', 'count'),
    contrat_dominant=('type_contrat_ml', lambda x: x.mode()[0]),
    pct_cdi=('type_contrat_ml', lambda x: (x == 'CDI').mean() * 100)
).reset_index()

# FIX P2 : labels UNIQUES et cohérents avec ancienneté + contrat dominant.
def label_candidates(row):
    anciennete = row['anciennete_moy']
    contrat = row['contrat_dominant']

    if contrat == 'FREELANCE' and anciennete >= 60:
        return ['Consultant Long Terme', 'Expert Externe', 'Freelance Stratégique']
    if anciennete < 12:
        return ['Talent Entrant', 'Nouveau Collaborateur']
    if anciennete < 36:
        return ['Jeune Talent', 'Junior en Développement']
    if anciennete < 60:
        return ['Profil Confirmé', 'Collaborateur Confirmé']
    if anciennete < 96:
        return ['Senior Confirmé', 'Profil Intermédiaire']
    return ['Expert Stable', 'Expert Stratégique', 'Vétéran Clé']

cluster_stats_sorted = cluster_stats.sort_values('anciennete_moy').reset_index(drop=True)
used_labels = set()
rank_labels = []
for i, row in cluster_stats_sorted.iterrows():
    for candidate in label_candidates(row):
        if candidate not in used_labels:
            label = candidate
            break
    else:
        label = f'Segment RH {i + 1}'
    used_labels.add(label)
    rank_labels.append(label)
cluster_stats_sorted['label'] = rank_labels
# Remettre dans l'ordre des clusters originaux pour le mapping
cluster_stats = cluster_stats.merge(
    cluster_stats_sorted[['cluster', 'label']], on='cluster', how='left'
)

cluster_map = dict(zip(cluster_stats['cluster'], cluster_stats['label']))
df['segment'] = df['cluster'].map(cluster_map)

print("\n  Segments identifiés :")
for _, row in cluster_stats.iterrows():
    print(f"  Cluster {int(row['cluster'])} → {row['label']:<25} "
          f"| {int(row['nb_employes'])} employés "
          f"| ancienneté moy. {row['anciennete_moy']:.0f} mois "
          f"| contrat dominant : {row['contrat_dominant']}")

# =============================================================================
# 6. Sauvegarde dans MySQL
# =============================================================================
print("\n[6] Sauvegarde dans sirh_dwh.ml_employee_segments...")

result_df = df[[
    'id_employe_nk', 'nom_complet', 'departement',
    'type_contrat_ml', 'anciennete_mois', 'profil_fidelisation',
    'cluster', 'segment'
]].copy()
result_df['generated_at'] = datetime.now()
result_df.rename(columns={'type_contrat_ml': 'type_contrat'}, inplace=True)

with engine.begin() as conn:
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ml_employee_segments (
            id_employe_nk       VARCHAR(36) PRIMARY KEY,
            nom_complet         VARCHAR(255),
            departement         VARCHAR(100),
            type_contrat        VARCHAR(50),
            anciennete_mois     INT,
            profil_fidelisation VARCHAR(50),
            cluster_id          INT,
            segment             VARCHAR(50),
            generated_at        DATETIME
        )
    """))
    conn.execute(sa.text("TRUNCATE TABLE ml_employee_segments"))

result_df.rename(columns={'cluster': 'cluster_id'}, inplace=True)
write_df(result_df, 'ml_employee_segments')

print(f"  ✓ {len(result_df)} lignes insérées dans ml_employee_segments")

# =============================================================================
# 7. Résumé
# =============================================================================
print(f"""
{'=' * 60}
  RÉSUMÉ ML-2 — Segmentation
{'=' * 60}
  Modèle         : K-Means (k={best_k})
  Silhouette     : {max(silhouettes):.3f}
  Employés       : {len(result_df)} segmentés

  Segments :
""")
for seg, count in result_df['segment'].value_counts().items():
    pct = count / len(result_df) * 100
    print(f"    {seg:<25} : {count:>4} employés ({pct:.1f}%)")

print(f"""
  Table créée : sirh_dwh.ml_employee_segments
{'=' * 60}
""")
