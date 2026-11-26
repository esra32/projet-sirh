-- Diagnostic post-run pour expliquer l'ecart dim_employe (1511) vs employees (1500).
-- Resultat attendu si le DWH conserve les anciens employes :
--   is_parti = 0 -> 1500
--   is_parti = 1 -> 11

SELECT is_parti, COUNT(*)
FROM sirh_dwh.dim_employe
GROUP BY is_parti;

-- Si cette requete retourne des lignes, dim_employe contient des doublons de cle naturelle.
SELECT id_employe_nk, COUNT(*) AS nb_lignes
FROM sirh_dwh.dim_employe
GROUP BY id_employe_nk
HAVING COUNT(*) > 1;
