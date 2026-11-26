{{ config(
    indexes=[
        {'columns': ['id_poste_nk'], 'unique': true}
    ],
    post_hook=[
        "CREATE UNIQUE INDEX idx_dim_poste_id_poste_nk ON {{ this }} (id_poste_nk)"
    ]
) }}

-- Dimension poste — lit depuis stg_positions via ref()
WITH source AS (
    SELECT * FROM {{ ref('stg_positions') }}
)

SELECT
    position_nk         AS id_poste_nk,
    titre,
    CASE
        WHEN LOWER(titre) LIKE '%manager%' THEN 'Manager'
        WHEN LOWER(titre) LIKE '%senior%'  THEN 'Senior'
        WHEN LOWER(titre) LIKE '%junior%'  THEN 'Junior'
        ELSE 'Confirmé'
    END                 AS niveau_poste,
    TRUE                AS est_actuel
FROM source
