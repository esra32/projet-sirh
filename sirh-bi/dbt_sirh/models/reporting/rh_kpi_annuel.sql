-- Vue reporting annuelle pour Superset.
-- Granularite : departement x annee, avec comparaison N vs N-1.
WITH mobilite_annuelle AS (
    SELECT
        id_departement_nk,
        annee,
        SUM(nb_embauches_mois) AS nb_embauches_annee,
        MAX(effectif_cumule_dept) AS effectif_fin_annee
    FROM {{ ref('fait_mobilite') }}
    GROUP BY id_departement_nk, annee
),
mobilite_compare AS (
    SELECT
        id_departement_nk,
        annee,
        nb_embauches_annee,
        effectif_fin_annee,
        LAG(nb_embauches_annee) OVER (
            PARTITION BY id_departement_nk
            ORDER BY annee
        ) AS nb_embauches_annee_n_1,
        LAG(effectif_fin_annee) OVER (
            PARTITION BY id_departement_nk
            ORDER BY annee
        ) AS effectif_fin_annee_n_1
    FROM mobilite_annuelle
),
effectifs_annuels AS (
    SELECT
        id_departement_nk,
        annee_embauche AS annee,
        COUNT(*) AS nb_employes_embauches,
        ROUND(AVG(anciennete_mois), 1) AS anciennete_moy_mois,
        SUM(CASE WHEN type_contrat = 'CDI' THEN 1 ELSE 0 END) AS nb_cdi,
        SUM(CASE WHEN type_contrat = 'CDD' THEN 1 ELSE 0 END) AS nb_cdd,
        SUM(CASE WHEN type_contrat = 'STAGE' THEN 1 ELSE 0 END) AS nb_stage,
        SUM(CASE WHEN type_contrat = 'FREELANCE' THEN 1 ELSE 0 END) AS nb_freelance,
        SUM(CASE WHEN type_contrat = 'ALTERNANCE' THEN 1 ELSE 0 END) AS nb_alternance
    FROM {{ ref('fait_effectifs') }}
    GROUP BY id_departement_nk, annee_embauche
),
recrutement_annuel AS (
    SELECT
        id_departement_nk,
        annee_depot AS annee,
        COUNT(*) AS nb_candidatures,
        -- Bug #4 corrigé : source unifiée est_accepte (cohérent avec kpi_rh et fait_recrutement)
        SUM(est_accepte) AS nb_acceptes,
        ROUND(AVG(match_score), 1) AS score_moy_candidatures,
        ROUND(AVG(duree_offre_jours), 1) AS duree_moy_offre_jours,
        SUM(CASE WHEN match_score >= 80 THEN 1 ELSE 0 END) AS nb_scores_excellents
    FROM {{ ref('fait_recrutement') }}
    GROUP BY id_departement_nk, annee_depot
),
annees_departements AS (
    SELECT id_departement_nk, annee FROM mobilite_annuelle
    UNION
    SELECT id_departement_nk, annee FROM effectifs_annuels
    UNION
    SELECT id_departement_nk, annee FROM recrutement_annuel
),
dim_d AS (
    SELECT * FROM {{ ref('dim_departement') }}
),
final_data AS (
    SELECT
        ad.annee,
        STR_TO_DATE(CONCAT(ad.annee, '-01-01'), '%Y-%m-%d') AS date_annee,
        dd.nom AS departement,
        COALESCE(mc.nb_embauches_annee, 0) AS nb_embauches_annee,
        COALESCE(mc.nb_embauches_annee_n_1, 0) AS nb_embauches_annee_n_1,
        COALESCE(mc.nb_embauches_annee, 0) - COALESCE(mc.nb_embauches_annee_n_1, 0) AS variation_embauches_vs_n_1,
        ROUND(
            (COALESCE(mc.nb_embauches_annee, 0) - COALESCE(mc.nb_embauches_annee_n_1, 0)) * 100.0
            / NULLIF(mc.nb_embauches_annee_n_1, 0),
            2
        ) AS variation_embauches_pct_vs_n_1,
        COALESCE(mc.effectif_fin_annee, 0) AS effectif_fin_annee,
        COALESCE(mc.effectif_fin_annee_n_1, 0) AS effectif_fin_annee_n_1,
        COALESCE(mc.effectif_fin_annee, 0) - COALESCE(mc.effectif_fin_annee_n_1, 0) AS variation_effectif_vs_n_1,
        ROUND(
            (COALESCE(mc.effectif_fin_annee, 0) - COALESCE(mc.effectif_fin_annee_n_1, 0)) * 100.0
            / NULLIF(mc.effectif_fin_annee_n_1, 0),
            2
        ) AS variation_effectif_pct_vs_n_1,
        COALESCE(ea.nb_employes_embauches, 0) AS nb_employes_embauches,
        COALESCE(ea.nb_cdi, 0) AS nb_cdi,
        COALESCE(ea.nb_cdd, 0) AS nb_cdd,
        COALESCE(ea.nb_stage, 0) AS nb_stage,
        COALESCE(ea.nb_freelance, 0) AS nb_freelance,
        COALESCE(ea.nb_alternance, 0) AS nb_alternance,
        COALESCE(ea.anciennete_moy_mois, 0) AS anciennete_moy_mois,
        COALESCE(ra.nb_candidatures, 0) AS nb_candidatures,
        COALESCE(ra.nb_acceptes, 0) AS nb_acceptes,
        ROUND(COALESCE(ra.nb_acceptes, 0) * 100.0 / NULLIF(ra.nb_candidatures, 0), 2) AS taux_acceptation_pct,
        COALESCE(ra.score_moy_candidatures, 0) AS score_moy_candidatures,
        COALESCE(ra.duree_moy_offre_jours, 0) AS duree_moy_offre_jours,
        ROUND(COALESCE(ra.nb_scores_excellents, 0) * 100.0 / NULLIF(ra.nb_candidatures, 0), 2) AS pct_score_excellent
    FROM annees_departements ad
    JOIN dim_d dd ON dd.id_departement_nk = ad.id_departement_nk
    LEFT JOIN mobilite_compare mc
           ON mc.id_departement_nk = ad.id_departement_nk
          AND mc.annee = ad.annee
    LEFT JOIN effectifs_annuels ea
           ON ea.id_departement_nk = ad.id_departement_nk
          AND ea.annee = ad.annee
    LEFT JOIN recrutement_annuel ra
           ON ra.id_departement_nk = ad.id_departement_nk
          AND ra.annee = ad.annee
),
departements_eligibles AS (
    SELECT departement
    FROM final_data
    GROUP BY departement
    HAVING COUNT(*) >= 5
       AND MAX(effectif_fin_annee) >= 10
)
SELECT fd.*
FROM final_data fd
JOIN departements_eligibles de
  ON de.departement = fd.departement
