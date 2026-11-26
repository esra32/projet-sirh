{{ config(
    indexes=[
        {'columns': ['id_departement_nk', 'id_employe_nk']}
    ],
    post_hook=[
        "CREATE INDEX idx_fait_effectifs_fks ON {{ this }} (id_departement_nk, id_employe_nk)"
    ]
) }}

-- Fait effectifs : 1 ligne par employe actif, rattachee a sa date d'embauche.
WITH stg AS (
    SELECT * FROM {{ ref('stg_employees') }}
),
dim_e AS (
    SELECT * FROM {{ ref('dim_employe') }}
),
dim_d AS (
    SELECT * FROM {{ ref('dim_departement') }}
),
dim_p AS (
    SELECT * FROM {{ ref('dim_poste') }}
),
dim_t AS (
    SELECT * FROM {{ ref('dim_temps') }}
)
SELECT
    dt.id_temps_sk AS id_temps_sk,
    dd.id_departement_nk AS id_departement_nk,
    dd.nom AS departement,
    dp.id_poste_nk AS id_poste_nk,
    de.id_employe_nk AS id_employe_nk,
    stg.email,
    stg.nom_complet,
    stg.type_contrat,
    stg.anciennete_jours,
    stg.anciennete_mois,
    CASE
        WHEN stg.anciennete_mois < 12  THEN '< 1 an'
        WHEN stg.anciennete_mois < 36  THEN '1-3 ans'
        WHEN stg.anciennete_mois < 60  THEN '3-5 ans'
        WHEN stg.anciennete_mois < 120 THEN '5-10 ans'
        ELSE '10+ ans'
    END AS tranche_anciennete,
    CASE
        WHEN stg.anciennete_mois < 12  THEN 1
        WHEN stg.anciennete_mois < 36  THEN 2
        WHEN stg.anciennete_mois < 60  THEN 3
        WHEN stg.anciennete_mois < 120 THEN 4
        ELSE 5
    END AS ordre_anciennete,
    de.profil_fidelisation,
    stg.date_embauche,
    dt.annee AS annee_embauche,
    dt.trimestre AS trimestre_embauche,
    dt.libelle_trimestre AS libelle_trimestre_embauche,
    dt.mois AS mois_embauche,
    dt.nom_mois AS nom_mois_embauche,
    dt.nom_mois_court AS nom_mois_court_embauche,
    dt.annee_mois AS annee_mois_embauche,
    dt.annee_mois_libelle AS annee_mois_libelle_embauche,
    dt.annee,
    dt.trimestre,
    dt.mois,
    dt.nom_mois,
    dt.annee_mois,
    1 AS nb_employes
FROM stg
LEFT JOIN dim_e de ON de.id_employe_nk = stg.employee_nk
LEFT JOIN dim_t dt ON dt.date_jour = stg.date_embauche
LEFT JOIN dim_d dd ON dd.id_departement_nk = stg.department_nk
LEFT JOIN dim_p dp ON dp.id_poste_nk = stg.position_nk
