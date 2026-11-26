"""
Run the complete SIRH advanced analytics pipeline.

This is the local Python entry point for section 1.5 "Analyses Avancees".
It runs the ML scripts in the same order as the Airflow DAG, after checking
that Python dependencies and the DWH input tables are available.

Usage:
    python ml/run_all.py
    python ml/run_all.py --only turnover segmentation
    python ml/run_all.py --skip-preflight
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
ML_DIR = Path(__file__).resolve().parent


@dataclass(frozen=True)
class MlStep:
    key: str
    title: str
    script: str
    output_table: str


PIPELINE = [
    MlStep("turnover", "ML-1 Turnover risk", "turnover_model.py", "ml_turnover_risk"),
    MlStep("segmentation", "ML-2 Employee segmentation", "segmentation_model.py", "ml_employee_segments"),
    MlStep("high_potentials", "ML-3 High potentials", "high_potentials.py", "ml_high_potentials"),
    MlStep("forecast", "ML-4 Hiring forecast", "forecast_model.py", "ml_forecast_embauches"),
    MlStep("correlations", "ML-5 RH correlations", "correlations.py", "ml_correlations"),
    MlStep("retention", "ML-6 Talent retention", "retention_analysis.py", "ml_retention_analysis"),
]


REQUIRED_IMPORTS = {
    "pandas": "pandas",
    "numpy": "numpy",
    "pymysql": "pymysql",
    "sqlalchemy": "sqlalchemy",
    "scikit-learn": "sklearn",
    "scipy": "scipy",
    "shap": "shap",
    "prophet": "prophet",
}


REQUIRED_TABLES = [
    "dim_employe",
    "fait_recrutement",
    "fait_mobilite",
    "fait_gap_competences",
]


def db_config() -> dict[str, object]:
    return {
        "host": os.getenv("SIRH_MYSQL_HOST", "localhost"),
        "port": int(os.getenv("SIRH_MYSQL_PORT", "3306")),
        "user": os.getenv("SIRH_MYSQL_USER", "root"),
        "password": os.getenv("SIRH_MYSQL_PASSWORD", "root"),
        "database": "sirh_dwh",
        "charset": "utf8mb4",
    }


def fail(message: str) -> None:
    print(f"\nERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def check_imports() -> None:
    missing = []
    for package_name, import_name in REQUIRED_IMPORTS.items():
        if importlib.util.find_spec(import_name) is None:
            missing.append(package_name)

    if missing:
        fail(
            "Missing Python dependencies: "
            + ", ".join(missing)
            + "\nRun from sirh-bi: python -m pip install -r requirements.txt"
        )

    print("[OK] Python dependencies are installed")


def query_one(cursor: object, sql: str, params: tuple[object, ...] = ()) -> object:
    cursor.execute(sql, params)
    row = cursor.fetchone()
    if row is None:
        return None
    if isinstance(row, dict):
        return next(iter(row.values()))
    return row[0]


def check_database() -> None:
    import pymysql

    try:
        conn = pymysql.connect(**db_config())
    except Exception as exc:  # pragma: no cover - diagnostic path
        fail(
            "Cannot connect to MySQL database sirh_dwh. "
            "Check that MySQL/Docker is running and SIRH_MYSQL_* env vars are correct.\n"
            f"Original error: {exc}"
        )

    try:
        with conn.cursor() as cursor:
            missing_tables = []
            empty_tables = []

            for table in REQUIRED_TABLES:
                exists = query_one(
                    cursor,
                    """
                    SELECT COUNT(*)
                    FROM information_schema.tables
                    WHERE table_schema = DATABASE()
                      AND table_name = %s
                    """,
                    (table,),
                )
                if not exists:
                    missing_tables.append(table)
                    continue

                count = int(query_one(cursor, f"SELECT COUNT(*) FROM `{table}`") or 0)
                if count == 0:
                    empty_tables.append(table)

            if missing_tables:
                fail(
                    "DWH tables are missing: "
                    + ", ".join(missing_tables)
                    + "\nRun the ETL/dbt pipeline first: extract_staging -> dbt snapshot -> dbt run."
                )

            if "dim_employe" in empty_tables:
                fail("dim_employe is empty. Run dbt first, then retry the ML pipeline.")

            is_parti_classes = query_one(
                cursor,
                """
                SELECT COUNT(DISTINCT is_parti)
                FROM dim_employe
                WHERE is_parti IS NOT NULL
                """,
            )
            if int(is_parti_classes or 0) < 2:
                fail(
                    "dim_employe.is_parti must contain both active and departed employees "
                    "for the turnover model. Run ml/generate_departures.py before ETL/dbt, "
                    "then rebuild sirh_dwh."
                )

            print("[OK] DWH input tables are available")
            if empty_tables:
                print("[WARN] Empty optional tables: " + ", ".join(empty_tables))
    finally:
        conn.close()


def run_step(step: MlStep) -> None:
    script_path = ML_DIR / step.script
    if not script_path.exists():
        fail(f"Script not found: {script_path}")

    print("\n" + "=" * 80)
    print(f"Starting {step.title}")
    print(f"Script: {script_path.relative_to(PROJECT_DIR)}")
    print(f"Output: sirh_dwh.{step.output_table}")
    print("=" * 80)

    env = os.environ.copy()
    env.setdefault("PYTHONUNBUFFERED", "1")
    env.setdefault("PYTHONIOENCODING", "utf-8")

    completed = subprocess.run(
        [sys.executable, "-u", str(script_path)],
        cwd=PROJECT_DIR,
        env=env,
        check=False,
    )

    if completed.returncode != 0:
        fail(f"{step.title} failed with exit code {completed.returncode}")

    print(f"[OK] Finished {step.title}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run SIRH BI advanced analytics ML pipeline")
    parser.add_argument(
        "--only",
        nargs="+",
        choices=[step.key for step in PIPELINE],
        help="Run only selected steps, still in pipeline order.",
    )
    parser.add_argument(
        "--skip-preflight",
        action="store_true",
        help="Skip dependency and database checks.",
    )
    parser.add_argument(
        "--continue-on-error",
        action="store_true",
        help="Continue with next steps even if one script fails.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    selected = set(args.only or [step.key for step in PIPELINE])
    steps = [step for step in PIPELINE if step.key in selected]

    print("SIRH BI advanced analytics pipeline")
    print(f"Project: {PROJECT_DIR}")
    print("Steps: " + " -> ".join(step.key for step in steps))

    if not args.skip_preflight:
        check_imports()
        check_database()

    failures = []
    for step in steps:
        try:
            run_step(step)
        except SystemExit as exc:
            failures.append((step.key, int(exc.code or 1)))
            if not args.continue_on_error:
                raise

    if failures:
        details = ", ".join(f"{key}={code}" for key, code in failures)
        fail(f"Pipeline finished with failures: {details}")

    print("\nAll selected ML steps finished successfully.")


if __name__ == "__main__":
    main()
