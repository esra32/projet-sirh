{{ config(
    indexes=[
        {'columns': ['id_departement_nk'], 'unique': true}
    ],
    post_hook=[
        "CREATE UNIQUE INDEX idx_dim_departement_id_departement_nk ON {{ this }} (id_departement_nk)"
    ]
) }}

-- Dimension département — lit depuis stg_departments via ref()
WITH source AS (
    SELECT * FROM {{ ref('stg_departments') }}
)

SELECT
    department_nk       AS id_departement_nk,
    nom,
    TRUE                AS est_actuel
FROM source
