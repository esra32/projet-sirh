-- Vue reporting mensuelle : 1 ligne par departement x annee x mois.
-- Utiliser cette vue dans Superset pour les tendances mensuelles.
SELECT
    dd.nom AS departement,
    fm.annee_snapshot AS annee,
    fm.trimestre,
    fm.libelle_trimestre,
    fm.mois_snapshot AS mois,
    fm.nom_mois,
    fm.nom_mois_court,
    fm.annee_mois,
    fm.annee_mois_libelle,
    SUM(fm.nb_embauches_mois) AS nb_embauches_mois,
    MAX(fm.effectif_cumule_dept) AS effectif_cumule_fin_mois,
    SUM(fm.effectif_cumule_dept_sans_doublon) AS effectif_cumule_fin_mois_safe,
    SUM(CASE WHEN fm.type_contrat = 'CDI' THEN fm.nb_embauches_mois ELSE 0 END) AS nb_cdi_mois,
    SUM(CASE WHEN fm.type_contrat = 'CDD' THEN fm.nb_embauches_mois ELSE 0 END) AS nb_cdd_mois,
    SUM(CASE WHEN fm.type_contrat = 'STAGE' THEN fm.nb_embauches_mois ELSE 0 END) AS nb_stage_mois,
    SUM(CASE WHEN fm.type_contrat = 'FREELANCE' THEN fm.nb_embauches_mois ELSE 0 END) AS nb_freelance_mois,
    SUM(CASE WHEN fm.type_contrat = 'ALTERNANCE' THEN fm.nb_embauches_mois ELSE 0 END) AS nb_alternance_mois
FROM {{ ref('fait_mobilite') }} fm
JOIN {{ ref('dim_departement') }} dd ON dd.id_departement_nk = fm.id_departement_nk
GROUP BY
    dd.nom,
    fm.annee_snapshot,
    fm.trimestre,
    fm.libelle_trimestre,
    fm.mois_snapshot,
    fm.nom_mois,
    fm.nom_mois_court,
    fm.annee_mois,
    fm.annee_mois_libelle
ORDER BY
    fm.annee_snapshot,
    fm.mois_snapshot,
    dd.nom
