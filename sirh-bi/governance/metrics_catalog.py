"""
=============================================================================
SIRH BI — 1.6.3 : Catalogue des Métriques & Indicateurs
=============================================================================
Crée la table bi_metrics_catalog dans sirh_dwh avec la définition
complète de tous les KPIs utilisés dans les dashboards Superset.

Objectif gouvernance :
  - Traçabilité : chaque indicateur a une définition officielle
  - Cohérence   : formule unique référencée par tous les dashboards
  - Audit       : qui a défini quoi, quand, quel statut

Table créée : sirh_dwh.bi_metrics_catalog
Table créée : sirh_dwh.bi_data_sources

Usage :
    python governance/metrics_catalog.py

Ajouter ensuite dans Superset :
    Data > Datasets > + Dataset > sirh_dwh > bi_metrics_catalog
    Créer un dashboard "Catalogue des Métriques BI"
=============================================================================
"""

import os
import pymysql
import sqlalchemy as sa
import pandas as pd
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

print("=" * 70)
print("  SIRH BI — 1.6.3 : Catalogue des Métriques")
print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 70)

# =============================================================================
# CATALOGUE DES MÉTRIQUES — Définition complète
# =============================================================================

NOW = datetime.now()

METRICS = [
    # ── Effectifs ──────────────────────────────────────────────────────────
    {
        "code":          "KPI_EFFECTIF_TOTAL",
        "nom":           "Effectif Total",
        "categorie":     "Effectifs",
        "sous_categorie":"Stock",
        "description":   "Nombre total d'employés actifs dans l'entreprise à la date de référence",
        "formule":       "COUNT(id_employe) WHERE is_parti = 0",
        "source_table":  "dim_employe",
        "source_colonne":"id_employe_nk",
        "unite":         "employés",
        "type_indicateur":"Stock",
        "frequence_maj": "Quotidienne (02h00 Europe/Paris)",
        "dashboard":     "Vue Générale RH",
        "responsable":   "DRH",
        "proprietaire_donnee": "Service RH",
        "statut":        "Actif",
        "version":       "1.0",
    },
    {
        "code":          "KPI_TAUX_TURNOVER",
        "nom":           "Taux de Turnover Global",
        "categorie":     "Rétention",
        "sous_categorie":"Turnover",
        "description":   "Proportion d'employés ayant quitté l'entreprise, toutes années confondues, rapportée à l'effectif total",
        "formule":       "COUNT(date_depart IS NOT NULL) * 100.0 / COUNT(*)",
        "source_table":  "rh_turnover_departement",
        "source_colonne":"taux_turnover",
        "unite":         "%",
        "type_indicateur":"Taux",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Analyse Turnover",
        "responsable":   "DRH",
        "proprietaire_donnee": "Service RH",
        "statut":        "Actif",
        "version":       "1.1",
    },
    {
        "code":          "KPI_NB_DEPARTS",
        "nom":           "Nombre de Départs",
        "categorie":     "Rétention",
        "sous_categorie":"Turnover",
        "description":   "Nombre d'employés ayant quitté l'entreprise (date_depart renseignée), toutes années confondues",
        "formule":       "SUM(CASE WHEN date_depart IS NOT NULL THEN 1 ELSE 0 END)",
        "source_table":  "rh_turnover_departement",
        "source_colonne":"nb_departs",
        "unite":         "employés",
        "type_indicateur":"Flux",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Analyse Turnover",
        "responsable":   "DRH",
        "proprietaire_donnee": "Service RH",
        "statut":        "Actif",
        "version":       "1.0",
    },
    # ── Risque & ML ────────────────────────────────────────────────────────
    {
        "code":          "ML_SCORE_RISQUE_TURNOVER",
        "nom":           "Score Risque de Turnover",
        "categorie":     "Analyse Prédictive",
        "sous_categorie":"Machine Learning",
        "description":   "Probabilité estimée qu'un employé quitte l'entreprise dans les 12 prochains mois, exprimée en score 0-100. Calculée par Random Forest calibré (AUC-ROC=0.757, n_estimators=300).",
        "formule":       "CalibratedClassifierCV(RandomForest).predict_proba() * 100",
        "source_table":  "ml_turnover_risk",
        "source_colonne":"score_risque",
        "unite":         "score (0-100)",
        "type_indicateur":"Score ML",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Analyse des Risques RH",
        "responsable":   "Data Scientist SIRH",
        "proprietaire_donnee": "Direction BI",
        "statut":        "Actif",
        "version":       "2.0",
    },
    {
        "code":          "ML_NIVEAU_RISQUE",
        "nom":           "Niveau de Risque Turnover",
        "categorie":     "Analyse Prédictive",
        "sous_categorie":"Machine Learning",
        "description":   "Catégorisation du score risque en 4 niveaux : Critique (>75), Élevé (50-75), Modéré (25-50), Faible (<25)",
        "formule":       "CASE WHEN score_risque>75 THEN 'Critique' WHEN score_risque>50 THEN 'Élevé' WHEN score_risque>25 THEN 'Modéré' ELSE 'Faible' END",
        "source_table":  "ml_turnover_risk",
        "source_colonne":"niveau_risque",
        "unite":         "catégorie",
        "type_indicateur":"Classification",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Analyse des Risques RH",
        "responsable":   "Data Scientist SIRH",
        "proprietaire_donnee": "Direction BI",
        "statut":        "Actif",
        "version":       "1.0",
    },
    # ── Segmentation ───────────────────────────────────────────────────────
    {
        "code":          "ML_SEGMENT_EMPLOYE",
        "nom":           "Segment Employé (K-Means)",
        "categorie":     "Segmentation",
        "sous_categorie":"Machine Learning",
        "description":   "Groupe d'appartenance d'un employé issu d'un clustering K-Means. Le k optimal est sélectionné par score de silhouette. Features : ancienneté, type de contrat, profil recrutement.",
        "formule":       "KMeans(k=optimal_by_silhouette).predict(anciennete, contrat_enc, profil_enc)",
        "source_table":  "ml_employee_segments",
        "source_colonne":"segment_label",
        "unite":         "segment",
        "type_indicateur":"Cluster ML",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Segmentation Employés",
        "responsable":   "Data Scientist SIRH",
        "proprietaire_donnee": "Direction BI",
        "statut":        "Actif",
        "version":       "1.0",
    },
    # ── High Potentials ────────────────────────────────────────────────────
    {
        "code":          "KPI_SCORE_POTENTIEL",
        "nom":           "Score Potentiel Employé",
        "categorie":     "Talents",
        "sous_categorie":"High Potentials",
        "description":   "Score composite (0-100) combinant le segment ML (40 pts max), le score recrutement (30 pts), l'ancienneté (20 pts) et le type de contrat CDI (10 pts).",
        "formule":       "score_segment(40) + score_recrutement(30) + score_anciennete(20) + bonus_cdi(10)",
        "source_table":  "ml_high_potentials",
        "source_colonne":"score_potentiel",
        "unite":         "score (0-100)",
        "type_indicateur":"Score composite",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Gestion des Talents",
        "responsable":   "DRH",
        "proprietaire_donnee": "Service RH",
        "statut":        "Actif",
        "version":       "1.0",
    },
    {
        "code":          "KPI_CATEGORIE_HP",
        "nom":           "Catégorie High Potential",
        "categorie":     "Talents",
        "sous_categorie":"High Potentials",
        "description":   "Classement des employés en 3 catégories selon leur score potentiel: High Potential (P97+), Potentiel Confirmé (P85+), À Surveiller (P50+)",
        "formule":       "CASE WHEN score >= P97 THEN 'High Potential' WHEN score >= P85 THEN 'Potentiel Confirmé' WHEN score >= P50 THEN 'À Surveiller' ELSE 'Standard' END",
        "source_table":  "ml_high_potentials",
        "source_colonne":"categorie",
        "unite":         "catégorie",
        "type_indicateur":"Classification",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Gestion des Talents",
        "responsable":   "DRH",
        "proprietaire_donnee": "Service RH",
        "statut":        "Actif",
        "version":       "1.0",
    },
    # ── Prévision ──────────────────────────────────────────────────────────
    {
        "code":          "ML_EMBAUCHES_PREVUES",
        "nom":           "Prévision Embauches Mensuelles",
        "categorie":     "Planification RH",
        "sous_categorie":"Prévision",
        "description":   "Nombre d'embauches prévu pour chaque mois des 6 prochains mois, calculé par Facebook Prophet sur les données historiques de fait_mobilite.",
        "formule":       "Prophet(yearly_seasonality=True, interval_width=0.80).predict(horizon=6 mois)",
        "source_table":  "ml_forecast_embauches",
        "source_colonne":"embauches_prevues",
        "unite":         "embauches",
        "type_indicateur":"Prévision ML",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Prévision RH",
        "responsable":   "Data Scientist SIRH",
        "proprietaire_donnee": "Direction BI",
        "statut":        "Actif",
        "version":       "1.0",
    },
    {
        "code":          "ML_INTERVALLE_CONFIANCE_BAS",
        "nom":           "Intervalle de Confiance Bas (Embauches)",
        "categorie":     "Planification RH",
        "sous_categorie":"Prévision",
        "description":   "Borne inférieure de l'intervalle de confiance à 80% pour les prévisions d'embauches Prophet.",
        "formule":       "Prophet.predict()['yhat_lower'].clip(min=0)",
        "source_table":  "ml_forecast_embauches",
        "source_colonne":"intervalle_bas",
        "unite":         "embauches",
        "type_indicateur":"Prévision ML",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Prévision RH",
        "responsable":   "Data Scientist SIRH",
        "proprietaire_donnee": "Direction BI",
        "statut":        "Actif",
        "version":       "1.0",
    },
    # ── Recrutement ────────────────────────────────────────────────────────
    {
        "code":          "KPI_MATCH_SCORE",
        "nom":           "Score de Matching Recrutement",
        "categorie":     "Recrutement",
        "sous_categorie":"Performance",
        "description":   "Score de correspondance entre un candidat et un poste, calculé par l'algorithme de matching IA (extraction de compétences + score composite). Plage : 0-100.",
        "formule":       "smart_score(cv_skills ∩ required_skills) + bonus_experience + bonus_confidence",
        "source_table":  "fait_recrutement",
        "source_colonne":"match_score",
        "unite":         "score (0-100)",
        "type_indicateur":"Score IA",
        "frequence_maj": "Temps réel (à chaque candidature)",
        "dashboard":     "Analyse du Recrutement",
        "responsable":   "RH Recrutement",
        "proprietaire_donnee": "Service Recrutement",
        "statut":        "Actif",
        "version":       "1.0",
    },
    {
        "code":          "KPI_TAUX_ACCEPTATION",
        "nom":           "Taux d'Acceptation des Candidatures",
        "categorie":     "Recrutement",
        "sous_categorie":"Efficacité",
        "description":   "Proportion de candidatures acceptées sur le total des candidatures reçues par département et par période.",
        "formule":       "COUNT(statut_normalise='ACCEPTED') * 100.0 / COUNT(*)",
        "source_table":  "fait_recrutement",
        "source_colonne":"statut_normalise",
        "unite":         "%",
        "type_indicateur":"Taux",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Analyse du Recrutement",
        "responsable":   "RH Recrutement",
        "proprietaire_donnee": "Service Recrutement",
        "statut":        "Actif",
        "version":       "1.0",
    },
    # ── Rétention ──────────────────────────────────────────────────────────
    {
        "code":          "KPI_SCORE_RETENTION",
        "nom":           "Score de Rétention",
        "categorie":     "Rétention",
        "sous_categorie":"Analyse",
        "description":   "Score de probabilité de rétention d'un employé (inverse du risque turnover), ajusté par son statut High Potential et son ancienneté.",
        "formule":       "(100 - score_risque) + bonus_HP(0/5/10) + bonus_anciennete(0/4/8)",
        "source_table":  "ml_retention_analysis",
        "source_colonne":"score_retention",
        "unite":         "score (0-118 normalisé 0-100)",
        "type_indicateur":"Score composite",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Analyse des Risques RH",
        "responsable":   "DRH",
        "proprietaire_donnee": "Service RH",
        "statut":        "Actif",
        "version":       "1.0",
    },
    {
        "code":          "KPI_PRIORITE_RH",
        "nom":           "Priorité d'Action RH",
        "categorie":     "Rétention",
        "sous_categorie":"Plan d'action",
        "description":   "Niveau de priorité d'action RH sur un employé, croisement risque turnover × profil High Potential. 5 niveaux : URGENT Talent clé à risque, Surveillance talent clé, ACTION REQUISE, Surveillance, Stable.",
        "formule":       "f(niveau_risque, categorie_HP) → 5 niveaux de priorité",
        "source_table":  "ml_retention_analysis",
        "source_colonne":"priorite_rh",
        "unite":         "niveau",
        "type_indicateur":"Classification",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Gestion des Talents",
        "responsable":   "DRH",
        "proprietaire_donnee": "Service RH",
        "statut":        "Actif",
        "version":       "1.0",
    },
    # ── KPIs RH Globaux ────────────────────────────────────────────────────
    {
        "code":          "KPI_TAUX_MOBILITE",
        "nom":           "Taux de Mobilité Interne",
        "categorie":     "Mobilité",
        "sous_categorie":"KPI Opérationnel",
        "description":   "Proportion d'employés ayant changé de département ou de poste sur la période analysée, par rapport à l'effectif moyen.",
        "formule":       "nb_mobilites * 100.0 / effectif_moyen",
        "source_table":  "kpi_rh",
        "source_colonne":"taux_mobilite_pct",
        "unite":         "%",
        "type_indicateur":"Taux",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Vue Générale RH",
        "responsable":   "DRH",
        "proprietaire_donnee": "Service RH",
        "statut":        "Actif",
        "version":       "1.0",
    },
    {
        "code":          "KPI_ANCIENNETE_MOY",
        "nom":           "Ancienneté Moyenne",
        "categorie":     "Effectifs",
        "sous_categorie":"Profil",
        "description":   "Ancienneté moyenne des employés actifs en mois, calculée depuis la date d'embauche jusqu'à la date du snapshot.",
        "formule":       "AVG(TIMESTAMPDIFF(MONTH, date_embauche, snapshot_date)) WHERE is_parti=0",
        "source_table":  "dim_employe",
        "source_colonne":"anciennete_mois",
        "unite":         "mois",
        "type_indicateur":"Moyenne",
        "frequence_maj": "Quotidienne",
        "dashboard":     "Vue Générale RH",
        "responsable":   "DRH",
        "proprietaire_donnee": "Service RH",
        "statut":        "Actif",
        "version":       "1.0",
    },
]

# =============================================================================
# SOURCES DE DONNÉES
# =============================================================================

DATA_SOURCES = [
    {
        "code":         "SRC_EMPLOYEE",
        "nom":          "Base Opérationnelle Employés",
        "base_donnees": "sirh_employee",
        "tables":       "employees, departments, positions, skills",
        "type":         "MySQL 8.0",
        "proprietaire": "Service Informatique",
        "frequence_maj":"Temps réel (OLTP)",
        "description":  "Base de données principale de gestion des employés, alimentée par l'API Spring Boot (Employee Service port 8082)",
    },
    {
        "code":         "SRC_RECRUITMENT",
        "nom":          "Base Opérationnelle Recrutement",
        "base_donnees": "sirh_recruitment",
        "tables":       "job_offers, applications, application_skills",
        "type":         "MySQL 8.0",
        "proprietaire": "Service Informatique",
        "frequence_maj":"Temps réel (OLTP)",
        "description":  "Base de données de recrutement interne, alimentée par le Recruitment Service (port 8083)",
    },
    {
        "code":         "SRC_STAGING",
        "nom":          "Zone de Staging ETL",
        "base_donnees": "sirh_staging",
        "tables":       "stg_employees, stg_departments, stg_positions, stg_job_offers, stg_applications, stg_skills",
        "type":         "MySQL 8.0",
        "proprietaire": "Direction BI",
        "frequence_maj":"Quotidienne (02h00)",
        "description":  "Zone tampon ETL. Données extraites depuis les bases opérationnelles avec horodatage extracted_at. Script : extract/extract_staging.py",
    },
    {
        "code":         "SRC_DWH",
        "nom":          "Data Warehouse SIRH",
        "base_donnees": "sirh_dwh",
        "tables":       "dim_employe, dim_departement, dim_poste, dim_competence, dim_offre, dim_temps, fait_recrutement, fait_effectifs, fait_mobilite, fait_competences, kpi_rh + tables ML",
        "type":         "MySQL 8.0 (schéma en étoile)",
        "proprietaire": "Direction BI",
        "frequence_maj":"Quotidienne (dbt run 02h05)",
        "description":  "Data Warehouse central — schéma en étoile avec 6 dimensions, 4 tables de faits, KPIs agrégés et 6 tables ML. Toutes les visualisations Superset pointent ici.",
    },
]

# =============================================================================
# Écriture en base
# =============================================================================

print("\n[1] Création/remplacement de bi_metrics_catalog...")

with engine.begin() as conn:
    conn.execute(sa.text("DROP TABLE IF EXISTS bi_metrics_catalog"))
    conn.execute(sa.text("""
        CREATE TABLE bi_metrics_catalog (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            code             VARCHAR(60)  NOT NULL UNIQUE,
            nom              VARCHAR(150) NOT NULL,
            categorie        VARCHAR(60),
            sous_categorie   VARCHAR(60),
            description      TEXT,
            formule          VARCHAR(500),
            source_table     VARCHAR(100),
            source_colonne   VARCHAR(100),
            unite            VARCHAR(50),
            type_indicateur  VARCHAR(50),
            frequence_maj    VARCHAR(100),
            dashboard        VARCHAR(150),
            responsable      VARCHAR(100),
            proprietaire_donnee VARCHAR(100),
            statut           VARCHAR(20) DEFAULT 'Actif',
            version          VARCHAR(10),
            created_at       DATETIME
        )
    """))

df_metrics = pd.DataFrame(METRICS)
df_metrics['created_at'] = NOW

with engine.begin() as conn:
    for _, row in df_metrics.iterrows():
        conn.execute(
            sa.text("""
                INSERT INTO bi_metrics_catalog
                    (code, nom, categorie, sous_categorie, description, formule,
                     source_table, source_colonne, unite, type_indicateur,
                     frequence_maj, dashboard, responsable, proprietaire_donnee,
                     statut, version, created_at)
                VALUES
                    (:code, :nom, :categorie, :sous_categorie, :description, :formule,
                     :source_table, :source_colonne, :unite, :type_indicateur,
                     :frequence_maj, :dashboard, :responsable, :proprietaire_donnee,
                     :statut, :version, :created_at)
            """),
            row.to_dict()
        )

print(f"  ✓ {len(METRICS)} métriques insérées dans bi_metrics_catalog")

print("\n[2] Création/remplacement de bi_data_sources...")

with engine.begin() as conn:
    conn.execute(sa.text("DROP TABLE IF EXISTS bi_data_sources"))
    conn.execute(sa.text("""
        CREATE TABLE bi_data_sources (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            code           VARCHAR(30) NOT NULL UNIQUE,
            nom            VARCHAR(150),
            base_donnees   VARCHAR(100),
            tables         TEXT,
            type           VARCHAR(50),
            proprietaire   VARCHAR(100),
            frequence_maj  VARCHAR(100),
            description    TEXT,
            created_at     DATETIME
        )
    """))

df_sources = pd.DataFrame(DATA_SOURCES)
df_sources['created_at'] = NOW

with engine.begin() as conn:
    for _, row in df_sources.iterrows():
        conn.execute(
            sa.text("""
                INSERT INTO bi_data_sources
                    (code, nom, base_donnees, tables, type, proprietaire, frequence_maj, description, created_at)
                VALUES
                    (:code, :nom, :base_donnees, :tables, :type, :proprietaire, :frequence_maj, :description, :created_at)
            """),
            row.to_dict()
        )

print(f"  ✓ {len(DATA_SOURCES)} sources insérées dans bi_data_sources")

# =============================================================================
# Résumé
# =============================================================================

cats = df_metrics['categorie'].value_counts()

print(f"""
{'=' * 70}
  RÉSUMÉ — Catalogue des Métriques
{'=' * 70}

  Tables créées dans sirh_dwh :
    bi_metrics_catalog  — {len(METRICS)} indicateurs définis
    bi_data_sources     — {len(DATA_SOURCES)} sources de données documentées

  Métriques par catégorie :""")

for cat, cnt in cats.items():
    print(f"    {cat:<30} {cnt} indicateur(s)")

print(f"""
  Ajouter dans Superset :
    1. Data > Datasets > + Dataset
    2. Database : sirh_dwh
    3. Tables   : bi_metrics_catalog, bi_data_sources
    4. Créer un dashboard "Catalogue BI" avec :
       - Table chart : bi_metrics_catalog (colonnes: code, nom, categorie, formule, source_table, dashboard)
       - Pie chart   : répartition par categorie
       - Big Number  : COUNT total de métriques

  Ce dashboard démontre la maturité de gouvernance de la solution BI.
{'=' * 70}
""")
