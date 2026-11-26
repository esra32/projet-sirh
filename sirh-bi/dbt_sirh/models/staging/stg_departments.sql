-- Staging départements : nettoyage depuis sirh_staging
WITH source AS (
    SELECT * FROM {{ source('staging', 'stg_departments') }}
)

SELECT
    id          AS department_nk,
    TRIM(name)  AS nom
FROM source
WHERE id IS NOT NULL