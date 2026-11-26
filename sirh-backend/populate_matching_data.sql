-- =============================================================================
-- Script de peuplement des compétences — Matching interne SIRH
-- Base : sirh_recruitment  |  IDs : UUID (VARCHAR 36 — schéma Hibernate)
-- Table de liaison : job_offer_skills
-- Flyway est DÉSACTIVÉ → exécuter manuellement dans MySQL Workbench / CLI
--
-- Usage CLI :  mysql -u root -p sirh_recruitment < populate_matching_data.sql
-- =============================================================================

USE sirh_recruitment;

-- ── 1. Compétences manquantes (INSERT IGNORE = sans doublon sur name) ─────────

INSERT IGNORE INTO skills (id, name) VALUES
  (UUID(), 'dbt'),
  (UUID(), 'Kafka'),
  (UUID(), 'Hadoop'),
  (UUID(), 'Databricks'),
  (UUID(), 'Spark'),
  (UUID(), 'Airflow'),
  (UUID(), 'ETL'),
  (UUID(), 'Power BI'),
  (UUID(), 'SQL'),
  (UUID(), 'Python'),
  (UUID(), 'Management'),
  (UUID(), 'Java'),
  (UUID(), 'Spring Boot'),
  (UUID(), 'Docker'),
  (UUID(), 'Git'),
  (UUID(), 'Microservices'),
  (UUID(), 'PostgreSQL'),
  (UUID(), 'Angular'),
  (UUID(), 'TypeScript'),
  (UUID(), 'Kubernetes'),
  (UUID(), 'CI/CD'),
  (UUID(), 'Azure'),
  (UUID(), 'Terraform'),
  (UUID(), 'DevOps'),
  (UUID(), 'Machine Learning'),
  (UUID(), 'TensorFlow'),
  (UUID(), 'Data Science'),
  (UUID(), 'SEO'),
  (UUID(), 'Google Ads'),
  (UUID(), 'HubSpot'),
  (UUID(), 'Négociation'),
  (UUID(), 'Salesforce'),
  (UUID(), 'Cybersécurité'),
  (UUID(), 'OWASP'),
  (UUID(), 'Linux'),
  (UUID(), 'Figma'),
  (UUID(), 'UX Design'),
  (UUID(), 'Recrutement'),
  (UUID(), 'React'),
  (UUID(), 'Scrum');

-- ── 2. Offre "Business Intelligence Lead" (si absente) ───────────────────────

INSERT INTO job_offers (id, title, description, department, location, status,
                        published_date, deadline_date, created_at, updated_at,
                        created_by_email, created_by_name)
SELECT UUID(),
       'Business Intelligence Lead',
       'Pilotez la stratégie BI : tableaux de bord Power BI, modélisation SQL, pipelines Spark/dbt. Accompagnement des équipes métier sur les données décisionnelles.',
       'Data & Analytics',
       'Tunis - Hybride',
       'PUBLISHED',
       CURDATE(),
       DATE_ADD(CURDATE(), INTERVAL 2 MONTH),
       NOW(), NOW(),
       'nadia.mgr@sirh.com',
       'Nadia Ziani'
WHERE NOT EXISTS (
  SELECT 1 FROM job_offers WHERE title = 'Business Intelligence Lead'
);

-- ── 3. Lier les compétences aux offres (INSERT IGNORE sur PK composite) ───────
--       Sûr à relancer : ignore les paires déjà existantes.
--       Si la compétence ou l'offre n'existe pas → SELECT vide → 0 ligne insérée.

-- Business Intelligence Lead → SQL, Power BI, Python, Spark, dbt
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('Power BI','SQL','Python','Spark','dbt','Communication')
WHERE jo.title = 'Business Intelligence Lead';

-- Développeur Fullstack Java/Angular → Java, Angular, Spring Boot, Git
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('Java','Angular','Spring Boot','Git')
WHERE jo.title = 'Développeur Fullstack Java/Angular';

-- Chargé de Recrutement Senior → Recrutement, Scrum
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('Recrutement','Scrum')
WHERE jo.title = 'Chargé de Recrutement Senior';

-- Ingénieur DevOps → Docker, Kubernetes, CI/CD
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('Docker','Kubernetes','CI/CD')
WHERE jo.title = 'Ingénieur DevOps';

-- Data Scientist Junior → Python, Machine Learning
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('Python','Machine Learning')
WHERE jo.title = 'Data Scientist Junior';

-- UX/UI Designer Senior → Figma, UX Design
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('Figma','UX Design')
WHERE jo.title = 'UX/UI Designer Senior';

-- Développeur Backend Java Senior → Java, Spring Boot, Docker, Microservices, PostgreSQL
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('Java','Spring Boot','Docker','Microservices','PostgreSQL')
WHERE jo.title = 'Développeur Backend Java Senior';

-- Développeur Frontend Angular Expert → Angular, TypeScript, React
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('Angular','TypeScript','React')
WHERE jo.title = 'Développeur Frontend Angular Expert';

-- Ingénieur Cloud & DevOps Azure → Azure, Terraform, Kubernetes, DevOps
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('Azure','Terraform','Kubernetes','DevOps')
WHERE jo.title = 'Ingénieur Cloud & DevOps Azure';

-- Data Engineer — Pipeline Big Data → Python, Spark, ETL, SQL
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('Python','SQL','Airflow','dbt','Spark','Docker','Kafka')
WHERE jo.title = 'Data Engineer — Pipeline Big Data';

-- Responsable Marketing Digital & SEO → SEO, Google Ads, HubSpot
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('SEO','Google Ads','HubSpot')
WHERE jo.title = 'Responsable Marketing Digital & SEO';

-- Key Account Manager B2B → Négociation, Salesforce
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('Négociation','Salesforce')
WHERE jo.title = 'Key Account Manager B2B';

-- Ingénieur Cybersécurité OWASP → Cybersécurité, OWASP, Linux
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('Cybersécurité','OWASP','Linux','Docker','CI/CD','Git','Kubernetes')
WHERE jo.title = 'Ingénieur Cybersécurité OWASP';

-- Machine Learning Engineer — NLP → Machine Learning, TensorFlow, Data Science, Python
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id)
SELECT jo.id, s.id
FROM job_offers jo JOIN skills s ON s.name IN ('Machine Learning','TensorFlow','Data Science','Python')
WHERE jo.title = 'Machine Learning Engineer — NLP';

-- ── 4. Rapport de vérification ────────────────────────────────────────────────

SELECT
  jo.title                                                    AS offre,
  jo.department                                               AS departement,
  COUNT(jos.skill_id)                                         AS nb_competences,
  GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ' | ')        AS competences_requises
FROM job_offers jo
LEFT JOIN job_offer_skills jos ON jos.job_offer_id = jo.id
LEFT JOIN skills s              ON s.id = jos.skill_id
WHERE jo.status = 'PUBLISHED'
GROUP BY jo.id, jo.title, jo.department
ORDER BY nb_competences DESC, jo.title;
