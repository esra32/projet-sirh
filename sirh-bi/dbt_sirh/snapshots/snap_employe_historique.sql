{% snapshot snap_employe_historique %}

{{
    config(
        target_schema = 'sirh_dwh',
        unique_key    = 'employee_nk',
        strategy      = 'check',
        check_cols    = ['department_nk', 'position_nk', 'type_contrat'],
    )
}}

-- =============================================================================
-- Snapshot SCD Type 2 — Historique des changements employé
-- =============================================================================
-- Ce snapshot détecte automatiquement les changements sur 3 colonnes critiques :
--   • department_nk  → l'employé a changé de département (mobilité interne)
--   • position_nk    → l'employé a changé de poste (promotion/transfert)
--   • type_contrat   → le contrat a évolué (ex: STAGE → CDI)
--
-- Quand dbt détecte un changement :
--   1. L'ancienne ligne reçoit : dbt_valid_to = CURRENT_TIMESTAMP, dbt_is_current = FALSE
--   2. Une nouvelle ligne est créée avec : dbt_valid_from = CURRENT_TIMESTAMP, dbt_is_current = TRUE
--
-- Colonnes ajoutées automatiquement par dbt :
--   • dbt_scd_id      : UUID unique de chaque version
--   • dbt_updated_at  : timestamp de mise à jour
--   • dbt_valid_from  : début de validité de cette version
--   • dbt_valid_to    : fin de validité (NULL si version courante)
--   • dbt_is_current  : TRUE si version active
--
-- Usage : exécuter `dbt snapshot` AVANT `dbt run` lors de chaque chargement.
-- Après plusieurs exécutions avec des changements, ce snapshot contiendra
-- l'historique complet des mutations organisationnelles de chaque employé.
-- =============================================================================

SELECT
    id                  AS employee_nk,
    TRIM(first_name)    AS prenom,
    TRIM(last_name)     AS nom,
    LOWER(TRIM(email))  AS email,
    contract_type       AS type_contrat,
    hire_date           AS date_embauche,
    department_id       AS department_nk,
    position_id         AS position_nk,
    CURRENT_TIMESTAMP   AS updated_at
FROM {{ source('staging', 'stg_employees') }}
WHERE id IS NOT NULL
  AND email IS NOT NULL

{% endsnapshot %}