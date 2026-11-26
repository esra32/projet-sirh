"""
=============================================================================
SIRH BI — ML-1 : Prévision du Turnover + SHAP Values
=============================================================================
Modèle  : Random Forest Classifier
Source  : sirh_dwh.dim_employe + fait_recrutement
Features: variables numériques + catégories one-hot + indicateurs de valeurs
          manquantes pour garder le modèle explicable avec SHAP.
Output  : sirh_dwh.ml_turnover_risk

Usage :
    python ml/turnover_model.py
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

from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    classification_report,
    precision_recall_curve,
    roc_auc_score,
)
import shap
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
print("  SIRH BI — Modèle Prévision Turnover (v3 — features explicables)")
print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 60)

# =============================================================================
# 1. Chargement — dim_employe + scores recrutement
# =============================================================================
print("\n[1] Chargement des données...")

df = read_sql("""
    SELECT
        de.id_employe_nk,
        de.nom_complet,
        de.type_contrat,
        de.anciennete_mois,
        de.departement,
        de.poste,
        de.profil_fidelisation,
        de.is_parti,
        COALESCE(de.salaire, 0)              AS salaire,
        rec.score_moyen                      AS score_recrutement_raw,
        COALESCE(rec.nb_cands,      0)       AS nb_candidatures
    FROM dim_employe de
    LEFT JOIN (
        SELECT
            applicant_email,
            ROUND(AVG(match_score), 1)  AS score_moyen,
            COUNT(*)                    AS nb_cands
        FROM fait_recrutement
        WHERE match_score IS NOT NULL
        GROUP BY applicant_email
    ) rec ON rec.applicant_email = de.email
    WHERE de.anciennete_mois IS NOT NULL
""")

print(f"  ✓ {len(df)} employés chargés")
print(f"  ✓ Départs (is_parti=1) : {df['is_parti'].sum()}")
print(f"  ✓ Avec score recrutement : {df['score_recrutement_raw'].notna().sum()}")
print(f"  ✓ Avec salaire renseigné : {(df['salaire'] > 0).sum()}")

df, contract_fix_summary = apply_contract_coherence(df)
print_contract_coherence_report(contract_fix_summary)

# =============================================================================
# 2. Feature Engineering
# =============================================================================
print("\n[2] Préparation des features explicables...")

# Salaire : remplacer 0 par médiane globale pour les employés sans salaire
median_salaire = df[df['salaire'] > 0]['salaire'].median()
df['salaire_filled'] = df['salaire'].where(df['salaire'] > 0, median_salaire)
df['salaire_log'] = np.log1p(df['salaire_filled'])

# Normalisation salaire : ratio par rapport à la médiane du département
dept_med = df.groupby('departement')['salaire_filled'].transform('median')
df['salaire_ratio'] = (
    df['salaire_filled'] / dept_med
).replace([np.inf, -np.inf], np.nan).fillna(1.0).round(3)
df['salary_gap'] = (
    (df['salaire_filled'] - dept_med) / dept_med.clip(lower=1)
).replace([np.inf, -np.inf], np.nan).fillna(0.0)
df['underpaid_depth'] = (-df['salary_gap']).clip(lower=0)
df['salary_signal'] = -df['salary_gap'] * 2.5

CONTRACT_RISK = {
    'STAGE': 1.2,
    'CDD': 0.9,
    'ALTERNANCE': 0.7,
    'FREELANCE': 0.4,
    'CDI': 0.0,
}

def seniority_risk(months):
    if months < 6:
        return 0.8
    if months < 12:
        return 0.5
    if months < 24:
        return 0.2
    if months < 48:
        return -0.1
    return -0.3

df['contract_risk'] = df['type_contrat_ml'].map(CONTRACT_RISK).fillna(0.0)
df['seniority_risk'] = df['anciennete_mois'].apply(seniority_risk)
df['departure_propensity_proxy'] = (
    0.72 * df['salary_signal'] + 0.18 * (df['contract_risk'] + df['seniority_risk'])
)

# Score recrutement : distinguer un vrai score 50 d'un score absent.
df['score_recrutement_missing'] = df['score_recrutement_raw'].isna().astype(int)
median_score = df['score_recrutement_raw'].median()
if pd.isna(median_score):
    median_score = 50
df['score_recrutement'] = df['score_recrutement_raw'].fillna(median_score)
df['has_recruitment_score'] = (df['score_recrutement_missing'] == 0).astype(int)
df['nb_candidatures'] = df['nb_candidatures'].fillna(0)

# Log anciennete : aide le modele a capter l'effet fort des premieres annees.
df['anciennete_log'] = np.log1p(df['anciennete_mois'])

NUMERIC_FEATURES = [
    'anciennete_mois',
    'anciennete_log',
    'salaire_ratio',
    'salaire_log',
    'salary_gap',
    'underpaid_depth',
    'salary_signal',
    'contract_risk',
    'seniority_risk',
    'departure_propensity_proxy',
    'score_recrutement',
    'score_recrutement_missing',
    'has_recruitment_score',
    'nb_candidatures',
]
CATEGORICAL_FEATURES = ['type_contrat_ml', 'departement', 'profil_fidelisation']

X_numeric = df[NUMERIC_FEATURES].copy()
X_categorical = pd.get_dummies(
    df[CATEGORICAL_FEATURES].fillna('Inconnu'),
    prefix=CATEGORICAL_FEATURES,
    dtype=int,
)
X = pd.concat([X_numeric, X_categorical], axis=1)
FEATURES = X.columns.tolist()
TARGET = 'is_parti'
y = df[TARGET]

def readable_feature_name(col):
    labels = {
        'anciennete_mois': 'Anciennete (mois)',
        'anciennete_log': 'Anciennete log',
        'salaire_ratio': 'Salaire / mediane dept',
        'salaire_log': 'Salaire log',
        'salary_gap': 'Ecart salaire vs dept',
        'underpaid_depth': 'Sous-paiement relatif',
        'salary_signal': 'Signal salaire turnover',
        'contract_risk': 'Risque contrat',
        'seniority_risk': 'Risque anciennete',
        'departure_propensity_proxy': 'Propension depart metier',
        'score_recrutement': 'Score recrutement',
        'score_recrutement_missing': 'Score recrutement absent',
        'has_recruitment_score': 'Score recrutement present',
        'nb_candidatures': 'Nb candidatures',
    }
    if col in labels:
        return labels[col]
    for prefix, label in [
        ('type_contrat_ml_', 'Type contrat = '),
        ('departement_', 'Departement = '),
        ('profil_fidelisation_', 'Profil fidelisation = '),
    ]:
        if col.startswith(prefix):
            return label + col[len(prefix):]
    return col

FEATURE_NAMES = [readable_feature_name(col) for col in FEATURES]

print(f"  ✓ Features numériques : {NUMERIC_FEATURES}")
print(f"  ✓ Features catégorielles one-hot : {len(X_categorical.columns)} colonnes")
print(f"  ✓ Score recrutement imputé par médiane : {median_score:.1f}")
print(f"  ✓ Distribution target : {y.value_counts().to_dict()}")

# =============================================================================
# 3. Entraînement Random Forest
# =============================================================================
print("\n[3] Entraînement Random Forest + calibration...")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)

RF_PARAMS = {
    'n_estimators': 300,
    'max_depth': 8,
    'min_samples_leaf': 8,
    'max_features': 'sqrt',
    'class_weight': 'balanced',
    'random_state': 42,
    'n_jobs': 1,
}

# Modele de base conserve pour SHAP : TreeExplainer explique ce RandomForest.
model = RandomForestClassifier(**RF_PARAMS)
model.fit(X_train, y_train)

# Modele calibre pour transformer les scores en probabilites plus fiables.
calibration_method = os.getenv('SIRH_TURNOVER_CALIBRATION', 'isotonic').strip().lower()
if calibration_method not in {'sigmoid', 'isotonic'}:
    calibration_method = 'isotonic'

calibrated_model = CalibratedClassifierCV(
    estimator=RandomForestClassifier(**RF_PARAMS),
    method=calibration_method,
    cv=3,
    ensemble=True,
    n_jobs=1,
)
calibrated_model.fit(X_train, y_train)

# Validation croisée 5-fold pour un AUC plus robuste
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_aucs = cross_val_score(model, X, y, cv=cv, scoring='roc_auc', n_jobs=1)
cv_pr_aucs = cross_val_score(model, X, y, cv=cv, scoring='average_precision', n_jobs=1)
print(f"\n  AUC-ROC 5-fold CV : {cv_aucs.mean():.3f} ± {cv_aucs.std():.3f}")
print(f"  AUC-PR  5-fold CV : {cv_pr_aucs.mean():.3f} ± {cv_pr_aucs.std():.3f}")

y_proba_raw = model.predict_proba(X_test)[:, 1]
y_proba = calibrated_model.predict_proba(X_test)[:, 1]
auc     = roc_auc_score(y_test, y_proba)
auc_pr  = average_precision_score(y_test, y_proba)
brier_raw = brier_score_loss(y_test, y_proba_raw)
brier_calibrated = brier_score_loss(y_test, y_proba)

precisions, recalls, thresholds = precision_recall_curve(y_test, y_proba)
f1_scores = (2 * precisions[:-1] * recalls[:-1]) / np.maximum(precisions[:-1] + recalls[:-1], 1e-9)
f2_scores = (5 * precisions[:-1] * recalls[:-1]) / np.maximum((4 * precisions[:-1]) + recalls[:-1], 1e-9)
best_f1_idx = int(np.argmax(f1_scores))
best_f2_idx = int(np.argmax(f2_scores))
target_precision = float(os.getenv('SIRH_TURNOVER_TARGET_PRECISION', '0.60'))
precision_candidates = np.where(precisions[:-1] >= target_precision)[0]
if len(precision_candidates) > 0:
    precision_priority_idx = int(precision_candidates[np.argmax(recalls[:-1][precision_candidates])])
else:
    precision_priority_idx = int(np.argmax(precisions[:-1]))

fp_cost = float(os.getenv('SIRH_TURNOVER_FP_COST', '0.5'))
fn_cost = float(os.getenv('SIRH_TURNOVER_FN_COST', '1.0'))
cost_threshold = fp_cost / (fp_cost + fn_cost)
cost_idx = int(np.argmin(np.abs(thresholds - cost_threshold)))

threshold_mode = os.getenv('SIRH_TURNOVER_THRESHOLD_MODE', 'precision').strip().lower()
threshold_indices = {
    'balanced': best_f1_idx,
    'recall': best_f2_idx,
    'precision': precision_priority_idx,
    'cost': cost_idx,
}
selected_threshold_idx = threshold_indices.get(threshold_mode, best_f1_idx)

decision_threshold = float(thresholds[selected_threshold_idx])
recall_priority_threshold = float(thresholds[best_f2_idx])
precision_priority_threshold = float(thresholds[precision_priority_idx])
cost_business_threshold = float(thresholds[cost_idx])

y_pred = (y_proba >= decision_threshold).astype(int)
parti_precision = float(precisions[selected_threshold_idx])
parti_recall = float(recalls[selected_threshold_idx])

print(f"  AUC-ROC (test)  : {auc:.3f}")
print(f"  AUC-PR  (test)  : {auc_pr:.3f}")
print(f"  Calibration     : {calibration_method} | Brier {brier_raw:.3f} → {brier_calibrated:.3f}")
print(f"  Seuil F1 équilibré       : {thresholds[best_f1_idx]:.3f} "
      f"(precision={precisions[best_f1_idx]:.3f}, recall={recalls[best_f1_idx]:.3f})")
print(f"  Seuil recall prioritaire : {recall_priority_threshold:.3f} "
      f"(precision={precisions[best_f2_idx]:.3f}, recall={recalls[best_f2_idx]:.3f})")
print(f"  Seuil precision >= {target_precision:.2f} : {precision_priority_threshold:.3f} "
      f"(precision={precisions[precision_priority_idx]:.3f}, recall={recalls[precision_priority_idx]:.3f})")
print(f"  Seuil coût métier FP={fp_cost:.2f}, FN={fn_cost:.2f} : {cost_business_threshold:.3f} "
      f"(precision={precisions[cost_idx]:.3f}, recall={recalls[cost_idx]:.3f})")
print(f"  Seuil utilisé ({threshold_mode}) : {decision_threshold:.3f}")
print(f"  Classe Parti utilisée : precision={parti_precision:.3f}, recall={parti_recall:.3f}")
print(f"\n{classification_report(y_test, y_pred, target_names=['Actif', 'Parti'])}")

# =============================================================================
# 4. SHAP Values — Explicabilité
# =============================================================================
print("\n[4] Calcul SHAP Values...")

# Sous-échantillon pour accélérer (max 500 individus)
sample_size = min(500, len(X))
X_sample = X.sample(n=sample_size, random_state=42)

explainer   = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X_sample)

# Normalisation selon la forme retournée par SHAP
# - liste [class0, class1] : shape (n_samples, n_features) chacun
# - array 3D (n_samples, n_features, n_classes) : SHAP >= 0.42
# - array 2D (n_samples, n_features) : binaire simplifié
sv = np.array(shap_values)
if sv.ndim == 3 and sv.shape[2] == 2:
    # (n_samples, n_features, 2) → prendre classe 1
    shap_class1 = sv[:, :, 1]
elif sv.ndim == 3 and sv.shape[0] == 2:
    # (2, n_samples, n_features) → prendre classe 1
    shap_class1 = sv[1]
elif isinstance(shap_values, list):
    shap_class1 = np.array(shap_values[1])
else:
    shap_class1 = sv

# Doit être (n_samples, n_features)
if shap_class1.ndim != 2:
    shap_class1 = shap_class1.reshape(len(X_sample), -1)

shap_importance = np.abs(shap_class1).mean(axis=0)
assert len(shap_importance) == len(FEATURES), \
    f"SHAP shape inattendue : {shap_importance.shape}, attendu {len(FEATURES)}"

print("\n  Impact moyen de chaque feature (SHAP) :")
for name, imp in sorted(zip(FEATURE_NAMES, shap_importance.tolist()), key=lambda x: -x[1]):
    bar = "█" * max(1, int(imp * 60))
    print(f"  {name:<28} {imp:.4f}  {bar}")

# -----------------------------------------------------------------------------
# Sauvegarde de l'importance des features (SHAP) → table pour visualisation
# Explainable AI : "quels facteurs prédisent le départ ?"
# -----------------------------------------------------------------------------
_imp_total = float(np.sum(shap_importance)) or 1.0
df_importance = pd.DataFrame({
    'feature':    FEATURE_NAMES,
    'importance': [round(float(v), 4) for v in shap_importance],
}).sort_values('importance', ascending=False).reset_index(drop=True)
df_importance['importance_pct'] = (df_importance['importance'] / _imp_total * 100).round(1)
df_importance['rang'] = range(1, len(df_importance) + 1)
df_importance['generated_at'] = datetime.now()

with engine.begin() as conn:
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ml_feature_importance (
            feature        VARCHAR(60),
            importance     DOUBLE,
            importance_pct DOUBLE,
            rang           INT,
            generated_at   DATETIME
        )
    """))
    conn.execute(sa.text("TRUNCATE TABLE ml_feature_importance"))
write_df(df_importance, 'ml_feature_importance')
print(f"\n  Importance des features sauvegardée → sirh_dwh.ml_feature_importance")

# =============================================================================
# 5. Scores de risque — tous les employés actifs
# =============================================================================
print("\n[5] Calcul des scores de risque (employés actifs)...")

df_actifs = df[df['is_parti'] == 0].copy()
X_actifs  = X.loc[df_actifs.index, FEATURES]
scores    = calibrated_model.predict_proba(X_actifs)[:, 1]

df_actifs['score_risque'] = (scores * 100).round(1)

# Seuils metier sur probabilites calibrees, plus interpretables que des percentiles.
p_critique = float(os.getenv('SIRH_TURNOVER_CRITICAL_PROBA', '0.50')) * 100
p_eleve    = float(os.getenv('SIRH_TURNOVER_HIGH_PROBA', '0.35')) * 100
p_modere   = float(os.getenv('SIRH_TURNOVER_MODERATE_PROBA', '0.20')) * 100

print(f"\n  Seuils de risque sur probabilités calibrées :")
print(f"  Critique  ≥ {p_critique:.1f}% de probabilité calibrée")
print(f"  Élevé     ≥ {p_eleve:.1f}% de probabilité calibrée")
print(f"  Modéré    ≥ {p_modere:.1f}% de probabilité calibrée")

def niveau_risque(s):
    if s >= p_critique: return 'Critique'
    if s >= p_eleve:    return 'Élevé'
    if s >= p_modere:   return 'Modéré'
    return 'Faible'

df_actifs['niveau_risque'] = df_actifs['score_risque'].apply(niveau_risque)

print(f"\n  Distribution des niveaux :")
for niveau, count in df_actifs['niveau_risque'].value_counts().items():
    pct = count / len(df_actifs) * 100
    print(f"  {niveau:<12} : {count:>4} ({pct:.1f}%)")

# =============================================================================
# 6. Sauvegarde
# =============================================================================
print("\n[6] Sauvegarde dans sirh_dwh.ml_turnover_risk...")

result_df = df_actifs[[
    'id_employe_nk', 'nom_complet', 'departement',
    'type_contrat_ml', 'anciennete_mois', 'profil_fidelisation',
    'score_risque', 'niveau_risque'
]].copy()
result_df['generated_at'] = datetime.now()
result_df.rename(columns={'type_contrat_ml': 'type_contrat'}, inplace=True)

with engine.begin() as conn:
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS ml_turnover_risk (
            id_employe_nk       VARCHAR(36) PRIMARY KEY,
            nom_complet         VARCHAR(255),
            departement         VARCHAR(100),
            type_contrat        VARCHAR(50),
            anciennete_mois     INT,
            profil_fidelisation VARCHAR(50),
            score_risque        DECIMAL(5,1),
            niveau_risque       VARCHAR(20),
            generated_at        DATETIME
        )
    """))
    conn.execute(sa.text("TRUNCATE TABLE ml_turnover_risk"))

write_df(result_df, 'ml_turnover_risk')
print(f"  ✓ {len(result_df)} lignes insérées")

# =============================================================================
# 7. Résumé
# =============================================================================
critique_count = (df_actifs['niveau_risque'] == 'Critique').sum()
print(f"""
{'=' * 60}
  RÉSUMÉ ML-1 — Turnover (v3)
{'=' * 60}
  Modèle     : Random Forest (300 arbres, max_depth=8)
  Features   : {len(FEATURES)} variables
  Calibration: {calibration_method} (Brier {brier_raw:.3f} → {brier_calibrated:.3f})
  AUC-ROC    : {auc:.3f}  (CV: {cv_aucs.mean():.3f} ± {cv_aucs.std():.3f})
  AUC-PR     : {auc_pr:.3f}  (CV: {cv_pr_aucs.mean():.3f} ± {cv_pr_aucs.std():.3f})
  Seuil      : {threshold_mode} ({decision_threshold:.3f})
  Parti      : precision={parti_precision:.3f}, recall={parti_recall:.3f}
  Employés   : {len(result_df)} scores calculés

  Top feature SHAP : {FEATURE_NAMES[int(np.argmax(shap_importance))]}
  Cas critiques    : {critique_count} employés ({critique_count/len(result_df)*100:.1f}%)

  Table : sirh_dwh.ml_turnover_risk
{'=' * 60}
""")
