-- KPIs RH globaux par departement, dates a la periode courante.
-- Pour l'analyse historique annuelle, utiliser rh_kpi_annuel.
WITH temps_courant AS (
    SELECT *
    FROM {{ ref('dim_temps') }}
    WHERE date_jour = CURDATE()
),
effectifs AS (
    SELECT
        id_departement_nk,
        COUNT(*) AS nb_employes,
        ROUND(AVG(anciennete_mois), 1) AS anciennete_moy_mois,
        SUM(CASE WHEN type_contrat = 'CDI' THEN 1 ELSE 0 END) AS nb_cdi,
        SUM(CASE WHEN type_contrat = 'CDD' THEN 1 ELSE 0 END) AS nb_cdd,
        SUM(CASE WHEN type_contrat = 'STAGE' THEN 1 ELSE 0 END) AS nb_stage,
        SUM(CASE WHEN type_contrat = 'FREELANCE' THEN 1 ELSE 0 END) AS nb_freelance,
        SUM(CASE WHEN type_contrat = 'ALTERNANCE' THEN 1 ELSE 0 END) AS nb_alternance
    FROM {{ ref('fait_effectifs') }}
    GROUP BY id_departement_nk
),
-- Bug #1 corrigé : mobilité interne = candidats internes recrutés (fait_recrutement)
-- et non plus la somme des embauches mensuelles de fait_mobilite (qui donnait 100%)
mobilite AS (
    SELECT
        id_departement_nk,
        SUM(est_accepte) AS nb_mobilites
    FROM {{ ref('fait_recrutement') }}
    WHERE type_recrutement = 'Recrutement Interne'
    GROUP BY id_departement_nk
),
recrutement AS (
    SELECT
        id_departement_nk,
        COUNT(*) AS nb_candidatures,
        -- Bug #4 corrigé : source unifiée est_accepte (au lieu de statut_normalise = 'ACCEPTED')
        SUM(est_accepte) AS nb_acceptes,
        ROUND(AVG(duree_offre_jours), 1) AS duree_moy_offre_jours,
        ROUND(AVG(match_score), 1) AS score_moy_candidatures,
        SUM(CASE WHEN match_score >= 80 THEN 1 ELSE 0 END) * 100.0
            / NULLIF(COUNT(*), 0) AS pct_score_excellent
    FROM {{ ref('fait_recrutement') }}
    GROUP BY id_departement_nk
),
dim_d AS (
    SELECT * FROM {{ ref('dim_departement') }}
)
SELECT
    tc.annee,
    tc.trimestre,
    tc.libelle_trimestre,
    tc.mois,
    tc.nom_mois,
    tc.annee_mois,
    dd.nom AS departement,
    COALESCE(e.nb_employes, 0) AS nb_employes,
    COALESCE(e.nb_cdi, 0) AS nb_cdi,
    COALESCE(e.nb_cdd, 0) AS nb_cdd,
    COALESCE(e.nb_stage, 0) AS nb_stage,
    COALESCE(e.nb_freelance, 0) AS nb_freelance,
    COALESCE(e.nb_alternance, 0) AS nb_alternance,
    COALESCE(e.anciennete_moy_mois, 0) AS anciennete_moy_mois,
    COALESCE(m.nb_mobilites, 0) AS nb_mobilites,
    ROUND(COALESCE(m.nb_mobilites, 0) * 100.0 / NULLIF(e.nb_employes, 0), 2) AS taux_mobilite_pct,
    COALESCE(e.nb_cdi, 0) * 100.0 / NULLIF(e.nb_employes, 0) AS taux_cdi_pct,
    COALESCE(r.nb_candidatures, 0) AS nb_candidatures,
    COALESCE(r.nb_acceptes, 0) AS nb_acceptes,
    ROUND(COALESCE(r.nb_acceptes, 0) * 100.0 / NULLIF(r.nb_candidatures, 0), 2) AS taux_acceptation_pct,
    COALESCE(r.duree_moy_offre_jours, 0) AS duree_moy_offre_jours,
    COALESCE(r.score_moy_candidatures, 0) AS score_moy_candidatures,
    ROUND(COALESCE(r.pct_score_excellent, 0), 2) AS pct_score_excellent
FROM dim_d dd
CROSS JOIN temps_courant tc
LEFT JOIN effectifs e ON e.id_departement_nk = dd.id_departement_nk
LEFT JOIN mobilite m ON m.id_departement_nk = dd.id_departement_nk
LEFT JOIN recrutement r ON r.id_departement_nk = dd.id_departement_nk
