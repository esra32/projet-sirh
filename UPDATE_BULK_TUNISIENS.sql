-- ================================================================
--  UPDATE BULK — TOUS les employés non-démo (Arab Soft)
--  Cible : TOUS sauf les 16 comptes @sirh.com
--  Champs : first_name, last_name, email, phone, city, address
--  Non touché : department, position, manager, contract, hire_date
-- ================================================================

USE sirh_employee;

-- ----------------------------------------------------------------
-- 0. Combien d'employés à mettre à jour ?
-- ----------------------------------------------------------------
SELECT CONCAT('A mettre a jour : ', COUNT(*)) AS info
FROM employees
WHERE email NOT LIKE '%@sirh.com';

-- ----------------------------------------------------------------
-- 1. Tables temporaires
-- ----------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS t_firstnames;
DROP TEMPORARY TABLE IF EXISTS t_lastnames;
DROP TEMPORARY TABLE IF EXISTS t_cities;
DROP TEMPORARY TABLE IF EXISTS t_bulk_emp;

CREATE TEMPORARY TABLE t_firstnames (id INT PRIMARY KEY, name VARCHAR(50));
CREATE TEMPORARY TABLE t_lastnames  (id INT PRIMARY KEY, name VARCHAR(50));
CREATE TEMPORARY TABLE t_cities     (id INT PRIMARY KEY, name VARCHAR(60), zip VARCHAR(10));

INSERT INTO t_firstnames VALUES
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

INSERT INTO t_lastnames VALUES
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

-- ----------------------------------------------------------------
-- 2. Numéroter TOUS les employés non-sirh.com
-- ----------------------------------------------------------------
CREATE TEMPORARY TABLE t_bulk_emp AS
SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY id) AS rn
FROM employees
WHERE email NOT LIKE '%@sirh.com';

SELECT CONCAT('Total cible : ', COUNT(*)) AS info FROM t_bulk_emp;

-- ----------------------------------------------------------------
-- 3. UPDATE
-- ----------------------------------------------------------------
UPDATE employees e
JOIN t_bulk_emp   b  ON e.id = b.id
JOIN t_firstnames fn ON fn.id = ((b.rn - 1) % 50) + 1
JOIN t_lastnames  ln ON ln.id = ((b.rn - 1 + 25) % 50) + 1
JOIN t_cities     c  ON c.id  = ((b.rn - 1) % 20) + 1
SET
    e.first_name = fn.name,
    e.last_name  = ln.name,
    e.email = CONCAT(
        LOWER(REPLACE(fn.name, ' ', '.')),
        '.',
        LOWER(REPLACE(ln.name, ' ', '.')),
        b.rn,
        '@arabsoft.com.tn'
    ),
    e.phone = CONCAT(
        '+216 ',
        ELT((b.rn % 5) + 1, '20', '25', '50', '55', '98'),
        ' ',
        LPAD(((b.rn * 37 + 100) % 900) + 100, 3, '0'),
        ' ',
        LPAD(((b.rn * 53 + 200) % 900) + 100, 3, '0')
    ),
    e.city    = c.name,
    e.address = CONCAT(
        ((b.rn * 7) % 150) + 1,
        ', Rue ',
        ELT((b.rn % 10) + 1,
            'de la Republique','Ibn Khaldoun','Habib Bourguiba',
            'de Carthage','du Lac','des Jasmins',
            'de la Liberte','Ali Belhouane','Mongi Slim','de Tunis'),
        ', ', c.name, ' ', c.zip
    );

-- ----------------------------------------------------------------
-- 4. Résultat
-- ----------------------------------------------------------------
SELECT CONCAT('Mis a jour @arabsoft : ', COUNT(*)) AS resultat
FROM employees WHERE email LIKE '%@arabsoft.com.tn';

SELECT CONCAT('Inchanges @sirh.com : ', COUNT(*)) AS resultat
FROM employees WHERE email LIKE '%@sirh.com';