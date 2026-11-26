{{ config(materialized='view') }}

SELECT
    localisation,
    CASE
        WHEN localisation IN ('Tunis','Sfax','Sousse',
                              'Monastir','Ben Arous','Ariana')
            THEN 'TN'
        WHEN localisation IN ('Montpellier','Toulouse - Hybride',
                              'Paris / Remote','Bordeaux','Lyon - Hybride')
            THEN 'FR'
        WHEN localisation = 'Remote'
            THEN 'TN'
        ELSE 'TN'
    END AS pays_iso,
    CASE
        WHEN localisation = 'Remote'
            THEN 'Remote / Télétravail'
        ELSE type_recrutement
    END AS type_recrutement,
    COUNT(*) AS nb_offres,
    AVG(match_score) AS score_moyen,
    SUM(CASE WHEN statut = 'Accepté' THEN 1 ELSE 0 END) AS nb_acceptes,
    ROUND(
        100.0 * SUM(CASE WHEN statut = 'Accepté' THEN 1 ELSE 0 END) / COUNT(*),
        2
    ) AS taux_acceptation
FROM {{ ref('fait_recrutement') }}
WHERE localisation IS NOT NULL
GROUP BY
    localisation,
    pays_iso,
    CASE
        WHEN localisation = 'Remote'
            THEN 'Remote / Télétravail'
        ELSE type_recrutement
    END
