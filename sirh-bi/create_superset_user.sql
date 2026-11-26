-- =============================================================================
-- SIRH BI — Création du user MySQL read-only pour Superset
-- =============================================================================
-- Exécuter ce script UNE SEULE FOIS dans MySQL Workbench ou CMD :
--   mysql -u root -p < create_superset_user.sql
-- =============================================================================

-- 1. Créer le user superset_reader (accessible depuis Docker et localhost)
CREATE USER IF NOT EXISTS 'superset_reader'@'%' IDENTIFIED BY 'superset2026';
CREATE USER IF NOT EXISTS 'superset_reader'@'localhost' IDENTIFIED BY 'superset2026';

-- 2. Donner uniquement les droits SELECT sur sirh_dwh
GRANT SELECT ON sirh_dwh.* TO 'superset_reader'@'%';
GRANT SELECT ON sirh_dwh.* TO 'superset_reader'@'localhost';

-- 3. Appliquer les changements
FLUSH PRIVILEGES;

-- 4. Vérification
SELECT user, host FROM mysql.user WHERE user = 'superset_reader';
SHOW GRANTS FOR 'superset_reader'@'%';