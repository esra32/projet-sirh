"""
=============================================================================
SIRH BI — ML-4 : Prévision Temporelle des Embauches (Prophet)
=============================================================================
Modèle : Facebook Prophet
Source : sirh_dwh.fait_mobilite (embauches mensuelles par département)
Output : sirh_dwh.ml_forecast_embauches (prévisions 6 mois)

Usage :
    pip install prophet
    python ml/forecast_model.py
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

try:
    from prophet import Prophet
except ImportError:
    raise SystemExit(
        "Prophet is required for ML-4. "
        "Install dependencies from sirh-bi with: python -m pip install -r requirements.txt"
    )

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
print("  SIRH BI — Prévision Embauches (Prophet)")
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

df = read_sql("""
    SELECT
        annee_snapshot,
        mois_snapshot,
        SUM(nb_embauches_mois) AS nb_embauches
    FROM fait_mobilite
    WHERE annee_snapshot IS NOT NULL
      AND mois_snapshot  IS NOT NULL
    GROUP BY annee_snapshot, mois_snapshot
    ORDER BY annee_snapshot, mois_snapshot
""")

print(f"  ✓ {len(df)} points de données mensuels")

# Construire la colonne date
df['ds'] = pd.to_datetime(
    df['annee_snapshot'].astype(str) + '-' +
    df['mois_snapshot'].astype(str).str.zfill(2) + '-01'
)
df['y'] = df['nb_embauches'].astype(float)
df_prophet = df[['ds', 'y']].dropna()

print(f"  ✓ Période : {df_prophet['ds'].min().date()} → {df_prophet['ds'].max().date()}")

# =============================================================================
# 2. Entraînement Prophet
# =============================================================================
print("\n[2] Entraînement Prophet...")

model = Prophet(
    yearly_seasonality=True,
    weekly_seasonality=False,
    daily_seasonality=False,
    seasonality_mode='additive',
    interval_width=0.80,
)
model.fit(df_prophet)

# =============================================================================
# 3. Prévision 6 mois
# =============================================================================
print("\n[3] Prévision sur 6 mois...")

future    = model.make_future_dataframe(periods=6, freq='MS')
forecast  = model.predict(future)

# Garder uniquement les 6 mois futurs
last_date    = df_prophet['ds'].max()
df_future    = forecast[forecast['ds'] > last_date][['ds', 'yhat', 'yhat_lower', 'yhat_upper']].copy()
df_future['yhat']       = df_future['yhat'].clip(lower=0).round(0).astype(int)
df_future['yhat_lower'] = df_future['yhat_lower'].clip(lower=0).round(0).astype(int)
df_future['yhat_upper'] = df_future['yhat_upper'].clip(lower=0).round(0).astype(int)

print("\n  Prévisions mensuelles :")
print(f"  {'Mois':<12} {'Prévu':>8} {'Min':>8} {'Max':>8}")
print("  " + "-" * 38)
for _, row in df_future.iterrows():
    print(f"  {row['ds'].strftime('%Y-%m'):<12} {row['yhat']:>8} {row['yhat_lower']:>8} {row['yhat_upper']:>8}")

# =============================================================================
# 4. Sauvegarde
# =============================================================================
print("\n[4] Sauvegarde dans sirh_dwh.ml_forecast_embauches...")

result_df = df_future.copy()
result_df.rename(columns={
    'ds':          'mois',
    'yhat':        'embauches_prevues',
    'yhat_lower':  'intervalle_bas',
    'yhat_upper':  'intervalle_haut'
}, inplace=True)
result_df['generated_at'] = datetime.now()

# Libellés de mois en français + ordre chronologique pour l'affichage Superset
_MOIS_FR = {1: 'Jan', 2: 'Fév', 3: 'Mar', 4: 'Avr', 5: 'Mai', 6: 'Juin',
            7: 'Juil', 8: 'Août', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Déc'}
result_df = result_df.sort_values('mois').reset_index(drop=True)
result_df['mois_label'] = result_df['mois'].apply(
    lambda d: f"{_MOIS_FR[d.month]} {d.year}")
result_df['ordre_mois'] = range(1, len(result_df) + 1)

with engine.begin() as conn:
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ml_forecast_embauches (
            mois               DATE PRIMARY KEY,
            embauches_prevues  INT,
            intervalle_bas     INT,
            intervalle_haut    INT,
            mois_label         VARCHAR(15),
            ordre_mois         INT,
            generated_at       DATETIME
        )
    """))
    conn.execute(sa.text("TRUNCATE TABLE ml_forecast_embauches"))

write_df(result_df, 'ml_forecast_embauches')
print(f"  ✓ {len(result_df)} mois insérés dans ml_forecast_embauches")

# =============================================================================
# 5. Résumé
# =============================================================================
total_prevu = result_df['embauches_prevues'].sum()
print(f"""
{'=' * 60}
  RÉSUMÉ ML-4 — Prévision Embauches
{'=' * 60}
  Modèle          : Facebook Prophet
  Données         : {len(df_prophet)} mois historiques
  Horizon         : 6 mois futurs
  Total prévu     : {total_prevu} embauches

  Table créée : sirh_dwh.ml_forecast_embauches
  Superset    : Line chart avec intervalles de confiance
{'=' * 60}
""")
