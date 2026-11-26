{{ config(
    indexes=[
        {'columns': ['id_offre_nk'], 'unique': true}
    ],
    post_hook=[
        "CREATE UNIQUE INDEX idx_dim_offre_id_offre_nk ON {{ this }} (id_offre_nk)"
    ]
) }}

-- Dimension offre d'emploi
WITH stg AS (
    SELECT * FROM {{ ref('stg_job_offers') }}
)

SELECT
    offer_nk          AS id_offre_nk,
    titre,
    departement,
    localisation,
    statut,
    date_publication,
    date_limite,
    duree_offre_jours,
    est_active
FROM stg
