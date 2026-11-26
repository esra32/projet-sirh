-- Formule taux_turnover_equipe recalculée sur tous les départs, toutes années confondues
-- documentée via colonne methode_calcul (cohérent avec rh_turnover_departement)
SELECT
    m.id AS manager_id,
    CONCAT(m.first_name, ' ', m.last_name) AS manager_nom,
    d.name AS departement,
    CAST(COUNT(e.id) AS SIGNED) AS nb_subordonnes,
    CASE
        WHEN COUNT(e.id) > 100 THEN 'Top management'
        WHEN COUNT(e.id) >= 25 THEN 'Management intermediaire'
        ELSE 'Manager operationnel'
    END AS categorie_manager,
    CAST(COUNT(DISTINCT e.position_id) AS SIGNED) AS nb_postes_differents,
    CAST(SUM(CASE
        WHEN e.date_depart IS NOT NULL THEN 1
        ELSE 0
    END) AS SIGNED) AS nb_departs_equipe,
    CAST(ROUND(
        100.0 * SUM(CASE
            WHEN e.date_depart IS NOT NULL THEN 1
            ELSE 0
        END) / NULLIF(COUNT(e.id), 0),
        2
    ) AS DECIMAL(10,2)) AS taux_turnover_equipe,
    -- Colonne documentaire : label pour affichage Superset et jury
    'Départs toutes années' AS methode_calcul
FROM {{ source('sirh_employee', 'employees') }} e
JOIN {{ source('sirh_employee', 'employees') }} m
    ON e.manager_id = m.id
LEFT JOIN {{ source('sirh_employee', 'departments') }} d
    ON m.department_id = d.id
GROUP BY m.id, m.first_name, m.last_name, d.name
HAVING COUNT(e.id) >= 5
ORDER BY nb_subordonnes DESC
