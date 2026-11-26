-- ================================================================
--  Génération des salaires — sirh_employee.employees
--  Règle : base contrat × multiplicateur ancienneté × coeff dept
--           + bruit déterministe ±300 DT (CRC32 sur id)
--  Fourchette finale : 600 – 3 500 DT, arrondi à 50 DT
--
--  Usage dans mysql :
--      source C:/Users/Hp/Desktop/last v/essra/generate_salaries.sql
--  Puis relancer ETL + dbt + pipeline ML
-- ================================================================

USE sirh_employee;

-- ── Ajouter la colonne si elle n'existe pas ──────────────────────
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS salary INT DEFAULT NULL;

-- ── Vérification avant ──────────────────────────────────────────
SELECT CONCAT('[AVANT] Employés sans salaire : ', COUNT(*)) AS info
FROM employees WHERE salary IS NULL OR salary = 0;

-- ── UPDATE principal ────────────────────────────────────────────
UPDATE employees e
JOIN departments d ON d.id = e.department_id
SET e.salary = GREATEST(600, LEAST(3500,
    ROUND((
        -- Base par type de contrat
        CASE e.contract_type
            WHEN 'STAGE'      THEN  750
            WHEN 'ALTERNANCE' THEN 1000
            WHEN 'CDD'        THEN 1300
            WHEN 'FREELANCE'  THEN 2600
            ELSE                   2000   -- CDI
        END
        *
        -- Multiplicateur ancienneté
        CASE
            WHEN FLOOR(DATEDIFF(CURDATE(), e.hire_date) / 30) <  12 THEN 1.00
            WHEN FLOOR(DATEDIFF(CURDATE(), e.hire_date) / 30) <  36 THEN 1.15
            WHEN FLOOR(DATEDIFF(CURDATE(), e.hire_date) / 30) <  60 THEN 1.35
            WHEN FLOOR(DATEDIFF(CURDATE(), e.hire_date) / 30) <  96 THEN 1.55
            WHEN FLOOR(DATEDIFF(CURDATE(), e.hire_date) / 30) < 120 THEN 1.75
            ELSE                                                      1.90
        END
        *
        -- Coeff département (certains secteurs paient mieux)
        CASE
            WHEN d.name LIKE '%Informatique%' OR d.name LIKE '%IT%'
              OR d.name LIKE '%Data%'         OR d.name LIKE '%Digital%'
              OR d.name LIKE '%Tech%'         THEN 1.25
            WHEN d.name LIKE '%Finance%'      OR d.name LIKE '%Audit%'
              OR d.name LIKE '%Comptab%'      THEN 1.20
            WHEN d.name LIKE '%Direction%'    OR d.name LIKE '%Strat%'
              OR d.name LIKE '%Executive%'    THEN 1.30
            WHEN d.name LIKE '%Commercial%'   OR d.name LIKE '%Vente%'
              OR d.name LIKE '%Business%'     THEN 1.10
            WHEN d.name LIKE '%RH%'           OR d.name LIKE '%Ressources%'
              OR d.name LIKE '%Paie%'         THEN 0.95
            ELSE 1.00
        END
        -- Bruit déterministe ±300 DT (CRC32 sur UUID = stable entre runs)
        + (CRC32(e.id) % 600) - 300
    ) / 50) * 50
));

-- ── Vérification après ──────────────────────────────────────────
SELECT CONCAT('[APRES] Employés avec salaire : ', COUNT(*)) AS info
FROM employees WHERE salary > 0;

SELECT
    contract_type,
    COUNT(*)                  AS nb,
    MIN(salary)               AS min_dt,
    ROUND(AVG(salary))        AS moy_dt,
    MAX(salary)               AS max_dt
FROM employees
WHERE salary > 0
GROUP BY contract_type
ORDER BY moy_dt;

-- Résumé distribution par tranche
SELECT
    CASE
        WHEN salary < 1000 THEN '600 – 999 DT'
        WHEN salary < 1500 THEN '1 000 – 1 499 DT'
        WHEN salary < 2000 THEN '1 500 – 1 999 DT'
        WHEN salary < 2500 THEN '2 000 – 2 499 DT'
        WHEN salary < 3000 THEN '2 500 – 2 999 DT'
        ELSE                    '3 000 – 3 500 DT'
    END AS tranche,
    COUNT(*) AS nb_employes
FROM employees
WHERE salary > 0
GROUP BY tranche
ORDER BY MIN(salary);

-- ================================================================
--  FIN — Relancer ensuite :
--    1. python extract/extract_staging.py
--    2. cd dbt_sirh && dbt run
--    3. python ml/fix_dwh_is_parti.py
--    4. python ml/turnover_model.py
-- ================================================================