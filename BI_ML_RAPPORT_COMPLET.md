# Rapport Partie II — Infrastructure Business Intelligence & Machine Learning
## Projet de Fin d'Études — SIRH Microservices

> **Périmètre** : Ce rapport couvre exclusivement la **Partie II** du projet PFE : la mise en place de l'infrastructure décisionnelle complète sur les données de la plateforme SIRH développée en Partie I.
> Chaque section précise l'**objectif**, l'**implémentation réelle dans votre projet**, la **procédure de démonstration** et les **captures d'écran à réaliser**.

---

## Table des matières

1. [Architecture globale de l'infrastructure BI](#1-architecture-globale)
2. [Data Warehouse — Modélisation dimensionnelle](#2-data-warehouse)
3. [ETL — Extraction et chargement (extract_staging.py)](#3-etl--extraction)
4. [dbt — Transformation et qualité des données](#4-dbt--transformation)
5. [Apache Airflow — Orchestration du pipeline](#5-apache-airflow--orchestration)
6. [Apache Superset — Visualisation et dashboards](#6-apache-superset--visualisation)
7. [Machine Learning — Six modèles analytiques](#7-machine-learning--six-modèles)
8. [MLflow — Tracking des expériences ML](#8-mlflow--tracking)
9. [Qualité et gouvernance des données](#9-qualité-et-gouvernance)
10. [Guide de démonstration — Captures d'écran](#10-guide-de-démonstration)

---

## 1. Architecture globale

### 1.1 Vue d'ensemble

L'infrastructure BI du projet SIRH repose sur une **chaîne de traitement de données en cinq couches** qui transforme les données opérationnelles de l'application en insights décisionnels exploitables.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     SOURCES OPÉRATIONNELLES (MySQL)                      │
│  sirh_employee  (:3306)          sirh_recruitment  (:3306)              │
│  employees, departments,         job_offers, applications,              │
│  positions, employee_skills      skills                                  │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ extract_staging.py (Python / SQLAlchemy)
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     COUCHE STAGING  (sirh_staging)                       │
│  stg_employees  stg_departments  stg_positions                           │
│  stg_job_offers  stg_applications  stg_skills                            │
│  Données brutes, aucune transformation, colonne extracted_at             │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ dbt (SQL compilé + Jinja)
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   DATA WAREHOUSE  (sirh_dwh)                             │
│  DIMENSIONS : dim_employe, dim_departement, dim_poste,                  │
│               dim_temps, dim_competence, dim_offre                       │
│  FAITS      : fait_recrutement, fait_effectifs,                          │
│               fait_mobilite, fait_gap_competences                        │
│  REPORTING  : kpi_rh, vw_effectifs_mensuels                              │
│  SNAPSHOT   : snap_employe_historique (SCD Type 2)                      │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ Scikit-learn / Prophet / SHAP
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    COUCHE ML  (tables ml_* dans sirh_dwh)               │
│  ml_turnover_risk        ml_employee_segments                            │
│  ml_high_potentials      ml_forecast_embauches                           │
│  ml_correlations         ml_retention_analysis                           │
└──────────────────────────┬──────────────────────────────────────────────┘
                           │ Apache Superset (port 8088)
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  COUCHE PRÉSENTATION  (Apache Superset)                  │
│  Dashboard RH Global     Dashboard Recrutement                           │
│  Dashboard Compétences   Dashboard ML & Prédictions                      │
│  Dashboard Géographique  Dashboard Santé du Pipeline                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Rôle de chaque technologie

| Technologie | Rôle dans le projet | Port / URL |
|---|---|---|
| **MySQL** | Base sources (`sirh_employee`, `sirh_recruitment`) + DWH | 3306 |
| **Python / SQLAlchemy** | Scripts ETL et ML | — |
| **dbt** | Transformation SQL, tests qualité, documentation | CLI |
| **Apache Airflow** | Orchestration quotidienne automatique | 8085 |
| **Apache Superset** | Dashboards interactifs pour les RH | 8088 |
| **MLflow** | Tracking et comparaison des expériences ML | 5000 |
| **Docker** | Conteneurs Airflow et Superset | — |

### 1.3 Démarrage de l'infrastructure complète

```bash
# Étape 1 : Démarrer MySQL (service Windows) + Docker Desktop

# Étape 2 : Démarrer Airflow
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi\airflow"
docker compose up -d

# Étape 3 : Démarrer Superset
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi"
docker compose -f docker-compose.superset.yml up -d   # attendre 2-3 min

# Étape 4 : Démarrer MLflow (terminal séparé)
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi"
mlflow ui --port 5000

# Vérification des services
http://localhost:8085   → Airflow   (admin / admin123)
http://localhost:8088   → Superset  (admin / admin)
http://localhost:5000   → MLflow    (sans login)
```

> **Capture d'écran 1** : Les quatre onglets de navigateur ouverts simultanément (Airflow, Superset, MLflow) prouvant que l'infrastructure est opérationnelle.

---

## 2. Data Warehouse — Modélisation dimensionnelle

### 2.1 Objectif

Le **Data Warehouse (DWH)** est le cœur analytique du projet. Contrairement aux bases opérationnelles (normalisées pour les écritures), le DWH est organisé en **schéma en étoile** — optimisé pour les requêtes analytiques et les agrégations. Toutes les questions métier RH ("Quel est le taux de turnover par département ?", "Quels profils candidatent le plus ?") trouvent une réponse directe dans ce modèle.

### 2.2 Schéma en étoile — Vue globale

```
                         ┌─────────────────┐
                         │   dim_temps      │
                         │ date_id (PK)     │
                         │ annee, mois, trim│
                         │ mois_nom, semaine│
                         └────────┬────────┘
                                  │
┌──────────────┐    ┌─────────────▼──────────────┐    ┌──────────────────┐
│ dim_employe  │────│      fait_effectifs         │────│ dim_departement  │
│ employe_id   │    │ date_id (FK) ← dim_temps    │    │ dept_id (PK)     │
│ nom_complet  │    │ employe_id (FK)             │    │ nom_departement  │
│ departement  │    │ dept_id (FK)                │    │ nombre_employes  │
│ poste        │    │ nombre_employes             │    └──────────────────┘
│ contrat      │    │ nouvelles_embauches         │
│ anciennete   │    │ departs                     │    ┌──────────────────┐
│ salaire      │    │ taux_turnover               │────│   dim_poste      │
│ is_parti     │    └─────────────────────────────┘    │ poste_id (PK)    │
│ date_depart  │                                        │ titre_poste      │
└──────────────┘    ┌─────────────────────────────┐    └──────────────────┘
                    │      fait_recrutement        │
┌──────────────┐────│ candidature_id (PK)         │────┌──────────────────┐
│  dim_offre   │    │ offre_id (FK)               │    │ dim_competence   │
│ offre_id (PK)│    │ candidat_email              │    │ comp_id (PK)     │
│ titre_offre  │    │ statut_candidature          │    │ nom_competence   │
│ departement  │    │ match_score (IA)            │    │ niveau           │
│ statut_offre │    │ date_candidature (FK)       │    └──────────────────┘
│ nb_postes    │    └─────────────────────────────┘
└──────────────┘
                    ┌─────────────────────────────┐
                    │      fait_mobilite          │
                    │ mobilite_id (PK)            │
                    │ employe_id (FK)             │
                    │ dept_source_id (FK)         │
                    │ dept_cible_id (FK)          │
                    │ date_mobilite (FK)          │
                    └─────────────────────────────┘
```

### 2.3 Tables de faits — Détail

#### `fait_recrutement`
**Ce qu'elle mesure** : Chaque candidature soumise à une offre d'emploi.

| Colonne | Type | Description |
|---|---|---|
| `candidature_id` | VARCHAR | Clé primaire |
| `offre_id` | VARCHAR | FK → dim_offre |
| `date_candidature` | DATE | FK → dim_temps |
| `statut_candidature` | VARCHAR | PENDING / ACCEPTED / REJECTED |
| `match_score` | DECIMAL | Score IA de matching (0-100) |
| `a_cv` | TINYINT | 1 si CV joint |
| `a_lettre` | TINYINT | 1 si lettre de motivation jointe |

#### `fait_effectifs`
**Ce qu'elle mesure** : Photographie mensuelle des effectifs par département.

| Colonne | Type | Description |
|---|---|---|
| `snapshot_date` | DATE | FK → dim_temps |
| `dept_id` | VARCHAR | FK → dim_departement |
| `nombre_employes` | INT | Effectif actif ce mois |
| `nouvelles_embauches` | INT | Embauches dans le mois |
| `taux_turnover` | DECIMAL | % départs / effectif moyen |

#### `fait_mobilite`
**Ce qu'elle mesure** : Mouvements internes d'un département à un autre.

#### `fait_gap_competences`
**Ce qu'elle mesure** : Écart entre compétences requises (offres) et disponibles (employés).

### 2.4 Snapshot SCD Type 2 — `snap_employe_historique`

Le **Slowly Changing Dimension Type 2** conserve l'**historique complet des changements** sur les employés. Si un employé change de département ou de salaire, l'ancienne valeur est conservée avec sa date de fin de validité.

```sql
-- Structure du snapshot dbt
snap_employe_historique :
  employe_id
  nom_complet, departement, poste, contrat, salaire
  dbt_scd_id       -- identifiant unique de la version
  dbt_updated_at   -- date de détection du changement
  dbt_valid_from   -- début de validité
  dbt_valid_to     -- fin de validité (NULL = version courante)
  dbt_is_deleted   -- TRUE si l'employé est parti
```

**Pourquoi c'est important** : Sans SCD Type 2, il serait impossible de répondre à "Quel était le département de cet employé en janvier 2024 ?" car la base opérationnelle écrase la valeur précédente.

### 2.5 Comment tester le Data Warehouse

```sql
-- Se connecter à sirh_dwh (MySQL Workbench ou DBeaver)

-- Vérifier que toutes les tables existent
SHOW TABLES FROM sirh_dwh;

-- Compter les lignes dans chaque table clé
SELECT 'dim_employe'      AS tbl, COUNT(*) AS lignes FROM dim_employe
UNION ALL
SELECT 'dim_departement',                             COUNT(*) FROM dim_departement
UNION ALL
SELECT 'fait_recrutement',                            COUNT(*) FROM fait_recrutement
UNION ALL
SELECT 'fait_effectifs',                              COUNT(*) FROM fait_effectifs
UNION ALL
SELECT 'snap_employe_historique',                     COUNT(*) FROM snap_employe_historique;

-- Requête analytique : taux de turnover par département
SELECT
    d.nom_departement,
    COUNT(CASE WHEN e.is_parti = 1 THEN 1 END) AS departs,
    COUNT(*)                                    AS total,
    ROUND(COUNT(CASE WHEN e.is_parti = 1 THEN 1 END) * 100.0 / COUNT(*), 1) AS taux_turnover_pct
FROM dim_employe e
JOIN dim_departement d ON e.departement = d.nom_departement
GROUP BY d.nom_departement
ORDER BY taux_turnover_pct DESC;

-- Requête analytique : score de matching par offre
SELECT
    o.titre_offre,
    COUNT(r.candidature_id)        AS nb_candidatures,
    ROUND(AVG(r.match_score), 1)   AS score_moyen,
    MAX(r.match_score)             AS meilleur_score
FROM fait_recrutement r
JOIN dim_offre o ON r.offre_id = o.offre_id
GROUP BY o.titre_offre
ORDER BY score_moyen DESC;
```

> **Capture d'écran 2** : MySQL Workbench ou DBeaver montrant `SHOW TABLES FROM sirh_dwh` avec les 18+ tables visibles.
> **Capture d'écran 3** : Résultat de la requête de taux de turnover par département (tableau avec colonnes nom_departement, departs, total, taux_turnover_pct).

---

## 3. ETL — Extraction et chargement

### 3.1 Objectif

L'**ETL (Extract, Transform, Load)** est le processus qui transfère les données depuis les bases opérationnelles de l'application vers la couche de staging du DWH. Dans ce projet, l'extraction est volontairement **simple et sans transformation** : le script copie les données brutes telles quelles. Toute la logique de transformation est déléguée à **dbt** (voir section 4), ce qui respecte le principe ELT moderne (Extract-Load-Transform).

### 3.2 Architecture du script

**Fichier** : `sirh-bi/extract/extract_staging.py`

Le script utilise **SQLAlchemy** pour se connecter simultanément à trois bases MySQL :

```
sirh_employee  ──────┐
                      ├──► extract_staging.py ──► sirh_staging
sirh_recruitment ────┘
```

### 3.3 Tables extraites

| Table source | Base source | Table staging créée | Lignes typiques |
|---|---|---|---|
| `departments` | sirh_employee | `stg_departments` | ~10 |
| `positions` | sirh_employee | `stg_positions` | ~15 |
| `employees` | sirh_employee | `stg_employees` | ~1000 |
| `employee_skills` | sirh_employee | `stg_employee_skills` | ~3000 |
| `job_offers` | sirh_recruitment | `stg_job_offers` | ~50 |
| `applications` | sirh_recruitment | `stg_applications` | ~200 |
| `skills` | sirh_recruitment | `stg_skills` | ~100 |

**Mécanisme** : À chaque extraction, la table staging est **vidée puis rechargée entièrement** (`DELETE` + `INSERT`). Une colonne `extracted_at` (timestamp) est ajoutée automatiquement pour tracer l'origine temporelle de chaque lot.

### 3.4 Configuration de connexion

**Fichier** : `sirh-bi/extract/config.py`

```python
SOURCE_EMPLOYEE    = "mysql+pymysql://root:root@localhost:3306/sirh_employee"
SOURCE_RECRUITMENT = "mysql+pymysql://root:root@localhost:3306/sirh_recruitment"
STAGING            = "mysql+pymysql://root:root@localhost:3306/sirh_staging"
```

### 3.5 Comment exécuter et tester l'ETL

```bash
# Depuis le dossier sirh-bi
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi"

# Exécution manuelle (hors Airflow)
python extract/extract_staging.py
```

**Sortie attendue** :
```
=== EXTRACTION STAGING ===

✓ stg_departments        : 10 lignes
✓ stg_positions          : 15 lignes
✓ stg_employees          : 1000 lignes
✓ stg_employee_skills    : 3200 lignes
✓ stg_job_offers         : 52 lignes
✓ stg_applications       : 215 lignes
✓ stg_skills             : 87 lignes
```

**Vérification SQL** :
```sql
-- Vérifier la fraîcheur des données staging
SELECT
    table_name,
    table_rows        AS lignes_estimees,
    update_time       AS derniere_mise_a_jour
FROM information_schema.tables
WHERE table_schema = 'sirh_staging'
ORDER BY table_name;

-- Vérifier la colonne extracted_at
SELECT MIN(extracted_at), MAX(extracted_at) FROM sirh_staging.stg_employees;
```

> **Capture d'écran 4** : Terminal montrant la sortie de `python extract/extract_staging.py` avec toutes les lignes "✓ stg_*** : N lignes".

---

## 4. dbt — Transformation et qualité des données

### 4.1 Objectif

**dbt (data build tool)** est l'outil qui transforme les données brutes du staging en données propres et structurées dans le Data Warehouse. dbt écrit des requêtes SQL dans des fichiers `.sql` avec du templating Jinja, les compile et les exécute dans le bon ordre. Il intègre également un système de **tests automatiques** pour garantir la qualité des données.

**Philosophie** : "Le data analyst écrit du SELECT, dbt s'occupe du reste."

### 4.2 Structure du projet dbt

**Dossier** : `sirh-bi/dbt_sirh/`

```
dbt_sirh/
├── dbt_project.yml          ← Configuration principale
├── profiles.yml             ← Connexions MySQL (local + docker)
├── models/
│   ├── staging/             ← Vues : nettoyage minimal des données brutes
│   │   ├── sources.yml      ← Déclaration des sources (sirh_staging)
│   │   ├── stg_employees.sql
│   │   ├── stg_departments.sql
│   │   ├── stg_positions.sql
│   │   ├── stg_job_offers.sql
│   │   ├── stg_applications.sql
│   │   └── stg_skills.sql
│   ├── dimensions/          ← Tables : dimensions du schéma en étoile
│   │   ├── dim_employe.sql
│   │   ├── dim_departement.sql
│   │   ├── dim_poste.sql
│   │   ├── dim_temps.sql
│   │   ├── dim_competence.sql
│   │   └── dim_offre.sql
│   ├── faits/               ← Tables : faits mesurables
│   │   ├── fait_recrutement.sql
│   │   ├── fait_effectifs.sql
│   │   ├── fait_mobilite.sql
│   │   └── fait_gap_competences.sql
│   ├── reporting/           ← Tables : KPIs pré-agrégés pour Superset
│   │   ├── kpi_rh.sql
│   │   └── vw_effectifs_mensuels.sql
│   └── schema.yml           ← Tests qualité (not_null, unique, accepted_values)
├── snapshots/
│   └── snap_employe.sql     ← SCD Type 2 sur les employés
└── tests/
    └── generic/             ← Tests personnalisés
```

### 4.3 Matérialisation des modèles

dbt matérialise les modèles de deux façons selon le besoin :

| Couche | Matérialisation | Explication |
|---|---|---|
| `staging/` | **view** | Recalculée à chaque requête — toujours fraîche |
| `dimensions/` | **table** | Physiquement stockée — optimisée pour les jointures |
| `faits/` | **table** | Physiquement stockée — optimisée pour les agrégations |
| `reporting/` | **table** | Pré-agrégée — alimentation directe de Superset |

### 4.4 Exemple concret : `dim_employe.sql`

Ce modèle enrichit les données brutes des employés et calcule des métriques dérivées :

```sql
-- sirh-bi/dbt_sirh/models/dimensions/dim_employe.sql
SELECT
    id                                              AS employe_id,
    CONCAT(first_name, ' ', last_name)             AS nom_complet,
    email,
    hire_date,
    contract_type                                   AS type_contrat,
    department_id                                   AS departement_id,
    position_id                                     AS poste_id,
    salary                                          AS salaire,
    COALESCE(date_depart IS NOT NULL, FALSE)        AS is_parti,
    date_depart,
    -- Ancienneté calculée en mois
    TIMESTAMPDIFF(MONTH, hire_date, COALESCE(date_depart, CURDATE()))
                                                    AS anciennete_mois
FROM {{ ref('stg_employees') }}
```

La syntaxe `{{ ref('stg_employees') }}` est la magie de dbt : elle résout automatiquement les dépendances et construit un graphe d'exécution (DAG dbt).

### 4.5 Tests qualité dbt (92 tests)

Le fichier `schema.yml` déclare des règles de validation qui s'exécutent avec `dbt test` :

```yaml
models:
  - name: dim_employe
    columns:
      - name: employe_id
        tests:
          - not_null          # Aucun ID nul
          - unique            # Pas de doublons

      - name: type_contrat
        tests:
          - accepted_values:
              values: ['CDI', 'CDD', 'STAGE']   # Valeurs autorisées

      - name: salaire
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: "salaire >= 0"         # Pas de salaire négatif

  - name: fait_recrutement
    columns:
      - name: match_score
        tests:
          - dbt_utils.expression_is_true:
              expression: "match_score BETWEEN 0 AND 100"
```

### 4.6 Graphe de dépendances (Lineage)

dbt génère automatiquement la documentation du graphe de dépendances :

```
sources (sirh_staging)
    └─► stg_employees
            └─► dim_employe
                    ├─► fait_effectifs
                    ├─► fait_mobilite
                    └─► kpi_rh

    └─► stg_applications
            └─► fait_recrutement
                    └─► kpi_rh
```

### 4.7 Commandes dbt

```bash
# Se placer dans le dossier dbt
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi\dbt_sirh"

# Exécuter tous les modèles (reconstruction du DWH)
dbt run

# Exécuter uniquement les modèles de staging
dbt run --select staging

# Exécuter une dimension spécifique
dbt run --select dim_employe

# Lancer tous les tests qualité
dbt test

# Lancer uniquement les tests d'une table
dbt test --select dim_employe

# Snapshot SCD Type 2
dbt snapshot

# Générer et afficher la documentation
dbt docs generate
dbt docs serve --port 8086
# → ouvre http://localhost:8086

# Tout en une commande
dbt run && dbt snapshot && dbt test
```

**Sortie attendue de `dbt run`** :
```
Running with dbt=1.7.x
Found 18 models, 92 tests, 1 snapshot, 1 analysis

Concurrency: 4 threads

1 of 18 START sql view model sirh_dwh.stg_employees ........................ [RUN]
1 of 18 OK created sql view model sirh_dwh.stg_employees ................... [CREATE VIEW in 0.15s]
...
18 of 18 OK created sql table model sirh_dwh.kpi_rh ........................ [CREATE TABLE in 1.23s]

Finished running 6 views, 12 tables in 4.82s.

Completed successfully
Done. PASS=18 WARN=0 ERROR=0 SKIP=0 TOTAL=18
```

**Sortie attendue de `dbt test`** :
```
Running 92 tests...

92 of 92 PASS  ...
Done. PASS=92 WARN=0 ERROR=0 SKIP=0 TOTAL=92
```

> **Capture d'écran 5** : Terminal montrant `dbt run` avec `PASS=18 WARN=0 ERROR=0`.
> **Capture d'écran 6** : Terminal montrant `dbt test` avec `PASS=92 WARN=0 ERROR=0 TOTAL=92`.
> **Capture d'écran 7** : Interface dbt Docs (`http://localhost:8086`) montrant le graphe de lineage (DAG des dépendances entre modèles).

---

## 5. Apache Airflow — Orchestration du pipeline

### 5.1 Objectif

**Apache Airflow** est la plateforme d'orchestration qui automatise l'exécution du pipeline de données. Sans Airflow, il faudrait lancer manuellement les scripts ETL, dbt et ML dans le bon ordre chaque jour. Airflow remplace cette procédure manuelle par un **DAG (Directed Acyclic Graph)** : un graphe de tâches avec des dépendances explicites, exécuté automatiquement selon un calendrier.

**Dans ce projet** : Le pipeline s'exécute automatiquement tous les jours à 02h00 (Europe/Paris), garantissant que les dashboards Superset affichent des données fraîches chaque matin.

### 5.2 Infrastructure Docker

**Fichier** : `sirh-bi/airflow/docker-compose.yml`

Airflow tourne dans un conteneur Docker (`airflow-sirh`) isolé du système hôte. La bibliothèque de modèles ML (scikit-learn, Prophet, SHAP) est installée dans le conteneur via `_PIP_ADDITIONAL_REQUIREMENTS`.

```bash
# Démarrer Airflow
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi\airflow"
docker compose up -d

# Vérifier que le conteneur est actif
docker ps --filter name=airflow-sirh
```

### 5.3 Le DAG `sirh_pipeline`

**Fichier** : `sirh-bi/airflow/dags/sirh_pipeline.py`

Le DAG orchestre **12 tâches** dans un ordre précis :

```
[extract_staging]
       │
[dbt_freshness]         ← Vérifie l'âge des données sources
       │
[dbt_snapshot]          ← Snapshot SCD Type 2 (historique employés)
       │
  [dbt_run]             ← Reconstruit les 18 modèles du DWH
       │
  [dbt_test]            ← Lance les 92 tests qualité
       │
[data_quality_report]   ← Génère le rapport HTML de qualité
       │
  [ml_turnover]         ← Random Forest turnover
       │
[ml_segmentation]       ← K-Means segmentation employés
       │
[ml_high_potentials]    ← Identification hauts potentiels
       │
 [ml_forecast]          ← Prophet prévision embauches
       │
[ml_correlations]       ← Analyse corrélations RH
       │
 [ml_retention]         ← Analyse rétention talents
       │
[pipeline_summary]      ← Log final dans bi_pipeline_log (gouvernance)
```

### 5.4 Planification et monitoring

```python
# Extrait du DAG
schedule_interval = '0 2 * * *'   # Tous les jours à 02h00
start_date        = days_ago(1)
catchup           = False          # Pas de backfill automatique
```

**Gouvernance intégrée** : Chaque tâche écrit son statut (`success` / `failed`), sa durée et ses éventuelles erreurs dans la table `sirh_dwh.bi_pipeline_log`. Cette table alimente le dashboard "Santé du Pipeline" dans Superset.

### 5.5 Interaction avec Airflow

#### Interface web (http://localhost:8085)

```
DAGs → sirh_pipeline → [Trigger DAG ▶] pour déclencher manuellement
```

#### Commandes depuis le conteneur

```bash
# Exécuter le DAG manuellement depuis la CLI Airflow
docker exec airflow-sirh airflow dags trigger sirh_pipeline

# Voir l'état des derniers runs
docker exec airflow-sirh airflow dags list-runs -d sirh_pipeline

# Voir le log d'une tâche spécifique
docker exec airflow-sirh airflow tasks logs sirh_pipeline dbt_run <run_id>

# Exécuter un script ML directement dans le conteneur
MSYS_NO_PATHCONV=1 docker exec -e PYTHONIOENCODING=utf-8 \
    -w /opt/sirh/ml airflow-sirh \
    python turnover_model.py
```

#### Vérification de l'historique dans MySQL

```sql
-- Consulter le log du pipeline (table de gouvernance)
SELECT
    task_id,
    status,
    started_at,
    ended_at,
    duration_seconds,
    error_message
FROM sirh_dwh.bi_pipeline_log
ORDER BY logged_at DESC
LIMIT 20;

-- Tâches ayant échoué
SELECT * FROM sirh_dwh.bi_pipeline_log WHERE status = 'failed';
```

> **Capture d'écran 8** : Interface Airflow (http://localhost:8085) montrant le DAG `sirh_pipeline` avec le graphe des tâches en vert (toutes réussies).
> **Capture d'écran 9** : Vue "Graph" du DAG avec les 12 nœuds connectés et leur état de dernière exécution.
> **Capture d'écran 10** : Log d'une tâche Airflow (ex: `dbt_run`) montrant la sortie détaillée.
> **Capture d'écran 11** : Vue "Gantt" du dernier run montrant la durée de chaque tâche.

---

## 6. Apache Superset — Visualisation et dashboards

### 6.1 Objectif

**Apache Superset** est la plateforme open-source de Business Intelligence qui permet de créer des **tableaux de bord interactifs** à partir des données du DWH. Les utilisateurs RH (HR_ADMIN, MANAGER) accèdent à Superset pour consulter les KPIs, analyser les tendances et prendre des décisions basées sur les données — sans écrire une seule ligne de code.

### 6.2 Infrastructure

**Fichiers** :
- `sirh-bi/docker-compose.superset.yml` — Conteneur Superset
- `sirh-bi/superset_config.py` — Configuration (connexions, sécurité, thème)
- `sirh-bi/fix_superset.py` — Script d'initialisation automatique des datasets

### 6.3 Connexion à MySQL DWH

Dans Superset (`Settings → Database Connections`) :

```
Database Name : SIRH Data Warehouse
SQLAlchemy URI: mysql+pymysql://root:root@host.docker.internal:3306/sirh_dwh
```

> Le hostname `host.docker.internal` (et non `localhost`) est nécessaire car Superset tourne dans Docker et doit atteindre MySQL sur la machine hôte.

### 6.4 Dashboards réalisés

#### Dashboard 1 — Vue d'ensemble RH globale

**But** : Donner au DRH une vision instantanée de l'état des ressources humaines.

**Charts inclus** :
| Visualisation | Type | Données |
|---|---|---|
| KPI Effectif total | Big Number | `COUNT(*) FROM dim_employe` |
| KPI Taux de turnover | Big Number with Trend | `AVG(taux_turnover) FROM fait_effectifs` |
| Répartition par département | Donut Chart | `GROUP BY departement` |
| Évolution des embauches | Line Chart | `fait_effectifs GROUP BY mois` |
| Pyramide des âges (contrats) | Bar Chart | `GROUP BY type_contrat, anciennete` |
| Distribution des salaires | Histogram | `salaire FROM dim_employe` |

#### Dashboard 2 — Analyse du recrutement

**But** : Suivre l'efficacité du processus de recrutement.

**Charts inclus** :
| Visualisation | Type | Données |
|---|---|---|
| Entonnoir de candidatures | Funnel Chart | `fait_recrutement GROUP BY statut` |
| Score de matching moyen | Big Number | `AVG(match_score) FROM fait_recrutement` |
| Candidatures par offre | Bar Chart | `GROUP BY titre_offre ORDER BY nb DESC` |
| Délai moyen recrutement | Table | `AVG(DATEDIFF(...))` |
| Top compétences demandées | Word Cloud | `fait_gap_competences` |

#### Dashboard 3 — Analyses ML & Prédictions

**But** : Présenter les résultats des modèles Machine Learning aux RH.

**Charts inclus** :
| Visualisation | Type | Source |
|---|---|---|
| Carte de risque turnover | Heatmap | `ml_turnover_risk` |
| Segments d'employés | Scatter Plot | `ml_employee_segments` |
| Hauts potentiels | Table filtrée | `ml_high_potentials` |
| Prévision embauches | Line Chart + Intervalles | `ml_forecast_embauches` |

#### Dashboard 4 — Santé du Pipeline

**But** : Gouvernance technique — suivre l'état des exécutions Airflow.

**Charts inclus** :
| Visualisation | Type | Source |
|---|---|---|
| Dernière exécution | Big Number | `bi_pipeline_log` |
| Statut par tâche | Table | `bi_pipeline_log` |
| Durée historique | Line Chart | `bi_pipeline_log GROUP BY date` |
| Taux de succès | Gauge | `COUNT(success)/COUNT(*)` |

### 6.5 Comment créer un chart Superset (procédure standard)

```
1. Superset → Charts → + Chart
2. Sélectionner le Dataset : ex. "dim_employe" ou "fait_recrutement"
3. Choisir le type de visualisation (Bar, Line, Donut, Table...)
4. Configurer les dimensions et métriques
5. Appliquer un filtre si besoin
6. Save → "Ajouter au Dashboard"
```

### 6.6 Filtres et interactivité

Superset supporte les filtres natifs qui connectent plusieurs charts d'un même dashboard :
- Filtre par **département** → tous les charts se filtrent simultanément
- Filtre par **période** → analyse temporelle dynamique
- Filtre par **type de contrat** → segmentation CDI/CDD/STAGE

### 6.7 Requêtes SQL directes (SQL Lab)

```bash
# Depuis Superset → SQL Lab → SQL Editor
# Connexion : SIRH Data Warehouse

SELECT
    d.nom_departement,
    COUNT(e.employe_id)                                AS nb_employes,
    ROUND(AVG(e.salaire), 0)                          AS salaire_moyen,
    SUM(CASE WHEN e.is_parti = 1 THEN 1 ELSE 0 END)  AS nb_departs,
    ROUND(
        SUM(CASE WHEN e.is_parti = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1
    )                                                  AS taux_turnover_pct
FROM dim_employe e
JOIN dim_departement d ON e.departement = d.nom_departement
GROUP BY d.nom_departement
ORDER BY nb_employes DESC;
```

> **Capture d'écran 12** : Dashboard "Vue d'ensemble RH" avec KPIs et graphiques.
> **Capture d'écran 13** : Dashboard "Recrutement" montrant l'entonnoir de candidatures.
> **Capture d'écran 14** : Dashboard "ML & Prédictions" avec heatmap de risque turnover.
> **Capture d'écran 15** : SQL Lab Superset avec une requête analytique et ses résultats.
> **Capture d'écran 16** : Interface de création d'un chart (sélection dataset + type + métriques).

---

## 7. Machine Learning — Six modèles analytiques

### 7.1 Objectif global

Les six modèles ML transforment les données du DWH en **prédictions et insights actionnables**. L'objectif n'est pas de créer des modèles de recherche académique, mais des outils pratiques que les RH peuvent utiliser pour **anticiper les départs**, **identifier les talents**, **prévoir les besoins en recrutement** et **comprendre les dynamiques organisationnelles**.

**Architecture** : Chaque script ML lit `sirh_dwh`, effectue ses calculs et écrit les résultats dans une table `ml_*` — directement visualisable depuis Superset.

```bash
# Lancer tout le pipeline ML localement
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi"
python ml/run_all.py

# Lancer un modèle spécifique
python ml/run_all.py --only turnover
python ml/run_all.py --only turnover segmentation high_potentials
```

---

### 7.2 ML-1 — Prévision du Turnover (Random Forest + SHAP)

**Fichier** : `sirh-bi/ml/turnover_model.py`
**Table de sortie** : `sirh_dwh.ml_turnover_risk`

#### Problème résolu

"Quels employés risquent de quitter l'entreprise dans les prochains mois ?"

#### Approche technique

- **Algorithme** : Random Forest Classifier avec calibration isotonique
- **Features** : ancienneté, salaire, type de contrat, département, nombre de compétences, ratio salaire/médiane département
- **Variable cible** : `is_parti` (généré de façon réaliste avec `generate_departures.py`)
- **Validation** : Cross-validation 5-fold stratifiée
- **Interprétabilité** : SHAP values pour expliquer chaque prédiction individuelle

#### Résultats obtenus

```
AUC-ROC        : 0.757  (> seuil critique 0.70)
Cross-val AUC  : 0.755
Brier Score    : 0.118  (meilleur que 0.125 baseline)
Top feature    : salaire (SHAP impact le plus élevé)
```

#### Structure de la table de sortie

```sql
SELECT * FROM ml_turnover_risk LIMIT 5;
-- employe_id | nom_complet | departement | probabilite_depart | risque_niveau | top_feature | shap_values_json
```

| Colonne | Description |
|---|---|
| `employe_id` | Identifiant employé |
| `probabilite_depart` | Probabilité 0.0–1.0 |
| `risque_niveau` | ÉLEVÉ / MOYEN / FAIBLE |
| `top_feature` | Feature SHAP principale pour cet employé |
| `shap_values_json` | Détail des contributions de chaque feature |

#### Test et validation

```python
# Dans Python, après exécution
import pandas as pd
import pymysql

conn = pymysql.connect(host='localhost', port=3306, user='root',
                       password='root', database='sirh_dwh')
df = pd.read_sql("SELECT risque_niveau, COUNT(*) as n FROM ml_turnover_risk GROUP BY risque_niveau", conn)
print(df)
#   risque_niveau    n
#   ÉLEVÉ           78
#   MOYEN          312
#   FAIBLE         610
```

> **Capture d'écran 17** : Terminal montrant la sortie du script `turnover_model.py` avec AUC = 0.757.
> **Capture d'écran 18** : Dashboard Superset avec heatmap des risques de turnover par département.

---

### 7.3 ML-2 — Segmentation des Employés (K-Means)

**Fichier** : `sirh-bi/ml/segmentation_model.py`
**Table de sortie** : `sirh_dwh.ml_employee_segments`

#### Problème résolu

"Y a-t-il des profils d'employés distincts dans l'organisation ? Quels groupes homogènes peut-on identifier ?"

#### Approche technique

- **Algorithme** : K-Means Clustering avec optimisation du k par méthode du coude (Elbow)
- **Features standardisées** : ancienneté, salaire, nombre de compétences
- **Validation** : Score de silhouette pour choisir le k optimal
- **Normalisation** : StandardScaler avant clustering

#### Résultats et interprétation

Les segments typiques identifiés :

| Segment | Profil | Caractéristiques |
|---|---|---|
| Segment 0 | Talents expérimentés | Ancienneté haute, salaire élevé, compétences nombreuses |
| Segment 1 | Nouveaux recrutés | Ancienneté faible, salaire moyen, profil en développement |
| Segment 2 | Experts techniques | Salaire élevé, compétences spécialisées nombreuses |
| Segment 3 | Profils intermédiaires | Ancienneté et salaire médians |

#### Test

```sql
SELECT
    segment_id,
    COUNT(*)                    AS nb_employes,
    ROUND(AVG(salaire), 0)      AS salaire_moyen,
    ROUND(AVG(anciennete_mois)/12, 1) AS anciennete_ans,
    segment_label
FROM ml_employee_segments
GROUP BY segment_id, segment_label
ORDER BY segment_id;
```

> **Capture d'écran 19** : Scatter plot Superset des segments (axes : ancienneté vs salaire, couleur = segment).

---

### 7.4 ML-3 — Identification des Hauts Potentiels

**Fichier** : `sirh-bi/ml/high_potentials.py`
**Table de sortie** : `sirh_dwh.ml_high_potentials`

#### Problème résolu

"Quels employés ont le meilleur potentiel d'évolution et méritent un plan de développement prioritaire ?"

#### Approche technique

Score composite calculé avec des règles métier pondérées :

```
Score HP = (ancienneté normalisée × 0.25)
         + (nombre compétences normalisé × 0.35)
         + (match_score recrutement normalisé × 0.20)
         + (salaire normalisé × 0.20)
```

**Seuil HP** : employés dans le top 20% du score composite.

#### Structure de sortie

```sql
SELECT nom_complet, departement, score_potentiel, rang_potentiel, est_haut_potentiel
FROM ml_high_potentials
WHERE est_haut_potentiel = 1
ORDER BY score_potentiel DESC
LIMIT 10;
```

> **Capture d'écran 20** : Table Superset des 20 hauts potentiels avec leur score et département.

---

### 7.5 ML-4 — Prévision des Embauches (Prophet)

**Fichier** : `sirh-bi/ml/forecast_model.py`
**Table de sortie** : `sirh_dwh.ml_forecast_embauches`

#### Problème résolu

"Combien d'embauches faut-il prévoir pour les 6 prochains mois, département par département ?"

#### Approche technique

- **Algorithme** : Facebook Prophet (modèle de séries temporelles bayésien)
- **Données** : Historique mensuel des embauches par département (`fait_effectifs`)
- **Horizon de prévision** : 6 mois dans le futur
- **Intervalles de confiance** : yhat_lower / yhat_upper à 80%

#### Structure de sortie

```sql
SELECT
    departement,
    mois_prevision,
    embauches_prevues,
    intervalle_bas,
    intervalle_haut
FROM ml_forecast_embauches
WHERE mois_prevision > CURDATE()
ORDER BY departement, mois_prevision;
```

> **Capture d'écran 21** : Line chart Superset avec courbe historique + prévision sur 6 mois + intervalle de confiance en gris.

---

### 7.6 ML-5 — Analyse des Corrélations RH

**Fichier** : `sirh-bi/ml/correlations.py`
**Table de sortie** : `sirh_dwh.ml_correlations`

#### Problème résolu

"Y a-t-il une corrélation entre le salaire et l'ancienneté ? Entre le type de contrat et le taux de turnover ?"

#### Approche technique

- **Méthode** : Matrice de corrélation de Pearson + tests statistiques (scipy)
- **Variables analysées** : salaire, ancienneté, nombre de compétences, score de matching, probabilité de turnover
- **Test de significativité** : p-value < 0.05 pour valider la corrélation

#### Structure de sortie

```sql
SELECT variable_a, variable_b, correlation, p_value, est_significatif
FROM ml_correlations
WHERE est_significatif = 1
ORDER BY ABS(correlation) DESC;
```

> **Capture d'écran 22** : Heatmap de la matrice de corrélation dans Superset (couleurs : rouge=corrélation positive forte, bleu=négative).

---

### 7.7 ML-6 — Analyse de Rétention des Talents

**Fichier** : `sirh-bi/ml/retention_analysis.py`
**Table de sortie** : `sirh_dwh.ml_retention_analysis`

#### Problème résolu

"Quels facteurs expliquent pourquoi un employé reste dans l'entreprise ? Quel est le profil typique des employés fidèles ?"

#### Approche technique

- **Analyse de survie** : Calcul du taux de rétention par cohorte d'embauche
- **Segmentation** : Groupes de rétention par département, type de contrat, tranche de salaire
- **Indice de rétention** : Score composite (0–100) indiquant la probabilité de rester 12 mois supplémentaires

#### Test rapide

```bash
# Lancer uniquement le modèle de rétention
python ml/run_all.py --only retention

# Vérifier la sortie
python -c "
import pymysql, pandas as pd
conn = pymysql.connect(host='localhost', port=3306, user='root', password='root', database='sirh_dwh')
df = pd.read_sql('SELECT departement, ROUND(AVG(indice_retention),1) AS retention FROM ml_retention_analysis GROUP BY departement ORDER BY retention DESC', conn)
print(df)
"
```

> **Capture d'écran 23** : Bar chart Superset de l'indice de rétention moyen par département.

---

## 8. MLflow — Tracking des expériences ML

### 8.1 Objectif

**MLflow** est la plateforme de gestion du cycle de vie des modèles ML. Il résout un problème concret : sans tracking, il est impossible de savoir "quel modèle avec quels hyperparamètres a donné le meilleur AUC ?". MLflow enregistre automatiquement les paramètres, métriques et artefacts de chaque entraînement.

**Dans ce projet** : MLflow compare plusieurs algorithmes (Random Forest, Gradient Boosting, XGBoost, LightGBM) pour le modèle de turnover et plusieurs valeurs de k pour le clustering.

### 8.2 Architecture

**Fichier** : `sirh-bi/ml/mlflow_tracking.py`
**Backend** : SQLite local (`sirh-bi/mlflow.db`)
**Artefacts** : `sirh-bi/mlruns/`

```
mlflow_tracking.py
    ├── Expérience "SIRH_Turnover_v3"
    │     ├── Run: Random Forest (calibré)
    │     │     params: n_estimators=200, max_depth=8, ...
    │     │     metrics: auc=0.757, brier=0.118, ap=0.412
    │     │     artifact: model.pkl, feature_importance.json
    │     ├── Run: Gradient Boosting
    │     └── Run: XGBoost
    └── Expérience "SIRH_Segmentation"
          ├── Run: KMeans k=3
          ├── Run: KMeans k=4
          └── Run: KMeans k=5 (silhouette le plus élevé)
```

### 8.3 Démarrage et utilisation

```bash
# Démarrer l'interface MLflow
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi"
mlflow ui --port 5000
# → http://localhost:5000

# Générer de nouveaux runs (lancer les expériences)
python ml/mlflow_tracking.py
```

### 8.4 Métriques enregistrées automatiquement

| Métrique | Description | Valeur cible |
|---|---|---|
| `auc_roc` | Aire sous la courbe ROC | > 0.70 |
| `cross_val_auc` | AUC en validation croisée 5-fold | Proche de auc_roc |
| `brier_score` | Calibration des probabilités | < 0.125 |
| `average_precision` | Précision moyenne (courbe PR) | Maximiser |
| `silhouette_score` | Qualité du clustering | > 0.30 |

### 8.5 Comparaison de modèles (interface MLflow)

Dans l'interface web :
```
1. http://localhost:5000
2. Cliquer sur l'expérience "SIRH_Turnover_v3"
3. Cocher plusieurs runs
4. "Compare" → affiche les métriques côte à côte
5. Vue "Parallel Coordinates" → visualise l'impact des hyperparamètres
```

### 8.6 Requête d'analyse des runs

```python
import mlflow

mlflow.set_tracking_uri("file:///C:/Users/Hp/Desktop/last v/essra/sirh-bi/mlruns")

# Récupérer tous les runs d'une expérience
client = mlflow.tracking.MlflowClient()
experiment = client.get_experiment_by_name("SIRH_Turnover_v3")
runs = client.search_runs(experiment.experiment_id, order_by=["metrics.auc_roc DESC"])

for run in runs[:3]:
    print(f"Run: {run.data.tags.get('mlflow.runName', run.info.run_id[:8])}")
    print(f"  AUC    : {run.data.metrics.get('auc_roc', 'N/A'):.3f}")
    print(f"  Brier  : {run.data.metrics.get('brier_score', 'N/A'):.3f}")
    print(f"  Params : {run.data.params}")
    print()
```

> **Capture d'écran 24** : Interface MLflow (http://localhost:5000) montrant la liste des expériences.
> **Capture d'écran 25** : Vue de comparaison des runs avec le tableau des métriques (AUC, Brier Score, Average Precision) pour chaque algorithme.
> **Capture d'écran 26** : Graphique "Parallel Coordinates" dans MLflow montrant la relation hyperparamètres → performance.
> **Capture d'écran 27** : Page de détail d'un run MLflow avec les métriques, paramètres et artefacts enregistrés.

---

## 9. Qualité et gouvernance des données

### 9.1 Objectif

La gouvernance des données garantit que les dashboards et modèles ML reposent sur des données **fiables, complètes et cohérentes**. Dans ce projet, la qualité est assurée à trois niveaux : les tests dbt, le rapport qualité Python, et le log de pipeline Airflow.

### 9.2 Niveau 1 — Tests dbt (92 règles automatiques)

Voir section 4.5. Les 92 tests couvrent :
- **not_null** : champs obligatoires non vides
- **unique** : pas de doublons sur les clés primaires
- **accepted_values** : valeurs dans des ensembles prédéfinis
- **expression_is_true** : contraintes numériques (salaire ≥ 0, score ∈ [0,100])
- **Tests custom** : `test_dates_valides`, `test_match_score`

### 9.3 Niveau 2 — Rapport qualité HTML

**Fichier** : `sirh-bi/quality/data_quality_report.py`
**Sortie** : `sirh-bi/quality/quality_report.html`

Ce script génère un rapport HTML interactif après chaque pipeline Airflow :

```bash
# Exécuter manuellement
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi"
python quality/data_quality_report.py

# Ouvrir le rapport
start quality/quality_report.html
```

**Catégories de tests dans le rapport** :

| Catégorie | Description | Résultat |
|---|---|---|
| PASS | Test validé | ✅ Vert |
| WARN | Anomalie mineure (< 5% de valeurs manquantes) | ⚠️ Orange |
| FAIL | Violation critique | ❌ Rouge |

### 9.4 Niveau 3 — Log de pipeline (bi_pipeline_log)

```sql
-- Tableau de bord de gouvernance
SELECT
    DATE(logged_at)              AS date_run,
    COUNT(*)                     AS nb_taches,
    SUM(status = 'success')      AS succes,
    SUM(status = 'failed')       AS echecs,
    MAX(duration_seconds)        AS duree_max_tache_s,
    SUM(duration_seconds)        AS duree_totale_s
FROM sirh_dwh.bi_pipeline_log
WHERE task_id != 'PIPELINE_COMPLETE'
GROUP BY DATE(logged_at)
ORDER BY date_run DESC
LIMIT 10;
```

### 9.5 Règles métier (business_rules.py)

**Fichier** : `sirh-bi/ml/business_rules.py`

Des règles métier RH supplémentaires sont appliquées avant l'entraînement ML pour garantir la cohérence :

- Un employé en CDD ne peut pas avoir une ancienneté > 24 mois sans renouvellement
- Un stage dure maximum 6 mois
- Le salaire d'un stagiaire est plafonné à 800€ (SMIC stage)

```bash
# Rapport de cohérence des contrats
python -c "
import sys
sys.path.insert(0, 'C:/Users/Hp/Desktop/last v/essra/sirh-bi/ml')
from business_rules import print_contract_coherence_report
import pymysql, pandas as pd
conn = pymysql.connect(host='localhost', port=3306, user='root',
                       password='root', database='sirh_dwh', charset='utf8mb4')
df = pd.read_sql('SELECT * FROM dim_employe', conn)
print_contract_coherence_report(df)
"
```

> **Capture d'écran 28** : Rapport qualité HTML (`quality_report.html`) ouvert dans le navigateur avec les résultats PASS/WARN/FAIL.
> **Capture d'écran 29** : Table `bi_pipeline_log` dans MySQL Workbench montrant l'historique des runs.

---

## 10. Guide de démonstration — Captures d'écran

### 10.1 Checklist des captures à réaliser

Voici l'ordre recommandé pour réaliser les captures d'écran de manière fluide et professionnelle :

#### Phase 1 — Démarrage de l'infrastructure

| # | Ce qu'on capture | Comment y arriver |
|---|---|---|
| 1 | Quatre onglets ouverts (Airflow, Superset, MLflow, dbt docs) | `docker compose up -d` les deux stacks + `mlflow ui` + `dbt docs serve` |
| 2 | Docker Desktop avec les conteneurs actifs | Ouvrir Docker Desktop → Containers |

#### Phase 2 — Data Warehouse

| # | Ce qu'on capture | Comment y arriver |
|---|---|---|
| 3 | MySQL Workbench : `SHOW TABLES FROM sirh_dwh` | Connecter à localhost:3306, exécuter la requête |
| 4 | Requête analytique turnover par département | Copier la requête de la section 2.5 |
| 5 | Schéma ERD du DWH | MySQL Workbench → Database → Reverse Engineer → sirh_dwh |

#### Phase 3 — ETL

| # | Ce qu'on capture | Commande |
|---|---|---|
| 6 | Sortie extraction ETL | `python extract/extract_staging.py` |
| 7 | Table staging avec colonne extracted_at | MySQL Workbench : `SELECT * FROM sirh_staging.stg_employees LIMIT 10` |

#### Phase 4 — dbt

| # | Ce qu'on capture | Commande |
|---|---|---|
| 8 | `dbt run` avec PASS=18 | `dbt run` dans le dossier dbt_sirh |
| 9 | `dbt test` avec PASS=92 | `dbt test` |
| 10 | dbt Docs — Lineage Graph | `dbt docs serve --port 8086` → http://localhost:8086 |
| 11 | Un modèle SQL ouvert dans dbt Docs | Cliquer sur dim_employe dans le graphe |

#### Phase 5 — Airflow

| # | Ce qu'on capture | Navigation |
|---|---|---|
| 12 | DAG `sirh_pipeline` — vue Grid | http://localhost:8085 → DAGs → sirh_pipeline |
| 13 | Vue Graph du DAG (toutes les tâches vertes) | Onglet "Graph" |
| 14 | Log d'une tâche (ex: dbt_run) | Cliquer sur la tâche → Logs |
| 15 | Vue Gantt du dernier run | Onglet "Gantt" |
| 16 | Trigger manuel du DAG | Bouton ▶ → "Trigger DAG" |

#### Phase 6 — Superset

| # | Ce qu'on capture | Navigation |
|---|---|---|
| 17 | Dashboard RH Global avec KPIs | http://localhost:8088 → Dashboards |
| 18 | Dashboard Recrutement — entonnoir | Dashboards → Recrutement |
| 19 | Dashboard ML — heatmap turnover | Dashboards → ML & Prédictions |
| 20 | SQL Lab avec requête analytique | SQL Lab → SQL Editor |
| 21 | Création d'un chart (mode éditeur) | Charts → + Chart → configurer |

#### Phase 7 — Machine Learning

| # | Ce qu'on capture | Commande |
|---|---|---|
| 22 | Sortie `python ml/run_all.py` (tous les steps OK) | `python ml/run_all.py` |
| 23 | Résultat du modèle turnover (AUC = 0.757) | `python ml/turnover_model.py` |
| 24 | Table ml_turnover_risk dans MySQL | `SELECT * FROM ml_turnover_risk LIMIT 20` |
| 25 | Prévision Prophet (graphique) | `python ml/forecast_model.py` (génère un graphique matplotlib) |

#### Phase 8 — MLflow

| # | Ce qu'on capture | Navigation |
|---|---|---|
| 26 | Page d'accueil MLflow avec expériences | http://localhost:5000 |
| 27 | Vue comparaison de runs (tableau métriques) | Expérience → Cocher runs → Compare |
| 28 | Graphique Parallel Coordinates | Vue Compare → Parallel Coordinates |
| 29 | Détail d'un run (params + métriques + artefacts) | Cliquer sur un run |

#### Phase 9 — Qualité et gouvernance

| # | Ce qu'on capture | Commande |
|---|---|---|
| 30 | Rapport HTML qualité | `start quality/quality_report.html` |
| 31 | Table bi_pipeline_log (historique) | `SELECT * FROM sirh_dwh.bi_pipeline_log ORDER BY logged_at DESC LIMIT 20` |

### 10.2 Conseils pour des captures professionnelles

1. **Résolution** : Régler l'affichage à 100% (pas de zoom) pour des captures nettes.
2. **Données** : Vérifier que les tables contiennent des données (> 100 lignes visibles) avant de capturer.
3. **Terminal** : Utiliser Windows Terminal avec fond sombre pour une meilleure lisibilité.
4. **Annoter** : Ajouter des encadrés ou flèches dans PowerPoint/Paint pour pointer les éléments importants.
5. **Séquence logique** : Présenter les captures dans l'ordre du pipeline (source → staging → DWH → visualisation).

### 10.3 Script de test d'intégrité globale

Ce script vérifie que toute l'infrastructure est opérationnelle avant la soutenance :

```python
# test_integration.py — à lancer depuis sirh-bi/
import pymysql
import requests
import sys

CHECKS = []

def check(name, fn):
    try:
        fn()
        print(f"  ✅  {name}")
        CHECKS.append((name, True))
    except Exception as e:
        print(f"  ❌  {name} : {e}")
        CHECKS.append((name, False))

print("\n=== TEST D'INTÉGRITÉ SIRH BI ===\n")

# 1. MySQL DWH
def test_dwh():
    conn = pymysql.connect(host='localhost', port=3306, user='root',
                           password='root', database='sirh_dwh', charset='utf8mb4')
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM dim_employe")
    n = c.fetchone()[0]
    assert n > 0, f"dim_employe est vide"
    conn.close()
check("MySQL DWH — dim_employe peuplée", test_dwh)

def test_ml():
    conn = pymysql.connect(host='localhost', port=3306, user='root',
                           password='root', database='sirh_dwh', charset='utf8mb4')
    c = conn.cursor()
    for tbl in ['ml_turnover_risk', 'ml_employee_segments',
                'ml_high_potentials', 'ml_forecast_embauches']:
        c.execute(f"SELECT COUNT(*) FROM {tbl}")
        n = c.fetchone()[0]
        assert n > 0, f"{tbl} est vide"
    conn.close()
check("Tables ML — 4 tables peuplées", test_ml)

# 2. Airflow
def test_airflow():
    r = requests.get("http://localhost:8085/health", timeout=5)
    assert r.status_code == 200
check("Airflow — service UP (:8085)", test_airflow)

# 3. Superset
def test_superset():
    r = requests.get("http://localhost:8088/health", timeout=5)
    assert r.status_code == 200
check("Superset — service UP (:8088)", test_superset)

# 4. MLflow
def test_mlflow():
    r = requests.get("http://localhost:5000/api/2.0/mlflow/experiments/list", timeout=5)
    assert r.status_code == 200
check("MLflow — service UP (:5000)", test_mlflow)

# Bilan
passed = sum(1 for _, ok in CHECKS if ok)
print(f"\n{'='*40}")
print(f"RÉSULTAT : {passed}/{len(CHECKS)} checks passés")
if passed == len(CHECKS):
    print("Infrastructure SIRH BI 100% opérationnelle ✅")
else:
    print("⚠️  Des services sont down — vérifier Docker et MySQL")
sys.exit(0 if passed == len(CHECKS) else 1)
```

```bash
# Lancer ce test
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi"
python test_integration.py
```

> **Capture d'écran 32 (finale)** : Sortie du script `test_integration.py` avec tous les checks en vert ✅ — preuve que l'infrastructure complète est opérationnelle.

---

## Annexe — Résumé de l'infrastructure

| Composant | Technologie | Version | Statut |
|---|---|---|---|
| Sources opérationnelles | MySQL 8 | 8.0+ | ✅ |
| Extraction ETL | Python + SQLAlchemy | 3.11 | ✅ |
| Transformation | dbt | 1.7.x | ✅ |
| Tests qualité | dbt + tests custom | 92 tests | ✅ |
| Snapshot SCD Type 2 | dbt snapshots | — | ✅ |
| Orchestration | Apache Airflow | 2.8.x (Docker) | ✅ |
| Visualisation BI | Apache Superset | 3.x (Docker) | ✅ |
| ML-1 Turnover | Random Forest + SHAP | AUC 0.757 | ✅ |
| ML-2 Segmentation | K-Means | Silhouette > 0.35 | ✅ |
| ML-3 Hauts potentiels | Score composite | Top 20% | ✅ |
| ML-4 Prévision | Prophet | 6 mois horizon | ✅ |
| ML-5 Corrélations | Pearson + scipy | p < 0.05 | ✅ |
| ML-6 Rétention | Analyse de survie | Indice 0–100 | ✅ |
| Tracking ML | MLflow | 2.x (local) | ✅ |
| Gouvernance | bi_pipeline_log | MySQL | ✅ |

**Flux de données total** :
```
MySQL opérationnel (~1000 employés, ~200 candidatures)
  → ETL Python (extract_staging.py)
  → sirh_staging (7 tables brutes)
  → dbt (18 modèles : 6 views + 12 tables)
  → sirh_dwh (6 dimensions + 4 faits + 1 snapshot + 2 reporting + 6 ML)
  → Airflow (orchestration quotidienne automatique, log gouvernance)
  → Superset (4 dashboards interactifs)
  → MLflow (comparaison de 10+ runs d'expériences)
```

---

*Document généré pour le Projet de Fin d'Études — SIRH Microservices — Partie II : Infrastructure Business Intelligence & Machine Learning*