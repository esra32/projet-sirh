"""
SIRH BI - MLflow Tracking.

This script logs the current ML experiments into MLflow:
  - Turnover v3: same feature engineering/calibration as ml/turnover_model.py
  - Employee segmentation: KMeans comparison for k values

Usage:
    mlflow ui --port 5000
    python ml/mlflow_tracking.py
    open http://localhost:5000
"""

from __future__ import annotations

import os
import warnings
from datetime import datetime

warnings.filterwarnings("ignore")
os.environ.setdefault("LOKY_MAX_CPU_COUNT", "1")

import mlflow
import mlflow.sklearn
import numpy as np
import pandas as pd
import pymysql

from business_rules import apply_contract_coherence, print_contract_coherence_report
from sklearn.calibration import CalibratedClassifierCV
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    silhouette_score,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier


DB_CONFIG = {
    "host": os.getenv("SIRH_MYSQL_HOST", "localhost"),
    "port": int(os.getenv("SIRH_MYSQL_PORT", "3306")),
    "user": os.getenv("SIRH_MYSQL_USER", "root"),
    "password": os.getenv("SIRH_MYSQL_PASSWORD", "root"),
}


def read_sql(query: str) -> pd.DataFrame:
    conn = pymysql.connect(
        host=DB_CONFIG["host"],
        port=DB_CONFIG["port"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        database="sirh_dwh",
        charset="utf8mb4",
    )
    try:
        return pd.read_sql(query, conn)
    finally:
        conn.close()


MLFLOW_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mlruns")
mlflow.set_tracking_uri(f"file:///{MLFLOW_DIR.replace(os.sep, '/')}")


def seniority_risk(months: float) -> float:
    if months < 6:
        return 0.8
    if months < 12:
        return 0.5
    if months < 24:
        return 0.2
    if months < 48:
        return -0.1
    return -0.3


def build_turnover_features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    median_salaire = df[df["salaire"] > 0]["salaire"].median()
    df["salaire_filled"] = df["salaire"].where(df["salaire"] > 0, median_salaire)
    df["salaire_log"] = np.log1p(df["salaire_filled"])

    dept_med = df.groupby("departement")["salaire_filled"].transform("median")
    df["salaire_ratio"] = (
        df["salaire_filled"] / dept_med
    ).replace([np.inf, -np.inf], np.nan).fillna(1.0).round(3)
    df["salary_gap"] = (
        (df["salaire_filled"] - dept_med) / dept_med.clip(lower=1)
    ).replace([np.inf, -np.inf], np.nan).fillna(0.0)
    df["underpaid_depth"] = (-df["salary_gap"]).clip(lower=0)
    df["salary_signal"] = -df["salary_gap"] * 2.5

    contract_risk = {
        "STAGE": 1.2,
        "CDD": 0.9,
        "ALTERNANCE": 0.7,
        "FREELANCE": 0.4,
        "CDI": 0.0,
    }
    df["contract_risk"] = df["type_contrat_ml"].map(contract_risk).fillna(0.0)
    df["seniority_risk"] = df["anciennete_mois"].apply(seniority_risk)
    df["departure_propensity_proxy"] = (
        0.72 * df["salary_signal"] + 0.18 * (df["contract_risk"] + df["seniority_risk"])
    )

    df["score_recrutement_missing"] = df["score_recrutement_raw"].isna().astype(int)
    median_score = df["score_recrutement_raw"].median()
    if pd.isna(median_score):
        median_score = 50
    df["score_recrutement"] = df["score_recrutement_raw"].fillna(median_score)
    df["has_recruitment_score"] = (df["score_recrutement_missing"] == 0).astype(int)
    df["nb_candidatures"] = df["nb_candidatures"].fillna(0)
    df["anciennete_log"] = np.log1p(df["anciennete_mois"])

    numeric_features = [
        "anciennete_mois",
        "anciennete_log",
        "salaire_ratio",
        "salaire_log",
        "salary_gap",
        "underpaid_depth",
        "salary_signal",
        "contract_risk",
        "seniority_risk",
        "departure_propensity_proxy",
        "score_recrutement",
        "score_recrutement_missing",
        "has_recruitment_score",
        "nb_candidatures",
    ]
    categorical_features = ["type_contrat_ml", "departement", "profil_fidelisation"]
    X = pd.concat(
        [
            df[numeric_features].copy(),
            pd.get_dummies(
                df[categorical_features].fillna("Inconnu"),
                prefix=categorical_features,
                dtype=int,
            ),
        ],
        axis=1,
    )
    return X, df["is_parti"]


def _select_threshold(y_proba, y_test, target_precision: float, mode: str):
    precisions, recalls, thresholds = precision_recall_curve(y_test, y_proba)
    f1_scores = (2 * precisions[:-1] * recalls[:-1]) / np.maximum(precisions[:-1] + recalls[:-1], 1e-9)
    best_f1_idx = int(np.argmax(f1_scores))
    candidates = np.where(precisions[:-1] >= target_precision)[0]
    precision_idx = int(candidates[np.argmax(recalls[:-1][candidates])]) if len(candidates) > 0 else best_f1_idx
    idx = precision_idx if mode == "precision" else best_f1_idx
    return float(thresholds[idx])


def _run_model(name, model, X_train, X_test, y_train, y_test, X, y,
               calibration_method, target_precision, params, tag_modele,
               threshold_mode: str = "precision"):
    model.fit(X_train, y_train)
    calibrated = CalibratedClassifierCV(estimator=model, method=calibration_method, cv=3, ensemble=True, n_jobs=1)
    calibrated.fit(X_train, y_train)

    y_proba_raw = model.predict_proba(X_test)[:, 1]
    y_proba = calibrated.predict_proba(X_test)[:, 1]

    threshold = _select_threshold(y_proba, y_test, target_precision, threshold_mode)
    y_pred = (y_proba >= threshold).astype(int)

    auc_roc  = roc_auc_score(y_test, y_proba)
    auc_pr   = average_precision_score(y_test, y_proba)
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall   = recall_score(y_test, y_pred, zero_division=0)
    f1       = f1_score(y_test, y_pred, zero_division=0)
    brier_raw        = brier_score_loss(y_test, y_proba_raw)
    brier_calibrated = brier_score_loss(y_test, y_proba)
    cv_auc_roc = cross_val_score(model, X, y, cv=5, scoring="roc_auc", n_jobs=1).mean()
    cv_auc_pr  = cross_val_score(model, X, y, cv=5, scoring="average_precision", n_jobs=1).mean()

    version_tag = "v4_balanced" if threshold_mode == "balanced" else "v4_precision70"

    with mlflow.start_run(run_name=f"{name}_{datetime.now():%Y%m%d_%H%M%S}"):
        for k, v in params.items():
            mlflow.log_param(k, v)
        mlflow.log_param("calibration_method", calibration_method)
        mlflow.log_param("threshold_mode", threshold_mode)
        mlflow.log_param("decision_threshold", threshold)
        mlflow.log_param("target_precision", target_precision)
        mlflow.log_metric("auc_roc", auc_roc)
        mlflow.log_metric("auc_pr", auc_pr)
        mlflow.log_metric("accuracy", accuracy)
        mlflow.log_metric("precision_parti", precision)
        mlflow.log_metric("recall_parti", recall)
        mlflow.log_metric("f1_parti", f1)
        mlflow.log_metric("brier_raw", brier_raw)
        mlflow.log_metric("brier_calibrated", brier_calibrated)
        mlflow.log_metric("cv_auc_roc_mean", cv_auc_roc)
        mlflow.log_metric("cv_auc_pr_mean", cv_auc_pr)
        mlflow.sklearn.log_model(calibrated, f"model_{name.lower()}")
        mlflow.set_tag("projet", "SIRH BI PFE 2026")
        mlflow.set_tag("modele", tag_modele)
        mlflow.set_tag("cible", "turnover")
        mlflow.set_tag("version", version_tag)

    print(f"  {name}: AUC={auc_roc:.3f} | P={precision:.3f} | R={recall:.3f} | F1={f1:.3f}")
    return f1


def log_turnover_experiment() -> None:
    print("\n[1] Experience: Turnover Prediction v4 — RF + XGBoost + LightGBM")
    mlflow.set_experiment("SIRH_Turnover_Prediction")

    df = read_sql(
        """
        SELECT
            de.id_employe_nk,
            de.nom_complet,
            de.type_contrat,
            de.anciennete_mois,
            de.departement,
            de.poste,
            de.profil_fidelisation,
            de.is_parti,
            COALESCE(de.salaire, 0) AS salaire,
            rec.score_moyen AS score_recrutement_raw,
            COALESCE(rec.nb_cands, 0) AS nb_candidatures
        FROM dim_employe de
        LEFT JOIN (
            SELECT
                applicant_email,
                ROUND(AVG(match_score), 1) AS score_moyen,
                COUNT(*) AS nb_cands
            FROM fait_recrutement
            WHERE match_score IS NOT NULL
            GROUP BY applicant_email
        ) rec ON rec.applicant_email = de.email
        WHERE de.anciennete_mois IS NOT NULL
        """
    )
    df, contract_fix_summary = apply_contract_coherence(df)
    print_contract_coherence_report(contract_fix_summary)

    X, y = build_turnover_features(df)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    scale_pos = int((y == 0).sum()) / int((y == 1).sum())
    calibration_method = "isotonic"
    target_precision = 0.70

    # ── 1. Random Forest (v4 — target_precision=0.70) ──────────────────────────
    rf_params = {"n_estimators": 400, "max_depth": 10, "min_samples_leaf": 5,
                 "max_features": "sqrt", "class_weight": "balanced", "random_state": 42, "n_jobs": 1}
    _run_model("RF_v4_p70", RandomForestClassifier(**rf_params),
               X_train, X_test, y_train, y_test, X, y,
               calibration_method, target_precision, rf_params, "RandomForest v4")

    # ── 2. XGBoost ─────────────────────────────────────────────────────────────
    xgb_params = {"n_estimators": 400, "max_depth": 6, "learning_rate": 0.05,
                  "subsample": 0.8, "colsample_bytree": 0.8,
                  "scale_pos_weight": scale_pos, "random_state": 42,
                  "eval_metric": "aucpr", "verbosity": 0}
    _run_model("XGBoost_v4", XGBClassifier(**xgb_params),
               X_train, X_test, y_train, y_test, X, y,
               calibration_method, target_precision, xgb_params, "XGBoost")

    # ── 3. LightGBM ────────────────────────────────────────────────────────────
    lgbm_params = {"n_estimators": 400, "max_depth": 6, "learning_rate": 0.05,
                   "subsample": 0.8, "colsample_bytree": 0.8,
                   "class_weight": "balanced", "random_state": 42, "verbose": -1}
    _run_model("LightGBM_v4", LGBMClassifier(**lgbm_params),
               X_train, X_test, y_train, y_test, X, y,
               calibration_method, target_precision, lgbm_params, "LightGBM")

    # ── 4. RF v4 seuil balanced — optimise F1 (recall + precision equilibres) ─
    _run_model("RF_v4_balanced", RandomForestClassifier(**rf_params),
               X_train, X_test, y_train, y_test, X, y,
               calibration_method, target_precision, rf_params, "RandomForest v4 balanced",
               threshold_mode="balanced")


def log_segmentation_experiment() -> int:
    print("\n[2] Experience: Segmentation K-Means")
    mlflow.set_experiment("SIRH_Employee_Segmentation")

    df_seg = read_sql(
        """
        SELECT anciennete_mois, type_contrat, profil_fidelisation
        FROM dim_employe
        WHERE is_parti = 0 AND anciennete_mois IS NOT NULL
        """
    )
    df_seg, contract_fix_summary = apply_contract_coherence(df_seg)
    print_contract_coherence_report(contract_fix_summary)

    le_c = LabelEncoder()
    le_p = LabelEncoder()
    df_seg["contrat_enc"] = le_c.fit_transform(df_seg["type_contrat_ml"].fillna("CDI"))
    df_seg["profil_enc"] = le_p.fit_transform(df_seg["profil_fidelisation"].fillna("Nouveau"))

    X_seg = df_seg[["anciennete_mois", "contrat_enc", "profil_enc"]]
    X_scaled = StandardScaler().fit_transform(X_seg)

    k_values = [3, 4, 5, 6, 7]
    for k in k_values:
        with mlflow.start_run(run_name=f"KMeans_k{k}_{datetime.now():%Y%m%d_%H%M%S}"):
            km = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = km.fit_predict(X_scaled)
            sil = silhouette_score(X_scaled, labels)

            mlflow.log_param("n_clusters", k)
            mlflow.log_param("n_samples", len(df_seg))
            mlflow.log_metric("silhouette", sil)
            mlflow.log_metric("inertia", km.inertia_)
            mlflow.set_tag("projet", "SIRH BI PFE 2026")
            mlflow.set_tag("modele", "KMeans")
            mlflow.set_tag("cible", "segmentation")

            print(f"  Run KMeans k={k} -> Silhouette={sil:.3f} | Inertia={km.inertia_:.0f}")

    return len(k_values)


print("=" * 60)
print("  SIRH BI - MLflow Tracking")
print(f"  {datetime.now():%Y-%m-%d %H:%M:%S}")
print(f"  Tracking URI : {mlflow.get_tracking_uri()}")
print("=" * 60)

log_turnover_experiment()
n_seg_runs = log_segmentation_experiment()

print(
    f"""
============================================================
  RESUME MLflow
============================================================
  Experiences enregistrees :
    - SIRH_Turnover_Prediction  (4 runs : RF v4, XGBoost, LightGBM, RF v4 balanced)
    - SIRH_Employee_Segmentation ({n_seg_runs} runs)

  Interface :
    mlflow ui --port 5000
    http://localhost:5000

  Dossier : {MLFLOW_DIR}
============================================================
"""
)
