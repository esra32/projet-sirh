-- Staging offres d'emploi : nettoyage
WITH source AS (
    SELECT * FROM {{ source('staging', 'stg_job_offers') }}
),

cleaned AS (
    SELECT
        id                    AS offer_nk,
        TRIM(title)           AS titre,
        TRIM(department)      AS departement,
        TRIM(location)        AS localisation,
        status                AS statut,
        published_date        AS date_publication,
        deadline_date         AS date_limite,
        created_at            AS date_creation,

        -- Durée de l'offre en jours
        DATEDIFF(
            COALESCE(deadline_date, CURDATE()),
            COALESCE(published_date, DATE(created_at))
        )                     AS duree_offre_jours,

        -- Flag offre active
        CASE WHEN status = 'PUBLISHED'
             THEN 1 ELSE 0 END AS est_active

    FROM source
    WHERE id IS NOT NULL
)

SELECT * FROM cleaned