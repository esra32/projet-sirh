-- Staging compétences : nettoyage depuis sirh_staging
WITH source AS (
    SELECT * FROM {{ source('staging', 'stg_skills') }}
)

SELECT
    id          AS skill_nk,
    TRIM(name)  AS nom
FROM source
WHERE id IS NOT NULL
  AND name IS NOT NULL