-- ==========================================================
-- SCRIPT D'INITIALISATION ET D'INSERTION DE DONNÉES DE TEST
-- ==========================================================
-- À exécuter manuellement dans MySQL (ex: phpMyAdmin, DBeaver)
-- Assurez-vous d'avoir lancé les services Spring Boot au moins
-- une fois avant pour que les tables soient créées par Hibernate (`ddl-auto=update`).
-- ==========================================================

-- 1. Création des bases de données (au cas où "createDatabaseIfNotExist" échoue)
CREATE DATABASE IF NOT EXISTS sirh_auth;
CREATE DATABASE IF NOT EXISTS sirh_employee;
CREATE DATABASE IF NOT EXISTS sirh_recruitment;

-- 2. Création de la table ai_usage_log dans sirh_recruitment
USE sirh_recruitment;
CREATE TABLE IF NOT EXISTS ai_usage_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    question TEXT,
    answer TEXT,
    input_tokens INT DEFAULT 0,
    output_tokens INT DEFAULT 0,
    cost_cents INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- DONNÉES DE TEST : AUTH SERVICE
-- ==========================================
USE sirh_auth;

-- Mots de passe = 'password' (Haché avec BCrypt)
SET @pass = '$2a$10$W2neF9.6Ayi6EU.2bZcQqe9.2lK3LFOgG7m99a9a0tW.f/mN6L7Hq';

-- Utilisateurs (IDs fixes pour cohérence)
INSERT IGNORE INTO users (id, email, password, enabled) VALUES 
('u1-auth-admin', 'admin@sirh.com', @pass, 1),
('u2-auth-manager', 'manager@sirh.com', @pass, 1),
('u3-auth-emp', 'employee@sirh.com', @pass, 1);

-- Rôles
INSERT IGNORE INTO user_roles (user_id, role) VALUES 
('u1-auth-admin', 'HR_ADMIN'),
('u2-auth-manager', 'MANAGER'),
('u3-auth-emp', 'EMPLOYEE');


-- ==========================================
-- DONNÉES DE TEST : EMPLOYEE SERVICE
-- ==========================================
USE sirh_employee;

-- Départements
INSERT IGNORE INTO departments (id, name, description) VALUES 
('dep-1-it', 'IT & Tech', 'Département des technologies de l''information'),
('dep-2-hr', 'Ressources Humaines', 'Gestion du personnel et recrutement'),
('dep-3-sales', 'Ventes', 'Département commercial');

-- Postes (Positions)
INSERT IGNORE INTO positions (id, title, description, department_id) VALUES 
('pos-1-dev', 'Développeur Fullstack', 'Développement des applications internes', 'dep-1-it'),
('pos-2-lead', 'Tech Lead', 'Gestion de l''équipe technique', 'dep-1-it'),
('pos-3-rec', 'Recruteur IT', 'Recherche de talents', 'dep-2-hr'),
('pos-4-sales', 'Commercial', 'Vente B2B', 'dep-3-sales');

-- Employés
INSERT IGNORE INTO employees (id, email, first_name, last_name, phone, hire_date, department_id, position_id, contract_type) VALUES 
('emp-1-admin', 'admin@sirh.com', 'Alice', 'Admin', '0600000001', '2023-01-15', 'dep-2-hr', 'pos-3-rec', 'CDI'),
('emp-2-manager', 'manager@sirh.com', 'Bob', 'Manager', '0600000002', '2022-06-10', 'dep-1-it', 'pos-2-lead', 'CDI'),
('emp-3-emp', 'employee@sirh.com', 'Charlie', 'Employé', '0600000003', '2024-03-01', 'dep-1-it', 'pos-1-dev', 'CDD');


-- ==========================================
-- DONNÉES DE TEST : RECRUITMENT SERVICE
-- ==========================================
USE sirh_recruitment;

-- Compétences (Skills)
INSERT IGNORE INTO skills (id, name) VALUES 
('sk-1-java', 'Java'),
('sk-2-spring', 'Spring Boot'),
('sk-3-angular', 'Angular'),
('sk-4-sql', 'MySQL'),
('sk-5-comm', 'Communication');

-- Offres d'emploi (Job Offers)
INSERT IGNORE INTO job_offers (id, title, description, department, location, status, published_date, deadline_date, created_at, updated_at) VALUES 
('job-1', 'Développeur Fullstack Junior', 'Nous cherchons un dev Java/Angular.', 'IT', 'Paris', 'PUBLISHED', '2024-05-01', '2024-06-01', NOW(), NOW()),
('job-2', 'Tech Lead Java', 'Manager une équipe technique et architecture.', 'IT', 'Lyon', 'DRAFT', NULL, NULL, NOW(), NOW()),
('job-3', 'Recruteur Senior', 'Profil RH expérimenté.', 'HR', 'Toulouse', 'PUBLISHED', '2024-05-10', '2024-07-01', NOW(), NOW());

-- Association Offres <-> Compétences (job_offer_skills)
INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id) VALUES 
('job-1', 'sk-1-java'),
('job-1', 'sk-3-angular'),
('job-1', 'sk-4-sql'),
('job-2', 'sk-1-java'),
('job-2', 'sk-2-spring'),
('job-3', 'sk-5-comm');

-- Candidatures (Applications)
INSERT IGNORE INTO applications (id, job_offer_id, applicant_email, applicant_name, cover_letter, status, applied_date) VALUES 
('app-1', 'job-1', 'jean.dupont@test.com', 'Jean Dupont', 'Très motivé par ce poste Java !', 'PENDING', '2024-05-15'),
('app-2', 'job-1', 'marie.curie@test.com', 'Marie Curie', 'Expérience en Angular et Spring Boot.', 'ACCEPTED', '2024-05-18'),
('app-3', 'job-3', 'paul.rh@test.com', 'Paul Ressources', '10 ans d''expérience en recrutement.', 'REJECTED', '2024-05-12');

-- Association Candidatures <-> Compétences (application_skills)
INSERT IGNORE INTO application_skills (application_id, skill_id) VALUES 
('app-1', 'sk-1-java'),
('app-2', 'sk-1-java'), ('app-2', 'sk-2-spring'), ('app-2', 'sk-3-angular'),
('app-3', 'sk-5-comm');

COMMIT;
