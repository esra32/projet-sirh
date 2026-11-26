{{ config(
    indexes=[
        {'columns': ['id_temps_sk', 'id_departement_nk']}
    ],
    post_hook=[
        "CREATE INDEX idx_fait_mobilite_fks ON {{ this }} (id_temps_sk, id_departement_nk)"
    ]
) }}

-- Fait mobilite : periodic snapshot mensuel.
-- Granularite : departement x poste x contrat x annee x mois.
WITH embauches_mensuelles AS (
    SELECT
        department_nk,
        position_nk,
        type_contrat,
        YEAR(date_embauche) AS annee,
        MONTH(date_embauche) AS mois,
        COUNT(*) AS nb_embauches
    FROM {{ ref('stg_employees') }}
    WHERE date_embauche IS NOT NULL
      AND department_nk IS NOT NULL
    GROUP BY
        department_nk,
        position_nk,
        type_contrat,
        YEAR(date_embauche),
        MONTH(date_embauche)
),
cumul_dept AS (
    SELECT
        department_nk,
        annee,
        mois,
        SUM(nb_embauches) AS nb_embauches_dept_mois,
        SUM(SUM(nb_embauches)) OVER (
            PARTITION BY department_nk
            ORDER BY annee, mois
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS effectif_cumule_dept
    FROM embauches_mensuelles
    GROUP BY department_nk, annee, mois
),
dim_t AS (
    SELECT
        id_temps_sk,
        date_jour,
        annee,
        trimestre,
        libelle_trimestre,
        mois,
        nom_mois,
        nom_mois_court,
        annee_mois,
        annee_mois_libelle
    FROM {{ ref('dim_temps') }}
    WHERE jour = 1
),
dim_d AS (
    SELECT * FROM {{ ref('dim_departement') }}
),
dim_p AS (
    SELECT * FROM {{ ref('dim_poste') }}
),
base AS (
    SELECT
        dt.id_temps_sk,
        dd.id_departement_nk,
        dp.id_poste_nk,
        em.annee AS annee_snapshot,
        em.mois AS mois_snapshot,
        dt.trimestre,
        dt.libelle_trimestre,
        dt.nom_mois,
        dt.nom_mois_court,
        dt.annee_mois,
        dt.annee_mois_libelle,
        em.annee,
        em.mois,
        em.type_contrat,
        em.nb_embauches AS nb_embauches_mois,
        COALESCE(cd.effectif_cumule_dept, 0) AS effectif_cumule_dept,
        ROUND(
            em.nb_embauches * 100.0 / NULLIF(cd.effectif_cumule_dept, 0),
            2
        ) AS taux_croissance_pct,
        ROW_NUMBER() OVER (
            PARTITION BY dd.id_departement_nk, em.annee, em.mois
            ORDER BY em.type_contrat, dp.id_poste_nk
        ) AS rang_ligne_snapshot
    FROM embauches_mensuelles em
    LEFT JOIN dim_t dt
           ON dt.annee = em.annee
          AND dt.mois = em.mois
    LEFT JOIN dim_d dd ON dd.id_departement_nk = em.department_nk
    LEFT JOIN dim_p dp ON dp.id_poste_nk = em.position_nk
    LEFT JOIN cumul_dept cd
           ON cd.department_nk = em.department_nk
          AND cd.annee = em.annee
          AND cd.mois = em.mois
)
SELECT
    id_temps_sk,
    id_departement_nk,
    id_poste_nk,
    annee_snapshot,
    mois_snapshot,
    trimestre,
    libelle_trimestre,
    nom_mois,
    nom_mois_court,
    annee_mois,
    annee_mois_libelle,
    annee,
    mois,
    type_contrat,
    nb_embauches_mois,
    effectif_cumule_dept,
    CASE
        WHEN rang_ligne_snapshot = 1 THEN effectif_cumule_dept
        ELSE 0
    END AS effectif_cumule_dept_sans_doublon,
    taux_croissance_pct,
    rang_ligne_snapshot
FROM base
