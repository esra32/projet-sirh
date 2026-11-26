-- =============================================================================
-- REQUETES SQL - PARTIE 1 : ARCHITECTURE BI, ETL ET MODELISATION DIMENSIONNELLE
-- Projet SIRH / ESSRA
-- Compatible MySQL 8.x
-- =============================================================================
--
-- Objectif du fichier :
-- 1.1 Architecture de la solution BI
--     - identifier les sources
--     - creer les couches staging et data warehouse
--     - documenter le choix Data Warehouse et Superset
--
-- 1.2 Extraction et Transformation des Donnees ETL
--     - creer les tables staging
--     - extraire les donnees des bases operationnelles
--     - nettoyer, standardiser et controler la qualite
--     - charger les dimensions et les tables de faits
--     - gerer l'historique SCD Type 2
--
-- 1.3 Modelisation Dimensionnelle
--     - creer le schema en etoile
--     - creer les dimensions : temps, employe, departement, poste, competence, offre
--     - creer les faits : recrutement, effectifs, mobilite, competences
--     - creer les vues agregees et les KPI RH
--
-- Important :
-- - Les requetes SHOW/SELECT sont en lecture seule.
-- - Les requetes CREATE/INSERT/UPDATE/TRUNCATE modifient les bases BI.
-- - Executer section par section dans MySQL Workbench, phpMyAdmin ou DBeaver.
-- - Adapter les noms des bases si votre environnement utilise un prefixe different.
--
-- Bases utilisees :
-- - sirh_auth          : utilisateurs et roles
-- - sirh_employee      : departements, postes, employes
-- - sirh_recruitment   : offres, candidatures, competences
-- - sirh_staging       : couche brute extraite
-- - sirh_dwh           : data warehouse analytique
-- =============================================================================


-- =============================================================================
-- 1.1 ARCHITECTURE DE LA SOLUTION BI
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1.1 Inventaire des bases de donnees du projet
-- -----------------------------------------------------------------------------

SHOW DATABASES;

SHOW DATABASES LIKE 'sirh_%';

SELECT
    schema_name AS base_donnees
FROM information_schema.schemata
WHERE schema_name IN (
    'sirh_auth',
    'sirh_employee',
    'sirh_recruitment',
    'sirh_staging',
    'sirh_dwh'
)
ORDER BY schema_name;


-- -----------------------------------------------------------------------------
-- 1.1.2 Cartographie logique des couches BI
-- -----------------------------------------------------------------------------

SELECT
    1 AS ordre,
    'Sources operationnelles' AS couche,
    'sirh_auth, sirh_employee, sirh_recruitment' AS base_donnees,
    'Donnees transactionnelles produites par les microservices backend' AS role_couche
UNION ALL
SELECT
    2,
    'Staging',
    'sirh_staging',
    'Zone tampon : copie brute des donnees sources avec horodatage extraction'
UNION ALL
SELECT
    3,
    'Integration / Data Warehouse',
    'sirh_dwh',
    'Modele en etoile avec dimensions, faits, historique et KPIs RH'
UNION ALL
SELECT
    4,
    'Presentation',
    'Superset / vues reporting',
    'Tableaux de bord, graphiques RH, filtres temporels et indicateurs decisionnels';


-- -----------------------------------------------------------------------------
-- 1.1.3 Justification Data Warehouse vs Data Lake
-- -----------------------------------------------------------------------------
-- Le projet utilise un Data Warehouse car les donnees sont structurees,
-- relationnelles et destinees a des analyses RH/KPI avec un schema stable.

SELECT
    'Data Warehouse' AS choix_architecture,
    'Schema structure en etoile' AS justification_1,
    'Optimise pour KPI, reporting, tableaux de bord et analyse RH' AS justification_2,
    'Plus adapte que Data Lake pour donnees relationnelles nettoyees' AS justification_3;


-- -----------------------------------------------------------------------------
-- 1.1.4 Choix de la technologie BI
-- -----------------------------------------------------------------------------
-- Dans ce projet, Apache Superset est pertinent car il est open-source,
-- connectable a MySQL, adapte aux dashboards et facile a integrer avec Docker.

SELECT
    'Apache Superset' AS outil_bi,
    'Open-source' AS critere_1,
    'Connexion MySQL compatible' AS critere_2,
    'Dashboards interactifs RH' AS critere_3,
    'Integration possible avec Docker et Airflow' AS critere_4;


-- -----------------------------------------------------------------------------
-- 1.1.5 Inventaire technique des tables par couche
-- -----------------------------------------------------------------------------

SELECT
    table_schema AS base_donnees,
    table_name AS table_nom,
    table_type AS type_objet,
    engine AS moteur,
    table_rows AS estimation_lignes
FROM information_schema.tables
WHERE table_schema IN (
    'sirh_auth',
    'sirh_employee',
    'sirh_recruitment',
    'sirh_staging',
    'sirh_dwh'
)
ORDER BY table_schema, table_name;


-- -----------------------------------------------------------------------------
-- 1.1.6 Detail des colonnes des tables sources et BI
-- -----------------------------------------------------------------------------

SELECT
    table_schema AS base_donnees,
    table_name AS table_nom,
    ordinal_position AS ordre_colonne,
    column_name AS colonne,
    column_type AS type_colonne,
    is_nullable AS nullable,
    column_key AS cle,
    column_default AS valeur_defaut
FROM information_schema.columns
WHERE table_schema IN (
    'sirh_auth',
    'sirh_employee',
    'sirh_recruitment',
    'sirh_staging',
    'sirh_dwh'
)
ORDER BY table_schema, table_name, ordinal_position;


-- -----------------------------------------------------------------------------
-- 1.1.7 Relations et cles etrangeres de la solution
-- -----------------------------------------------------------------------------

SELECT
    constraint_schema AS base_donnees,
    table_name AS table_source,
    column_name AS colonne_source,
    referenced_table_schema AS base_referencee,
    referenced_table_name AS table_referencee,
    referenced_column_name AS colonne_referencee,
    constraint_name AS nom_contrainte
FROM information_schema.key_column_usage
WHERE referenced_table_name IS NOT NULL
  AND constraint_schema IN (
      'sirh_auth',
      'sirh_employee',
      'sirh_recruitment',
      'sirh_staging',
      'sirh_dwh'
  )
ORDER BY constraint_schema, table_name, column_name;


-- -----------------------------------------------------------------------------
-- 1.1.8 Creation des bases BI : staging et data warehouse
-- -----------------------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS sirh_staging
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS sirh_dwh
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;


-- =============================================================================
-- 1.2 EXTRACTION ET TRANSFORMATION DES DONNEES ETL
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.2.1 Creation de la couche staging
-- -----------------------------------------------------------------------------
-- La couche staging garde une copie brute des donnees extraites.
-- Chaque table contient extracted_at pour tracer le moment du chargement.

USE sirh_staging;

CREATE TABLE IF NOT EXISTS stg_departments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255),
    description VARCHAR(1000),
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stg_positions (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255),
    description VARCHAR(1000),
    department_id VARCHAR(36),
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stg_positions_department (department_id)
);

CREATE TABLE IF NOT EXISTS stg_employees (
    id VARCHAR(36) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    hire_date DATE,
    department_id VARCHAR(36),
    position_id VARCHAR(36),
    contract_type VARCHAR(50),
    date_depart DATE NULL,
    motif_depart VARCHAR(100) NULL,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stg_employees_department (department_id),
    INDEX idx_stg_employees_position (position_id),
    INDEX idx_stg_employees_email (email),
    INDEX idx_stg_employees_hire_date (hire_date)
);

CREATE TABLE IF NOT EXISTS stg_skills (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255),
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stg_employee_skills (
    employee_id VARCHAR(36),
    skill_id VARCHAR(36),
    level VARCHAR(50),
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (employee_id, skill_id),
    INDEX idx_stg_emp_skills_skill (skill_id)
);

CREATE TABLE IF NOT EXISTS stg_job_offers (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    department VARCHAR(255),
    location VARCHAR(255),
    status VARCHAR(50),
    published_date DATE,
    deadline_date DATE,
    created_at DATETIME,
    updated_at DATETIME,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stg_job_offers_department (department),
    INDEX idx_stg_job_offers_status (status),
    INDEX idx_stg_job_offers_published (published_date)
);

CREATE TABLE IF NOT EXISTS stg_job_offer_skills (
    job_offer_id VARCHAR(36),
    skill_id VARCHAR(36),
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (job_offer_id, skill_id),
    INDEX idx_stg_offer_skills_skill (skill_id)
);

CREATE TABLE IF NOT EXISTS stg_applications (
    id VARCHAR(36) PRIMARY KEY,
    job_offer_id VARCHAR(36),
    applicant_email VARCHAR(255),
    applicant_name VARCHAR(255),
    cover_letter TEXT,
    cv_url VARCHAR(500),
    status VARCHAR(50),
    applied_date DATE,
    match_score INT NULL,
    candidate_profile_json TEXT NULL,
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stg_applications_offer (job_offer_id),
    INDEX idx_stg_applications_status (status),
    INDEX idx_stg_applications_applied_date (applied_date),
    INDEX idx_stg_applications_email (applicant_email)
);

CREATE TABLE IF NOT EXISTS stg_application_skills (
    application_id VARCHAR(36),
    skill_id VARCHAR(36),
    extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (application_id, skill_id),
    INDEX idx_stg_application_skills_skill (skill_id)
);


-- -----------------------------------------------------------------------------
-- 1.2.2 Extraction depuis la base sirh_employee vers sirh_staging
-- -----------------------------------------------------------------------------
-- Strategie batch : vider la table staging puis recharger depuis la source.
-- Si les colonnes optionnelles date_depart / motif_depart n'existent pas dans
-- votre base source, supprimer ces colonnes de l'INSERT correspondant.

TRUNCATE TABLE sirh_staging.stg_departments;

INSERT INTO sirh_staging.stg_departments (
    id,
    name,
    description,
    extracted_at
)
SELECT
    CAST(id AS CHAR(36)) AS id,
    name,
    description,
    NOW() AS extracted_at
FROM sirh_employee.departments;


TRUNCATE TABLE sirh_staging.stg_positions;

INSERT INTO sirh_staging.stg_positions (
    id,
    title,
    description,
    department_id,
    extracted_at
)
SELECT
    CAST(id AS CHAR(36)) AS id,
    title,
    description,
    CAST(department_id AS CHAR(36)) AS department_id,
    NOW() AS extracted_at
FROM sirh_employee.positions;


TRUNCATE TABLE sirh_staging.stg_employees;

INSERT INTO sirh_staging.stg_employees (
    id,
    first_name,
    last_name,
    email,
    phone,
    hire_date,
    department_id,
    position_id,
    contract_type,
    date_depart,
    motif_depart,
    extracted_at
)
SELECT
    CAST(id AS CHAR(36)) AS id,
    first_name,
    last_name,
    email,
    phone,
    hire_date,
    CAST(department_id AS CHAR(36)) AS department_id,
    CAST(position_id AS CHAR(36)) AS position_id,
    contract_type,
    date_depart,
    motif_depart,
    NOW() AS extracted_at
FROM sirh_employee.employees;


-- -----------------------------------------------------------------------------
-- 1.2.3 Extraction depuis la base sirh_recruitment vers sirh_staging
-- -----------------------------------------------------------------------------

TRUNCATE TABLE sirh_staging.stg_skills;

INSERT INTO sirh_staging.stg_skills (
    id,
    name,
    extracted_at
)
SELECT
    CAST(id AS CHAR(36)) AS id,
    name,
    NOW() AS extracted_at
FROM sirh_recruitment.skills;


TRUNCATE TABLE sirh_staging.stg_job_offers;

INSERT INTO sirh_staging.stg_job_offers (
    id,
    title,
    description,
    department,
    location,
    status,
    published_date,
    deadline_date,
    created_at,
    updated_at,
    extracted_at
)
SELECT
    CAST(id AS CHAR(36)) AS id,
    title,
    description,
    department,
    location,
    status,
    published_date,
    deadline_date,
    created_at,
    updated_at,
    NOW() AS extracted_at
FROM sirh_recruitment.job_offers;


TRUNCATE TABLE sirh_staging.stg_job_offer_skills;

INSERT INTO sirh_staging.stg_job_offer_skills (
    job_offer_id,
    skill_id,
    extracted_at
)
SELECT
    CAST(job_offer_id AS CHAR(36)) AS job_offer_id,
    CAST(skill_id AS CHAR(36)) AS skill_id,
    NOW() AS extracted_at
FROM sirh_recruitment.job_offer_skills;


TRUNCATE TABLE sirh_staging.stg_applications;

INSERT INTO sirh_staging.stg_applications (
    id,
    job_offer_id,
    applicant_email,
    applicant_name,
    cover_letter,
    cv_url,
    status,
    applied_date,
    match_score,
    extracted_at
)
SELECT
    CAST(id AS CHAR(36)) AS id,
    CAST(job_offer_id AS CHAR(36)) AS job_offer_id,
    applicant_email,
    applicant_name,
    cover_letter,
    cv_url,
    status,
    applied_date,
    match_score,
    NOW() AS extracted_at
FROM sirh_recruitment.applications;


TRUNCATE TABLE sirh_staging.stg_application_skills;

INSERT INTO sirh_staging.stg_application_skills (
    application_id,
    skill_id,
    extracted_at
)
SELECT
    CAST(application_id AS CHAR(36)) AS application_id,
    CAST(skill_id AS CHAR(36)) AS skill_id,
    NOW() AS extracted_at
FROM sirh_recruitment.application_skills;


-- -----------------------------------------------------------------------------
-- 1.2.4 Verification du volume extrait dans la couche staging
-- -----------------------------------------------------------------------------

SELECT 'stg_departments' AS table_staging, COUNT(*) AS nb_lignes FROM sirh_staging.stg_departments
UNION ALL
SELECT 'stg_positions', COUNT(*) FROM sirh_staging.stg_positions
UNION ALL
SELECT 'stg_employees', COUNT(*) FROM sirh_staging.stg_employees
UNION ALL
SELECT 'stg_skills', COUNT(*) FROM sirh_staging.stg_skills
UNION ALL
SELECT 'stg_employee_skills', COUNT(*) FROM sirh_staging.stg_employee_skills
UNION ALL
SELECT 'stg_job_offers', COUNT(*) FROM sirh_staging.stg_job_offers
UNION ALL
SELECT 'stg_job_offer_skills', COUNT(*) FROM sirh_staging.stg_job_offer_skills
UNION ALL
SELECT 'stg_applications', COUNT(*) FROM sirh_staging.stg_applications
UNION ALL
SELECT 'stg_application_skills', COUNT(*) FROM sirh_staging.stg_application_skills;


-- -----------------------------------------------------------------------------
-- 1.2.5 Vues de transformation : nettoyage et standardisation
-- -----------------------------------------------------------------------------
-- Ces vues representent la logique "T" de ETL :
-- nettoyage des espaces, normalisation des emails, calcul des indicateurs.

USE sirh_dwh;

CREATE OR REPLACE VIEW v_stg_departments_clean AS
SELECT
    id AS department_nk,
    TRIM(name) AS nom,
    TRIM(description) AS description,
    extracted_at
FROM sirh_staging.stg_departments
WHERE id IS NOT NULL
  AND name IS NOT NULL;


CREATE OR REPLACE VIEW v_stg_positions_clean AS
SELECT
    id AS position_nk,
    TRIM(title) AS titre,
    TRIM(description) AS description,
    department_id AS department_nk,
    extracted_at
FROM sirh_staging.stg_positions
WHERE id IS NOT NULL
  AND title IS NOT NULL;


CREATE OR REPLACE VIEW v_stg_employees_clean AS
SELECT
    id AS employee_nk,
    TRIM(first_name) AS prenom,
    TRIM(last_name) AS nom,
    CONCAT(TRIM(first_name), ' ', TRIM(last_name)) AS nom_complet,
    LOWER(TRIM(email)) AS email,
    phone AS telephone,
    hire_date AS date_embauche,
    department_id AS department_nk,
    position_id AS position_nk,
    UPPER(TRIM(contract_type)) AS type_contrat,
    DATEDIFF(CURDATE(), hire_date) AS anciennete_jours,
    FLOOR(DATEDIFF(CURDATE(), hire_date) / 30) AS anciennete_mois,
    date_depart,
    motif_depart,
    CASE WHEN date_depart IS NULL THEN 0 ELSE 1 END AS is_parti,
    extracted_at
FROM sirh_staging.stg_employees
WHERE id IS NOT NULL
  AND email IS NOT NULL
  AND hire_date IS NOT NULL;


CREATE OR REPLACE VIEW v_stg_skills_clean AS
SELECT
    id AS skill_nk,
    TRIM(name) AS nom,
    CASE
        WHEN LOWER(name) IN ('java', 'spring boot', 'angular', 'react', 'javascript', 'typescript') THEN 'Developpement'
        WHEN LOWER(name) IN ('sql', 'mysql', 'postgresql', 'power bi', 'tableau', 'superset') THEN 'Data et BI'
        WHEN LOWER(name) IN ('docker', 'kubernetes', 'jenkins', 'git', 'linux') THEN 'DevOps'
        WHEN LOWER(name) IN ('python', 'machine learning', 'ai', 'ia') THEN 'Data Science'
        ELSE 'Autre'
    END AS categorie_competence,
    extracted_at
FROM sirh_staging.stg_skills
WHERE id IS NOT NULL
  AND name IS NOT NULL;


CREATE OR REPLACE VIEW v_stg_job_offers_clean AS
SELECT
    id AS offer_nk,
    TRIM(title) AS titre,
    TRIM(description) AS description,
    CASE TRIM(department)
        WHEN 'RH' THEN 'Ressources Humaines'
        WHEN 'IT' THEN 'Informatique'
        WHEN 'Infrastructure' THEN 'Informatique'
        WHEN 'Commercial' THEN 'Commercial & Ventes'
        WHEN 'Marketing' THEN 'Marketing & Communication'
        WHEN 'Finance' THEN 'Finance & Controle de Gestion'
        ELSE TRIM(department)
    END AS departement_normalise,
    TRIM(department) AS departement_source,
    TRIM(location) AS localisation,
    UPPER(TRIM(status)) AS statut,
    published_date AS date_publication,
    deadline_date AS date_limite,
    created_at AS date_creation,
    DATEDIFF(
        COALESCE(deadline_date, CURDATE()),
        COALESCE(published_date, DATE(created_at))
    ) AS duree_offre_jours,
    CASE WHEN UPPER(TRIM(status)) = 'PUBLISHED' THEN 1 ELSE 0 END AS est_active,
    extracted_at
FROM sirh_staging.stg_job_offers
WHERE id IS NOT NULL;


CREATE OR REPLACE VIEW v_stg_applications_clean AS
SELECT
    id AS application_nk,
    job_offer_id AS offer_nk,
    LOWER(TRIM(applicant_email)) AS applicant_email,
    TRIM(applicant_name) AS applicant_name,
    UPPER(TRIM(status)) AS statut,
    applied_date AS date_candidature,
    COALESCE(match_score, 0) AS match_score,
    CASE
        WHEN COALESCE(match_score, 0) >= 80 THEN 'EXCELLENT'
        WHEN COALESCE(match_score, 0) >= 60 THEN 'BON'
        WHEN COALESCE(match_score, 0) >= 40 THEN 'MOYEN'
        ELSE 'FAIBLE'
    END AS categorie_score,
    CASE WHEN UPPER(TRIM(status)) = 'ACCEPTED' THEN 1 ELSE 0 END AS est_accepte,
    CASE
        WHEN UPPER(TRIM(status)) IN ('INTERVIEW_SCHEDULED', 'ACCEPTED') THEN 1
        ELSE 0
    END AS a_passe_entretien,
    extracted_at
FROM sirh_staging.stg_applications
WHERE id IS NOT NULL
  AND job_offer_id IS NOT NULL
  AND applicant_email IS NOT NULL
  AND applied_date IS NOT NULL;


-- -----------------------------------------------------------------------------
-- 1.2.6 Creation des tables de dimensions du Data Warehouse
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dim_temps (
    id_temps_sk INT PRIMARY KEY,
    date_jour DATE NOT NULL UNIQUE,
    jour INT,
    mois INT,
    trimestre INT,
    annee INT,
    annee_mois INT,
    annee_mois_libelle VARCHAR(7),
    annee_trimestre VARCHAR(10),
    nom_mois VARCHAR(20),
    nom_mois_court VARCHAR(10),
    nom_jour VARCHAR(20),
    libelle_trimestre VARCHAR(5),
    semestre VARCHAR(5),
    annee_semestre VARCHAR(10),
    debut_mois DATE,
    fin_mois DATE,
    est_debut_mois BOOLEAN,
    est_fin_mois BOOLEAN,
    est_annee_courante BOOLEAN,
    est_mois_courant BOOLEAN,
    est_weekend BOOLEAN,
    INDEX idx_dim_temps_date (date_jour),
    INDEX idx_dim_temps_annee_mois (annee_mois)
);


CREATE TABLE IF NOT EXISTS dim_departement (
    id_departement_sk INT AUTO_INCREMENT PRIMARY KEY,
    id_departement_nk VARCHAR(36) NOT NULL,
    nom VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    date_debut_validite DATE DEFAULT (CURRENT_DATE),
    date_fin_validite DATE NULL,
    est_actuel BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1,
    UNIQUE KEY uq_dim_departement_nk_current (id_departement_nk, est_actuel),
    INDEX idx_dim_departement_nom (nom)
);


CREATE TABLE IF NOT EXISTS dim_poste (
    id_poste_sk INT AUTO_INCREMENT PRIMARY KEY,
    id_poste_nk VARCHAR(36) NOT NULL,
    titre VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    id_departement_nk VARCHAR(36),
    date_debut_validite DATE DEFAULT (CURRENT_DATE),
    date_fin_validite DATE NULL,
    est_actuel BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1,
    UNIQUE KEY uq_dim_poste_nk_current (id_poste_nk, est_actuel),
    INDEX idx_dim_poste_titre (titre)
);


CREATE TABLE IF NOT EXISTS dim_employe (
    id_employe_sk INT AUTO_INCREMENT PRIMARY KEY,
    id_employe_nk VARCHAR(36) NOT NULL,
    prenom VARCHAR(100),
    nom VARCHAR(100),
    nom_complet VARCHAR(255),
    email VARCHAR(255),
    telephone VARCHAR(50),
    type_contrat VARCHAR(50),
    date_embauche DATE,
    anciennete_jours INT,
    anciennete_mois INT,
    id_departement_nk VARCHAR(36),
    departement VARCHAR(255),
    id_poste_nk VARCHAR(36),
    poste VARCHAR(255),
    tranche_anciennete VARCHAR(50),
    profil_fidelisation VARCHAR(50),
    date_depart DATE NULL,
    motif_depart VARCHAR(100) NULL,
    is_parti BOOLEAN DEFAULT FALSE,
    date_debut_validite DATE DEFAULT (CURRENT_DATE),
    date_fin_validite DATE NULL,
    est_actuel BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1,
    INDEX idx_dim_employe_nk_current (id_employe_nk, est_actuel),
    INDEX idx_dim_employe_email (email),
    INDEX idx_dim_employe_departement (departement),
    INDEX idx_dim_employe_poste (poste)
);


CREATE TABLE IF NOT EXISTS dim_competence (
    id_competence_sk INT AUTO_INCREMENT PRIMARY KEY,
    id_competence_nk VARCHAR(36) NOT NULL,
    nom VARCHAR(255) NOT NULL,
    categorie_competence VARCHAR(100),
    UNIQUE KEY uq_dim_competence_nk (id_competence_nk),
    INDEX idx_dim_competence_nom (nom)
);


CREATE TABLE IF NOT EXISTS dim_offre (
    id_offre_sk INT AUTO_INCREMENT PRIMARY KEY,
    id_offre_nk VARCHAR(36) NOT NULL,
    titre VARCHAR(255),
    description TEXT,
    departement_source VARCHAR(255),
    departement_normalise VARCHAR(255),
    localisation VARCHAR(255),
    statut VARCHAR(50),
    date_publication DATE,
    date_limite DATE,
    date_creation DATETIME,
    duree_offre_jours INT,
    est_active BOOLEAN,
    UNIQUE KEY uq_dim_offre_nk (id_offre_nk),
    INDEX idx_dim_offre_departement (departement_normalise),
    INDEX idx_dim_offre_statut (statut)
);


-- -----------------------------------------------------------------------------
-- 1.2.7 Creation des tables de faits du Data Warehouse
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fait_recrutement (
    id_fait_recrutement BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_temps_depot INT,
    id_departement_sk INT NULL,
    id_offre_sk INT NULL,
    id_candidature_nk VARCHAR(36) NOT NULL,
    applicant_email VARCHAR(255),
    applicant_name VARCHAR(255),
    statut VARCHAR(50),
    statut_normalise VARCHAR(50),
    match_score INT,
    categorie_score VARCHAR(20),
    est_accepte BOOLEAN,
    a_passe_entretien BOOLEAN,
    titre_offre VARCHAR(255),
    departement_normalise VARCHAR(255),
    localisation VARCHAR(255),
    type_recrutement VARCHAR(50),
    duree_offre_jours INT,
    nb_competences_candidat INT DEFAULT 0,
    nb_competences_offre INT DEFAULT 0,
    nb_competences_matchees INT DEFAULT 0,
    date_chargement DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_fait_recrutement_candidature (id_candidature_nk),
    INDEX idx_fait_recrutement_temps (id_temps_depot),
    INDEX idx_fait_recrutement_dept (id_departement_sk),
    INDEX idx_fait_recrutement_offre (id_offre_sk),
    INDEX idx_fait_recrutement_statut (statut_normalise)
);


CREATE TABLE IF NOT EXISTS fait_effectifs (
    id_fait_effectif BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_temps_embauche INT,
    id_employe_sk INT,
    id_departement_sk INT NULL,
    id_poste_sk INT NULL,
    id_employe_nk VARCHAR(36),
    type_contrat VARCHAR(50),
    anciennete_jours INT,
    anciennete_mois INT,
    nb_employes INT DEFAULT 1,
    est_actif BOOLEAN,
    is_parti BOOLEAN,
    date_chargement DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_fait_effectifs_employe (id_employe_nk),
    INDEX idx_fait_effectifs_temps (id_temps_embauche),
    INDEX idx_fait_effectifs_dept (id_departement_sk),
    INDEX idx_fait_effectifs_poste (id_poste_sk)
);


CREATE TABLE IF NOT EXISTS fait_mobilite (
    id_fait_mobilite BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_temps_sk INT,
    id_departement_sk INT NULL,
    id_poste_sk INT NULL,
    annee_snapshot INT,
    mois_snapshot INT,
    trimestre INT,
    libelle_trimestre VARCHAR(5),
    departement VARCHAR(255),
    poste VARCHAR(255),
    type_contrat VARCHAR(50),
    nb_embauches_mois INT,
    nb_departs_mois INT,
    effectif_cumule_departement INT,
    taux_croissance_pct DECIMAL(10,2),
    taux_depart_pct DECIMAL(10,2),
    date_chargement DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fait_mobilite_temps (id_temps_sk),
    INDEX idx_fait_mobilite_dept (id_departement_sk),
    INDEX idx_fait_mobilite_poste (id_poste_sk)
);


CREATE TABLE IF NOT EXISTS fait_competences (
    id_fait_competence BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_temps_sk INT NULL,
    id_competence_sk INT,
    id_offre_sk INT NULL,
    competence VARCHAR(255),
    categorie_competence VARCHAR(100),
    departement_normalise VARCHAR(255),
    nb_candidats INT DEFAULT 0,
    nb_offres INT DEFAULT 0,
    score_moyen DECIMAL(10,2),
    date_chargement DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fait_competences_temps (id_temps_sk),
    INDEX idx_fait_competences_competence (id_competence_sk),
    INDEX idx_fait_competences_offre (id_offre_sk)
);


-- -----------------------------------------------------------------------------
-- 1.2.8 Chargement de la dimension temps
-- -----------------------------------------------------------------------------
-- Cette requete genere le calendrier de 2014 a 2026.

INSERT IGNORE INTO dim_temps (
    id_temps_sk,
    date_jour,
    jour,
    mois,
    trimestre,
    annee,
    annee_mois,
    annee_mois_libelle,
    annee_trimestre,
    nom_mois,
    nom_mois_court,
    nom_jour,
    libelle_trimestre,
    semestre,
    annee_semestre,
    debut_mois,
    fin_mois,
    est_debut_mois,
    est_fin_mois,
    est_annee_courante,
    est_mois_courant,
    est_weekend
)
SELECT
    CAST(DATE_FORMAT(date_jour, '%Y%m%d') AS UNSIGNED) AS id_temps_sk,
    date_jour,
    DAY(date_jour) AS jour,
    MONTH(date_jour) AS mois,
    QUARTER(date_jour) AS trimestre,
    YEAR(date_jour) AS annee,
    CAST(DATE_FORMAT(date_jour, '%Y%m') AS UNSIGNED) AS annee_mois,
    DATE_FORMAT(date_jour, '%Y-%m') AS annee_mois_libelle,
    CONCAT(YEAR(date_jour), '-T', QUARTER(date_jour)) AS annee_trimestre,
    CASE MONTH(date_jour)
        WHEN 1 THEN 'Janvier'
        WHEN 2 THEN 'Fevrier'
        WHEN 3 THEN 'Mars'
        WHEN 4 THEN 'Avril'
        WHEN 5 THEN 'Mai'
        WHEN 6 THEN 'Juin'
        WHEN 7 THEN 'Juillet'
        WHEN 8 THEN 'Aout'
        WHEN 9 THEN 'Septembre'
        WHEN 10 THEN 'Octobre'
        WHEN 11 THEN 'Novembre'
        WHEN 12 THEN 'Decembre'
    END AS nom_mois,
    CASE MONTH(date_jour)
        WHEN 1 THEN 'Jan'
        WHEN 2 THEN 'Fev'
        WHEN 3 THEN 'Mar'
        WHEN 4 THEN 'Avr'
        WHEN 5 THEN 'Mai'
        WHEN 6 THEN 'Juin'
        WHEN 7 THEN 'Juil'
        WHEN 8 THEN 'Aout'
        WHEN 9 THEN 'Sep'
        WHEN 10 THEN 'Oct'
        WHEN 11 THEN 'Nov'
        WHEN 12 THEN 'Dec'
    END AS nom_mois_court,
    CASE DAYOFWEEK(date_jour)
        WHEN 1 THEN 'Dimanche'
        WHEN 2 THEN 'Lundi'
        WHEN 3 THEN 'Mardi'
        WHEN 4 THEN 'Mercredi'
        WHEN 5 THEN 'Jeudi'
        WHEN 6 THEN 'Vendredi'
        WHEN 7 THEN 'Samedi'
    END AS nom_jour,
    CONCAT('T', QUARTER(date_jour)) AS libelle_trimestre,
    CASE WHEN MONTH(date_jour) <= 6 THEN 'S1' ELSE 'S2' END AS semestre,
    CONCAT(YEAR(date_jour), '-S', CASE WHEN MONTH(date_jour) <= 6 THEN 1 ELSE 2 END) AS annee_semestre,
    DATE_ADD(date_jour, INTERVAL 1 - DAY(date_jour) DAY) AS debut_mois,
    LAST_DAY(date_jour) AS fin_mois,
    CASE WHEN date_jour = DATE_ADD(date_jour, INTERVAL 1 - DAY(date_jour) DAY) THEN TRUE ELSE FALSE END AS est_debut_mois,
    CASE WHEN date_jour = LAST_DAY(date_jour) THEN TRUE ELSE FALSE END AS est_fin_mois,
    CASE WHEN YEAR(date_jour) = YEAR(CURDATE()) THEN TRUE ELSE FALSE END AS est_annee_courante,
    CASE WHEN YEAR(date_jour) = YEAR(CURDATE()) AND MONTH(date_jour) = MONTH(CURDATE()) THEN TRUE ELSE FALSE END AS est_mois_courant,
    CASE WHEN DAYOFWEEK(date_jour) IN (1, 7) THEN TRUE ELSE FALSE END AS est_weekend
FROM (
    SELECT DATE_ADD(DATE('2014-01-01'), INTERVAL n.num DAY) AS date_jour
    FROM (
        SELECT
            d1.n * 1000 + d2.n * 100 + d3.n * 10 + d4.n AS num
        FROM
            (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
             UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
        CROSS JOIN
            (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
             UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
        CROSS JOIN
            (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
             UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
        CROSS JOIN
            (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
             UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
    ) n
) dates_generees
WHERE date_jour BETWEEN DATE('2014-01-01') AND DATE('2026-12-31');


-- -----------------------------------------------------------------------------
-- 1.2.9 Chargement des dimensions simples
-- -----------------------------------------------------------------------------

INSERT INTO dim_departement (
    id_departement_nk,
    nom,
    description,
    date_debut_validite,
    est_actuel,
    version
)
SELECT
    department_nk,
    nom,
    description,
    CURDATE(),
    TRUE,
    1
FROM v_stg_departments_clean
ON DUPLICATE KEY UPDATE
    nom = VALUES(nom),
    description = VALUES(description);


INSERT INTO dim_poste (
    id_poste_nk,
    titre,
    description,
    id_departement_nk,
    date_debut_validite,
    est_actuel,
    version
)
SELECT
    position_nk,
    titre,
    description,
    department_nk,
    CURDATE(),
    TRUE,
    1
FROM v_stg_positions_clean
ON DUPLICATE KEY UPDATE
    titre = VALUES(titre),
    description = VALUES(description),
    id_departement_nk = VALUES(id_departement_nk);


INSERT INTO dim_competence (
    id_competence_nk,
    nom,
    categorie_competence
)
SELECT
    skill_nk,
    nom,
    categorie_competence
FROM v_stg_skills_clean
ON DUPLICATE KEY UPDATE
    nom = VALUES(nom),
    categorie_competence = VALUES(categorie_competence);


INSERT INTO dim_offre (
    id_offre_nk,
    titre,
    description,
    departement_source,
    departement_normalise,
    localisation,
    statut,
    date_publication,
    date_limite,
    date_creation,
    duree_offre_jours,
    est_active
)
SELECT
    offer_nk,
    titre,
    description,
    departement_source,
    departement_normalise,
    localisation,
    statut,
    date_publication,
    date_limite,
    date_creation,
    duree_offre_jours,
    est_active
FROM v_stg_job_offers_clean
ON DUPLICATE KEY UPDATE
    titre = VALUES(titre),
    description = VALUES(description),
    departement_source = VALUES(departement_source),
    departement_normalise = VALUES(departement_normalise),
    localisation = VALUES(localisation),
    statut = VALUES(statut),
    date_publication = VALUES(date_publication),
    date_limite = VALUES(date_limite),
    date_creation = VALUES(date_creation),
    duree_offre_jours = VALUES(duree_offre_jours),
    est_active = VALUES(est_active);


-- -----------------------------------------------------------------------------
-- 1.2.10 Gestion historique SCD Type 2 pour dim_employe
-- -----------------------------------------------------------------------------
-- Principe :
-- - si un employe change de contrat, departement, poste ou statut depart,
--   l'ancienne version est fermee.
-- - une nouvelle version est inseree avec est_actuel = TRUE.

UPDATE dim_employe de
JOIN v_stg_employees_clean s
    ON de.id_employe_nk = s.employee_nk
   AND de.est_actuel = TRUE
LEFT JOIN v_stg_departments_clean d
    ON d.department_nk = s.department_nk
LEFT JOIN v_stg_positions_clean p
    ON p.position_nk = s.position_nk
SET
    de.date_fin_validite = DATE_SUB(CURDATE(), INTERVAL 1 DAY),
    de.est_actuel = FALSE
WHERE
    COALESCE(de.email, '') <> COALESCE(s.email, '')
    OR COALESCE(de.type_contrat, '') <> COALESCE(s.type_contrat, '')
    OR COALESCE(de.id_departement_nk, '') <> COALESCE(s.department_nk, '')
    OR COALESCE(de.id_poste_nk, '') <> COALESCE(s.position_nk, '')
    OR COALESCE(de.date_depart, DATE('1900-01-01')) <> COALESCE(s.date_depart, DATE('1900-01-01'))
    OR COALESCE(de.motif_depart, '') <> COALESCE(s.motif_depart, '');


INSERT INTO dim_employe (
    id_employe_nk,
    prenom,
    nom,
    nom_complet,
    email,
    telephone,
    type_contrat,
    date_embauche,
    anciennete_jours,
    anciennete_mois,
    id_departement_nk,
    departement,
    id_poste_nk,
    poste,
    tranche_anciennete,
    profil_fidelisation,
    date_depart,
    motif_depart,
    is_parti,
    date_debut_validite,
    date_fin_validite,
    est_actuel,
    version
)
SELECT
    s.employee_nk,
    s.prenom,
    s.nom,
    s.nom_complet,
    s.email,
    s.telephone,
    s.type_contrat,
    s.date_embauche,
    s.anciennete_jours,
    s.anciennete_mois,
    s.department_nk,
    d.nom AS departement,
    s.position_nk,
    p.titre AS poste,
    CASE
        WHEN s.anciennete_mois < 6 THEN '0-6 mois'
        WHEN s.anciennete_mois < 12 THEN '6-12 mois'
        WHEN s.anciennete_mois < 36 THEN '1-3 ans'
        WHEN s.anciennete_mois < 60 THEN '3-5 ans'
        WHEN s.anciennete_mois < 120 THEN '5-10 ans'
        ELSE '10+ ans'
    END AS tranche_anciennete,
    CASE
        WHEN s.anciennete_mois < 6 THEN 'Nouveau'
        WHEN s.anciennete_mois < 12 THEN 'En integration'
        WHEN s.anciennete_mois < 36 THEN 'Fidele'
        WHEN s.anciennete_mois < 60 THEN 'Ancre'
        ELSE 'Expert fidele'
    END AS profil_fidelisation,
    s.date_depart,
    s.motif_depart,
    s.is_parti,
    CURDATE(),
    NULL,
    TRUE,
    COALESCE((
        SELECT MAX(old.version) + 1
        FROM dim_employe old
        WHERE old.id_employe_nk = s.employee_nk
    ), 1) AS version
FROM v_stg_employees_clean s
LEFT JOIN v_stg_departments_clean d
    ON d.department_nk = s.department_nk
LEFT JOIN v_stg_positions_clean p
    ON p.position_nk = s.position_nk
LEFT JOIN dim_employe current_de
    ON current_de.id_employe_nk = s.employee_nk
   AND current_de.est_actuel = TRUE
WHERE current_de.id_employe_sk IS NULL;


-- -----------------------------------------------------------------------------
-- 1.2.11 Chargement de fait_recrutement
-- -----------------------------------------------------------------------------

INSERT INTO fait_recrutement (
    id_temps_depot,
    id_departement_sk,
    id_offre_sk,
    id_candidature_nk,
    applicant_email,
    applicant_name,
    statut,
    statut_normalise,
    match_score,
    categorie_score,
    est_accepte,
    a_passe_entretien,
    titre_offre,
    departement_normalise,
    localisation,
    type_recrutement,
    duree_offre_jours,
    nb_competences_candidat,
    nb_competences_offre,
    nb_competences_matchees
)
SELECT
    dt.id_temps_sk AS id_temps_depot,
    dd.id_departement_sk,
    dof.id_offre_sk,
    a.application_nk,
    a.applicant_email,
    a.applicant_name,
    a.statut,
    CASE
        WHEN a.statut IN ('ACCEPTED', 'ACCEPTE') THEN 'ACCEPTED'
        WHEN a.statut IN ('REJECTED', 'REJETE') THEN 'REJECTED'
        WHEN a.statut IN ('PENDING', 'EN ATTENTE') THEN 'PENDING'
        WHEN a.statut IN ('REVIEWING', 'EN REVISION') THEN 'REVIEWING'
        WHEN a.statut = 'INTERVIEW_SCHEDULED' THEN 'INTERVIEW_SCHEDULED'
        ELSE a.statut
    END AS statut_normalise,
    a.match_score,
    a.categorie_score,
    a.est_accepte,
    a.a_passe_entretien,
    o.titre AS titre_offre,
    o.departement_normalise,
    o.localisation,
    CASE
        WHEN o.localisation IN ('Tunis', 'Sfax', 'Sousse', 'Monastir', 'Ben Arous', 'Ariana') THEN 'Recrutement Interne'
        WHEN o.localisation = 'Remote' THEN 'Recrutement Interne'
        WHEN o.localisation IS NULL THEN 'Non defini'
        ELSE 'Recrutement Externe'
    END AS type_recrutement,
    o.duree_offre_jours,
    COALESCE(cand.nb_competences_candidat, 0) AS nb_competences_candidat,
    COALESCE(offr.nb_competences_offre, 0) AS nb_competences_offre,
    COALESCE(matchs.nb_competences_matchees, 0) AS nb_competences_matchees
FROM v_stg_applications_clean a
LEFT JOIN v_stg_job_offers_clean o
    ON o.offer_nk = a.offer_nk
LEFT JOIN dim_temps dt
    ON dt.date_jour = a.date_candidature
LEFT JOIN dim_offre dof
    ON dof.id_offre_nk = a.offer_nk
LEFT JOIN dim_departement dd
    ON dd.nom = o.departement_normalise
   AND dd.est_actuel = TRUE
LEFT JOIN (
    SELECT application_id, COUNT(*) AS nb_competences_candidat
    FROM sirh_staging.stg_application_skills
    GROUP BY application_id
) cand
    ON cand.application_id = a.application_nk
LEFT JOIN (
    SELECT job_offer_id, COUNT(*) AS nb_competences_offre
    FROM sirh_staging.stg_job_offer_skills
    GROUP BY job_offer_id
) offr
    ON offr.job_offer_id = a.offer_nk
LEFT JOIN (
    SELECT
        aps.application_id,
        app.job_offer_id,
        COUNT(*) AS nb_competences_matchees
    FROM sirh_staging.stg_application_skills aps
    JOIN sirh_staging.stg_applications app
        ON app.id = aps.application_id
    JOIN sirh_staging.stg_job_offer_skills jos
        ON jos.job_offer_id = app.job_offer_id
       AND jos.skill_id = aps.skill_id
    GROUP BY aps.application_id, app.job_offer_id
) matchs
    ON matchs.application_id = a.application_nk
   AND matchs.job_offer_id = a.offer_nk
ON DUPLICATE KEY UPDATE
    id_temps_depot = VALUES(id_temps_depot),
    id_departement_sk = VALUES(id_departement_sk),
    id_offre_sk = VALUES(id_offre_sk),
    applicant_email = VALUES(applicant_email),
    applicant_name = VALUES(applicant_name),
    statut = VALUES(statut),
    statut_normalise = VALUES(statut_normalise),
    match_score = VALUES(match_score),
    categorie_score = VALUES(categorie_score),
    est_accepte = VALUES(est_accepte),
    a_passe_entretien = VALUES(a_passe_entretien),
    titre_offre = VALUES(titre_offre),
    departement_normalise = VALUES(departement_normalise),
    localisation = VALUES(localisation),
    type_recrutement = VALUES(type_recrutement),
    duree_offre_jours = VALUES(duree_offre_jours),
    nb_competences_candidat = VALUES(nb_competences_candidat),
    nb_competences_offre = VALUES(nb_competences_offre),
    nb_competences_matchees = VALUES(nb_competences_matchees),
    date_chargement = CURRENT_TIMESTAMP;


-- -----------------------------------------------------------------------------
-- 1.2.12 Chargement de fait_effectifs
-- -----------------------------------------------------------------------------

INSERT INTO fait_effectifs (
    id_temps_embauche,
    id_employe_sk,
    id_departement_sk,
    id_poste_sk,
    id_employe_nk,
    type_contrat,
    anciennete_jours,
    anciennete_mois,
    nb_employes,
    est_actif,
    is_parti
)
SELECT
    dt.id_temps_sk AS id_temps_embauche,
    de.id_employe_sk,
    dd.id_departement_sk,
    dp.id_poste_sk,
    de.id_employe_nk,
    de.type_contrat,
    de.anciennete_jours,
    de.anciennete_mois,
    1 AS nb_employes,
    CASE WHEN de.date_depart IS NULL THEN TRUE ELSE FALSE END AS est_actif,
    de.is_parti
FROM dim_employe de
LEFT JOIN dim_temps dt
    ON dt.date_jour = de.date_embauche
LEFT JOIN dim_departement dd
    ON dd.id_departement_nk = de.id_departement_nk
   AND dd.est_actuel = TRUE
LEFT JOIN dim_poste dp
    ON dp.id_poste_nk = de.id_poste_nk
   AND dp.est_actuel = TRUE
WHERE de.est_actuel = TRUE
ON DUPLICATE KEY UPDATE
    id_temps_embauche = VALUES(id_temps_embauche),
    id_employe_sk = VALUES(id_employe_sk),
    id_departement_sk = VALUES(id_departement_sk),
    id_poste_sk = VALUES(id_poste_sk),
    type_contrat = VALUES(type_contrat),
    anciennete_jours = VALUES(anciennete_jours),
    anciennete_mois = VALUES(anciennete_mois),
    est_actif = VALUES(est_actif),
    is_parti = VALUES(is_parti),
    date_chargement = CURRENT_TIMESTAMP;


-- -----------------------------------------------------------------------------
-- 1.2.13 Chargement de fait_mobilite
-- -----------------------------------------------------------------------------
-- Snapshot mensuel : departement x poste x type_contrat x mois.

TRUNCATE TABLE fait_mobilite;

INSERT INTO fait_mobilite (
    id_temps_sk,
    id_departement_sk,
    id_poste_sk,
    annee_snapshot,
    mois_snapshot,
    trimestre,
    libelle_trimestre,
    departement,
    poste,
    type_contrat,
    nb_embauches_mois,
    nb_departs_mois,
    effectif_cumule_departement,
    taux_croissance_pct,
    taux_depart_pct
)
SELECT
    dt.id_temps_sk,
    dd.id_departement_sk,
    dp.id_poste_sk,
    dt.annee AS annee_snapshot,
    dt.mois AS mois_snapshot,
    dt.trimestre,
    dt.libelle_trimestre,
    de.departement,
    de.poste,
    de.type_contrat,
    SUM(CASE
        WHEN YEAR(de.date_embauche) = dt.annee
         AND MONTH(de.date_embauche) = dt.mois
        THEN 1 ELSE 0
    END) AS nb_embauches_mois,
    SUM(CASE
        WHEN de.date_depart IS NOT NULL
         AND YEAR(de.date_depart) = dt.annee
         AND MONTH(de.date_depart) = dt.mois
        THEN 1 ELSE 0
    END) AS nb_departs_mois,
    SUM(CASE
        WHEN de.date_embauche <= dt.fin_mois
         AND (de.date_depart IS NULL OR de.date_depart > dt.fin_mois)
        THEN 1 ELSE 0
    END) AS effectif_cumule_departement,
    ROUND(
        SUM(CASE
            WHEN YEAR(de.date_embauche) = dt.annee
             AND MONTH(de.date_embauche) = dt.mois
            THEN 1 ELSE 0
        END) * 100.0 / NULLIF(
            SUM(CASE
                WHEN de.date_embauche <= dt.fin_mois
                 AND (de.date_depart IS NULL OR de.date_depart > dt.fin_mois)
                THEN 1 ELSE 0
            END), 0
        ),
        2
    ) AS taux_croissance_pct,
    ROUND(
        SUM(CASE
            WHEN de.date_depart IS NOT NULL
             AND YEAR(de.date_depart) = dt.annee
             AND MONTH(de.date_depart) = dt.mois
            THEN 1 ELSE 0
        END) * 100.0 / NULLIF(
            SUM(CASE
                WHEN de.date_embauche <= dt.fin_mois
                 AND (de.date_depart IS NULL OR de.date_depart > dt.fin_mois)
                THEN 1 ELSE 0
            END), 0
        ),
        2
    ) AS taux_depart_pct
FROM dim_temps dt
JOIN dim_employe de
    ON de.date_embauche <= dt.fin_mois
   AND de.est_actuel = TRUE
LEFT JOIN dim_departement dd
    ON dd.id_departement_nk = de.id_departement_nk
   AND dd.est_actuel = TRUE
LEFT JOIN dim_poste dp
    ON dp.id_poste_nk = de.id_poste_nk
   AND dp.est_actuel = TRUE
WHERE dt.est_debut_mois = TRUE
  AND dt.date_jour BETWEEN DATE('2014-01-01') AND CURDATE()
GROUP BY
    dt.id_temps_sk,
    dd.id_departement_sk,
    dp.id_poste_sk,
    dt.annee,
    dt.mois,
    dt.trimestre,
    dt.libelle_trimestre,
    de.departement,
    de.poste,
    de.type_contrat;


-- -----------------------------------------------------------------------------
-- 1.2.14 Chargement de fait_competences
-- -----------------------------------------------------------------------------

TRUNCATE TABLE fait_competences;

INSERT INTO fait_competences (
    id_temps_sk,
    id_competence_sk,
    id_offre_sk,
    competence,
    categorie_competence,
    departement_normalise,
    nb_candidats,
    nb_offres,
    score_moyen
)
SELECT
    MIN(dt.id_temps_sk) AS id_temps_sk,
    dc.id_competence_sk,
    dof.id_offre_sk,
    dc.nom AS competence,
    dc.categorie_competence,
    dof.departement_normalise,
    COUNT(DISTINCT aps.application_id) AS nb_candidats,
    COUNT(DISTINCT jos.job_offer_id) AS nb_offres,
    ROUND(AVG(a.match_score), 2) AS score_moyen
FROM sirh_staging.stg_job_offer_skills jos
JOIN dim_competence dc
    ON dc.id_competence_nk = jos.skill_id
LEFT JOIN dim_offre dof
    ON dof.id_offre_nk = jos.job_offer_id
LEFT JOIN sirh_staging.stg_applications a
    ON a.job_offer_id = jos.job_offer_id
LEFT JOIN sirh_staging.stg_application_skills aps
    ON aps.application_id = a.id
   AND aps.skill_id = jos.skill_id
LEFT JOIN dim_temps dt
    ON dt.date_jour = a.applied_date
GROUP BY
    dc.id_competence_sk,
    dof.id_offre_sk,
    dc.nom,
    dc.categorie_competence,
    dof.departement_normalise;


-- -----------------------------------------------------------------------------
-- 1.2.15 Table d'audit ETL
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS etl_audit_log (
    id_log BIGINT AUTO_INCREMENT PRIMARY KEY,
    nom_pipeline VARCHAR(100),
    couche VARCHAR(50),
    table_nom VARCHAR(100),
    nb_lignes BIGINT,
    statut VARCHAR(30),
    message TEXT,
    date_execution DATETIME DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO etl_audit_log (
    nom_pipeline,
    couche,
    table_nom,
    nb_lignes,
    statut,
    message
)
SELECT 'pipeline_bi_partie_1', 'staging', 'stg_employees', COUNT(*), 'OK', 'Chargement staging employes'
FROM sirh_staging.stg_employees
UNION ALL
SELECT 'pipeline_bi_partie_1', 'staging', 'stg_applications', COUNT(*), 'OK', 'Chargement staging candidatures'
FROM sirh_staging.stg_applications
UNION ALL
SELECT 'pipeline_bi_partie_1', 'dwh', 'dim_employe', COUNT(*), 'OK', 'Chargement dimension employe'
FROM sirh_dwh.dim_employe
UNION ALL
SELECT 'pipeline_bi_partie_1', 'dwh', 'fait_recrutement', COUNT(*), 'OK', 'Chargement fait recrutement'
FROM sirh_dwh.fait_recrutement
UNION ALL
SELECT 'pipeline_bi_partie_1', 'dwh', 'fait_effectifs', COUNT(*), 'OK', 'Chargement fait effectifs'
FROM sirh_dwh.fait_effectifs
UNION ALL
SELECT 'pipeline_bi_partie_1', 'dwh', 'fait_mobilite', COUNT(*), 'OK', 'Chargement fait mobilite'
FROM sirh_dwh.fait_mobilite;


-- -----------------------------------------------------------------------------
-- 1.2.16 Controle qualite des donnees
-- -----------------------------------------------------------------------------

-- Emails employes manquants
SELECT
    'EMAIL_EMPLOYE_NULL' AS controle,
    COUNT(*) AS nb_anomalies
FROM sirh_staging.stg_employees
WHERE email IS NULL OR TRIM(email) = '';


-- Emails employes dupliques
SELECT
    LOWER(TRIM(email)) AS email,
    COUNT(*) AS nb_doublons
FROM sirh_staging.stg_employees
WHERE email IS NOT NULL
GROUP BY LOWER(TRIM(email))
HAVING COUNT(*) > 1;


-- Candidatures sans offre
SELECT
    a.id AS application_id,
    a.job_offer_id
FROM sirh_staging.stg_applications a
LEFT JOIN sirh_staging.stg_job_offers o
    ON o.id = a.job_offer_id
WHERE o.id IS NULL;


-- Scores IA hors bornes
SELECT
    id AS application_id,
    applicant_email,
    match_score
FROM sirh_staging.stg_applications
WHERE match_score < 0
   OR match_score > 100;


-- Dates de candidature dans le futur
SELECT
    id AS application_id,
    applicant_email,
    applied_date
FROM sirh_staging.stg_applications
WHERE applied_date > CURDATE();


-- Employes sans departement reconnu
SELECT
    e.id AS employee_id,
    e.email,
    e.department_id
FROM sirh_staging.stg_employees e
LEFT JOIN sirh_staging.stg_departments d
    ON d.id = e.department_id
WHERE e.department_id IS NOT NULL
  AND d.id IS NULL;


-- Employes sans poste reconnu
SELECT
    e.id AS employee_id,
    e.email,
    e.position_id
FROM sirh_staging.stg_employees e
LEFT JOIN sirh_staging.stg_positions p
    ON p.id = e.position_id
WHERE e.position_id IS NOT NULL
  AND p.id IS NULL;


-- Resume des controles qualite
SELECT
    'Employes sans email' AS controle,
    COUNT(*) AS nb_anomalies
FROM sirh_staging.stg_employees
WHERE email IS NULL OR TRIM(email) = ''
UNION ALL
SELECT
    'Employes sans departement valide',
    COUNT(*)
FROM sirh_staging.stg_employees e
LEFT JOIN sirh_staging.stg_departments d
    ON d.id = e.department_id
WHERE e.department_id IS NOT NULL
  AND d.id IS NULL
UNION ALL
SELECT
    'Candidatures sans offre valide',
    COUNT(*)
FROM sirh_staging.stg_applications a
LEFT JOIN sirh_staging.stg_job_offers o
    ON o.id = a.job_offer_id
WHERE o.id IS NULL
UNION ALL
SELECT
    'Scores IA invalides',
    COUNT(*)
FROM sirh_staging.stg_applications
WHERE match_score < 0 OR match_score > 100
UNION ALL
SELECT
    'Dates candidature futures',
    COUNT(*)
FROM sirh_staging.stg_applications
WHERE applied_date > CURDATE();


-- -----------------------------------------------------------------------------
-- 1.2.17 Planification automatique du chargement
-- -----------------------------------------------------------------------------
-- Option SQL pure : evenement MySQL.
-- Pour un vrai projet BI, Airflow est plus robuste. Cette requete documente
-- la logique de batch quotidien a 02:00.
--
-- Necessite : SET GLOBAL event_scheduler = ON;
-- Peut demander des droits administrateur MySQL.

CREATE TABLE IF NOT EXISTS etl_planning (
    id_planning INT AUTO_INCREMENT PRIMARY KEY,
    nom_pipeline VARCHAR(100),
    frequence VARCHAR(50),
    heure_execution TIME,
    outil_planification VARCHAR(100),
    statut VARCHAR(30),
    description TEXT
);

INSERT INTO etl_planning (
    nom_pipeline,
    frequence,
    heure_execution,
    outil_planification,
    statut,
    description
)
VALUES
(
    'pipeline_bi_sirh',
    'Quotidien',
    '02:00:00',
    'Airflow ou MySQL Event Scheduler',
    'ACTIF',
    'Extraction sources, chargement staging, transformations DWH, tests qualite et refresh dashboards'
)
ON DUPLICATE KEY UPDATE
    frequence = VALUES(frequence),
    heure_execution = VALUES(heure_execution),
    outil_planification = VALUES(outil_planification),
    statut = VALUES(statut),
    description = VALUES(description);


-- Exemple de controle de la fraicheur des donnees staging
SELECT
    'stg_employees' AS table_nom,
    MAX(extracted_at) AS derniere_extraction,
    TIMESTAMPDIFF(HOUR, MAX(extracted_at), NOW()) AS age_heures,
    CASE
        WHEN TIMESTAMPDIFF(HOUR, MAX(extracted_at), NOW()) <= 25 THEN 'OK'
        WHEN TIMESTAMPDIFF(HOUR, MAX(extracted_at), NOW()) <= 48 THEN 'WARNING'
        ELSE 'ERROR'
    END AS statut_fraicheur
FROM sirh_staging.stg_employees
UNION ALL
SELECT
    'stg_applications',
    MAX(extracted_at),
    TIMESTAMPDIFF(HOUR, MAX(extracted_at), NOW()),
    CASE
        WHEN TIMESTAMPDIFF(HOUR, MAX(extracted_at), NOW()) <= 25 THEN 'OK'
        WHEN TIMESTAMPDIFF(HOUR, MAX(extracted_at), NOW()) <= 48 THEN 'WARNING'
        ELSE 'ERROR'
    END
FROM sirh_staging.stg_applications
UNION ALL
SELECT
    'stg_job_offers',
    MAX(extracted_at),
    TIMESTAMPDIFF(HOUR, MAX(extracted_at), NOW()),
    CASE
        WHEN TIMESTAMPDIFF(HOUR, MAX(extracted_at), NOW()) <= 25 THEN 'OK'
        WHEN TIMESTAMPDIFF(HOUR, MAX(extracted_at), NOW()) <= 48 THEN 'WARNING'
        ELSE 'ERROR'
    END
FROM sirh_staging.stg_job_offers;


-- =============================================================================
-- 1.3 MODELISATION DIMENSIONNELLE
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.3.1 Visualisation logique du schema en etoile
-- -----------------------------------------------------------------------------

SELECT
    'fait_recrutement' AS table_fait,
    'dim_temps, dim_departement, dim_offre, dim_competence' AS dimensions_liees,
    '1 ligne = 1 candidature' AS granularite,
    'match_score, est_accepte, a_passe_entretien, nb_competences_matchees' AS mesures
UNION ALL
SELECT
    'fait_effectifs',
    'dim_temps, dim_employe, dim_departement, dim_poste',
    '1 ligne = 1 employe actif ou historique courant',
    'nb_employes, anciennete_jours, anciennete_mois'
UNION ALL
SELECT
    'fait_mobilite',
    'dim_temps, dim_departement, dim_poste',
    '1 ligne = 1 departement x poste x type_contrat x mois',
    'nb_embauches_mois, nb_departs_mois, effectif_cumule, taux_croissance_pct'
UNION ALL
SELECT
    'fait_competences',
    'dim_temps, dim_competence, dim_offre',
    '1 ligne = 1 competence x offre',
    'nb_candidats, nb_offres, score_moyen';


-- -----------------------------------------------------------------------------
-- 1.3.2 Requete de controle des dimensions
-- -----------------------------------------------------------------------------

SELECT 'dim_temps' AS table_dimension, COUNT(*) AS nb_lignes FROM sirh_dwh.dim_temps
UNION ALL
SELECT 'dim_departement', COUNT(*) FROM sirh_dwh.dim_departement
UNION ALL
SELECT 'dim_poste', COUNT(*) FROM sirh_dwh.dim_poste
UNION ALL
SELECT 'dim_employe', COUNT(*) FROM sirh_dwh.dim_employe
UNION ALL
SELECT 'dim_competence', COUNT(*) FROM sirh_dwh.dim_competence
UNION ALL
SELECT 'dim_offre', COUNT(*) FROM sirh_dwh.dim_offre;


-- -----------------------------------------------------------------------------
-- 1.3.3 Requete de controle des tables de faits
-- -----------------------------------------------------------------------------

SELECT 'fait_recrutement' AS table_fait, COUNT(*) AS nb_lignes FROM sirh_dwh.fait_recrutement
UNION ALL
SELECT 'fait_effectifs', COUNT(*) FROM sirh_dwh.fait_effectifs
UNION ALL
SELECT 'fait_mobilite', COUNT(*) FROM sirh_dwh.fait_mobilite
UNION ALL
SELECT 'fait_competences', COUNT(*) FROM sirh_dwh.fait_competences;


-- -----------------------------------------------------------------------------
-- 1.3.4 Creation des vues agregees pour optimiser les dashboards
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_effectifs_mensuels AS
SELECT
    fm.annee_snapshot AS annee,
    fm.mois_snapshot AS mois,
    fm.libelle_trimestre,
    fm.departement,
    fm.poste,
    fm.type_contrat,
    SUM(fm.nb_embauches_mois) AS nb_embauches_mois,
    SUM(fm.nb_departs_mois) AS nb_departs_mois,
    MAX(fm.effectif_cumule_departement) AS effectif_cumule,
    ROUND(AVG(fm.taux_croissance_pct), 2) AS taux_croissance_moyen_pct,
    ROUND(AVG(fm.taux_depart_pct), 2) AS taux_depart_moyen_pct
FROM fait_mobilite fm
GROUP BY
    fm.annee_snapshot,
    fm.mois_snapshot,
    fm.libelle_trimestre,
    fm.departement,
    fm.poste,
    fm.type_contrat;


CREATE OR REPLACE VIEW vw_funnel_recrutement AS
SELECT
    annee,
    mois,
    departement_normalise AS departement,
    COUNT(*) AS nb_candidatures,
    SUM(CASE WHEN statut_normalise = 'PENDING' THEN 1 ELSE 0 END) AS nb_pending,
    SUM(CASE WHEN statut_normalise = 'REVIEWING' THEN 1 ELSE 0 END) AS nb_reviewing,
    SUM(CASE WHEN statut_normalise = 'INTERVIEW_SCHEDULED' THEN 1 ELSE 0 END) AS nb_interview,
    SUM(CASE WHEN statut_normalise = 'ACCEPTED' THEN 1 ELSE 0 END) AS nb_acceptes,
    SUM(CASE WHEN statut_normalise = 'REJECTED' THEN 1 ELSE 0 END) AS nb_rejetes,
    ROUND(SUM(CASE WHEN statut_normalise = 'ACCEPTED' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS taux_acceptation_pct,
    ROUND(AVG(match_score), 2) AS score_moyen
FROM (
    SELECT
        fr.*,
        dt.annee,
        dt.mois
    FROM fait_recrutement fr
    LEFT JOIN dim_temps dt
        ON dt.id_temps_sk = fr.id_temps_depot
) base
GROUP BY
    annee,
    mois,
    departement_normalise;


CREATE OR REPLACE VIEW vw_competences_demandees AS
SELECT
    fc.competence,
    fc.categorie_competence,
    fc.departement_normalise,
    SUM(fc.nb_offres) AS nb_offres,
    SUM(fc.nb_candidats) AS nb_candidats,
    ROUND(AVG(fc.score_moyen), 2) AS score_moyen,
    RANK() OVER (
        PARTITION BY fc.departement_normalise
        ORDER BY SUM(fc.nb_offres) DESC
    ) AS rang_competence_departement
FROM fait_competences fc
GROUP BY
    fc.competence,
    fc.categorie_competence,
    fc.departement_normalise;


CREATE OR REPLACE VIEW vw_turnover_departement AS
SELECT
    de.departement,
    COUNT(*) AS nb_employes_total,
    SUM(CASE WHEN de.is_parti = TRUE THEN 1 ELSE 0 END) AS nb_departs,
    SUM(CASE WHEN de.motif_depart = 'DEMISSION' THEN 1 ELSE 0 END) AS nb_demissions,
    SUM(CASE WHEN de.motif_depart = 'LICENCIEMENT' THEN 1 ELSE 0 END) AS nb_licenciements,
    SUM(CASE WHEN de.motif_depart = 'RETRAITE' THEN 1 ELSE 0 END) AS nb_retraites,
    ROUND(SUM(CASE WHEN de.is_parti = TRUE THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) AS taux_turnover_pct
FROM dim_employe de
WHERE de.est_actuel = TRUE
GROUP BY de.departement;


-- -----------------------------------------------------------------------------
-- 1.3.5 Vue principale des KPIs RH
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW kpi_rh AS
SELECT
    COALESCE(e.departement, r.departement_normalise, m.departement) AS departement,
    COALESCE(e.nb_employes, 0) AS nb_employes,
    COALESCE(e.nb_cdi, 0) AS nb_cdi,
    COALESCE(e.nb_cdd, 0) AS nb_cdd,
    COALESCE(e.nb_stage, 0) AS nb_stage,
    COALESCE(e.nb_freelance, 0) AS nb_freelance,
    COALESCE(e.anciennete_moy_mois, 0) AS anciennete_moy_mois,
    COALESCE(m.nb_embauches, 0) AS nb_mobilites,
    COALESCE(m.nb_departs, 0) AS nb_departs,
    ROUND(COALESCE(m.nb_embauches, 0) * 100.0 / NULLIF(COALESCE(e.nb_employes, 0), 0), 2) AS taux_mobilite_pct,
    ROUND(COALESCE(m.nb_departs, 0) * 100.0 / NULLIF(COALESCE(e.nb_employes, 0), 0), 2) AS taux_depart_pct,
    COALESCE(r.nb_candidatures, 0) AS nb_candidatures,
    COALESCE(r.nb_acceptes, 0) AS nb_acceptes,
    COALESCE(r.nb_interviews, 0) AS nb_interviews,
    ROUND(COALESCE(r.nb_acceptes, 0) * 100.0 / NULLIF(COALESCE(r.nb_candidatures, 0), 0), 2) AS taux_acceptation_pct,
    ROUND(COALESCE(r.nb_interviews, 0) * 100.0 / NULLIF(COALESCE(r.nb_candidatures, 0), 0), 2) AS taux_entretien_pct,
    COALESCE(r.score_moy_candidatures, 0) AS score_moy_candidatures,
    COALESCE(r.delai_moy_recrutement, 0) AS delai_moy_recrutement
FROM (
    SELECT
        de.departement,
        COUNT(*) AS nb_employes,
        SUM(CASE WHEN de.type_contrat = 'CDI' THEN 1 ELSE 0 END) AS nb_cdi,
        SUM(CASE WHEN de.type_contrat = 'CDD' THEN 1 ELSE 0 END) AS nb_cdd,
        SUM(CASE WHEN de.type_contrat = 'STAGE' THEN 1 ELSE 0 END) AS nb_stage,
        SUM(CASE WHEN de.type_contrat = 'FREELANCE' THEN 1 ELSE 0 END) AS nb_freelance,
        ROUND(AVG(de.anciennete_mois), 2) AS anciennete_moy_mois
    FROM dim_employe de
    WHERE de.est_actuel = TRUE
      AND de.is_parti = FALSE
    GROUP BY de.departement
) e
LEFT JOIN (
    SELECT
        fr.departement_normalise,
        COUNT(*) AS nb_candidatures,
        SUM(CASE WHEN fr.statut_normalise = 'ACCEPTED' THEN 1 ELSE 0 END) AS nb_acceptes,
        SUM(CASE WHEN fr.a_passe_entretien = TRUE THEN 1 ELSE 0 END) AS nb_interviews,
        ROUND(AVG(fr.match_score), 2) AS score_moy_candidatures,
        ROUND(AVG(fr.duree_offre_jours), 2) AS delai_moy_recrutement
    FROM fait_recrutement fr
    GROUP BY fr.departement_normalise
) r
    ON r.departement_normalise = e.departement
LEFT JOIN (
    SELECT
        fm.departement,
        SUM(fm.nb_embauches_mois) AS nb_embauches,
        SUM(fm.nb_departs_mois) AS nb_departs
    FROM fait_mobilite fm
    GROUP BY fm.departement
) m
    ON m.departement = e.departement;


-- -----------------------------------------------------------------------------
-- 1.3.6 Requetes KPI pour le rapport et le dashboard
-- -----------------------------------------------------------------------------

-- KPI global RH
SELECT
    SUM(nb_employes) AS total_employes,
    SUM(nb_cdi) AS total_cdi,
    SUM(nb_cdd) AS total_cdd,
    SUM(nb_stage) AS total_stage,
    ROUND(AVG(anciennete_moy_mois), 2) AS anciennete_moyenne_mois,
    SUM(nb_candidatures) AS total_candidatures,
    SUM(nb_acceptes) AS total_acceptes,
    ROUND(SUM(nb_acceptes) * 100.0 / NULLIF(SUM(nb_candidatures), 0), 2) AS taux_acceptation_global_pct,
    ROUND(AVG(score_moy_candidatures), 2) AS score_moyen_global
FROM kpi_rh;


-- KPI par departement
SELECT
    departement,
    nb_employes,
    nb_cdi,
    nb_cdd,
    nb_stage,
    anciennete_moy_mois,
    nb_candidatures,
    nb_acceptes,
    taux_acceptation_pct,
    taux_mobilite_pct,
    taux_depart_pct,
    score_moy_candidatures
FROM kpi_rh
ORDER BY nb_employes DESC;


-- Evolution mensuelle des effectifs
SELECT
    annee,
    mois,
    departement,
    SUM(nb_embauches_mois) AS embauches,
    SUM(nb_departs_mois) AS departs,
    MAX(effectif_cumule) AS effectif_fin_mois
FROM vw_effectifs_mensuels
GROUP BY annee, mois, departement
ORDER BY annee, mois, departement;


-- Entonnoir de recrutement
SELECT
    departement,
    SUM(nb_candidatures) AS candidatures,
    SUM(nb_reviewing) AS en_revision,
    SUM(nb_interview) AS entretiens,
    SUM(nb_acceptes) AS acceptes,
    SUM(nb_rejetes) AS rejetes,
    ROUND(SUM(nb_acceptes) * 100.0 / NULLIF(SUM(nb_candidatures), 0), 2) AS taux_conversion_pct,
    ROUND(AVG(score_moyen), 2) AS score_moyen
FROM vw_funnel_recrutement
GROUP BY departement
ORDER BY candidatures DESC;


-- Top competences demandees
SELECT
    competence,
    categorie_competence,
    SUM(nb_offres) AS nb_offres,
    SUM(nb_candidats) AS nb_candidats,
    ROUND(AVG(score_moyen), 2) AS score_moyen
FROM vw_competences_demandees
GROUP BY competence, categorie_competence
ORDER BY nb_offres DESC, nb_candidats DESC
LIMIT 20;


-- Temps moyen de recrutement par departement
SELECT
    departement_normalise AS departement,
    COUNT(*) AS nb_candidatures,
    ROUND(AVG(duree_offre_jours), 2) AS delai_moyen_recrutement_jours,
    MIN(duree_offre_jours) AS delai_min,
    MAX(duree_offre_jours) AS delai_max
FROM fait_recrutement
WHERE duree_offre_jours IS NOT NULL
GROUP BY departement_normalise
ORDER BY delai_moyen_recrutement_jours DESC;


-- Taux de mobilite par departement
SELECT
    departement,
    SUM(nb_embauches_mois) AS total_embauches,
    MAX(effectif_cumule_departement) AS effectif_courant_estime,
    ROUND(SUM(nb_embauches_mois) * 100.0 / NULLIF(MAX(effectif_cumule_departement), 0), 2) AS taux_mobilite_pct
FROM fait_mobilite
GROUP BY departement
ORDER BY taux_mobilite_pct DESC;


-- Taux de turnover par departement
SELECT
    departement,
    nb_employes_total,
    nb_departs,
    nb_demissions,
    nb_licenciements,
    nb_retraites,
    taux_turnover_pct
FROM vw_turnover_departement
ORDER BY taux_turnover_pct DESC;


-- -----------------------------------------------------------------------------
-- 1.3.7 Controle d'integrite du modele dimensionnel
-- -----------------------------------------------------------------------------

-- Faits recrutement sans date
SELECT
    COUNT(*) AS nb_faits_recrutement_sans_date
FROM fait_recrutement
WHERE id_temps_depot IS NULL;


-- Faits recrutement sans offre
SELECT
    COUNT(*) AS nb_faits_recrutement_sans_offre
FROM fait_recrutement
WHERE id_offre_sk IS NULL;


-- Faits effectifs sans employe
SELECT
    COUNT(*) AS nb_faits_effectifs_sans_employe
FROM fait_effectifs
WHERE id_employe_sk IS NULL;


-- Faits effectifs sans departement
SELECT
    COUNT(*) AS nb_faits_effectifs_sans_departement
FROM fait_effectifs
WHERE id_departement_sk IS NULL;


-- Dimensions employees avec plusieurs versions actuelles
SELECT
    id_employe_nk,
    COUNT(*) AS nb_versions_actuelles
FROM dim_employe
WHERE est_actuel = TRUE
GROUP BY id_employe_nk
HAVING COUNT(*) > 1;


-- Resume integrite DWH
SELECT
    'fait_recrutement_sans_date' AS controle,
    COUNT(*) AS nb_anomalies
FROM fait_recrutement
WHERE id_temps_depot IS NULL
UNION ALL
SELECT
    'fait_recrutement_sans_offre',
    COUNT(*)
FROM fait_recrutement
WHERE id_offre_sk IS NULL
UNION ALL
SELECT
    'fait_effectifs_sans_employe',
    COUNT(*)
FROM fait_effectifs
WHERE id_employe_sk IS NULL
UNION ALL
SELECT
    'fait_effectifs_sans_departement',
    COUNT(*)
FROM fait_effectifs
WHERE id_departement_sk IS NULL
UNION ALL
SELECT
    'dim_employe_versions_actuelles_multiples',
    COUNT(*)
FROM (
    SELECT id_employe_nk
    FROM dim_employe
    WHERE est_actuel = TRUE
    GROUP BY id_employe_nk
    HAVING COUNT(*) > 1
) anomalies_scd;


-- -----------------------------------------------------------------------------
-- 1.3.8 Requetes de demonstration pour la soutenance
-- -----------------------------------------------------------------------------

-- Montrer le chemin complet Source -> Staging -> DWH -> Dashboard
SELECT
    'Source employee' AS etape,
    COUNT(*) AS nb_lignes
FROM sirh_employee.employees
UNION ALL
SELECT
    'Staging employes',
    COUNT(*)
FROM sirh_staging.stg_employees
UNION ALL
SELECT
    'Dimension employe',
    COUNT(*)
FROM sirh_dwh.dim_employe
UNION ALL
SELECT
    'Fait effectifs',
    COUNT(*)
FROM sirh_dwh.fait_effectifs;


-- Montrer le pipeline recrutement complet
SELECT
    'Source candidatures' AS etape,
    COUNT(*) AS nb_lignes
FROM sirh_recruitment.applications
UNION ALL
SELECT
    'Staging candidatures',
    COUNT(*)
FROM sirh_staging.stg_applications
UNION ALL
SELECT
    'Fait recrutement',
    COUNT(*)
FROM sirh_dwh.fait_recrutement
UNION ALL
SELECT
    'Vue funnel recrutement',
    COUNT(*)
FROM sirh_dwh.vw_funnel_recrutement;


-- Montrer les mesures calculees principales
SELECT
    'Taux acceptation' AS kpi,
    CONCAT(
        ROUND(SUM(CASE WHEN statut_normalise = 'ACCEPTED' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2),
        ' %'
    ) AS valeur
FROM fait_recrutement
UNION ALL
SELECT
    'Score IA moyen',
    CAST(ROUND(AVG(match_score), 2) AS CHAR)
FROM fait_recrutement
UNION ALL
SELECT
    'Anciennete moyenne mois',
    CAST(ROUND(AVG(anciennete_mois), 2) AS CHAR)
FROM dim_employe
WHERE est_actuel = TRUE
UNION ALL
SELECT
    'Turnover moyen',
    CONCAT(ROUND(AVG(taux_turnover_pct), 2), ' %')
FROM vw_turnover_departement;


-- =============================================================================
-- FIN DU FICHIER
-- =============================================================================
