-- Staging candidatures : nettoyage et enrichissement
WITH src AS (
    SELECT * FROM {{ source('staging', 'stg_applications') }}
),
cleaned AS (
    SELECT
        id                                            AS application_nk,
        LOWER(TRIM(applicant_email))                  AS applicant_email,
        TRIM(applicant_name)                          AS applicant_name,
        applied_date                                  AS date_candidature,
        job_offer_id                                  AS offer_nk,
        status                                        AS statut,
        COALESCE(match_score, 0)                      AS match_score,
        CASE
            WHEN COALESCE(match_score, 0) >= 80 THEN 'EXCELLENT'
            WHEN COALESCE(match_score, 0) >= 60 THEN 'BON'
            WHEN COALESCE(match_score, 0) >= 40 THEN 'MOYEN'
            ELSE 'FAIBLE'
        END                                           AS categorie_score,
        CASE WHEN status = 'ACCEPTED'
             THEN 1 ELSE 0 END                        AS est_accepte,
        CASE WHEN status IN ('INTERVIEW_SCHEDULED', 'ACCEPTED')
             THEN 1 ELSE 0 END                        AS a_passe_entretien,
        UPPER(COALESCE(NULLIF(TRIM(src.source), ''), 'INTERNAL')) AS source_candidature
    FROM src
    WHERE applicant_email IS NOT NULL
      AND job_offer_id IS NOT NULL
      AND applied_date IS NOT NULL
)
SELECT * FROM cleaned