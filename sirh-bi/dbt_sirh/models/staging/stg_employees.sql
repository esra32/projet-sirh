-- Staging employés : nettoyage et standardisation
WITH source AS (
    SELECT * FROM {{ source('staging', 'stg_employees') }}
),

cleaned AS (
    SELECT
        id                                              AS employee_nk,
        TRIM(first_name)                               AS prenom,
        TRIM(last_name)                                AS nom,
        CONCAT(TRIM(first_name), ' ', TRIM(last_name)) AS nom_complet,
        LOWER(TRIM(email))                             AS email,
        phone                                          AS telephone,
        hire_date                                      AS date_embauche,
        contract_type                                  AS type_contrat,
        department_id                                  AS department_nk,
        position_id                                    AS position_nk,
        DATEDIFF(CURDATE(), hire_date)                 AS anciennete_jours,
        FLOOR(DATEDIFF(CURDATE(), hire_date) / 30)     AS anciennete_mois,
        date_depart                                    AS date_depart,
        motif_depart                                   AS motif_depart,
        CASE WHEN date_depart IS NOT NULL THEN 1 ELSE 0 END AS is_parti,
        NULLIF(salary, 0)                              AS salary
    FROM source
    WHERE email IS NOT NULL
      AND hire_date IS NOT NULL
      AND id IS NOT NULL
)

SELECT * FROM cleaned