-- ================================================================
--  FIX FINAL — Arab Soft — Tous les noms tunisiens
--  Logique : update TOUT sauf les 16 comptes démo exacts
--            et ce qui est déjà @arabsoft.com.tn
-- ================================================================

-- ================================================================
--  PARTIE 1 — sirh_employee
-- ================================================================
USE sirh_employee;

SELECT CONCAT('Employes a mettre a jour : ', COUNT(*)) AS avant
FROM employees
WHERE email NOT LIKE '%@arabsoft.com.tn'
  AND email NOT IN (
    'admin@hr.sirh.com','manager@mgr.sirh.com','nadia.mgr@sirh.com',
    'employee@sirh.com','youssef.dev@sirh.com','karim.design@sirh.com',
    'clara.mkt@sirh.com','lea.data@sirh.com',
    'pierre.leclerc@sirh.com','emma.rousseau@sirh.com','thomas.dupuis@sirh.com',
    'camille.martin@sirh.com','guillaume.petit@sirh.com','david.bernard@sirh.com',
    'marie.lambert@sirh.com','lucas.fontaine@sirh.com'
  );

-- ── Tables temporaires ───────────────────────────────────────────
DROP TEMPORARY TABLE IF EXISTS t_fn;
DROP TEMPORARY TABLE IF EXISTS t_ln;
DROP TEMPORARY TABLE IF EXISTS t_cities;
DROP TEMPORARY TABLE IF EXISTS t_bulk;

CREATE TEMPORARY TABLE t_fn (id INT PRIMARY KEY, name VARCHAR(50));
CREATE TEMPORARY TABLE t_ln (id INT PRIMARY KEY, name VARCHAR(50));
CREATE TEMPORARY TABLE t_cities (id INT PRIMARY KEY, name VARCHAR(60), zip VARCHAR(10));

INSERT INTO t_fn VALUES
(1,'Mohamed'),(2,'Ahmed'),(3,'Ali'),(4,'Omar'),(5,'Youssef'),
(6,'Karim'),(7,'Slim'),(8,'Rami'),(9,'Tarek'),(10,'Houssem'),
(11,'Bilel'),(12,'Amine'),(13,'Sami'),(14,'Walid'),(15,'Nizar'),
(16,'Oussama'),(17,'Hamza'),(18,'Khaled'),(19,'Zied'),(20,'Maher'),
(21,'Salma'),(22,'Nadia'),(23,'Amina'),(24,'Ons'),(25,'Cyrine'),
(26,'Lina'),(27,'Rim'),(28,'Saoussen'),(29,'Hana'),(30,'Dorra'),
(31,'Nesrine'),(32,'Farah'),(33,'Yasmine'),(34,'Imen'),(35,'Meriem'),
(36,'Emna'),(37,'Wafa'),(38,'Lobna'),(39,'Sirine'),(40,'Ghofrane'),
(41,'Anis'),(42,'Fares'),(43,'Mehdi'),(44,'Souheil'),(45,'Aymen'),
(46,'Bassem'),(47,'Chokri'),(48,'Fathi'),(49,'Habib'),(50,'Issam');

INSERT INTO t_ln VALUES
(1,'Ben Ali'),(2,'Trabelsi'),(3,'Mansouri'),(4,'Gharbi'),(5,'Hammami'),
(6,'Bouzid'),(7,'Chaabane'),(8,'Gargouri'),(9,'Agrebi'),(10,'Dridi'),
(11,'Jlassi'),(12,'Belhaj'),(13,'Ben Fredj'),(14,'Mejri'),(15,'Ben Romdhane'),
(16,'Hamdi'),(17,'Maaroufi'),(18,'Souissi'),(19,'Kchaou'),(20,'Riahi'),
(21,'Ben Salah'),(22,'Cherni'),(23,'Haddad'),(24,'Tlili'),(25,'Fakhfakh'),
(26,'Baccouche'),(27,'Zouari'),(28,'Oueslati'),(29,'Mkacher'),(30,'Abidi'),
(31,'Ben Youssef'),(32,'Jouini'),(33,'Sfar'),(34,'Kammoun'),(35,'Chaabouni'),
(36,'Ferchichi'),(37,'Guellali'),(38,'Louati'),(39,'Meddeb'),(40,'Nasr'),
(41,'Ben Ammar'),(42,'Chouchane'),(43,'Dhouib'),(44,'Elloumi'),(45,'Farhat'),
(46,'Guizani'),(47,'Hamrouni'),(48,'Jaziri'),(49,'Ktari'),(50,'Labidi');

INSERT INTO t_cities VALUES
(1,'Tunis','1000'),(2,'Sfax','3000'),(3,'Sousse','4000'),
(4,'Monastir','5000'),(5,'Bizerte','7000'),(6,'Nabeul','8000'),
(7,'Hammamet','8050'),(8,'Kairouan','3100'),(9,'Gabes','6000'),
(10,'Ariana','2080'),(11,'Ben Arous','2013'),(12,'Manouba','2010'),
(13,'Zaghouan','1100'),(14,'Gafsa','2100'),(15,'Medenine','4100'),
(16,'Tozeur','2200'),(17,'Jendouba','8100'),(18,'Beja','9000'),
(19,'Le Kef','7100'),(20,'Siliana','6100');

-- ── Numéroter les cibles ─────────────────────────────────────────
CREATE TEMPORARY TABLE t_bulk AS
SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
FROM employees
WHERE email NOT LIKE '%@arabsoft.com.tn'
  AND email NOT IN (
    'admin@hr.sirh.com','manager@mgr.sirh.com','nadia.mgr@sirh.com',
    'employee@sirh.com','youssef.dev@sirh.com','karim.design@sirh.com',
    'clara.mkt@sirh.com','lea.data@sirh.com',
    'pierre.leclerc@sirh.com','emma.rousseau@sirh.com','thomas.dupuis@sirh.com',
    'camille.martin@sirh.com','guillaume.petit@sirh.com','david.bernard@sirh.com',
    'marie.lambert@sirh.com','lucas.fontaine@sirh.com'
  );

SELECT CONCAT('Total cible : ', COUNT(*)) AS info FROM t_bulk;

-- ── UPDATE ───────────────────────────────────────────────────────
UPDATE employees e
JOIN t_bulk    b  ON e.id  = b.id
JOIN t_fn      fn ON fn.id = ((b.rn - 1) % 50) + 1
JOIN t_ln      ln ON ln.id = ((b.rn - 1 + 25) % 50) + 1
JOIN t_cities  c  ON c.id  = ((b.rn - 1) % 20) + 1
SET
    e.first_name = fn.name,
    e.last_name  = ln.name,
    e.email = CONCAT(
        LOWER(REPLACE(fn.name,' ','.')), '.',
        LOWER(REPLACE(ln.name,' ','.')),
        b.rn + 2000, '@arabsoft.com.tn'
    ),
    e.phone = CONCAT(
        '+216 ',
        ELT((b.rn % 5)+1,'20','25','50','55','98'),
        ' ', LPAD(((b.rn*41+150)%900)+100,3,'0'),
        ' ', LPAD(((b.rn*59+250)%900)+100,3,'0')
    ),
    e.city    = c.name,
    e.address = CONCAT(
        ((b.rn*7)%150)+1, ', Rue ',
        ELT((b.rn%10)+1,
            'de la Republique','Ibn Khaldoun','Habib Bourguiba',
            'de Carthage','du Lac','des Jasmins',
            'de la Liberte','Ali Belhouane','Mongi Slim','de Tunis'),
        ', ', c.name, ' ', c.zip
    );

-- ── Résultat final employees ─────────────────────────────────────
SELECT CONCAT('Total @arabsoft.com.tn : ', COUNT(*)) AS resultat
FROM employees WHERE email LIKE '%@arabsoft.com.tn';

SELECT CONCAT('Comptes demo inchanges : ', COUNT(*)) AS resultat
FROM employees WHERE email IN (
    'admin@hr.sirh.com','manager@mgr.sirh.com','nadia.mgr@sirh.com',
    'employee@sirh.com','youssef.dev@sirh.com','karim.design@sirh.com',
    'clara.mkt@sirh.com','lea.data@sirh.com',
    'pierre.leclerc@sirh.com','emma.rousseau@sirh.com','thomas.dupuis@sirh.com',
    'camille.martin@sirh.com','guillaume.petit@sirh.com','david.bernard@sirh.com',
    'marie.lambert@sirh.com','lucas.fontaine@sirh.com'
);

SELECT CONCAT('Reste non-tunisiens : ', COUNT(*)) AS resultat
FROM employees
WHERE email NOT LIKE '%@arabsoft.com.tn'
  AND email NOT IN (
    'admin@hr.sirh.com','manager@mgr.sirh.com','nadia.mgr@sirh.com',
    'employee@sirh.com','youssef.dev@sirh.com','karim.design@sirh.com',
    'clara.mkt@sirh.com','lea.data@sirh.com',
    'pierre.leclerc@sirh.com','emma.rousseau@sirh.com','thomas.dupuis@sirh.com',
    'camille.martin@sirh.com','guillaume.petit@sirh.com','david.bernard@sirh.com',
    'marie.lambert@sirh.com','lucas.fontaine@sirh.com'
  );

-- ================================================================
--  PARTIE 2 — sirh_recruitment
-- ================================================================
USE sirh_recruitment;

-- ── Candidatures @sirh.com démo ──────────────────────────────────
UPDATE applications SET applicant_name = 'Ayoub Mansouri'  WHERE applicant_email = 'employee@sirh.com';
UPDATE applications SET applicant_name = 'Karim Hamdi'     WHERE applicant_email = 'karim.design@sirh.com';
UPDATE applications SET applicant_name = 'Lina Chaabane'   WHERE applicant_email = 'lea.data@sirh.com';
UPDATE applications SET applicant_name = 'Youssef Ben Ali' WHERE applicant_email = 'youssef.dev@sirh.com';
UPDATE applications SET applicant_name = 'Cyrine Bouzid'   WHERE applicant_email = 'clara.mkt@sirh.com';

-- ── Candidatures restantes (tous les autres emails) ──────────────
DROP TEMPORARY TABLE IF EXISTS t_apps;
DROP TEMPORARY TABLE IF EXISTS t_fn3;
DROP TEMPORARY TABLE IF EXISTS t_ln3;

CREATE TEMPORARY TABLE t_fn3 (id INT PRIMARY KEY, name VARCHAR(50));
CREATE TEMPORARY TABLE t_ln3 (id INT PRIMARY KEY, name VARCHAR(50));

INSERT INTO t_fn3 VALUES
(1,'Mohamed'),(2,'Ahmed'),(3,'Youssef'),(4,'Salma'),(5,'Nadia'),
(6,'Amina'),(7,'Karim'),(8,'Rami'),(9,'Cyrine'),(10,'Lina'),
(11,'Amine'),(12,'Ons'),(13,'Farah'),(14,'Slim'),(15,'Rim'),
(16,'Emna'),(17,'Mehdi'),(18,'Aymen'),(19,'Tarek'),(20,'Nesrine');

INSERT INTO t_ln3 VALUES
(1,'Ben Ali'),(2,'Trabelsi'),(3,'Mansouri'),(4,'Gharbi'),(5,'Hammami'),
(6,'Bouzid'),(7,'Chaabane'),(8,'Gargouri'),(9,'Dridi'),(10,'Jlassi'),
(11,'Belhaj'),(12,'Mejri'),(13,'Hamdi'),(14,'Souissi'),(15,'Riahi'),
(16,'Cherni'),(17,'Haddad'),(18,'Zouari'),(19,'Jouini'),(20,'Farhat');

CREATE TEMPORARY TABLE t_apps AS
SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
FROM applications
WHERE applicant_email NOT IN (
    'employee@sirh.com','karim.design@sirh.com',
    'lea.data@sirh.com','youssef.dev@sirh.com','clara.mkt@sirh.com'
);

UPDATE applications a
JOIN t_apps  t  ON t.id  = a.id
JOIN t_fn3  fn  ON fn.id = ((t.rn - 1) % 20) + 1
JOIN t_ln3  ln  ON ln.id = ((t.rn - 1 + 10) % 20) + 1
SET a.applicant_name  = CONCAT(fn.name, ' ', ln.name),
    a.applicant_email = CONCAT(
        LOWER(REPLACE(fn.name,' ','.')), '.',
        LOWER(REPLACE(ln.name,' ','.')),
        t.rn + 3000, '@arabsoft.com.tn'
    );

-- ── Offres created_by ────────────────────────────────────────────
UPDATE job_offers SET created_by_name = 'Mehdi Trabelsi'     WHERE created_by_email = 'manager@mgr.sirh.com';
UPDATE job_offers SET created_by_name = 'Nadia Gharbi'       WHERE created_by_email = 'nadia.mgr@sirh.com';
UPDATE job_offers SET created_by_name = 'Salma Ben Romdhane' WHERE created_by_email = 'admin@hr.sirh.com';

-- ── Résultat ─────────────────────────────────────────────────────
SELECT applicant_name, applicant_email FROM applications LIMIT 10;
SELECT title, created_by_name FROM job_offers LIMIT 5;

-- ================================================================
--  FIN
-- ================================================================