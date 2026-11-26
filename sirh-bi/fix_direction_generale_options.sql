USE sirh_employee;

-- Diagnostic : identifier le departement Direction Generale et l'employe concerne.
SELECT d.id AS id_departement, d.name AS departement, COUNT(e.id) AS nb_employes
FROM departments d
LEFT JOIN employees e
    ON e.department_id = d.id
WHERE d.name = 'Direction Générale'
GROUP BY d.id, d.name;

SELECT e.id, e.first_name, e.last_name, e.email, d.id AS department_id, d.name AS departement
FROM employees e
JOIN departments d
    ON d.id = e.department_id
WHERE d.name = 'Direction Générale';

-- Option A (recommandee) : reaffecter cet employe au departement le plus proche.
-- 1. Choisir le departement cible avec la requete suivante.
SELECT d.id AS id_dept_correct, d.name AS departement, COUNT(e.id) AS nb_employes
FROM departments d
LEFT JOIN employees e
    ON e.department_id = d.id
WHERE d.name <> 'Direction Générale'
GROUP BY d.id, d.name
ORDER BY nb_employes DESC, d.name;

-- 2. Renseigner les deux variables puis executer l'UPDATE cible.
SET @id_DG = '<id_DG>';
SET @id_dept_correct = '<id_dept_correct>';

UPDATE employees
SET department_id = @id_dept_correct
WHERE department_id = @id_DG;

-- Validation Option A.
SELECT d.name AS departement, COUNT(e.id) AS nb_employes
FROM departments d
LEFT JOIN employees e
    ON e.department_id = d.id
WHERE d.id IN (@id_DG, @id_dept_correct)
GROUP BY d.name
ORDER BY d.name;

-- Option B : conserver les donnees operationnelles et exclure Direction Generale des vues agregees dbt.
-- A appliquer dans les modeles de reporting agreges, par exemple kpi_rh, rh_kpi_annuel,
-- vw_effectifs_mensuels, rh_evolution_effectifs, rh_turnover_departement :
--
-- WHERE departement != 'Direction Générale'
--
-- Exemple de controle apres dbt run :
SELECT COUNT(*) AS lignes_direction_generale
FROM sirh_dwh.kpi_rh
WHERE departement = 'Direction Générale';
