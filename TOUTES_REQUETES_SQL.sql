


-- ================================================================
--   SIRH — TOUTES LES REQUÊTES SQL
--   Couvre : sirh_auth | sirh_employee | sirh_recruitment | sirh_dwh
-- ================================================================
-- Utilisation : coller dans MySQL Workbench / DBeaver / phpMyAdmin
-- ================================================================


-- ================================================================
--  SECTION 0 — VUE D'ENSEMBLE : toutes les bases et tables
-- ================================================================

-- Lister toutes les bases de données du projet
SHOW DATABASES;



-- Lister toutes les tables de chaque base
SELECT table_schema AS base, table_name AS table_name,
       table_rows   AS nb_lignes_approx,
       ROUND((data_length + index_length) / 1024, 1) AS taille_ko
FROM information_schema.tables
WHERE table_schema IN ('sirh_auth','sirh_employee','sirh_recruitment','sirh_dwh')
ORDER BY table_schema, table_name;

-- Compter les lignes réelles de toutes les tables ML
SELECT 'sirh_auth'        AS base, 'users'                  AS tbl, COUNT(*) n FROM sirh_auth.users
UNION ALL
SELECT 'sirh_auth',        'user_roles',                                         COUNT(*) FROM sirh_auth.user_roles
UNION ALL
SELECT 'sirh_employee',    'departments',                                         COUNT(*) FROM sirh_employee.departments
UNION ALL
SELECT 'sirh_employee',    'positions',                                           COUNT(*) FROM sirh_employee.positions
UNION ALL
SELECT 'sirh_employee',    'employees',                                           COUNT(*) FROM sirh_employee.employees
UNION ALL
SELECT 'sirh_recruitment', 'skills',                                              COUNT(*) FROM sirh_recruitment.skills
UNION ALL
SELECT 'sirh_recruitment', 'job_offers',                                          COUNT(*) FROM sirh_recruitment.job_offers
UNION ALL
SELECT 'sirh_recruitment', 'applications',                                        COUNT(*) FROM sirh_recruitment.applications
UNION ALL
SELECT 'sirh_dwh',         'dim_employe',                                         COUNT(*) FROM sirh_dwh.dim_employe
UNION ALL
SELECT 'sirh_dwh',         'fait_recrutement',                                    COUNT(*) FROM sirh_dwh.fait_recrutement
UNION ALL
SELECT 'sirh_dwh',         'ml_turnover_risk',                                    COUNT(*) FROM sirh_dwh.ml_turnover_risk
UNION ALL
SELECT 'sirh_dwh',         'ml_employee_segments',                                COUNT(*) FROM sirh_dwh.ml_employee_segments
UNION ALL
SELECT 'sirh_dwh',         'ml_high_potentials',                                  COUNT(*) FROM sirh_dwh.ml_high_potentials
UNION ALL
SELECT 'sirh_dwh',         'ml_forecast_embauches',                               COUNT(*) FROM sirh_dwh.ml_forecast_embauches
UNION ALL
SELECT 'sirh_dwh',         'ml_correlations',                                     COUNT(*) FROM sirh_dwh.ml_correlations
UNION ALL
SELECT 'sirh_dwh',         'ml_retention_analysis',                               COUNT(*) FROM sirh_dwh.ml_retention_analysis;


-- ================================================================
--  SECTION 1 — BASE sirh_auth
-- ================================================================
USE sirh_auth;

-- ── 1.1 Structure ────────────────────────────────────────────────

DESCRIBE users;
DESCRIBE user_roles;

-- ── 1.2 Tous les utilisateurs ────────────────────────────────────

SELECT * FROM users;

-- Utilisateurs avec leurs rôles (jointure)
SELECT u.id, u.email, u.enabled,
       GROUP_CONCAT(ur.role ORDER BY ur.role SEPARATOR ', ') AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
GROUP BY u.id, u.email, u.enabled
ORDER BY u.email;

-- ── 1.3 Requêtes filtrées ────────────────────────────────────────

-- Utilisateurs actifs uniquement
SELECT id, email FROM users WHERE enabled = 1;

-- Utilisateurs désactivés
SELECT id, email FROM users WHERE enabled = 0;

-- Tous les HR_ADMIN
SELECT u.email FROM users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'HR_ADMIN';

-- Tous les MANAGERs
SELECT u.email FROM users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'MANAGER';

-- Tous les EMPLOYEEs
SELECT u.email FROM users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'EMPLOYEE';

-- Un utilisateur spécifique
SELECT u.id, u.email, u.enabled,
       GROUP_CONCAT(ur.role SEPARATOR ', ') AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'admin@hr.sirh.com'
GROUP BY u.id;

-- ── 1.4 Statistiques auth ────────────────────────────────────────

-- Nombre d'utilisateurs par rôle
SELECT ur.role, COUNT(*) AS nb_utilisateurs
FROM user_roles ur
GROUP BY ur.role
ORDER BY nb_utilisateurs DESC;

-- Nombre total d'utilisateurs actifs/inactifs
SELECT enabled,
       COUNT(*) AS nb,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users), 1) AS pct
FROM users
GROUP BY enabled;

-- Utilisateurs avec plusieurs rôles
SELECT u.email, COUNT(ur.role) AS nb_roles
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
GROUP BY u.email
HAVING nb_roles > 1;


-- ================================================================
--  SECTION 2 — BASE sirh_employee
-- ================================================================
USE sirh_employee;

-- ── 2.1 Structure ────────────────────────────────────────────────

DESCRIBE departments;
DESCRIBE positions;
DESCRIBE employees;

-- ── 2.2 Départements ─────────────────────────────────────────────

-- Tous les départements
SELECT * FROM departments ORDER BY name;

-- Départements avec nombre d'employés
SELECT d.id, d.name AS departement, d.description,
       COUNT(e.id) AS nb_employes
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.id, d.name, d.description
ORDER BY nb_employes DESC;

-- Départements sans employés
SELECT d.name FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
WHERE e.id IS NULL;

-- ── 2.3 Postes ───────────────────────────────────────────────────

-- Tous les postes avec département
SELECT p.id, p.title AS poste, d.name AS departement, p.description
FROM positions p
LEFT JOIN departments d ON d.id = p.department_id
ORDER BY d.name, p.title;

-- Postes par département
SELECT d.name AS departement,
       GROUP_CONCAT(p.title ORDER BY p.title SEPARATOR ' | ') AS postes
FROM departments d
JOIN positions p ON p.department_id = d.id
GROUP BY d.name;

-- Postes sans titulaires
SELECT p.title FROM positions p
LEFT JOIN employees e ON e.position_id = p.id
WHERE e.id IS NULL;

-- ── 2.4 Employés — vue complète ──────────────────────────────────

-- Tous les employés (vue complète)
SELECT e.id,
       CONCAT(e.first_name, ' ', e.last_name) AS nom_complet,
       e.email, e.phone,
       d.name  AS departement,
       p.title AS poste,
       e.contract_type AS contrat,
       e.hire_date     AS date_embauche,
       TIMESTAMPDIFF(MONTH, e.hire_date, CURDATE()) AS anciennete_mois,
       e.departure_date,
       e.departure_reason
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN positions   p ON p.id = e.position_id
ORDER BY d.name, e.last_name;

-- Employés actifs (pas de date de départ)
SELECT e.id,
       CONCAT(e.first_name, ' ', e.last_name) AS nom_complet,
       e.email,
       d.name  AS departement,
       p.title AS poste,
       e.contract_type,
       e.hire_date,
       TIMESTAMPDIFF(MONTH, e.hire_date, CURDATE()) AS anciennete_mois
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN positions   p ON p.id = e.position_id
WHERE e.departure_date IS NULL
ORDER BY anciennete_mois DESC;

-- Employés partis (avec motif)
SELECT CONCAT(e.first_name, ' ', e.last_name) AS nom_complet,
       e.email, d.name AS departement,
       e.hire_date, e.departure_date,
       TIMESTAMPDIFF(MONTH, e.hire_date, e.departure_date) AS duree_mois,
       e.departure_reason AS motif
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
WHERE e.departure_date IS NOT NULL
ORDER BY e.departure_date DESC;

-- ── 2.5 Filtres employés ─────────────────────────────────────────

-- Par type de contrat
SELECT contract_type AS contrat,
       COUNT(*) AS nb,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM employees), 1) AS pct
FROM employees
GROUP BY contract_type
ORDER BY nb DESC;

-- Employés CDI uniquement
SELECT CONCAT(first_name, ' ', last_name) AS nom, email, hire_date
FROM employees
WHERE contract_type = 'CDI'
ORDER BY hire_date;

-- Employés embauchés cette année
SELECT CONCAT(first_name, ' ', last_name) AS nom, email, hire_date, contract_type
FROM employees
WHERE YEAR(hire_date) = YEAR(CURDATE())
ORDER BY hire_date DESC;

-- Recherche par nom ou email
SELECT CONCAT(first_name, ' ', last_name) AS nom, email, contract_type
FROM employees
WHERE first_name  LIKE '%ali%'
   OR last_name   LIKE '%ali%'
   OR email       LIKE '%ali%';

-- Employés par département spécifique
SELECT CONCAT(e.first_name, ' ', e.last_name) AS nom,
       e.email, e.contract_type, e.hire_date
FROM employees e
JOIN departments d ON d.id = e.department_id
WHERE d.name = 'IT & Tech'
ORDER BY e.hire_date;

-- ── 2.6 Hiérarchie (manager) ─────────────────────────────────────

-- Employés avec leur manager direct
SELECT CONCAT(e.first_name, ' ', e.last_name)  AS employe,
       e.email                                  AS email_employe,
       CONCAT(m.first_name, ' ', m.last_name)   AS manager,
       d.name                                   AS departement
FROM employees e
LEFT JOIN employees m  ON m.id = e.manager_id
LEFT JOIN departments d ON d.id = e.department_id
ORDER BY d.name, manager;

-- Managers et taille de leur équipe
SELECT CONCAT(m.first_name, ' ', m.last_name) AS manager,
       m.email,
       COUNT(e.id) AS taille_equipe
FROM employees m
JOIN employees e ON e.manager_id = m.id
GROUP BY m.id, m.first_name, m.last_name, m.email
ORDER BY taille_equipe DESC;

-- Employés sans manager (top niveau)
SELECT CONCAT(first_name, ' ', last_name) AS nom, email
FROM employees
WHERE manager_id IS NULL;

-- ── 2.7 Statistiques RH employés ─────────────────────────────────

-- Effectifs et ancienneté par département
SELECT d.name AS departement,
       COUNT(e.id)                                        AS nb_employes,
       ROUND(AVG(TIMESTAMPDIFF(MONTH, e.hire_date, CURDATE())), 1) AS anciennete_moy_mois,
       MIN(e.hire_date)                                   AS plus_ancien,
       MAX(e.hire_date)                                   AS plus_recent
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id AND e.departure_date IS NULL
GROUP BY d.name
ORDER BY nb_employes DESC;

-- Taux de turnover par département (départs / total × 100)
SELECT d.name AS departement,
       COUNT(e.id)                                                     AS total_employes,
       SUM(CASE WHEN e.departure_date IS NOT NULL THEN 1 ELSE 0 END)   AS nb_departs,
       ROUND(SUM(CASE WHEN e.departure_date IS NOT NULL THEN 1 ELSE 0 END)
             * 100.0 / NULLIF(COUNT(e.id), 0), 1)                       AS taux_turnover_pct
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.name
ORDER BY taux_turnover_pct DESC;

-- Distribution des tranches d'ancienneté
SELECT
    CASE
        WHEN TIMESTAMPDIFF(MONTH, hire_date, CURDATE()) < 12  THEN '0 - 12 mois'
        WHEN TIMESTAMPDIFF(MONTH, hire_date, CURDATE()) < 36  THEN '1 - 3 ans'
        WHEN TIMESTAMPDIFF(MONTH, hire_date, CURDATE()) < 60  THEN '3 - 5 ans'
        WHEN TIMESTAMPDIFF(MONTH, hire_date, CURDATE()) < 120 THEN '5 - 10 ans'
        ELSE '10 ans et +'
    END AS tranche,
    COUNT(*) AS nb,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM employees WHERE departure_date IS NULL), 1) AS pct
FROM employees
WHERE departure_date IS NULL
GROUP BY tranche
ORDER BY MIN(TIMESTAMPDIFF(MONTH, hire_date, CURDATE()));

-- Embauches par mois (12 derniers mois)
SELECT DATE_FORMAT(hire_date, '%Y-%m') AS mois,
       COUNT(*) AS nb_embauches
FROM employees
WHERE hire_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY mois
ORDER BY mois;

-- Départs par motif
SELECT departure_reason AS motif,
       COUNT(*) AS nb,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM employees WHERE departure_date IS NOT NULL), 1) AS pct
FROM employees
WHERE departure_date IS NOT NULL
  AND departure_reason IS NOT NULL
GROUP BY departure_reason
ORDER BY nb DESC;


-- ================================================================
--  SECTION 3 — BASE sirh_recruitment
-- ================================================================
USE sirh_recruitment;

-- ── 3.1 Structure ────────────────────────────────────────────────

DESCRIBE skills;
DESCRIBE job_offers;
DESCRIBE job_offer_skills;
DESCRIBE applications;
DESCRIBE application_skills;

-- ── 3.2 Compétences (Skills) ─────────────────────────────────────

-- Toutes les compétences
SELECT * FROM skills ORDER BY name;

-- Compétences les plus demandées dans les offres
SELECT s.name AS competence,
       COUNT(jos.job_offer_id) AS nb_offres
FROM skills s
JOIN job_offer_skills jos ON jos.skill_id = s.id
GROUP BY s.name
ORDER BY nb_offres DESC;

-- Compétences les plus présentes dans les candidatures
SELECT s.name AS competence,
       COUNT(aps.application_id) AS nb_candidatures
FROM skills s
JOIN application_skills aps ON aps.skill_id = s.id
GROUP BY s.name
ORDER BY nb_candidatures DESC;

-- ── 3.3 Offres d'emploi ──────────────────────────────────────────

-- Toutes les offres avec compétences
SELECT jo.id, jo.title, jo.department, jo.location,
       jo.status, jo.published_date, jo.deadline_date,
       GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ') AS competences_requises
FROM job_offers jo
LEFT JOIN job_offer_skills jos ON jos.job_offer_id = jo.id
LEFT JOIN skills s             ON s.id = jos.skill_id
GROUP BY jo.id, jo.title, jo.department, jo.location, jo.status, jo.published_date, jo.deadline_date
ORDER BY jo.created_at DESC;

-- Offres publiées uniquement
SELECT id, title, department, location, deadline_date
FROM job_offers
WHERE status = 'PUBLISHED'
ORDER BY deadline_date;

-- Offres en brouillon
SELECT id, title, department, created_at
FROM job_offers WHERE status = 'DRAFT';

-- Offres fermées
SELECT id, title, department, deadline_date
FROM job_offers WHERE status = 'CLOSED'
ORDER BY deadline_date DESC;

-- Offres expirées (deadline dépassée, encore publiées)
SELECT id, title, department, deadline_date
FROM job_offers
WHERE status = 'PUBLISHED'
  AND deadline_date < CURDATE()
ORDER BY deadline_date;

-- Offres par département
SELECT department AS departement,
       COUNT(*) AS nb_offres,
       SUM(CASE WHEN status = 'PUBLISHED' THEN 1 ELSE 0 END) AS publiees,
       SUM(CASE WHEN status = 'DRAFT'     THEN 1 ELSE 0 END) AS brouillons,
       SUM(CASE WHEN status = 'CLOSED'    THEN 1 ELSE 0 END) AS fermees
FROM job_offers
GROUP BY department
ORDER BY nb_offres DESC;

-- ── 3.4 Candidatures ─────────────────────────────────────────────

-- Toutes les candidatures avec offre et compétences
SELECT a.id,
       jo.title         AS offre,
       jo.department,
       a.applicant_name AS candidat,
       a.applicant_email,
       a.status,
       a.applied_date,
       COALESCE(a.match_score, 0) AS score_matching,
       GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ') AS competences_candidat
FROM applications a
JOIN job_offers jo             ON jo.id = a.job_offer_id
LEFT JOIN application_skills aps ON aps.application_id = a.id
LEFT JOIN skills s               ON s.id = aps.skill_id
GROUP BY a.id, jo.title, jo.department, a.applicant_name,
         a.applicant_email, a.status, a.applied_date, a.match_score
ORDER BY a.applied_date DESC;

-- Candidatures par statut
SELECT status AS statut,
       COUNT(*) AS nb,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM applications), 1) AS pct
FROM applications
GROUP BY status
ORDER BY nb DESC;

-- Top candidats par score de matching
SELECT a.applicant_name AS candidat,
       a.applicant_email,
       jo.title         AS offre,
       jo.department,
       a.match_score    AS score,
       a.status
FROM applications a
JOIN job_offers jo ON jo.id = a.job_offer_id
WHERE a.match_score IS NOT NULL
ORDER BY a.match_score DESC
LIMIT 20;

-- Candidatures pour une offre spécifique (triées par score)
SELECT a.applicant_name, a.applicant_email,
       a.match_score AS score, a.status,
       GROUP_CONCAT(s.name SEPARATOR ', ') AS competences
FROM applications a
LEFT JOIN application_skills aps ON aps.application_id = a.id
LEFT JOIN skills s ON s.id = aps.skill_id
WHERE a.job_offer_id = (SELECT id FROM job_offers WHERE title LIKE '%Fullstack%' LIMIT 1)
GROUP BY a.id, a.applicant_name, a.applicant_email, a.match_score, a.status
ORDER BY a.match_score DESC;

-- Candidats par email (historique de candidatures)
SELECT jo.title AS offre, a.status, a.applied_date, a.match_score
FROM applications a
JOIN job_offers jo ON jo.id = a.job_offer_id
WHERE a.applicant_email = 'jean.dupont@test.com'
ORDER BY a.applied_date DESC;

-- ── 3.5 Statistiques recrutement ─────────────────────────────────

-- Funnel de recrutement par offre
SELECT jo.title AS offre,
       jo.department,
       COUNT(a.id)                                               AS total_candidatures,
       SUM(CASE WHEN a.match_score >= 70 THEN 1 ELSE 0 END)      AS score_eleve,
       SUM(CASE WHEN a.status = 'ACCEPTED' THEN 1 ELSE 0 END)    AS acceptes,
       SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END)    AS refuses,
       SUM(CASE WHEN a.status = 'PENDING'  THEN 1 ELSE 0 END)    AS en_attente,
       ROUND(AVG(a.match_score), 1)                              AS score_moyen
FROM job_offers jo
LEFT JOIN applications a ON a.job_offer_id = jo.id
GROUP BY jo.id, jo.title, jo.department
ORDER BY total_candidatures DESC;

-- Score moyen de matching par département
SELECT jo.department,
       COUNT(a.id)               AS nb_candidatures,
       ROUND(AVG(a.match_score), 1) AS score_moyen,
       MAX(a.match_score)          AS score_max,
       MIN(a.match_score)          AS score_min
FROM applications a
JOIN job_offers jo ON jo.id = a.job_offer_id
WHERE a.match_score IS NOT NULL
GROUP BY jo.department
ORDER BY score_moyen DESC;

-- Candidatures par mois
SELECT DATE_FORMAT(applied_date, '%Y-%m') AS mois,
       COUNT(*) AS nb_candidatures,
       ROUND(AVG(match_score), 1) AS score_moyen
FROM applications
WHERE applied_date IS NOT NULL
GROUP BY mois
ORDER BY mois;

-- Offres avec le plus de candidatures
SELECT jo.title, jo.department,
       COUNT(a.id) AS nb_candidatures
FROM job_offers jo
LEFT JOIN applications a ON a.job_offer_id = jo.id
GROUP BY jo.id, jo.title, jo.department
ORDER BY nb_candidatures DESC
LIMIT 10;

-- ── 3.6 Chat & AI ────────────────────────────────────────────────

-- Historique des conversations chatbot
SELECT id, user_email, message, response,
       DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS date_heure
FROM chat_messages
ORDER BY created_at DESC
LIMIT 50;

-- Utilisation de l'IA Gemini (tokens consommés)
SELECT DATE(created_at)          AS jour,
       COUNT(*)                  AS nb_appels,
       SUM(input_tokens)         AS tokens_entree,
       SUM(output_tokens)        AS tokens_sortie,
       SUM(cost_cents) / 100.0   AS cout_euros
FROM ai_usage_log
GROUP BY DATE(created_at)
ORDER BY jour DESC;

-- Coût total IA
SELECT SUM(cost_cents) / 100.0 AS cout_total_euros,
       COUNT(*)                AS nb_total_appels,
       AVG(input_tokens)       AS moy_tokens_entree
FROM ai_usage_log;

-- ── 3.7 Notifications ────────────────────────────────────────────

-- Toutes les notifications
SELECT id, recipient_email, type, content,
       sent_at, is_read
FROM notifications
ORDER BY sent_at DESC
LIMIT 50;

-- Notifications non lues par email
SELECT recipient_email,
       COUNT(*) AS nb_non_lues
FROM notifications
WHERE is_read = 0
GROUP BY recipient_email
ORDER BY nb_non_lues DESC;

-- ── 3.8 Intelligence Marché (Adzuna) ─────────────────────────────

-- Offres du marché récupérées
SELECT title, company, location,
       salary_min, salary_max,
       source, DATE(retrieved_at) AS date_recup
FROM market_offers
ORDER BY retrieved_at DESC
LIMIT 30;

-- Salaires moyens du marché par titre
SELECT title,
       ROUND(AVG(salary_min), 0) AS salaire_min_moyen,
       ROUND(AVG(salary_max), 0) AS salaire_max_moyen,
       COUNT(*) AS nb_offres
FROM market_offers
WHERE salary_min IS NOT NULL
GROUP BY title
ORDER BY salaire_max_moyen DESC;


-- ================================================================
--  SECTION 4 — BASE sirh_dwh (Data Warehouse)
-- ================================================================
USE sirh_dwh;

-- ── 4.1 Vérification du DWH ──────────────────────────────────────

-- Toutes les tables du DWH
SHOW TABLES;

-- Colonnes de chaque table principale
DESCRIBE dim_employe;
DESCRIBE dim_departement;
DESCRIBE dim_poste;
DESCRIBE dim_competence;
DESCRIBE dim_offre;
DESCRIBE dim_temps;
DESCRIBE fait_recrutement;
DESCRIBE fait_effectifs;
DESCRIBE fait_mobilite;
DESCRIBE fait_gap_competences;
DESCRIBE kpi_rh;

-- ── 4.2 Dimensions ───────────────────────────────────────────────

-- dim_employe — tous les employés
SELECT id_employe_nk, nom_complet, departement, poste,
       type_contrat, anciennete_mois, tranche_anciennete,
       profil_fidelisation, is_parti, date_depart, motif_depart
FROM dim_employe
ORDER BY departement, nom_complet
LIMIT 50;

-- Distribution des profils de fidélisation
SELECT profil_fidelisation,
       COUNT(*) AS nb,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM dim_employe), 1) AS pct
FROM dim_employe
GROUP BY profil_fidelisation
ORDER BY nb DESC;

-- Employés actifs vs partis
SELECT
    CASE WHEN is_parti = 1 THEN 'Partis' ELSE 'Actifs' END AS statut,
    COUNT(*) AS nb
FROM dim_employe
GROUP BY is_parti;

-- dim_departement
SELECT * FROM dim_departement ORDER BY departement;

-- dim_poste — tous les postes
SELECT * FROM dim_poste ORDER BY departement, poste;

-- dim_competence — toutes les compétences
SELECT * FROM dim_competence ORDER BY competence;

-- dim_offre — toutes les offres
SELECT id_offre_nk, titre, departement, statut,
       date_creation, date_limite
FROM dim_offre
ORDER BY date_creation DESC;

-- dim_temps — plage de dates disponible
SELECT MIN(date_jour) AS date_debut,
       MAX(date_jour) AS date_fin,
       COUNT(*)       AS nb_jours
FROM dim_temps;

-- ── 4.3 Faits ────────────────────────────────────────────────────

-- fait_recrutement — vue complète
SELECT fr.id_offre_fk, do_.titre AS offre,
       fr.departement, fr.applicant_email,
       fr.statut, fr.match_score,
       fr.nb_candidatures, fr.nb_embauches_mois
FROM fait_recrutement fr
JOIN dim_offre do_ ON do_.id_offre_nk = fr.id_offre_fk
ORDER BY fr.match_score DESC
LIMIT 50;

-- fait_effectifs — snapshot mensuel
SELECT departement,
       annee_snapshot, mois_snapshot,
       nb_employes,
       ROUND(anciennete_moyenne_mois, 1) AS anc_moy,
       pct_cdi
FROM fait_effectifs
ORDER BY annee_snapshot DESC, mois_snapshot DESC, departement
LIMIT 50;

-- fait_mobilite — mouvements mensuels
SELECT departement,
       annee_snapshot, mois_snapshot,
       nb_embauches_mois, nb_departs_mois,
       nb_embauches_mois - nb_departs_mois AS solde_net
FROM fait_mobilite
ORDER BY annee_snapshot DESC, mois_snapshot DESC
LIMIT 50;

-- fait_gap_competences — analyse des écarts
SELECT departement, competence, statut,
       taux_couverture_pct
FROM fait_gap_competences
ORDER BY
    CASE statut
        WHEN 'Gap critique'      THEN 1
        WHEN 'En développement'  THEN 2
        WHEN 'Maîtrisé'          THEN 3
    END, departement;

-- Compétences en gap critique
SELECT departement, competence, taux_couverture_pct
FROM fait_gap_competences
WHERE statut = 'Gap critique'
ORDER BY taux_couverture_pct ASC;

-- ── 4.4 Reporting / KPIs ─────────────────────────────────────────

-- kpi_rh — tableau de bord RH par département
SELECT departement,
       effectif_total,
       ROUND(anciennete_moyenne, 1)         AS anc_moy_mois,
       ROUND(taux_turnover, 1)              AS turnover_pct,
       ROUND(pct_cdi, 1)                   AS pct_cdi,
       ROUND(score_matching_moyen, 1)       AS score_ia_moyen,
       ROUND(taux_recrutement, 1)           AS taux_recru_pct
FROM kpi_rh
ORDER BY taux_turnover DESC;

-- Département avec le plus fort turnover
SELECT departement, ROUND(taux_turnover, 1) AS turnover_pct
FROM kpi_rh
ORDER BY taux_turnover DESC
LIMIT 1;

-- Département avec le meilleur score matching IA
SELECT departement, ROUND(score_matching_moyen, 1) AS score_ia
FROM kpi_rh
ORDER BY score_matching_moyen DESC
LIMIT 1;

-- Évolution des effectifs par mois
SELECT mois, annee,
       SUM(nb_employes) AS total_employes
FROM rh_evolution_effectifs
GROUP BY mois, annee
ORDER BY annee DESC, mois DESC
LIMIT 24;

-- Funnel recrutement global
SELECT etape, nb_candidats, taux_conversion_pct
FROM rh_funnel_recrutement
ORDER BY nb_candidats DESC;

-- Turnover par département et période
SELECT departement, annee, mois,
       nb_departs, taux_turnover_mensuel
FROM rh_turnover_departement
ORDER BY annee DESC, mois DESC, nb_departs DESC
LIMIT 50;

-- KPIs annuels
SELECT annee,
       SUM(nb_embauches)   AS total_embauches,
       SUM(nb_departs)     AS total_departs,
       ROUND(AVG(taux_turnover_annuel), 1) AS turnover_moyen,
       ROUND(AVG(score_matching_moyen), 1) AS score_ia_moyen
FROM rh_kpi_annuel
GROUP BY annee
ORDER BY annee DESC;

-- Distribution des contrats par an
SELECT annee, type_contrat, nb_employes,
       ROUND(pct_contrat, 1) AS pct
FROM rh_contrats_annuel
ORDER BY annee DESC, nb_employes DESC;

-- Hiérarchie managers (span of control)
SELECT manager_nom, departement,
       taille_equipe_directe,
       taille_equipe_totale
FROM rh_hierarchie_managers
ORDER BY taille_equipe_totale DESC;

-- Vue mensuelle des effectifs
SELECT annee, mois,
       SUM(nb_employes) AS effectif_total,
       ROUND(AVG(pct_cdi), 1) AS pct_cdi_moyen
FROM vw_effectifs_mensuels
GROUP BY annee, mois
ORDER BY annee DESC, mois DESC
LIMIT 24;


-- ================================================================
--  SECTION 5 — TABLES ML (dans sirh_dwh)
-- ================================================================
USE sirh_dwh;

-- ── 5.1 ML-1 : Turnover Risk ─────────────────────────────────────

-- Tous les scores de risque
SELECT id_employe_nk, nom_complet, departement,
       type_contrat, anciennete_mois,
       score_risque, niveau_risque,
       DATE(generated_at) AS calcule_le
FROM ml_turnover_risk
ORDER BY score_risque DESC;

-- Top 20 employés les plus à risque
SELECT nom_complet, departement, type_contrat,
       anciennete_mois, score_risque, niveau_risque
FROM ml_turnover_risk
ORDER BY score_risque DESC
LIMIT 20;

-- Distribution par niveau de risque
SELECT niveau_risque,
       COUNT(*) AS nb,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ml_turnover_risk), 1) AS pct,
       ROUND(AVG(score_risque), 1) AS score_moyen
FROM ml_turnover_risk
GROUP BY niveau_risque
ORDER BY score_moyen DESC;

-- Risque moyen par département
SELECT departement,
       COUNT(*) AS nb_employes,
       ROUND(AVG(score_risque), 1) AS risque_moyen,
       SUM(CASE WHEN niveau_risque = 'Critique' THEN 1 ELSE 0 END) AS nb_critique,
       SUM(CASE WHEN niveau_risque = 'Élevé'    THEN 1 ELSE 0 END) AS nb_eleve
FROM ml_turnover_risk
GROUP BY departement
ORDER BY risque_moyen DESC;

-- Risque par type de contrat
SELECT type_contrat,
       COUNT(*) AS nb,
       ROUND(AVG(score_risque), 1) AS risque_moyen
FROM ml_turnover_risk
GROUP BY type_contrat
ORDER BY risque_moyen DESC;

-- ── 5.2 ML-2 : Segmentation ──────────────────────────────────────

-- Tous les segments
SELECT id_employe_nk, nom_complet, departement,
       type_contrat, anciennete_mois,
       cluster_id, segment
FROM ml_employee_segments
ORDER BY cluster_id, nom_complet;

-- Distribution des segments
SELECT segment,
       COUNT(*) AS nb,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ml_employee_segments), 1) AS pct,
       ROUND(AVG(anciennete_mois), 1) AS anc_moy_mois
FROM ml_employee_segments
GROUP BY segment, cluster_id
ORDER BY cluster_id;

-- Segments par département
SELECT departement, segment, COUNT(*) AS nb
FROM ml_employee_segments
GROUP BY departement, segment
ORDER BY departement, nb DESC;

-- ── 5.3 ML-3 : High Potentials ───────────────────────────────────

-- Tous les High Potentials
SELECT id_employe_nk, nom_complet, departement,
       type_contrat, anciennete_mois, segment,
       ROUND(score_moyen_recrutement, 1) AS score_recru,
       hp_score, hp_niveau
FROM ml_high_potentials
ORDER BY hp_score DESC;

-- Top 10 High Potentials
SELECT nom_complet, departement, segment,
       hp_score, hp_niveau
FROM ml_high_potentials
WHERE hp_niveau = 'High Potential'
ORDER BY hp_score DESC
LIMIT 10;

-- Distribution HP par niveau
SELECT hp_niveau,
       COUNT(*) AS nb,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ml_high_potentials), 1) AS pct,
       ROUND(AVG(hp_score), 1) AS score_moyen
FROM ml_high_potentials
GROUP BY hp_niveau
ORDER BY score_moyen DESC;

-- HP par département
SELECT departement,
       SUM(CASE WHEN hp_niveau = 'High Potential'     THEN 1 ELSE 0 END) AS high_potentials,
       SUM(CASE WHEN hp_niveau = 'Potentiel Confirmé' THEN 1 ELSE 0 END) AS potentiels,
       COUNT(*) AS total
FROM ml_high_potentials
GROUP BY departement
ORDER BY high_potentials DESC;

-- ── 5.4 ML-4 : Prévision Embauches ──────────────────────────────

-- Toutes les prévisions
SELECT mois, embauches_prevues,
       intervalle_bas  AS min_prevu,
       intervalle_haut AS max_prevu,
       DATE(generated_at) AS calcule_le
FROM ml_forecast_embauches
ORDER BY mois;

-- Total prévu sur les 6 prochains mois
SELECT SUM(embauches_prevues) AS total_embauches_prevues,
       MIN(mois)              AS debut,
       MAX(mois)              AS fin
FROM ml_forecast_embauches;

-- ── 5.5 ML-5 : Corrélations ──────────────────────────────────────

-- Corrélations significatives (|r| > 0.4)
SELECT variable_1, variable_2,
       ROUND(correlation, 3) AS r,
       CASE
           WHEN ABS(correlation) > 0.7 THEN 'Forte'
           WHEN ABS(correlation) > 0.4 THEN 'Modérée'
           ELSE 'Faible'
       END AS force,
       CASE WHEN correlation > 0 THEN 'Positive' ELSE 'Négative' END AS direction
FROM ml_correlations
WHERE variable_1 <> variable_2
  AND ABS(correlation) > 0.4
ORDER BY ABS(correlation) DESC;

-- Toutes les corrélations avec turnover
SELECT variable_1, variable_2, ROUND(correlation, 3) AS r
FROM ml_correlations
WHERE (variable_1 LIKE '%turnover%' OR variable_2 LIKE '%turnover%'
    OR variable_1 LIKE '%risque%'   OR variable_2 LIKE '%risque%')
  AND variable_1 <> variable_2
ORDER BY ABS(correlation) DESC;

-- ── 5.6 ML-6 : Rétention ────────────────────────────────────────

-- Toutes les analyses de rétention
SELECT id_employe_nk, nom_complet, departement,
       hp_niveau, score_risque,
       score_retention, retention_niveau, priorite_rh
FROM ml_retention_analysis
ORDER BY
    CASE priorite_rh
        WHEN 'URGENT — Talent clé à risque' THEN 1
        WHEN 'ACTION REQUISE'               THEN 2
        WHEN 'Surveillance'                 THEN 3
        ELSE 4
    END, score_risque DESC;

-- Alertes URGENT uniquement
SELECT nom_complet, departement, hp_niveau,
       score_risque, score_retention, priorite_rh
FROM ml_retention_analysis
WHERE priorite_rh = 'URGENT — Talent clé à risque'
ORDER BY score_risque DESC;

-- Résumé par priorité RH
SELECT priorite_rh,
       COUNT(*) AS nb,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ml_retention_analysis), 1) AS pct,
       ROUND(AVG(score_risque), 1)    AS risque_moyen,
       ROUND(AVG(score_retention), 1) AS retention_moyen
FROM ml_retention_analysis
GROUP BY priorite_rh
ORDER BY nb DESC;

-- Analyse rétention par département
SELECT departement,
       COUNT(*) AS nb_employes,
       ROUND(AVG(score_retention), 1) AS score_retention_moyen,
       SUM(CASE WHEN priorite_rh = 'URGENT — Talent clé à risque' THEN 1 ELSE 0 END) AS nb_urgents,
       SUM(CASE WHEN priorite_rh = 'ACTION REQUISE'               THEN 1 ELSE 0 END) AS nb_action,
       SUM(CASE WHEN retention_niveau = 'À risque immédiat'        THEN 1 ELSE 0 END) AS nb_risque_immediat
FROM ml_retention_analysis
GROUP BY departement
ORDER BY score_retention_moyen ASC;


-- ================================================================
--  SECTION 6 — REQUÊTES CROISÉES (MULTI-TABLES / MULTI-BASES)
-- ================================================================

-- ── 6.1 Vue 360° d'un employé (DWH + ML) ────────────────────────

SELECT
    de.nom_complet,
    de.departement,
    de.poste,
    de.type_contrat,
    de.anciennete_mois,
    de.profil_fidelisation,
    -- ML Turnover
    tr.score_risque,
    tr.niveau_risque,
    -- ML Segmentation
    seg.segment,
    -- ML High Potential
    hp.hp_score,
    hp.hp_niveau,
    -- ML Rétention
    ret.score_retention,
    ret.retention_niveau,
    ret.priorite_rh
FROM dim_employe de
LEFT JOIN ml_turnover_risk    tr  ON tr.id_employe_nk  = de.id_employe_nk
LEFT JOIN ml_employee_segments seg ON seg.id_employe_nk = de.id_employe_nk
LEFT JOIN ml_high_potentials  hp  ON hp.id_employe_nk  = de.id_employe_nk
LEFT JOIN ml_retention_analysis ret ON ret.id_employe_nk = de.id_employe_nk
WHERE de.is_parti = 0
ORDER BY tr.score_risque DESC
LIMIT 30;

-- ── 6.2 Tableau de bord exécutif complet ────────────────────────

SELECT
    -- Effectifs
    (SELECT COUNT(*) FROM dim_employe WHERE is_parti = 0)          AS employes_actifs,
    (SELECT COUNT(*) FROM dim_employe WHERE is_parti = 1)          AS departs_historiques,
    -- Recrutement
    (SELECT COUNT(*) FROM fait_recrutement WHERE statut = 'ACCEPTED') AS embauches_totales,
    (SELECT ROUND(AVG(match_score), 1) FROM fait_recrutement
     WHERE match_score IS NOT NULL)                                   AS score_ia_moyen,
    -- ML Turnover
    (SELECT COUNT(*) FROM ml_turnover_risk WHERE niveau_risque IN ('Élevé','Critique')) AS employes_a_risque,
    -- ML HP
    (SELECT COUNT(*) FROM ml_high_potentials WHERE hp_niveau = 'High Potential') AS high_potentials,
    -- ML Rétention
    (SELECT COUNT(*) FROM ml_retention_analysis
     WHERE priorite_rh = 'URGENT — Talent clé à risque')             AS alertes_urgentes;

-- ── 6.3 Croisement HP × Turnover : les talents critiques ─────────

SELECT
    hp.nom_complet,
    hp.departement,
    hp.hp_niveau,
    hp.hp_score,
    tr.score_risque,
    tr.niveau_risque,
    ret.priorite_rh
FROM ml_high_potentials hp
JOIN ml_turnover_risk    tr  ON tr.id_employe_nk = hp.id_employe_nk
JOIN ml_retention_analysis ret ON ret.id_employe_nk = hp.id_employe_nk
WHERE hp.hp_niveau IN ('High Potential', 'Potentiel Confirmé')
  AND tr.niveau_risque IN ('Élevé', 'Critique')
ORDER BY hp.hp_score DESC;

-- ── 6.4 Score moyen ML par département ──────────────────────────

SELECT
    de.departement,
    COUNT(DISTINCT de.id_employe_nk)       AS nb_employes,
    ROUND(AVG(tr.score_risque), 1)         AS risque_turnover_moyen,
    ROUND(AVG(hp.hp_score), 1)             AS hp_score_moyen,
    ROUND(AVG(ret.score_retention), 1)     AS retention_moyen,
    SUM(CASE WHEN ret.priorite_rh = 'URGENT — Talent clé à risque' THEN 1 ELSE 0 END) AS nb_urgents
FROM dim_employe de
LEFT JOIN ml_turnover_risk    tr  ON tr.id_employe_nk = de.id_employe_nk
LEFT JOIN ml_high_potentials  hp  ON hp.id_employe_nk = de.id_employe_nk
LEFT JOIN ml_retention_analysis ret ON ret.id_employe_nk = de.id_employe_nk
WHERE de.is_parti = 0
GROUP BY de.departement
ORDER BY nb_urgents DESC, risque_turnover_moyen DESC;

-- ── 6.5 Corrélation ancienneté vs risque ────────────────────────

SELECT
    de.tranche_anciennete,
    COUNT(*) AS nb,
    ROUND(AVG(tr.score_risque), 1) AS risque_moyen,
    ROUND(AVG(hp.hp_score), 1)     AS hp_moyen
FROM dim_employe de
JOIN ml_turnover_risk   tr ON tr.id_employe_nk = de.id_employe_nk
JOIN ml_high_potentials hp ON hp.id_employe_nk = de.id_employe_nk
WHERE de.is_parti = 0
GROUP BY de.tranche_anciennete
ORDER BY MIN(de.anciennete_mois);

-- ── 6.6 Gaps de compétences critiques + offres concernées ───────

SELECT
    gc.departement,
    gc.competence,
    gc.taux_couverture_pct,
    gc.statut,
    COUNT(DISTINCT jo.id_offre_nk) AS nb_offres_actives
FROM fait_gap_competences gc
LEFT JOIN dim_offre jo ON jo.departement = gc.departement
                      AND jo.statut = 'PUBLISHED'
WHERE gc.statut = 'Gap critique'
GROUP BY gc.departement, gc.competence, gc.taux_couverture_pct, gc.statut
ORDER BY gc.taux_couverture_pct ASC;


-- ================================================================
--  SECTION 7 — REQUÊTES DE MAINTENANCE ET VÉRIFICATION
-- ================================================================

-- ── 7.1 Intégrité des données ────────────────────────────────────

-- Employés dans DWH mais absents des tables ML
SELECT de.id_employe_nk, de.nom_complet
FROM dim_employe de
LEFT JOIN ml_turnover_risk tr ON tr.id_employe_nk = de.id_employe_nk
WHERE de.is_parti = 0 AND tr.id_employe_nk IS NULL;

-- Date de la dernière exécution ML
SELECT
    'ml_turnover_risk'      AS modele, MAX(generated_at) AS derniere_maj FROM ml_turnover_risk
UNION ALL
SELECT 'ml_employee_segments', MAX(generated_at) FROM ml_employee_segments
UNION ALL
SELECT 'ml_high_potentials',   MAX(generated_at) FROM ml_high_potentials
UNION ALL
SELECT 'ml_forecast_embauches',MAX(generated_at) FROM ml_forecast_embauches
UNION ALL
SELECT 'ml_correlations',      MAX(generated_at) FROM ml_correlations
UNION ALL
SELECT 'ml_retention_analysis',MAX(generated_at) FROM ml_retention_analysis;

-- Cohérence entre dim_employe et ml_turnover_risk
SELECT
    (SELECT COUNT(*) FROM dim_employe WHERE is_parti = 0) AS actifs_dwh,
    (SELECT COUNT(*) FROM ml_turnover_risk)               AS scores_turnover,
    (SELECT COUNT(*) FROM dim_employe WHERE is_parti = 0)
    - (SELECT COUNT(*) FROM ml_turnover_risk)             AS ecart;

-- ── 7.2 Freshness des tables DWH ─────────────────────────────────

-- Vérifier la fraîcheur des snapshots
SELECT dbt_updated_at        AS derniere_maj,
       COUNT(*)              AS nb_lignes,
       dbt_current_flag
FROM snap_employe_historique
GROUP BY dbt_updated_at, dbt_current_flag
ORDER BY dbt_updated_at DESC
LIMIT 5;

-- ── 7.3 Nettoyage (à utiliser avec précaution) ──────────────────

-- Vider et recharger les tables ML (exécuté par Airflow automatiquement)
-- TRUNCATE TABLE ml_turnover_risk;
-- TRUNCATE TABLE ml_employee_segments;
-- TRUNCATE TABLE ml_high_potentials;
-- TRUNCATE TABLE ml_forecast_embauches;
-- TRUNCATE TABLE ml_correlations;
-- TRUNCATE TABLE ml_retention_analysis;


-- ================================================================
--  SECTION 8 — CRÉATION DES BASES (si pas encore existantes)
-- ================================================================

CREATE DATABASE IF NOT EXISTS sirh_auth         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS sirh_employee     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS sirh_recruitment  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS sirh_dwh          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Utilisateur Superset (lecture seule sur DWH)
-- CREATE USER IF NOT EXISTS 'superset_reader'@'%' IDENTIFIED BY 'superset_pass';
-- GRANT SELECT ON sirh_dwh.* TO 'superset_reader'@'%';
-- FLUSH PRIVILEGES;

-- ================================================================
-- FIN DU FICHIER — SIRH SQL COMPLET
-- ================================================================