# Documentation Technique — Infrastructure BI SIRH

**Projet** : Système d'Information des Ressources Humaines (SIRH)  
**Section** : Partie II — Business Intelligence  
**Version** : 1.0  
**Date** : Juin 2026  
**Auteur** : Équipe BI SIRH  

---

## Table des Matières

1. [Architecture Globale](#1-architecture-globale)
2. [Sources de Données](#2-sources-de-données)
3. [Pipeline ETL](#3-pipeline-etl)
4. [Modélisation Dimensionnelle](#4-modélisation-dimensionnelle)
5. [Couche ML & Analyses Avancées](#5-couche-ml--analyses-avancées)
6. [Dashboards Superset](#6-dashboards-superset)
7. [Administration & Gouvernance](#7-administration--gouvernance)
8. [Catalogue des Métriques](#8-catalogue-des-métriques)
9. [Exploitation & Maintenance](#9-exploitation--maintenance)

---

## 1. Architecture Globale

### Schéma de la Solution

```
┌─────────────────────────────────────────────────────────────────────┐
│  SOURCES OPÉRATIONNELLES (OLTP)                                     │
│                                                                      │
│   sirh_employee (MySQL 8)     sirh_recruitment (MySQL 8)            │
│   ├── employees               ├── job_offers                        │
│   ├── departments             ├── applications                      │
│   ├── positions               └── application_skills                │
│   └── skills                                                         │
└───────────────────────┬─────────────────────────────────────────────┘
                        │  extract_staging.py (Python / Pandas)
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ZONE DE STAGING (sirh_staging)                                     │
│   stg_employees / stg_departments / stg_positions                   │
│   stg_job_offers / stg_applications / stg_skills                    │
│   Champ : extracted_at (horodatage extraction)                      │
└───────────────────────┬─────────────────────────────────────────────┘
                        │  dbt (snapshot + run + test)
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DATA WAREHOUSE (sirh_dwh) — Schéma en étoile                      │
│                                                                      │
│  Dimensions :                    Tables de faits :                  │
│  ├── dim_temps                   ├── fait_recrutement               │
│  ├── dim_employe                 ├── fait_effectifs                  │
│  ├── dim_departement             ├── fait_mobilite                  │
│  ├── dim_poste                   └── fait_competences               │
│  ├── dim_competence                                                  │
│  └── dim_offre                   KPIs & Reporting :                 │
│                                  ├── kpi_rh                         │
│  SCD Type 2 :                    ├── rh_turnover_departement        │
│  └── snap_employe_historique     ├── rh_contrats_annuel             │
│                                  ├── rh_kpi_annuel                  │
│                                  └── vw_effectifs_mensuels          │
└───────────────────────┬─────────────────────────────────────────────┘
                        │  Python ML (scikit-learn, Prophet, SHAP)
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  COUCHE ML (tables ml_* dans sirh_dwh)                              │
│   ├── ml_turnover_risk       (Random Forest — AUC=0.757)            │
│   ├── ml_employee_segments   (K-Means — k optimal silhouette)       │
│   ├── ml_high_potentials     (Score composite 0-100)                │
│   ├── ml_forecast_embauches  (Prophet — 6 mois)                     │
│   ├── ml_correlations        (Pearson r + p-value)                  │
│   └── ml_retention_analysis  (Score rétention + priorité RH)        │
└───────────────────────┬─────────────────────────────────────────────┘
                        │  Apache Superset 3.1.3
                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│  VISUALISATION (http://localhost:8088)                              │
│   Dashboards RBAC + Row-Level Security                              │
│   ├── Vue Générale RH                                               │
│   ├── Analyse du Recrutement                                        │
│   ├── Analyse des Risques RH                                        │
│   ├── Segmentation & Talents                                        │
│   ├── Prévision RH                                                  │
│   └── Catalogue des Métriques BI                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Stack Technique

| Composant | Technologie | Version | Port |
|-----------|-------------|---------|------|
| Orchestration | Apache Airflow | 2.9.1 | 8085 |
| Transformation | dbt-mysql | 1.7.0 | — |
| Visualisation | Apache Superset | 3.1.3 | 8088 |
| ML Tracking | MLflow | — | 5000 |
| Base DWH | MySQL | 8.0 | 3306 |
| Containerisation | Docker Compose | — | — |

---

## 2. Sources de Données

### 2.1 Base sirh_employee

| Table | Colonnes clés | Volume estimé | Rôle |
|-------|--------------|---------------|------|
| `employees` | id, email, department_id, hire_date, contract_type | ~1 150 | Employés actifs et partis |
| `departments` | id, name | ~9 | Référentiel départements |
| `positions` | id, title, department_id | ~20 | Postes de l'entreprise |
| `skills` | id, name | ~50 | Référentiel compétences |

### 2.2 Base sirh_recruitment

| Table | Colonnes clés | Volume estimé | Rôle |
|-------|--------------|---------------|------|
| `job_offers` | id, title, department_id, status, match_score | ~30 | Offres de poste |
| `applications` | id, job_offer_id, employee_id, status, score | ~150 | Candidatures |
| `application_skills` | application_id, skill_id | ~400 | Compétences par candidature |

### 2.3 Règles de Qualité des Sources

- **Fraîcheur** : dbt source freshness vérifie que `extracted_at` < 25h (WARN) / 48h (ERROR)
- **Intégrité** : toutes les clés étrangères sont vérifiées dans le staging
- **Cohérence contrats** : `business_rules.py` normalise STAGE>6m, CDD>30m → CDI automatiquement

---

## 3. Pipeline ETL

### 3.1 DAG Airflow — sirh_bi_pipeline

**Planning** : `0 2 * * *` (02h00 Europe/Paris, tous les jours)  
**DAG ID** : `sirh_bi_pipeline`  
**Accès** : http://localhost:8085

```
extract_staging
    └─► dbt_source_freshness
            └─► dbt_snapshot
                    └─► dbt_run
                            └─► dbt_test
                                    └─► data_quality_report
                                                └─► ml_turnover
                                                        └─► ml_segmentation
                                                                └─► ml_high_potentials
                                                                        └─► ml_forecast
                                                                                └─► ml_correlations
                                                                                        └─► ml_retention
                                                                                                └─► pipeline_summary
```

### 3.2 Description des Tâches

| Tâche | Script | Durée | Sortie |
|-------|--------|-------|--------|
| `extract_staging` | `extract/extract_staging.py` | ~10s | sirh_staging |
| `dbt_source_freshness` | dbt CLI | ~3s | Rapport fraîcheur |
| `dbt_snapshot` | dbt CLI | ~2s | snap_employe_historique (SCD2) |
| `dbt_run` | dbt CLI | ~5s | 26 modèles sirh_dwh |
| `dbt_test` | dbt CLI | ~10s | 92 tests qualité |
| `data_quality_report` | `quality/data_quality_report.py` | ~10s | quality_report.html |
| `ml_turnover` | `ml/turnover_model.py` | ~30s | ml_turnover_risk |
| `ml_segmentation` | `ml/segmentation_model.py` | ~10s | ml_employee_segments |
| `ml_high_potentials` | `ml/high_potentials.py` | ~5s | ml_high_potentials |
| `ml_forecast` | `ml/forecast_model.py` | ~20s | ml_forecast_embauches |
| `ml_correlations` | `ml/correlations.py` | ~5s | ml_correlations |
| `ml_retention` | `ml/retention_analysis.py` | ~5s | ml_retention_analysis |
| `pipeline_summary` | Python inline | ~2s | bi_pipeline_log |

**Durée totale estimée** : ~2 minutes

### 3.3 Gestion des Erreurs

- **Retry** : chaque tâche est retentée 1 fois après 5 minutes
- **Monitoring** : chaque tâche écrit dans `sirh_dwh.bi_pipeline_log` (succès ou échec)
- **Alertes email** : configurer `AIRFLOW__SMTP__*` variables d'environnement (voir DAG)
- **dbt test** : en cas d'échec, les tâches ML en aval sont bloquées automatiquement

---

## 4. Modélisation Dimensionnelle

### 4.1 Schéma en Étoile

```
                        dim_temps
                           │
           dim_competence  │  dim_departement
                  │        │        │
dim_offre ─── fait_recrutement ─── dim_poste
                  │        │
           fait_effectifs  │  fait_mobilite
                           │
                      dim_employe ── fait_competences
```

### 4.2 Tables de Faits

#### fait_recrutement
Granularité : 1 ligne = 1 candidature à 1 offre de poste

| Colonne | Type | Description |
|---------|------|-------------|
| `id_recrutement` | VARCHAR | Clé surrogate |
| `id_offre_fk` | VARCHAR | → dim_offre |
| `id_employe_fk` | VARCHAR | → dim_employe (candidat) |
| `match_score` | DECIMAL | Score IA matching (0-100) |
| `statut_normalise` | VARCHAR | PENDING / ACCEPTED / REJECTED |
| `departement_normalise` | VARCHAR | Département de l'offre |

#### fait_effectifs
Granularité : 1 ligne = 1 employé × 1 mois × 1 département

#### fait_mobilite
Granularité : 1 ligne = 1 mois × 1 département (embauches + départs)

#### fait_competences
Granularité : 1 ligne = 1 candidature × 1 compétence

### 4.3 SCD Type 2 — snap_employe_historique

Capture les changements de département, poste ou type de contrat :

| Colonne | Description |
|---------|-------------|
| `dbt_scd_id` | Clé unique de la version |
| `dbt_valid_from` | Date d'entrée en vigueur |
| `dbt_valid_to` | Date de fin (NULL = version active) |
| `dbt_is_deleted` | True si l'employé a été supprimé |

---

## 5. Couche ML & Analyses Avancées

### 5.1 ML-1 : Prédiction de Turnover (Random Forest)

**Script** : `ml/turnover_model.py`  
**Algorithme** : Random Forest (300 arbres) + CalibratedClassifierCV (isotonic)  
**Performance** : AUC-ROC = 0.757 (seuil minimum : 0.70 ✓)

| Paramètre | Valeur |
|-----------|--------|
| n_estimators | 300 |
| max_depth | 8 |
| class_weight | balanced |
| Validation | 5-fold CV |
| Calibration | Isotonic regression |

**Variables explicatives** :
1. Ancienneté (mois)
2. Type de contrat (encodé)
3. Score de candidature
4. Département (encodé)
5. Profil de recrutement

**Niveaux de risque** :
- Critique : score > 75
- Élevé : 50 < score ≤ 75
- Modéré : 25 < score ≤ 50
- Faible : score ≤ 25

### 5.2 ML-2 : Segmentation Employés (K-Means)

**Script** : `ml/segmentation_model.py`  
**Algorithme** : K-Means avec sélection du k optimal par score de silhouette  
**Features** : ancienneté, précarité du contrat, profil recrutement (StandardScaler)

### 5.3 ML-3 : High Potentials (Score Composite)

**Script** : `ml/high_potentials.py`  
**Score** : 0-100 = segment(40) + recrutement(30) + ancienneté(20) + CDI(10)

| Seuil | Catégorie |
|-------|-----------|
| P97+ | High Potential |
| P85+ | Potentiel Confirmé |
| P50+ | À Surveiller |
| <P50 | Standard |

### 5.4 ML-4 : Prévision Embauches (Prophet)

**Script** : `ml/forecast_model.py`  
**Modèle** : Facebook Prophet, yearly_seasonality=True, interval_width=80%  
**Horizon** : 6 mois futurs  
**Source** : fait_mobilite (historique mensuel d'embauches)

### 5.5 ML-5 : Corrélations RH (Pearson)

**Script** : `ml/correlations.py`  
**Niveaux** : Individuel (n~1150, seuil |r|>0.25 + p<0.05) et Département (n=9, seuil |r|>0.60)

### 5.6 ML-6 : Analyse de Rétention

**Script** : `ml/retention_analysis.py`  
**Score** : (100 - score_risque) + bonus HP (0/5/10) + bonus ancienneté (0/4/8)

| Priorité | Condition |
|----------|-----------|
| URGENT — Talent clé à risque | HP + risque Critique/Élevé |
| Surveillance talent clé | HP + risque Modéré |
| ACTION REQUISE | non-HP + risque Critique |
| Surveillance | non-HP + risque Élevé |
| Stable | risque Faible/Modéré |

---

## 6. Dashboards Superset

**Accès** : http://localhost:8088 (admin / admin)

| Dashboard | Description | Rôles autorisés |
|-----------|-------------|-----------------|
| Vue Générale RH | Effectifs, turnover, contrats, ancienneté | HR_Admin, Manager, Employee |
| Analyse du Recrutement | Offres, candidatures, match scores, délais | HR_Admin, Manager |
| Analyse des Risques RH | Scores de risque ML, carte thermique, rétention | HR_Admin, Manager (RLS) |
| Segmentation & Talents | K-Means, high potentials, priorités RH | HR_Admin, Manager (RLS) |
| Prévision RH | Prophet 6 mois, intervalles de confiance | HR_Admin |
| Santé du Pipeline | bi_pipeline_log, durées, statuts Airflow | HR_Admin |
| Catalogue des Métriques BI | bi_metrics_catalog, définitions KPIs | Tous |

### Connexion Base de Données

```
Type      : MySQL
Host      : host.docker.internal (dans Docker) / localhost (hors Docker)
Port      : 3306
Database  : sirh_dwh
Username  : root
Password  : root
SQLAlchemy URI : mysql+pymysql://root:root@host.docker.internal:3306/sirh_dwh
```

---

## 7. Administration & Gouvernance

### 7.1 Rôles & Permissions Superset (RBAC)

| Rôle | Template | Permissions |
|------|----------|-------------|
| `HR_Admin` | Alpha | Créer/éditer dashboards + voir toutes les données |
| `Manager` | Gamma | Lecture seule + données filtrées par département (RLS) |
| `Employee` | Gamma | Lecture seule + dashboards partagés uniquement |

**Script de configuration** : `governance/setup_rbac.py`

```bash
python governance/setup_rbac.py
```

**Comptes de test créés** :

| Compte | Mot de passe | Rôle | Département visible |
|--------|-------------|------|---------------------|
| `hr.admin` | HrAdmin2026! | HR_Admin | Tous |
| `manager.info` | Manager2026! | Manager | Informatique uniquement |
| `employee.test` | Employee2026! | Employee | Dashboards partagés |

### 7.2 Row-Level Security (RLS)

**Script de configuration** : `governance/setup_rls.py`

**Filtre actif** :
- Rôle : `Manager`
- Clause SQL : `departement = 'Informatique'`
- Tables filtrées : `ml_turnover_risk`, `kpi_rh`, `rh_turnover_departement`, `ml_employee_segments`, `ml_high_potentials`, `ml_retention_analysis`, `dim_employe`, `fait_effectifs`

**Démonstration** :
1. Connexion `admin` → voit tous les départements
2. Connexion `manager.info` → voit uniquement Informatique

### 7.3 Monitoring du Pipeline

**Table** : `sirh_dwh.bi_pipeline_log`

| Colonne | Description |
|---------|-------------|
| `dag_id` | Identifiant du DAG |
| `run_id` | Identifiant du run |
| `task_id` | Nom de la tâche |
| `status` | success / failed |
| `started_at` | Heure de début |
| `ended_at` | Heure de fin |
| `duration_seconds` | Durée d'exécution |
| `error_message` | Message d'erreur (si echec) |

**Dashboard Superset recommandé** :
- Big Number : nb runs dernière semaine
- Bar chart : durée par tâche (moyenne)
- Table : derniers 20 runs avec statut

### 7.4 Planification des Rafraîchissements

| Pipeline | Fréquence | Heure | Exécuté par |
|----------|-----------|-------|-------------|
| ETL complet (extract + dbt + ML) | Quotidienne | 02h00 | Airflow DAG |
| dbt source freshness | Quotidienne | 02h01 | Airflow (dans DAG) |
| dbt snapshot (SCD2) | Quotidienne | 02h03 | Airflow (dans DAG) |
| ML models retraining | Quotidienne | 02h10 | Airflow (dans DAG) |

**Modification du planning** :
```python
# Dans airflow/dags/sirh_pipeline.py
schedule_interval='0 2 * * *'   # format cron
# 0 2 * * 1    = chaque lundi à 02h00 (hebdomadaire)
# 0 2 1 * *    = 1er de chaque mois à 02h00 (mensuel)
```

---

## 8. Catalogue des Métriques

**Script** : `governance/metrics_catalog.py`  
**Table** : `sirh_dwh.bi_metrics_catalog`

### Métriques par Catégorie

#### Effectifs
| Code | Nom | Formule | Source |
|------|-----|---------|--------|
| KPI_EFFECTIF_TOTAL | Effectif Total | COUNT(id) WHERE is_parti=0 | dim_employe |
| KPI_ANCIENNETE_MOY | Ancienneté Moyenne | AVG(anciennete_mois) WHERE is_parti=0 | dim_employe |

#### Rétention & Turnover
| Code | Nom | Formule | Source |
|------|-----|---------|--------|
| KPI_TAUX_TURNOVER | Taux de Turnover | nb_departs / total_employes × 100 | rh_turnover_departement |
| KPI_NB_DEPARTS | Nombre de Départs | SUM(date_depart IS NOT NULL) | rh_turnover_departement |
| KPI_SCORE_RETENTION | Score de Rétention | (100 - score_risque) + bonus HP + bonus ancienneté | ml_retention_analysis |
| KPI_PRIORITE_RH | Priorité d'Action RH | f(niveau_risque, categorie_HP) | ml_retention_analysis |

#### Analyse Prédictive ML
| Code | Nom | Modèle | Source |
|------|-----|--------|--------|
| ML_SCORE_RISQUE_TURNOVER | Score Risque Turnover | Random Forest (AUC=0.757) | ml_turnover_risk |
| ML_NIVEAU_RISQUE | Niveau de Risque | CASE sur score_risque | ml_turnover_risk |
| ML_SEGMENT_EMPLOYE | Segment K-Means | K-Means (k optimal silhouette) | ml_employee_segments |
| KPI_SCORE_POTENTIEL | Score Potentiel | Composite 4 critères (max 100) | ml_high_potentials |
| ML_EMBAUCHES_PREVUES | Prévision Embauches | Prophet 6 mois IC 80% | ml_forecast_embauches |

#### Recrutement
| Code | Nom | Formule | Source |
|------|-----|---------|--------|
| KPI_MATCH_SCORE | Score Matching | smart_score(compétences IA) | fait_recrutement |
| KPI_TAUX_ACCEPTATION | Taux Acceptation | ACCEPTED / total × 100 | fait_recrutement |

#### Mobilité
| Code | Nom | Formule | Source |
|------|-----|---------|--------|
| KPI_TAUX_MOBILITE | Taux Mobilité Interne | nb_mobilites / effectif_moy × 100 | kpi_rh |

---

## 9. Exploitation & Maintenance

### 9.1 Démarrage des Services

```bash
# 1. Base de données MySQL (doit tourner)
# (Supposé déjà démarré avec les services Spring Boot)

# 2. Apache Airflow
cd sirh-bi
docker compose -f airflow/docker-compose.yml up -d
# Attendre 60 secondes → http://localhost:8085

# 3. Apache Superset
docker compose -f docker-compose.superset.yml up -d
# Attendre 2-3 minutes → http://localhost:8088

# 4. MLflow (optionnel)
cd sirh-bi
mlflow ui --port 5000 --backend-store-uri file:///$(pwd)/mlruns
# → http://localhost:5000
```

### 9.2 Configuration Initiale Gouvernance

```bash
# Installer requests pour les scripts API Superset
pip install requests

# 1. Créer les rôles et utilisateurs
python governance/setup_rbac.py

# 2. Configurer le Row-Level Security
python governance/setup_rls.py

# 3. Alimenter le catalogue des métriques
python governance/metrics_catalog.py
```

### 9.3 Résolution des Problèmes Courants

| Symptôme | Cause probable | Solution |
|----------|---------------|----------|
| Airflow `dbt_test` échoue | Test dbt NOT NULL échoue | Voir logs → corriger les données source |
| Superset "Database connection failed" | MySQL inaccessible depuis Docker | Utiliser `host.docker.internal:3306` (pas `localhost`) |
| ML `prophet` ImportError | cmdstanpy version incompatible | `pip install cmdstanpy==1.2.4` (1.3.0 incompatible) |
| RLS ne filtre pas | Datasets non importés dans Superset | Data > Datasets > importer tables sirh_dwh |
| `bi_pipeline_log` vide | Connexion Docker → MySQL | Vérifier `host.docker.internal` résolvable |

### 9.4 Contacts & Responsabilités

| Composant | Responsable | Priorité en cas d'incident |
|-----------|-------------|---------------------------|
| Pipeline Airflow | Direction BI | P1 — impact toutes données |
| Dashboards Superset | Direction BI | P2 — impact visualisation |
| Modèles ML | Data Scientist | P3 — impact analyses avancées |
| Sources MySQL | Service Informatique | P1 — impact pipeline complet |

---

*Documentation générée automatiquement — Projet de Fin d'Études SIRH BI*  
*Pour toute question : consulter le catalogue des métriques dans Superset (Dashboard "Catalogue BI")*
