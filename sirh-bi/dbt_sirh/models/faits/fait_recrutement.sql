{{ config(
    indexes=[
        {'columns': ['id_temps_depot', 'id_departement_nk', 'id_offre_nk']}
    ],
    post_hook=[
        "CREATE INDEX idx_fait_recrutement_fks ON {{ this }} (id_temps_depot, id_departement_nk, id_offre_nk)"
    ]
) }}

-- Fait recrutement : granularite = 1 candidature.
WITH apps AS (
    SELECT * FROM {{ ref('stg_applications') }}
),
offers AS (
    SELECT * FROM {{ ref('stg_job_offers') }}
),
stg_d AS (
    SELECT * FROM {{ ref('stg_departments') }}
),
-- Problème 2 : normalisation complète des noms de départements pour le JOIN dim_departement
dept_norm AS (
    SELECT
        offer_nk,
        CASE TRIM(departement)
            WHEN 'RH'                            THEN 'Ressources Humaines'
            WHEN 'Ressources Humaines'            THEN 'Ressources Humaines'
            WHEN 'Commercial'                     THEN 'Commercial & Ventes'
            WHEN 'Commercial & Ventes'            THEN 'Commercial & Ventes'
            WHEN 'Marketing'                      THEN 'Marketing & Communication'
            WHEN 'Marketing & Communication'      THEN 'Marketing & Communication'
            WHEN 'Finance'                        THEN 'Finance & Contrôle de Gestion'
            WHEN 'Finance & Contrôle de Gestion'  THEN 'Finance & Contrôle de Gestion'
            WHEN 'IT'                             THEN 'Informatique'
            WHEN 'Informatique'                   THEN 'Informatique'
            WHEN 'Infrastructure'                 THEN 'Informatique'
            ELSE TRIM(departement)
        END AS departement_norm
    FROM offers
),
dim_d AS (
    SELECT * FROM {{ ref('dim_departement') }}
),
dim_t AS (
    SELECT * FROM {{ ref('dim_temps') }}
)
SELECT
    dt.id_temps_sk AS id_temps_depot,
    dd.id_departement_nk AS id_departement_nk,
    o.offer_nk AS id_offre_nk,
    a.application_nk AS id_candidature_nk,
    a.date_candidature,
    dt.annee AS annee_depot,
    dt.trimestre AS trimestre_depot,
    dt.libelle_trimestre AS libelle_trimestre_depot,
    dt.mois AS mois_depot,
    dt.nom_mois AS nom_mois_depot,
    dt.nom_mois_court AS nom_mois_court_depot,
    dt.annee_mois AS annee_mois_depot,
    dt.annee_mois_libelle AS annee_mois_libelle_depot,
    dt.annee,
    dt.trimestre,
    dt.mois,
    dt.nom_mois,
    dt.annee_mois,
    a.applicant_email,
    a.applicant_name,
    CASE
        WHEN a.statut = 'ACCEPTED' THEN 'Accepté'
        WHEN a.statut = 'REJECTED' THEN 'Rejeté'
        WHEN a.statut = 'PENDING' THEN 'En attente'
        WHEN a.statut = 'REVIEWING' THEN 'En révision'
        WHEN a.statut = 'INTERVIEW_SCHEDULED' THEN 'Entretien planifié'
        ELSE a.statut
    END AS statut,
    -- Problème 1 : normalisation des statuts (français / casse mixte → uppercase anglais)
    CASE UPPER(TRIM(a.statut))
        WHEN 'ACCEPTED'   THEN 'ACCEPTED'
        WHEN 'ACCEPTÉ'    THEN 'ACCEPTED'
        WHEN 'REJECTED'   THEN 'REJECTED'
        WHEN 'REJETÉ'     THEN 'REJECTED'
        WHEN 'PENDING'    THEN 'PENDING'
        WHEN 'EN ATTENTE' THEN 'PENDING'
        ELSE UPPER(TRIM(a.statut))
    END                                           AS statut_normalise,
    a.match_score,
    a.categorie_score,
    a.est_accepte,
    a.a_passe_entretien,
    o.titre AS titre_offre,
    o.departement,
    -- Problème 2 : colonne normalisée exposée pour les agrégations aval
    CASE TRIM(o.departement)
        WHEN 'RH'                            THEN 'Ressources Humaines'
        WHEN 'Ressources Humaines'            THEN 'Ressources Humaines'
        WHEN 'Commercial'                     THEN 'Commercial & Ventes'
        WHEN 'Commercial & Ventes'            THEN 'Commercial & Ventes'
        WHEN 'Marketing'                      THEN 'Marketing & Communication'
        WHEN 'Marketing & Communication'      THEN 'Marketing & Communication'
        WHEN 'Finance'                        THEN 'Finance & Contrôle de Gestion'
        WHEN 'Finance & Contrôle de Gestion'  THEN 'Finance & Contrôle de Gestion'
        WHEN 'IT'                             THEN 'Informatique'
        WHEN 'Informatique'                   THEN 'Informatique'
        WHEN 'Infrastructure'                 THEN 'Informatique'
        ELSE TRIM(o.departement)
    END                                           AS departement_normalise,
    o.localisation,
    -- type_recrutement basé sur le vrai champ métier Application.source
    -- (INTERNAL = employé via l'app / EXTERNAL = candidat via pub LinkedIn)
    CASE a.source_candidature
        WHEN 'INTERNAL' THEN 'Recrutement Interne'
        WHEN 'EXTERNAL' THEN 'Recrutement Externe'
        ELSE 'Non défini'
    END AS type_recrutement,
    o.duree_offre_jours
FROM apps a
LEFT JOIN dim_t dt ON dt.date_jour = a.date_candidature
LEFT JOIN offers o ON o.offer_nk = a.offer_nk
LEFT JOIN dept_norm dn ON dn.offer_nk = a.offer_nk
-- Le JOIN utilise departement_norm (normalisé) → plus besoin du OR LIKE 'Finance%Gestion'
LEFT JOIN stg_d sd ON sd.nom = dn.departement_norm
LEFT JOIN dim_d dd ON dd.id_departement_nk = sd.department_nk
