-- ================================================================
--  UPDATE RECRUTEMENT — Noms tunisiens (Arab Soft)
--  1. applications : applicant_name synchronisé avec employees
--  2. job_offers   : created_by_name synchronisé avec employees
-- ================================================================

USE sirh_recruitment;

-- ----------------------------------------------------------------
-- 1. Candidatures — synchroniser applicant_name depuis la table employees
--    Pour les emails @sirh.com déjà Tunisiens → sera mis à jour aussi
--    Pour les emails @arabsoft.com.tn (bulk mis à jour) → idem
-- ----------------------------------------------------------------
UPDATE applications a
JOIN sirh_employee.employees e ON e.email = a.applicant_email
SET a.applicant_name = CONCAT(e.first_name, ' ', e.last_name);

SELECT CONCAT('Candidatures mises a jour : ', ROW_COUNT()) AS info;

-- Candidatures dont l'email n'a pas de correspondance en base employees
-- → assigner un nom tunisien basé sur le row number
DROP TEMPORARY TABLE IF EXISTS t_apps_sans_match;
CREATE TEMPORARY TABLE t_apps_sans_match AS
SELECT a.id, ROW_NUMBER() OVER (ORDER BY a.id) AS rn
FROM applications a
LEFT JOIN sirh_employee.employees e ON e.email = a.applicant_email
WHERE e.id IS NULL;

DROP TEMPORARY TABLE IF EXISTS t_fn;
DROP TEMPORARY TABLE IF EXISTS t_ln;
CREATE TEMPORARY TABLE t_fn (id INT PRIMARY KEY, name VARCHAR(50));
CREATE TEMPORARY TABLE t_ln (id INT PRIMARY KEY, name VARCHAR(50));

INSERT INTO t_fn VALUES
(1,'Mohamed'),(2,'Ahmed'),(3,'Ali'),(4,'Youssef'),(5,'Karim'),
(6,'Salma'),(7,'Nadia'),(8,'Amina'),(9,'Cyrine'),(10,'Lina'),
(11,'Rami'),(12,'Tarek'),(13,'Amine'),(14,'Ons'),(15,'Farah'),
(16,'Slim'),(17,'Rim'),(18,'Emna'),(19,'Mehdi'),(20,'Aymen');

INSERT INTO t_ln VALUES
(1,'Ben Ali'),(2,'Trabelsi'),(3,'Mansouri'),(4,'Gharbi'),(5,'Hammami'),
(6,'Bouzid'),(7,'Chaabane'),(8,'Gargouri'),(9,'Dridi'),(10,'Jlassi'),
(11,'Belhaj'),(12,'Mejri'),(13,'Hamdi'),(14,'Souissi'),(15,'Riahi'),
(16,'Cherni'),(17,'Haddad'),(18,'Zouari'),(19,'Jouini'),(20,'Farhat');

UPDATE applications a
JOIN t_apps_sans_match t ON t.id = a.id
JOIN t_fn fn ON fn.id = ((t.rn - 1) % 20) + 1
JOIN t_ln ln ON ln.id = ((t.rn - 1 + 10) % 20) + 1
SET a.applicant_name = CONCAT(fn.name, ' ', ln.name);

-- ----------------------------------------------------------------
-- 2. Offres d'emploi — synchroniser created_by_name depuis employees
-- ----------------------------------------------------------------
UPDATE job_offers j
JOIN sirh_employee.employees e ON e.email = j.created_by_email
SET j.created_by_name = CONCAT(e.first_name, ' ', e.last_name)
WHERE j.created_by_email IS NOT NULL AND j.created_by_email != '';

-- ----------------------------------------------------------------
-- 3. Vérification
-- ----------------------------------------------------------------
SELECT applicant_name, applicant_email, status
FROM applications
ORDER BY applicant_email
LIMIT 15;

SELECT title, created_by_name, created_by_email
FROM job_offers
ORDER BY title
LIMIT 15;

-- ----------------------------------------------------------------
-- FIN
-- ----------------------------------------------------------------