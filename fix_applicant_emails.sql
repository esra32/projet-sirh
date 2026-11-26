-- ================================================================
--  FIX — Alignement applicant_email → email employé réel
-- ================================================================
--  Problème : FIX_TOUT_TUNISIEN.sql a utilisé rn+2000 pour les
--             employés et rn+3000 pour les candidatures.
--             → JOIN de.email = fr.applicant_email ne trouve que
--               les 5 comptes démo @sirh.com.
--
--  Correction : on fait tourner les emails @arabsoft.com.tn des
--               employés sur l'ensemble des candidatures non-démo
--               (modulo cycling deterministe).
--
--  À exécuter DANS mysql :
--      source C:/Users/Hp/Desktop/last v/essra/fix_applicant_emails.sql
--  Puis relancer l'ETL :
--      python extract/extract_staging.py
--  Puis relancer :
--      python ml/high_potentials.py
-- ================================================================

USE sirh_recruitment;

SELECT CONCAT('[AVANT] candidatures non-demo : ', COUNT(*)) AS info
FROM applications
WHERE applicant_email NOT IN (
    'employee@sirh.com','karim.design@sirh.com',
    'lea.data@sirh.com','youssef.dev@sirh.com','clara.mkt@sirh.com'
);

-- ── Étape 1 : liste numérotée des emails employés @arabsoft ──────
DROP TEMPORARY TABLE IF EXISTS t_emp_list;
CREATE TEMPORARY TABLE t_emp_list (
    rn    INT PRIMARY KEY,
    email VARCHAR(255)
);

INSERT INTO t_emp_list (rn, email)
SELECT ROW_NUMBER() OVER (ORDER BY id) AS rn,
       email
FROM sirh_employee.employees
WHERE email LIKE '%@arabsoft.com.tn'
ORDER BY id;

SELECT CONCAT('  Employés @arabsoft disponibles : ', COUNT(*)) AS info
FROM t_emp_list;

-- ── Étape 2 : liste numérotée des candidatures non-démo ──────────
DROP TEMPORARY TABLE IF EXISTS t_app_list;
CREATE TEMPORARY TABLE t_app_list (
    rn     INT,
    app_id VARCHAR(36)
);

INSERT INTO t_app_list (rn, app_id)
SELECT ROW_NUMBER() OVER (ORDER BY id) AS rn,
       id
FROM applications
WHERE applicant_email NOT IN (
    'employee@sirh.com','karim.design@sirh.com',
    'lea.data@sirh.com','youssef.dev@sirh.com','clara.mkt@sirh.com'
)
ORDER BY id;

-- ── Étape 3 : calcul du total pour le modulo ─────────────────────
SET @total_emp := (SELECT COUNT(*) FROM t_emp_list);
SELECT CONCAT('  Total employés (modulo) : ', @total_emp) AS info;

-- ── Étape 4 : UPDATE par modulo cycling ──────────────────────────
UPDATE applications a
JOIN t_app_list  al ON al.app_id = a.id
JOIN t_emp_list  el ON el.rn     = ((al.rn - 1) % @total_emp) + 1
SET a.applicant_email = el.email;

SELECT ROW_COUNT() AS lignes_mises_a_jour;

-- ── Vérification ─────────────────────────────────────────────────
SELECT CONCAT('[APRES] candidatures avec email @arabsoft : ', COUNT(*)) AS info
FROM applications
WHERE applicant_email LIKE '%@arabsoft.com.tn';

-- Nombre d'employés distincts maintenant présents dans les candidatures
SELECT CONCAT('  Employés distincts avec candidature : ', COUNT(DISTINCT applicant_email)) AS info
FROM applications
WHERE applicant_email LIKE '%@arabsoft.com.tn';

-- Aperçu
SELECT applicant_name, applicant_email, match_score
FROM applications
WHERE applicant_email LIKE '%@arabsoft.com.tn'
LIMIT 10;

-- ================================================================
--  FIN — Relancer ETL puis high_potentials.py
-- ================================================================