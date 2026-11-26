-- ================================================================
--  FIX PRODUCTION — Cohérence contrat ↔ ancienneté (Problème 2)
--  Base : sirh_employee
--  Règle : STAGE ≤ 6 mois, ALTERNANCE ≤ 24 mois, CDD ≤ 24 mois
--  Correction : tout contrat précaire avec ancienneté dépassée → CDI
-- ================================================================

USE sirh_employee;

-- Voir les violations avant correction
SELECT
    contract_type,
    COUNT(*) AS nb_violations,
    ROUND(AVG(TIMESTAMPDIFF(MONTH, hire_date, CURDATE()))) AS anciennete_moy_mois
FROM employees
WHERE
    (contract_type = 'STAGE'      AND TIMESTAMPDIFF(MONTH, hire_date, CURDATE()) > 6)
 OR (contract_type = 'ALTERNANCE' AND TIMESTAMPDIFF(MONTH, hire_date, CURDATE()) > 24)
 OR (contract_type = 'CDD'        AND TIMESTAMPDIFF(MONTH, hire_date, CURDATE()) > 30)
GROUP BY contract_type;

-- FIX P2 : STAGE avec ancienneté > 6 mois → CDI (stage converti)
UPDATE employees
SET contract_type = 'CDI'
WHERE contract_type = 'STAGE'
  AND TIMESTAMPDIFF(MONTH, hire_date, CURDATE()) > 6;

SELECT CONCAT('STAGE → CDI corrigés : ', ROW_COUNT()) AS resultat;

-- FIX P2 : ALTERNANCE avec ancienneté > 24 mois → CDI
UPDATE employees
SET contract_type = 'CDI'
WHERE contract_type = 'ALTERNANCE'
  AND TIMESTAMPDIFF(MONTH, hire_date, CURDATE()) > 24;

SELECT CONCAT('ALTERNANCE → CDI corrigés : ', ROW_COUNT()) AS resultat;

-- FIX P2 : CDD avec ancienneté > 30 mois → CDI (renouvellement abusif impossible)
UPDATE employees
SET contract_type = 'CDI'
WHERE contract_type = 'CDD'
  AND TIMESTAMPDIFF(MONTH, hire_date, CURDATE()) > 30;

SELECT CONCAT('CDD → CDI corrigés : ', ROW_COUNT()) AS resultat;

-- Vérification finale
SELECT
    contract_type,
    COUNT(*) AS nb_employes,
    ROUND(AVG(TIMESTAMPDIFF(MONTH, hire_date, CURDATE()))) AS anciennete_moy_mois,
    MIN(TIMESTAMPDIFF(MONTH, hire_date, CURDATE())) AS anciennete_min,
    MAX(TIMESTAMPDIFF(MONTH, hire_date, CURDATE())) AS anciennete_max
FROM employees
GROUP BY contract_type
ORDER BY anciennete_moy_mois;

-- ================================================================
-- FIN — Relancer ensuite l'ETL : python extract/extract_staging.py
-- ================================================================
