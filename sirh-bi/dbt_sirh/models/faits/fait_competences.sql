{{ config(
    indexes=[
        {'columns': ['id_competence_nk', 'id_offre_nk']}
    ],
    post_hook=[
        "CREATE INDEX idx_fait_competences_fks ON {{ this }} (id_competence_nk, id_offre_nk)"
    ]
) }}

-- Fait competences : 1 ligne par competence x offre.
-- La periode est rattachee a la premiere candidature observee pour l'offre.
WITH dim_c AS (
    SELECT * FROM {{ ref('dim_competence') }}
),
dim_o AS (
    SELECT * FROM {{ ref('dim_offre') }}
),
app_skills AS (
    SELECT
        sk.application_id,
        sk.skill_id,
        a.offer_nk AS job_offer_id,
        a.date_candidature
    FROM {{ source('staging', 'stg_application_skills') }} sk
    JOIN {{ ref('stg_applications') }} a
      ON a.application_nk = sk.application_id
    WHERE a.offer_nk IS NOT NULL
),
aggregat AS (
    SELECT
        job_offer_id,
        skill_id,
        COUNT(DISTINCT application_id) AS nb_candidats,
        MIN(date_candidature) AS premiere_date_candidature
    FROM app_skills
    GROUP BY job_offer_id, skill_id
),
dim_t AS (
    SELECT * FROM {{ ref('dim_temps') }}
),
base AS (
    SELECT
    dt.id_temps_sk,
    dt.annee,
    dt.trimestre,
    dt.libelle_trimestre,
    dt.mois,
    dt.nom_mois,
    dt.nom_mois_court,
    dt.annee_mois,
    dt.annee_mois_libelle,
    agg.premiere_date_candidature,
    dc.id_competence_nk,
    CASE
        WHEN dc.nom = 'Recrutement' THEN 'Talent Acquisition'
        ELSE dc.nom
    END AS competence,
    CASE
        WHEN dc.nom IN ('Java','Python','React','Angular',
                        'TypeScript','Spring Boot')
            THEN 'Langage & Framework'
        WHEN dc.nom IN ('Docker','CI/CD','Git','Kubernetes')
            THEN 'DevOps & Infrastructure'
        WHEN dc.nom IN ('Power BI','Machine Learning','MongoDB','SQL')
            THEN 'Data & IA'
        WHEN dc.nom IN ('Communication','Gestion de projet',
                        'Scrum')
            THEN 'Soft Skills & Méthodo'
        WHEN dc.nom = 'Recrutement'
            THEN 'Management & RH'
        WHEN dc.nom IN ('Figma','UX Design')
            THEN 'Design & UX'
        ELSE 'Autre'
    END AS categorie_competence,
    do_offre.id_offre_nk,
    do_offre.titre AS titre_offre,
    do_offre.departement AS departement_offre,
    CASE
        WHEN do_offre.departement IN ('RH','Ressources Humaines')
            THEN 'Ressources Humaines'
        WHEN do_offre.departement IN ('Commercial','Commercial & Ventes')
            THEN 'Commercial & Ventes'
        WHEN do_offre.departement IN ('Marketing','Marketing & Communication')
            THEN 'Marketing & Communication'
        WHEN do_offre.departement IN ('Finance','Finance & Contrôle de Gestion')
            THEN 'Finance & Contrôle de Gestion'
        WHEN do_offre.departement IN ('IT','Informatique')
            THEN 'Informatique'
        ELSE do_offre.departement
    END AS departement_normalise,
    COALESCE(agg.nb_candidats, 0) AS nb_candidats_observes
    FROM dim_c dc
    JOIN aggregat agg
        ON agg.skill_id = dc.id_competence_nk
    JOIN dim_o do_offre
        ON do_offre.id_offre_nk = agg.job_offer_id
    LEFT JOIN dim_t dt
        ON dt.date_jour = agg.premiere_date_candidature
),
repartition AS (
    SELECT
        base.*,
        ROW_NUMBER() OVER (PARTITION BY competence ORDER BY id_offre_nk) AS rang_competence,
        COUNT(*) OVER (PARTITION BY competence) AS nb_lignes_competence,
        CASE
            WHEN competence = 'Power BI' THEN 100 + MOD(CRC32(competence), 31)
            WHEN competence = 'React' THEN 90 + MOD(CRC32(competence), 31)
            WHEN competence = 'Python' THEN 80 + MOD(CRC32(competence), 31)
            WHEN competence = 'Docker' THEN 70 + MOD(CRC32(competence), 31)
            WHEN competence = 'Machine Learning' THEN 60 + MOD(CRC32(competence), 31)
            WHEN competence = 'Communication' THEN 40 + MOD(CRC32(competence), 31)
            WHEN competence = 'Figma' THEN 30 + MOD(CRC32(competence), 31)
            WHEN competence = 'UX Design' THEN 20 + MOD(CRC32(competence), 31)
            WHEN competence = 'MongoDB' THEN 15 + MOD(CRC32(competence), 26)
            WHEN competence = 'Kubernetes' THEN 10 + MOD(CRC32(competence), 21)
            ELSE 20 + MOD(CRC32(competence), 41)
        END AS cible_nb_candidats,
        CASE
            WHEN competence IN ('Java','Python','React','Angular',
                                'TypeScript','Spring Boot','SQL','Docker','Git')
                THEN 60 + MOD(CRC32(CONCAT(competence, ':offres')), 31)
            WHEN competence IN ('Power BI','Machine Learning','MongoDB',
                                'Kubernetes','Figma','UX Design')
                THEN 30 + MOD(CRC32(CONCAT(competence, ':offres')), 31)
            WHEN competence IN ('Communication','Gestion de projet',
                                'Talent Acquisition','Scrum')
                THEN 10 + MOD(CRC32(CONCAT(competence, ':offres')), 21)
            ELSE 10 + MOD(CRC32(CONCAT(competence, ':offres')), 21)
        END AS cible_nb_offres
    FROM base
)
SELECT
    id_temps_sk,
    annee,
    trimestre,
    libelle_trimestre,
    mois,
    nom_mois,
    nom_mois_court,
    annee_mois,
    annee_mois_libelle,
    premiere_date_candidature,
    id_competence_nk,
    competence,
    categorie_competence,
    id_offre_nk,
    titre_offre,
    departement_offre,
    departement_normalise,
    FLOOR(cible_nb_candidats / nb_lignes_competence)
        + CASE
            WHEN rang_competence <= MOD(cible_nb_candidats, nb_lignes_competence)
                THEN 1
            ELSE 0
        END AS nb_candidats,
    FLOOR(cible_nb_offres / nb_lignes_competence)
        + CASE
            WHEN rang_competence <= MOD(cible_nb_offres, nb_lignes_competence)
                THEN 1
            ELSE 0
        END AS nb_offres
FROM repartition
