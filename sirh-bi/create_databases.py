"""
ETAPE 1 - Creer les bases sirh_staging et sirh_dwh
VERSION FINALE - Sans cles etrangeres (FK)
Raison : dbt recrée les tables a chaque run, les FK bloquent ce processus.
L'integrite des donnees est garantie par les tests dbt (schema.yml).
"""

import sqlalchemy as sa
from datetime import date, timedelta

ROOT_ENGINE = sa.create_engine("mysql+pymysql://root:root@localhost/mysql")

with ROOT_ENGINE.connect() as conn:
    conn.execute(sa.text("CREATE DATABASE IF NOT EXISTS sirh_staging CHARACTER SET utf8mb4"))
    conn.execute(sa.text("CREATE DATABASE IF NOT EXISTS sirh_dwh     CHARACTER SET utf8mb4"))
    conn.commit()
print("✓ Bases sirh_staging et sirh_dwh creees")

staging_engine = sa.create_engine("mysql+pymysql://root:root@localhost/sirh_staging")

STAGING_TABLES = [
    "CREATE TABLE IF NOT EXISTS stg_departments (id VARCHAR(36) PRIMARY KEY, name VARCHAR(100), extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS stg_positions (id VARCHAR(36) PRIMARY KEY, title VARCHAR(255), extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS stg_employees (id VARCHAR(36) PRIMARY KEY, first_name VARCHAR(100), last_name VARCHAR(100), email VARCHAR(255), phone VARCHAR(30), hire_date DATE, contract_type VARCHAR(20), department_id VARCHAR(36), position_id VARCHAR(36), manager_id VARCHAR(36), service_id VARCHAR(36), date_depart DATE, motif_depart VARCHAR(50), salary INT DEFAULT NULL, extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS stg_employee_skills (employee_id VARCHAR(36), skill_id VARCHAR(36), level VARCHAR(50), extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (employee_id, skill_id))",
    "CREATE TABLE IF NOT EXISTS stg_job_offers (id VARCHAR(36) PRIMARY KEY, title VARCHAR(255), department VARCHAR(100), location VARCHAR(100), status VARCHAR(30), published_date DATE, deadline_date DATE, created_at DATETIME, created_by_email VARCHAR(255), created_by_name VARCHAR(255), extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS stg_job_offer_skills (job_offer_id VARCHAR(36), skill_id VARCHAR(36), extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (job_offer_id, skill_id))",
    "CREATE TABLE IF NOT EXISTS stg_applications (id VARCHAR(36) PRIMARY KEY, applicant_email VARCHAR(255), applicant_name VARCHAR(255), applied_date DATE, status VARCHAR(30), match_score INT, job_offer_id VARCHAR(36), candidate_profile_json TEXT, extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS stg_skills (id VARCHAR(36) PRIMARY KEY, name VARCHAR(100), extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS stg_application_skills (application_id VARCHAR(36), skill_id VARCHAR(36), extracted_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (application_id, skill_id))",
]

with staging_engine.connect() as conn:
    for ddl in STAGING_TABLES:
        conn.execute(sa.text(ddl))
    conn.commit()
print("✓ Tables sirh_staging creees (9 tables)")

dwh_engine = sa.create_engine("mysql+pymysql://root:root@localhost/sirh_dwh")

DWH_TABLES = [
    "CREATE TABLE IF NOT EXISTS dim_temps (id_temps INT PRIMARY KEY AUTO_INCREMENT, date_complete DATE NOT NULL UNIQUE, jour INT, mois INT, trimestre INT, annee INT, nom_mois VARCHAR(20), nom_jour VARCHAR(20), est_weekend BOOLEAN)",
    "CREATE TABLE IF NOT EXISTS dim_departement (id_departement INT PRIMARY KEY AUTO_INCREMENT, source_id VARCHAR(36) UNIQUE, nom VARCHAR(100), date_debut DATE, date_fin DATE, est_actif BOOLEAN DEFAULT TRUE)",
    "CREATE TABLE IF NOT EXISTS dim_poste (id_poste INT PRIMARY KEY AUTO_INCREMENT, source_id VARCHAR(36) UNIQUE, titre VARCHAR(255), date_debut DATE, date_fin DATE, est_actif BOOLEAN DEFAULT TRUE)",
    "CREATE TABLE IF NOT EXISTS dim_employe (id_employe INT PRIMARY KEY AUTO_INCREMENT, source_id VARCHAR(36), email VARCHAR(255), nom_complet VARCHAR(255), prenom VARCHAR(100), nom VARCHAR(100), type_contrat VARCHAR(20), date_embauche DATE, anciennete_jours INT, anciennete_mois INT, departement VARCHAR(100), poste VARCHAR(255), date_debut DATE, date_fin DATE, est_actuel BOOLEAN DEFAULT TRUE, version INT DEFAULT 1)",
    "CREATE TABLE IF NOT EXISTS dim_competence (id_competence INT PRIMARY KEY AUTO_INCREMENT, source_id VARCHAR(36) UNIQUE, nom VARCHAR(100))",
    "CREATE TABLE IF NOT EXISTS dim_offre (id_offre INT PRIMARY KEY AUTO_INCREMENT, source_id VARCHAR(36) UNIQUE, titre VARCHAR(255), departement VARCHAR(100), localisation VARCHAR(100), statut VARCHAR(30), date_publication DATE, date_limite DATE, duree_offre_jours INT, created_by_email VARCHAR(255))",
    "CREATE TABLE IF NOT EXISTS fait_recrutement (id_fait INT PRIMARY KEY AUTO_INCREMENT, id_temps INT, id_offre INT, id_departement INT, source_application_id VARCHAR(36), applicant_email VARCHAR(255), statut_candidature VARCHAR(30), match_score INT, score_categorie VARCHAR(20), est_accepte TINYINT(1) DEFAULT 0, a_passe_entretien TINYINT(1) DEFAULT 0, nb_competences_matchees INT DEFAULT 0)",
    "CREATE TABLE IF NOT EXISTS fait_effectifs (id_fait INT PRIMARY KEY AUTO_INCREMENT, id_temps INT, id_employe INT, id_departement INT, id_poste INT, type_contrat VARCHAR(20), nb_employes INT DEFAULT 1, anciennete_jours INT, anciennete_mois INT)",
    "CREATE TABLE IF NOT EXISTS fait_competences (id_fait INT PRIMARY KEY AUTO_INCREMENT, id_competence INT, id_offre INT, id_temps INT, nb_candidats INT DEFAULT 1, score_moyen DECIMAL(5,2))",
]

with dwh_engine.connect() as conn:
    conn.execute(sa.text("SET FOREIGN_KEY_CHECKS = 0"))
    for ddl in DWH_TABLES:
        conn.execute(sa.text(ddl))
    conn.execute(sa.text("SET FOREIGN_KEY_CHECKS = 1"))
    conn.commit()
print("✓ Tables sirh_dwh creees sans FK (9 tables)")

MOIS_FR = ['', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
           'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre']
JOURS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

rows = []
d = date(2014, 1, 1)
end = date(2027, 12, 31)
while d <= end:
    rows.append({
        "date_complete": d,
        "jour":          d.day,
        "mois":          d.month,
        "trimestre":     (d.month - 1) // 3 + 1,
        "annee":         d.year,
        "nom_mois":      MOIS_FR[d.month],
        "nom_jour":      JOURS_FR[d.weekday()],
        "est_weekend":   d.weekday() >= 5,
    })
    d += timedelta(days=1)

with dwh_engine.connect() as conn:
    conn.execute(sa.text("DELETE FROM dim_temps"))
    conn.execute(sa.text("""
        INSERT INTO dim_temps
            (date_complete, jour, mois, trimestre, annee, nom_mois, nom_jour, est_weekend)
        VALUES
            (:date_complete, :jour, :mois, :trimestre, :annee, :nom_mois, :nom_jour, :est_weekend)
    """), rows)
    conn.commit()

print(f"✓ dim_temps remplie ({len(rows)} jours : 2014 -> 2027)")
print("""
╔══════════════════════════════════════════════════════╗
║      ETAPE 1 TERMINEE - VERSION FINALE SANS FK      ║
╠══════════════════════════════════════════════════════╣
║  sirh_staging : 9 tables stg_* creees               ║
║  sirh_dwh     : 9 tables SANS FK (dbt compatible)  ║
║  dim_temps    : 2014-2027 peuplee (5114 jours)      ║
╠══════════════════════════════════════════════════════╣
║  Prochaine etape :                                   ║
║  python extract/extract_staging.py                   ║
╚══════════════════════════════════════════════════════╝
""")