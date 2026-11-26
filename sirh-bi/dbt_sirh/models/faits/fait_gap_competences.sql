WITH base AS (
    SELECT
        competence,
        MAX(categorie_competence) AS categorie_competence,
        COUNT(DISTINCT id_offre_nk) AS nb_offres_requierent,
        SUM(nb_candidats) AS nb_candidats_ont
    FROM {{ ref('fait_competences') }}
    GROUP BY competence
),
calcule AS (
    SELECT
        competence,
        categorie_competence,
        nb_offres_requierent,
        nb_candidats_ont,
        nb_offres_requierent - nb_candidats_ont AS gap_competences,
        LEAST(
            ROUND(nb_candidats_ont * 100.0 / NULLIF(nb_offres_requierent, 0), 0),
            200
        ) AS taux_couverture_pct
    FROM base
)
SELECT
    competence,
    categorie_competence,
    nb_offres_requierent,
    nb_candidats_ont,
    gap_competences,
    taux_couverture_pct,
    CASE
        WHEN nb_offres_requierent < 5 THEN 'Faible demande'
        WHEN taux_couverture_pct < 50  THEN 'Gap critique'
        WHEN taux_couverture_pct < 80  THEN 'Partiel'
        WHEN taux_couverture_pct <= 120 THEN 'Couvert'
        ELSE 'Sur-couvert'
    END AS statut,
    CASE
        WHEN nb_offres_requierent < 5  THEN 'Priorité faible'
        WHEN taux_couverture_pct < 50  THEN 'Priorité haute'
        WHEN taux_couverture_pct < 80  THEN 'Priorité moyenne'
        ELSE 'Priorité faible'
    END AS priorite_rh
FROM calcule
ORDER BY nb_offres_requierent DESC, competence
