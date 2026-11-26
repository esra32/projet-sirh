-- Vue reporting pour Superset : repartition annuelle des contrats.
-- Granularite : annee x departement x type_contrat.

{{ config(materialized='view') }}

SELECT
    annee,
    date_annee,
    departement,
    'CDI' AS type_contrat,
    nb_cdi AS nb_employes
FROM {{ ref('rh_kpi_annuel') }}

UNION ALL

SELECT
    annee,
    date_annee,
    departement,
    'CDD' AS type_contrat,
    nb_cdd AS nb_employes
FROM {{ ref('rh_kpi_annuel') }}

UNION ALL

SELECT
    annee,
    date_annee,
    departement,
    'STAGE' AS type_contrat,
    nb_stage AS nb_employes
FROM {{ ref('rh_kpi_annuel') }}

UNION ALL

SELECT
    annee,
    date_annee,
    departement,
    'FREELANCE' AS type_contrat,
    nb_freelance AS nb_employes
FROM {{ ref('rh_kpi_annuel') }}

UNION ALL

SELECT
    annee,
    date_annee,
    departement,
    'ALTERNANCE' AS type_contrat,
    nb_alternance AS nb_employes
FROM {{ ref('rh_kpi_annuel') }}
