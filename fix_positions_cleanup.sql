USE sirh_employee;

UPDATE positions
SET title = 'Développeur Backend'
WHERE title = 'dfbd';

UPDATE positions
SET title = 'Ingénieur Cloud'
WHERE title = 'ing cloud com';

SELECT
    p.id AS position_id,
    p.title,
    COUNT(e.id) AS nb_employes_affectes
FROM positions p
LEFT JOIN employees e
    ON e.position_id = p.id
WHERE p.title IN ('Développeur Backend', 'Ingénieur Cloud')
GROUP BY p.id, p.title
ORDER BY p.title;

SELECT
    p.title,
    COUNT(*) AS nb_positions_restantes
FROM positions p
WHERE p.title IN ('dfbd', 'ing cloud com')
GROUP BY p.title;
