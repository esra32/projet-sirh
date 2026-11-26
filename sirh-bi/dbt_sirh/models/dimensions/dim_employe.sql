{{ config(
    indexes=[
        {'columns': ['id_employe_nk'], 'unique': true}
    ],
    post_hook=[
        "CREATE UNIQUE INDEX idx_dim_employe_id_employe_nk ON {{ this }} (id_employe_nk)"
    ]
) }}

-- Dimension employé (SCD Type 2 simulé)
-- Toutes les dépendances via ref() pour lineage complet
WITH raw_stg AS (
    SELECT * FROM {{ ref('stg_employees') }}
),

stg AS (
    SELECT *
    FROM (
        SELECT
            raw_stg.*,
            ROW_NUMBER() OVER (
                PARTITION BY employee_nk
                ORDER BY
                    CASE WHEN date_depart IS NULL THEN 0 ELSE 1 END,
                    date_depart DESC,
                    date_embauche DESC,
                    email
            ) AS rn
        FROM raw_stg
    ) ranked
    WHERE rn = 1
),

dept AS (
    SELECT department_nk, nom AS dept_nom
    FROM {{ ref('stg_departments') }}
),

poste AS (
    SELECT position_nk, titre AS poste_titre
    FROM {{ ref('stg_positions') }}
)

SELECT
    stg.employee_nk             AS id_employe_nk,
    stg.prenom,
    stg.nom,
    stg.nom_complet,
    stg.email,
    stg.type_contrat,
    stg.date_embauche,
    stg.anciennete_jours,
    stg.anciennete_mois,
    dept.dept_nom               AS departement,
    poste.poste_titre           AS poste,
    CASE
        WHEN stg.anciennete_mois < 6   THEN '0-6 mois'
        WHEN stg.anciennete_mois < 12  THEN '6-12 mois'
        WHEN stg.anciennete_mois < 36  THEN '1-3 ans'
        WHEN stg.anciennete_mois < 60  THEN '3-5 ans'
        WHEN stg.anciennete_mois < 120 THEN '5-10 ans'
        ELSE '10+ ans'
    END                         AS tranche_anciennete,
    CASE
        WHEN stg.anciennete_mois < 6   THEN 'Nouveau'
        WHEN stg.anciennete_mois < 12  THEN 'En intégration'
        WHEN stg.anciennete_mois < 36  THEN 'Fidèle'
        WHEN stg.anciennete_mois < 60  THEN 'Ancré'
        ELSE 'Expert fidèle'
    END                         AS profil_fidelisation,
    stg.date_depart,
    stg.motif_depart,
    stg.is_parti,
    stg.salary                  AS salaire,
    NULL                        AS date_fin_validite,
    TRUE                        AS est_actuel,
    1                           AS version
FROM stg
LEFT JOIN dept  ON dept.department_nk = stg.department_nk
LEFT JOIN poste ON poste.position_nk  = stg.position_nk

-- Diagnostic post-run (voir aussi analyses/investigate_dim_employe.sql) :
-- SELECT is_parti, COUNT(*) FROM sirh_dwh.dim_employe GROUP BY is_parti;
-- SELECT id_employe_nk, COUNT(*) FROM sirh_dwh.dim_employe GROUP BY id_employe_nk HAVING COUNT(*) > 1;
