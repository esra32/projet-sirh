{{ config(
    indexes=[
        {'columns': ['id_temps_sk'], 'unique': true}
    ],
    post_hook=[
        "CREATE UNIQUE INDEX idx_dim_temps_id_temps_sk ON {{ this }} (id_temps_sk)"
    ]
) }}

WITH digits AS (
    SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
    UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
),
numbers AS (
    SELECT (d1.n * 1000 + d2.n * 100 + d3.n * 10 + d4.n) AS num
    FROM digits d1
    CROSS JOIN digits d2
    CROSS JOIN digits d3
    CROSS JOIN digits d4
),
date_series AS (
    SELECT DATE_ADD(DATE('2014-01-01'), INTERVAL num DAY) AS date_jour
    FROM numbers
    WHERE DATE_ADD(DATE('2014-01-01'), INTERVAL num DAY) <= DATE('2026-12-31')
)
SELECT
    CAST(DATE_FORMAT(date_jour, '%Y%m%d') AS UNSIGNED) AS id_temps_sk,
    date_jour,
    DAY(date_jour) AS jour,
    MONTH(date_jour) AS mois,
    QUARTER(date_jour) AS trimestre,
    YEAR(date_jour) AS annee,
    CAST(DATE_FORMAT(date_jour, '%Y%m') AS UNSIGNED) AS annee_mois,
    DATE_FORMAT(date_jour, '%Y-%m') AS annee_mois_libelle,
    CONCAT(YEAR(date_jour), '-T', QUARTER(date_jour)) AS annee_trimestre,
    CASE MONTH(date_jour)
        WHEN 1 THEN 'Janvier'
        WHEN 2 THEN 'Fevrier'
        WHEN 3 THEN 'Mars'
        WHEN 4 THEN 'Avril'
        WHEN 5 THEN 'Mai'
        WHEN 6 THEN 'Juin'
        WHEN 7 THEN 'Juillet'
        WHEN 8 THEN 'Aout'
        WHEN 9 THEN 'Septembre'
        WHEN 10 THEN 'Octobre'
        WHEN 11 THEN 'Novembre'
        WHEN 12 THEN 'Decembre'
    END AS nom_mois,
    CASE MONTH(date_jour)
        WHEN 1 THEN 'Jan'
        WHEN 2 THEN 'Fev'
        WHEN 3 THEN 'Mar'
        WHEN 4 THEN 'Avr'
        WHEN 5 THEN 'Mai'
        WHEN 6 THEN 'Juin'
        WHEN 7 THEN 'Juil'
        WHEN 8 THEN 'Aout'
        WHEN 9 THEN 'Sep'
        WHEN 10 THEN 'Oct'
        WHEN 11 THEN 'Nov'
        WHEN 12 THEN 'Dec'
    END AS nom_mois_court,
    CASE DAYOFWEEK(date_jour)
        WHEN 1 THEN 'Dimanche'
        WHEN 2 THEN 'Lundi'
        WHEN 3 THEN 'Mardi'
        WHEN 4 THEN 'Mercredi'
        WHEN 5 THEN 'Jeudi'
        WHEN 6 THEN 'Vendredi'
        WHEN 7 THEN 'Samedi'
    END AS nom_jour,
    CASE
        WHEN MONTH(date_jour) IN (1, 2, 3) THEN 'T1'
        WHEN MONTH(date_jour) IN (4, 5, 6) THEN 'T2'
        WHEN MONTH(date_jour) IN (7, 8, 9) THEN 'T3'
        ELSE 'T4'
    END AS libelle_trimestre,
    CASE WHEN MONTH(date_jour) <= 6 THEN 'S1' ELSE 'S2' END AS semestre,
    CONCAT(YEAR(date_jour), '-S', CASE WHEN MONTH(date_jour) <= 6 THEN 1 ELSE 2 END) AS annee_semestre,
    DATE_ADD(date_jour, INTERVAL 1 - DAY(date_jour) DAY) AS debut_mois,
    LAST_DAY(date_jour) AS fin_mois,
    CASE
        WHEN date_jour = DATE_ADD(date_jour, INTERVAL 1 - DAY(date_jour) DAY) THEN TRUE
        ELSE FALSE
    END AS est_debut_mois,
    CASE WHEN date_jour = LAST_DAY(date_jour) THEN TRUE ELSE FALSE END AS est_fin_mois,
    CASE WHEN YEAR(date_jour) = YEAR(CURDATE()) THEN TRUE ELSE FALSE END AS est_annee_courante,
    CASE
        WHEN YEAR(date_jour) = YEAR(CURDATE()) AND MONTH(date_jour) = MONTH(CURDATE()) THEN TRUE
        ELSE FALSE
    END AS est_mois_courant,
    CASE WHEN DAYOFWEEK(date_jour) IN (1, 7) THEN TRUE ELSE FALSE END AS est_weekend
FROM date_series
ORDER BY date_jour
