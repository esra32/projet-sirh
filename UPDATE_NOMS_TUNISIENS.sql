-- ================================================================
--  UPDATE — Coordonnées tunisiennes (Arab Soft)
--  Exécuter dans MySQL Workbench / DBeaver
--  Ne touche PAS aux emails, rôles, départements, postes, hiérarchie
-- ================================================================

-- ================================================================
--  1. sirh_employee — noms et téléphones
-- ================================================================
USE sirh_employee;

UPDATE employees SET first_name = 'Salma',    last_name = 'Ben Romdhane', phone = '+216 71 100 200' WHERE email = 'admin@hr.sirh.com';
UPDATE employees SET first_name = 'Mehdi',    last_name = 'Trabelsi',     phone = '+216 55 200 300' WHERE email = 'manager@mgr.sirh.com';
UPDATE employees SET first_name = 'Nadia',    last_name = 'Gharbi',       phone = '+216 98 300 400' WHERE email = 'nadia.mgr@sirh.com';
UPDATE employees SET first_name = 'Ayoub',    last_name = 'Mansouri',     phone = '+216 22 400 500' WHERE email = 'employee@sirh.com';
UPDATE employees SET first_name = 'Youssef',  last_name = 'Ben Ali',      phone = '+216 50 500 600' WHERE email = 'youssef.dev@sirh.com';
UPDATE employees SET first_name = 'Karim',    last_name = 'Hamdi',        phone = '+216 71 600 700' WHERE email = 'karim.design@sirh.com';
UPDATE employees SET first_name = 'Cyrine',   last_name = 'Bouzid',       phone = '+216 25 700 800' WHERE email = 'clara.mkt@sirh.com';
UPDATE employees SET first_name = 'Lina',     last_name = 'Chaabane',     phone = '+216 55 800 900' WHERE email = 'lea.data@sirh.com';

-- Anciens noms français dans le bulk
UPDATE employees SET first_name = 'Houssem',  last_name = 'Gargouri',     phone = '+216 71 111 222' WHERE email = 'pierre.leclerc@sirh.com';
UPDATE employees SET first_name = 'Rim',      last_name = 'Agrebi',       phone = '+216 22 222 333' WHERE email = 'emma.rousseau@sirh.com';
UPDATE employees SET first_name = 'Slim',     last_name = 'Hammami',      phone = '+216 50 333 444' WHERE email = 'thomas.dupuis@sirh.com';
UPDATE employees SET first_name = 'Amina',    last_name = 'Dridi',        phone = '+216 98 444 555' WHERE email = 'camille.martin@sirh.com';
UPDATE employees SET first_name = 'Ons',      last_name = 'Jlassi',       phone = '+216 71 555 666' WHERE email = 'guillaume.petit@sirh.com';
UPDATE employees SET first_name = 'Rami',     last_name = 'Belhaj',       phone = '+216 55 666 777' WHERE email = 'david.bernard@sirh.com';
UPDATE employees SET first_name = 'Saoussen', last_name = 'Ben Fredj',    phone = '+216 22 777 888' WHERE email = 'marie.lambert@sirh.com';
UPDATE employees SET first_name = 'Tarek',    last_name = 'Mejri',        phone = '+216 25 888 999' WHERE email = 'lucas.fontaine@sirh.com';

-- Vérification
SELECT CONCAT(first_name, ' ', last_name) AS nom, email, phone FROM employees ORDER BY email;

-- ================================================================
--  2. sirh_recruitment — candidatures (applicant_name)
-- ================================================================
USE sirh_recruitment;

UPDATE applications SET applicant_name = 'Ayoub Mansouri'  WHERE applicant_email = 'employee@sirh.com';
UPDATE applications SET applicant_name = 'Karim Hamdi'     WHERE applicant_email = 'karim.design@sirh.com';
UPDATE applications SET applicant_name = 'Lina Chaabane'   WHERE applicant_email = 'lea.data@sirh.com';
UPDATE applications SET applicant_name = 'Youssef Ben Ali' WHERE applicant_email = 'youssef.dev@sirh.com';
UPDATE applications SET applicant_name = 'Cyrine Bouzid'   WHERE applicant_email = 'clara.mkt@sirh.com';

-- Offres — created_by_name
UPDATE job_offers SET created_by_name = 'Mehdi Trabelsi'     WHERE created_by_email = 'manager@mgr.sirh.com';
UPDATE job_offers SET created_by_name = 'Nadia Gharbi'       WHERE created_by_email = 'nadia.mgr@sirh.com';
UPDATE job_offers SET created_by_name = 'Salma Ben Romdhane' WHERE created_by_email = 'admin@hr.sirh.com';

-- Offres — villes tunisiennes
UPDATE job_offers SET location = 'Tunis - Hybride' WHERE location = 'Toulouse - Hybride';
UPDATE job_offers SET location = 'Sousse'          WHERE location = 'Montpellier';
UPDATE job_offers SET location = 'Tunis / Remote'  WHERE location = 'Paris / Remote';
UPDATE job_offers SET location = 'Sfax - Hybride'  WHERE location = 'Lyon - Hybride';
UPDATE job_offers SET location = 'Monastir'        WHERE location = 'Bordeaux';

-- Vérification
SELECT applicant_name, applicant_email FROM applications ORDER BY applicant_email;
SELECT title, location, created_by_name FROM job_offers ORDER BY title;

-- ================================================================
-- FIN
-- ================================================================