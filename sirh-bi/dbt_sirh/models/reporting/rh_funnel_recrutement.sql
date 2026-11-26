{{ config(materialized='view') }}

SELECT *
FROM (
    SELECT 'Offres publiées' AS etape, 1 AS ordre, 
           COUNT(DISTINCT id_offre_nk) AS nombre
    FROM {{ ref('dim_offre') }}
    WHERE statut IN ('PUBLISHED', 'CLOSED')
    UNION ALL
    SELECT 'Candidatures reçues', 2, COUNT(*)
    FROM {{ ref('fait_recrutement') }}
    UNION ALL
    SELECT 'Entretiens planifiés', 3, 
           SUM(CASE WHEN statut = 'Entretien planifié' THEN 1 ELSE 0 END)
    FROM {{ ref('fait_recrutement') }}
    UNION ALL
    SELECT 'Candidatures acceptées', 4,
           SUM(CASE WHEN statut = 'Accepté' THEN 1 ELSE 0 END)
    FROM {{ ref('fait_recrutement') }}
) funnel
ORDER BY ordre ASC
