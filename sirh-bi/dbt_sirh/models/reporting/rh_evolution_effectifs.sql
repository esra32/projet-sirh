SELECT
    d.nom AS departement,
    fm.annee,
    fm.mois,
    CAST(CONCAT(fm.annee, '-', LPAD(fm.mois, 2, '0'), '-01') AS DATE) AS date_mois,
    fm.nom_mois,
    fm.type_contrat,
    SUM(fm.nb_embauches_mois) AS nb_embauches,
    MAX(fm.effectif_cumule_dept_sans_doublon) AS effectif,
    AVG(fm.taux_croissance_pct) AS taux_croissance
FROM {{ ref('fait_mobilite') }} fm
LEFT JOIN {{ ref('dim_departement') }} d
    ON fm.id_departement_nk = d.id_departement_nk
GROUP BY d.nom, fm.annee, fm.mois, fm.nom_mois, fm.type_contrat
