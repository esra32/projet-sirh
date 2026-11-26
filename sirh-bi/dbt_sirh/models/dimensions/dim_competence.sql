{{ config(
    indexes=[
        {'columns': ['id_competence_nk'], 'unique': true}
    ],
    post_hook=[
        "CREATE UNIQUE INDEX idx_dim_competence_id_competence_nk ON {{ this }} (id_competence_nk)"
    ]
) }}

-- Dimension compétences — lit depuis stg_skills via ref()
WITH source AS (
    SELECT * FROM {{ ref('stg_skills') }}
)

SELECT
    skill_nk        AS id_competence_nk,
    nom,
    CASE
        WHEN LOWER(nom) IN ('java','python','javascript','typescript','c++','c#','php','ruby','go','kotlin','swift') THEN 'Langage'
        WHEN LOWER(nom) IN ('docker','kubernetes','jenkins','gitlab','terraform','ansible','linux','nginx',
                            'git','ci/cd','aws','azure','gcp','devops')                                             THEN 'DevOps'
        WHEN LOWER(nom) IN ('sql','mysql','postgresql','mongodb','spark','hadoop','power bi','tableau',
                            'dbt','airflow','machine learning','data scientist','data analyst')                     THEN 'Data'
        WHEN LOWER(nom) IN ('spring','spring boot','react','angular','vue','django','flask','laravel',
                            'nodejs','fastapi','figma','ux design')                                                 THEN 'Framework'
        WHEN LOWER(nom) IN ('management','agile','scrum','kanban','jira','communication','leadership',
                            'recrutement','gestion de projet','hrbp')                                               THEN 'Management'
        ELSE 'Autre'
    END             AS categorie_competence
FROM source
