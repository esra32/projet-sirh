-- Staging postes : nettoyage depuis sirh_staging
WITH source AS (
    SELECT * FROM {{ source('staging', 'stg_positions') }}
)

SELECT
    id          AS position_nk,
    TRIM(title) AS titre
FROM source
WHERE id IS NOT NULL