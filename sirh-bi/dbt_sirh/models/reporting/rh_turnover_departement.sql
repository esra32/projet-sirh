-- Bug #2 corrigé : CAST explicites pour éviter les erreurs Superset sur colonnes Decimal/BigInt
-- Formule taux_turnover recalculée sur tous les départs, toutes années confondues
-- documentée via colonne methode_calcul
SELECT
    d.name AS departement,
    CAST(COUNT(*) AS SIGNED) AS total_employes,
    -- nb_departs = tous les départs renseignés, toutes années confondues
    CAST(SUM(CASE
        WHEN e.date_depart IS NOT NULL THEN 1
        ELSE 0
    END) AS SIGNED) AS nb_departs,
    CAST(ROUND(
        SUM(CASE
            WHEN e.date_depart IS NOT NULL THEN 1
            ELSE 0
        END) * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) AS DECIMAL(10,2)) AS taux_turnover,
    -- Colonne documentaire : label pour affichage Superset et jury
    'Départs toutes années' AS methode_calcul,
    CAST(COUNT(DISTINCT CASE
        WHEN e.motif_depart = 'DEMISSION' THEN e.id
    END) AS SIGNED) AS nb_demissions,
    CAST(COUNT(DISTINCT CASE
        WHEN e.motif_depart = 'LICENCIEMENT' THEN e.id
    END) AS SIGNED) AS nb_licenciements,
    CAST(COUNT(DISTINCT CASE
        WHEN e.motif_depart = 'RETRAITE' THEN e.id
    END) AS SIGNED) AS nb_retraites
FROM {{ source('sirh_employee', 'employees') }} e
LEFT JOIN {{ source('sirh_employee', 'departments') }} d
    ON e.department_id = d.id
WHERE d.name IS NOT NULL
GROUP BY d.name

ORDER BY taux_turnover DESC
