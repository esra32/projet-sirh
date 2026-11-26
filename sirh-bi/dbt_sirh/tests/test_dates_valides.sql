-- Test : date_candidature ne doit pas être dans le futur
-- Connecté via ref() pour apparaître dans le lineage
SELECT application_nk
FROM {{ ref('stg_applications') }}
WHERE date_candidature > CURDATE()