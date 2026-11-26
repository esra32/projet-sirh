-- Test : match_score doit être entre 0 et 100
-- Connecté via ref() pour apparaître dans le lineage
SELECT application_nk
FROM {{ ref('stg_applications') }}
WHERE match_score < 0 OR match_score > 100