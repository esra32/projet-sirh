"""
=============================================================================
DAG Airflow — Pipeline SIRH BI
=============================================================================
Orchestration du pipeline ETL/dbt quotidien pour le Data Warehouse SIRH.

Séquence d'exécution :
    [extract_staging] → [dbt_snapshot] → [dbt_run] → [dbt_test]
    → [data_quality_report] → [ML x6] → [pipeline_summary]

Planning : tous les jours à 02h00 (Europe/Paris)

Architecture :
    Sources MySQL (sirh_employee + sirh_recruitment)
        ↓ extract_staging (Python)
    sirh_staging (tables brutes)
        ↓ dbt snapshot (SCD Type 2)
    snap_employe_historique (historique)
        ↓ dbt run (transformation)
    sirh_dwh (dimensions + faits + KPIs)
        ↓ dbt test (92 tests qualité)
    Données validées → ML → prêtes pour Superset

Gouvernance (1.6) :
    - Chaque tâche écrit son statut dans sirh_dwh.bi_pipeline_log
    - Un résumé final est inséré dans bi_pipeline_log (niveau DAG)
    - Superset dashboard "Santé du Pipeline" lit bi_pipeline_log

Configuration email (optionnelle) :
    Editer airflow.cfg section [smtp] ou passer AIRFLOW__SMTP__* en env :
        AIRFLOW__SMTP__SMTP_HOST=smtp.gmail.com
        AIRFLOW__SMTP__SMTP_PORT=587
        AIRFLOW__SMTP__SMTP_STARTTLS=True
        AIRFLOW__SMTP__SMTP_USER=votre@email.com
        AIRFLOW__SMTP__SMTP_PASSWORD=votre_mot_de_passe
    Puis activer 'email_on_failure': True dans default_args
=============================================================================
"""

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago

# =============================================================================
# Callbacks de monitoring — écriture dans bi_pipeline_log
# =============================================================================

def _log_to_db(context, status):
    """Enregistre le statut d'une tâche dans sirh_dwh.bi_pipeline_log."""
    try:
        import pymysql
        ti = context['task_instance']
        duration = None
        if ti.start_date and ti.end_date:
            duration = int((ti.end_date - ti.start_date).total_seconds())

        conn = pymysql.connect(
            host='host.docker.internal', port=3306,
            user='root', password='root', database='sirh_dwh',
            charset='utf8mb4', connect_timeout=5,
        )
        try:
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS bi_pipeline_log (
                    id               INT AUTO_INCREMENT PRIMARY KEY,
                    dag_id           VARCHAR(200),
                    run_id           VARCHAR(250),
                    task_id          VARCHAR(200),
                    status           VARCHAR(20),
                    started_at       DATETIME,
                    ended_at         DATETIME,
                    duration_seconds INT,
                    error_message    TEXT,
                    logged_at        DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            error_msg = None
            if status == 'failed':
                exc = context.get('exception')
                error_msg = str(exc)[:500] if exc else 'Unknown error'

            cur.execute("""
                INSERT INTO bi_pipeline_log
                    (dag_id, run_id, task_id, status, started_at, ended_at,
                     duration_seconds, error_message)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                context['dag'].dag_id,
                context.get('run_id', ''),
                ti.task_id,
                status,
                ti.start_date,
                ti.end_date,
                duration,
                error_msg,
            ))
            conn.commit()
        finally:
            conn.close()
    except Exception:
        pass  # Ne jamais faire échouer une tâche à cause du logging


def on_task_success(context):
    _log_to_db(context, 'success')


def on_task_failure(context):
    _log_to_db(context, 'failed')


# =============================================================================
# Configuration par défaut du DAG
# =============================================================================

default_args = {
    'owner':               'sirh-bi',
    'depends_on_past':     False,
    'email_on_failure':    False,   # Passer à True + configurer SMTP pour alertes email
    'email_on_retry':      False,
    'retries':             1,
    'retry_delay':         timedelta(minutes=5),
    'on_success_callback': on_task_success,
    'on_failure_callback': on_task_failure,
}

# Chemins dans le container Docker
DBT_PROJECT_DIR = '/opt/sirh/dbt_sirh'
DBT_PROFILES_DIR = '/opt/sirh'
EXTRACT_SCRIPT = '/opt/sirh/extract/extract_staging.py'

# =============================================================================
# Définition du DAG
# =============================================================================

with DAG(
    dag_id='sirh_bi_pipeline',
    description='Pipeline ETL/dbt quotidien — SIRH Data Warehouse',
    default_args=default_args,
    start_date=days_ago(1),
    schedule_interval='0 2 * * *',   # Tous les jours à 02h00
    catchup=False,
    tags=['sirh', 'etl', 'dbt', 'bi'],
    doc_md="""
    ## Pipeline SIRH BI

    Ce DAG orchestre le chargement quotidien du Data Warehouse SIRH.

    ### Tâches
    1. **extract_staging** : Extrait les données depuis sirh_employee et sirh_recruitment
    2. **dbt_snapshot** : Met à jour l'historique SCD Type 2 (snap_employe_historique)
    3. **dbt_run** : Reconstruit toutes les dimensions et tables de faits (18 modèles)
    4. **dbt_test** : Valide les 50 règles de qualité des données

    ### En cas d'échec
    - La tâche échouée est retentée 1 fois après 5 minutes
    - Les tâches suivantes sont bloquées jusqu'à résolution
    """,
) as dag:

    # =========================================================================
    # TÂCHE 1 — Extraction ETL (Python → sirh_staging)
    # =========================================================================
    extract_staging = BashOperator(
        task_id='extract_staging',
        bash_command=f'python {EXTRACT_SCRIPT}',
        doc_md="""
        **Extraction ETL Python**

        Lit les tables depuis les bases opérationnelles :
        - sirh_employee : employees, departments, positions, skills
        - sirh_recruitment : job_offers, applications, application_skills

        Écrit dans sirh_staging avec horodatage extracted_at.
        Durée estimée : 5-10 secondes.
        """,
    )

    # =========================================================================
    # TÂCHE 1b — dbt Source Freshness (vérification fraîcheur des données)
    # =========================================================================
    dbt_freshness = BashOperator(
        task_id='dbt_source_freshness',
        bash_command=(
            f'cd {DBT_PROJECT_DIR} && '
            f'dbt source freshness '
            f'--project-dir {DBT_PROJECT_DIR} '
            f'--profiles-dir {DBT_PROFILES_DIR} '
            f'--target docker'
        ),
        doc_md="""
        **dbt Source Freshness — Vérification fraîcheur**

        Vérifie que les tables staging ont été chargées récemment
        (colonne extracted_at) :
        - WARN si données > 25 heures
        - ERROR si données > 48 heures

        Garantit que le pipeline ne transforme pas des données périmées.
        Durée estimée : 2-3 secondes.
        """,
    )

    # =========================================================================
    # TÂCHE 2 — dbt Snapshot (SCD Type 2)
    # =========================================================================
    dbt_snapshot = BashOperator(
        task_id='dbt_snapshot',
        bash_command=(
            f'cd {DBT_PROJECT_DIR} && '
            f'dbt snapshot '
            f'--project-dir {DBT_PROJECT_DIR} '
            f'--profiles-dir {DBT_PROFILES_DIR} '
            f'--target docker'
        ),
        doc_md="""
        **dbt Snapshot — SCD Type 2**

        Détecte les changements de département, poste ou contrat pour chaque employé.
        Si un changement est détecté :
        - Ferme l'ancienne ligne (dbt_valid_to = NOW())
        - Crée une nouvelle ligne (dbt_valid_to = NULL)

        Table mise à jour : snap_employe_historique
        Durée estimée : 1-2 secondes.
        """,
    )

    # =========================================================================
    # TÂCHE 3 — dbt Run (Transformation complète)
    # =========================================================================
    dbt_run = BashOperator(
        task_id='dbt_run',
        bash_command=(
            f'cd {DBT_PROJECT_DIR} && '
            f'dbt run '
            f'--project-dir {DBT_PROJECT_DIR} '
            f'--profiles-dir {DBT_PROFILES_DIR} '
            f'--target docker'
        ),
        doc_md="""
        **dbt Run — Transformation Data Warehouse**

        Reconstruit les 18 modèles dans sirh_dwh :
        - 6 views staging (nettoyage et standardisation)
        - 6 tables dimensions (dim_temps, dim_employe, dim_departement, dim_poste, dim_competence, dim_offre)
        - 4 tables de faits (fait_recrutement, fait_effectifs, fait_mobilite, fait_competences)
        - 2 tables de reporting (kpi_rh, vw_effectifs_mensuels)

        Durée estimée : 3-5 secondes.
        """,
    )

    # =========================================================================
    # TÂCHE 4 — dbt Test (Validation qualité)
    # =========================================================================
    dbt_test = BashOperator(
        task_id='dbt_test',
        bash_command=(
            f'cd {DBT_PROJECT_DIR} && '
            f'dbt test '
            f'--project-dir {DBT_PROJECT_DIR} '
            f'--profiles-dir {DBT_PROFILES_DIR} '
            f'--target docker'
        ),
        doc_md="""
        **dbt Test — Validation des 50 règles qualité**

        Vérifie automatiquement :
        - not_null : aucune valeur manquante sur les clés
        - unique : pas de doublons sur les identifiants
        - accepted_values : CDI/CDD/STAGE uniquement, scores 0-100
        - test_dates_valides : aucune date dans le futur
        - test_match_score : scores IA dans les bornes valides

        En cas d'échec : la tâche échoue et alerte le pipeline.
        Durée estimée : 5-10 secondes.
        """,
    )

    # =========================================================================
    # TÂCHE 5 — Rapport de Qualité des Données (HTML)
    # =========================================================================
    QUALITY_SCRIPT = '/opt/sirh/quality/data_quality_report.py'

    data_quality_report = BashOperator(
        task_id='data_quality_report',
        bash_command=f'python {QUALITY_SCRIPT}',
        doc_md="""
        **Rapport de Qualité des Données**

        Exécute data_quality_report.py après la validation dbt :
        - Teste not_null, unique, accepted_values, referential_integrity
        - Génère quality_report.html avec résumé PASS / WARN / FAIL
        - Rapport consultable dans /opt/sirh/quality/quality_report.html

        Durée estimée : 5-10 secondes.
        """,
    )

    # =========================================================================
    # TÂCHES ML — Analyses Avancées 1.5
    # =========================================================================
    ML_DIR = '/opt/sirh/ml'

    # NOTE : is_parti provient désormais de la source (date_depart), généré par
    # ml/generate_departures.py en amont de l'ETL. Le patch DWH fix_dwh_is_parti.py
    # est supprimé : il écrasait dim_employe APRÈS dbt run (anti-pattern).

    ml_turnover = BashOperator(
        task_id='ml_turnover',
        bash_command=f'python {ML_DIR}/turnover_model.py',
        doc_md="ML-1 : Random Forest Turnover + SHAP → ml_turnover_risk",
    )

    ml_segmentation = BashOperator(
        task_id='ml_segmentation',
        bash_command=f'python {ML_DIR}/segmentation_model.py',
        doc_md="ML-2 : K-Means Segmentation → ml_employee_segments",
    )

    ml_high_potentials = BashOperator(
        task_id='ml_high_potentials',
        bash_command=f'python {ML_DIR}/high_potentials.py',
        doc_md="ML-3 : High Potentials → ml_high_potentials",
    )

    ml_forecast = BashOperator(
        task_id='ml_forecast',
        bash_command=f'python {ML_DIR}/forecast_model.py',
        doc_md="ML-4 : Prophet Embauches → ml_forecast_embauches",
    )

    ml_correlations = BashOperator(
        task_id='ml_correlations',
        bash_command=f'python {ML_DIR}/correlations.py',
        doc_md="ML-5 : Corrélations RH → ml_correlations",
    )

    ml_retention = BashOperator(
        task_id='ml_retention',
        bash_command=f'python {ML_DIR}/retention_analysis.py',
        doc_md="ML-6 : Rétention Talents → ml_retention_analysis",
    )

    # =========================================================================
    # TÂCHE FINALE — Résumé pipeline (1.6 Gouvernance)
    # =========================================================================

    def write_pipeline_summary(**context):
        """Insère une ligne de résumé du run complet dans bi_pipeline_log."""
        import pymysql
        from datetime import datetime as dt

        run_id  = context.get('run_id', '')
        dag_id  = context['dag'].dag_id
        ended_at = dt.utcnow()

        # Durée totale — forcer timezone-naive pour éviter TypeError
        dag_run    = context.get('dag_run')
        started_at = None
        if dag_run and dag_run.start_date:
            s = dag_run.start_date
            # Supprimer la timezone si présente (rendre naive)
            started_at = s.replace(tzinfo=None) if s.tzinfo else s

        try:
            duration = int((ended_at - started_at).total_seconds()) if started_at else None
        except Exception:
            duration = None

        try:
            conn = pymysql.connect(
                host='host.docker.internal', port=3306,
                user='root', password='root', database='sirh_dwh',
                charset='utf8mb4', connect_timeout=5,
            )
            try:
                cur = conn.cursor()
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS bi_pipeline_log (
                        id               INT AUTO_INCREMENT PRIMARY KEY,
                        dag_id           VARCHAR(200),
                        run_id           VARCHAR(250),
                        task_id          VARCHAR(200),
                        status           VARCHAR(20),
                        started_at       DATETIME,
                        ended_at         DATETIME,
                        duration_seconds INT,
                        error_message    TEXT,
                        logged_at        DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cur.execute("""
                    INSERT INTO bi_pipeline_log
                        (dag_id, run_id, task_id, status, started_at, ended_at, duration_seconds)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (dag_id, run_id, 'PIPELINE_COMPLETE', 'success',
                      started_at, ended_at, duration))
                conn.commit()
                print(f"✓ Pipeline summary logged — durée totale : {duration}s")
            finally:
                conn.close()
        except Exception as e:
            print(f"⚠️  Impossible de logger le résumé pipeline: {e}")

    pipeline_summary = PythonOperator(
        task_id='pipeline_summary',
        python_callable=write_pipeline_summary,
        doc_md="""
        **Résumé Pipeline (Gouvernance 1.6)**

        Enregistre le statut final du run dans sirh_dwh.bi_pipeline_log.
        Ce log alimente le dashboard Superset "Santé du Pipeline".
        Durée totale du pipeline = extract → ML complet.
        """,
    )

    # =========================================================================
    # Définition des dépendances (ordre d'exécution)
    # =========================================================================
    #
    # extract → freshness → snapshot → dbt_run → dbt_test → quality_report
    #                                                              ↓
    #                                               ml_turnover → ml_segmentation
    #                                                              ↓
    #                                               ml_high_potentials → ml_forecast
    #                                                              ↓
    #                                               ml_correlations → ml_retention
    #                                                              ↓
    #                                                    pipeline_summary
    # ==========================================================================

    extract_staging >> dbt_freshness >> dbt_snapshot >> dbt_run >> dbt_test >> data_quality_report
    data_quality_report >> ml_turnover >> ml_segmentation >> ml_high_potentials
    ml_high_potentials >> ml_forecast >> ml_correlations >> ml_retention >> pipeline_summary
