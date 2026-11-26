"""
ÉTAPE 2 — Extraction : sources → sirh_staging
Copie les données brutes sans transformation.
"""

import sqlalchemy as sa
from datetime import datetime
import sys
import os

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from extract.config import SOURCE_EMPLOYEE, SOURCE_RECRUITMENT, STAGING

eng_emp = sa.create_engine(SOURCE_EMPLOYEE)
eng_rec = sa.create_engine(SOURCE_RECRUITMENT)
eng_stg = sa.create_engine(STAGING)

def extract_table(src_engine, query, stg_engine, stg_table, params=None):
    with src_engine.connect() as src:
        rows = src.execute(sa.text(query), params or {}).mappings().fetchall()
        data = [dict(r) for r in rows]
    if not data:
        print(f"  ⚠️  {stg_table} : aucune donnée source")
        return 0
    with stg_engine.begin() as stg:
        stg.execute(sa.text(f"DELETE FROM {stg_table}"))
        for row in data:
            row["extracted_at"] = datetime.now()
        cols = ", ".join(data[0].keys())
        vals = ", ".join(f":{k}" for k in data[0].keys())
        stg.execute(sa.text(f"INSERT INTO {stg_table} ({cols}) VALUES ({vals})"), data)
    return len(data)

print("=== EXTRACTION STAGING ===\n")

n = extract_table(eng_emp, "SELECT id, name FROM departments", eng_stg, "stg_departments")
print(f"✓ stg_departments        : {n} lignes")

n = extract_table(eng_emp, "SELECT id, title FROM positions", eng_stg, "stg_positions")
print(f"✓ stg_positions          : {n} lignes")

n = extract_table(eng_emp, """
    SELECT id, first_name, last_name, email, phone,
           hire_date, contract_type, department_id, position_id,
           date_depart, motif_depart,
           COALESCE(salary, 0) AS salary
    FROM employees
""", eng_stg, "stg_employees")
print(f"✓ stg_employees          : {n} lignes")

n = extract_table(eng_emp, """
    SELECT id, employee_id, skill_name, level
    FROM employee_skills
""", eng_stg, "stg_employee_skills")
print(f"✓ stg_employee_skills    : {n} lignes")

n = extract_table(eng_rec, """
    SELECT id, title, department, location, status,
           published_date, deadline_date, created_at
    FROM job_offers
""", eng_stg, "stg_job_offers")
print(f"✓ stg_job_offers         : {n} lignes")

n = extract_table(eng_rec, """
    SELECT id, applicant_email, applicant_name, applied_date,
           status, match_score, job_offer_id, source
    FROM applications
""", eng_stg, "stg_applications")
print(f"✓ stg_applications       : {n} lignes")

n = extract_table(eng_rec, "SELECT id, name FROM skills", eng_stg, "stg_skills")
print(f"✓ stg_skills             : {n} lignes")

n = extract_table(eng_rec,
    "SELECT application_id, skill_id FROM application_skills",
    eng_stg, "stg_application_skills")
print(f"✓ stg_application_skills : {n} lignes")

print("\n✅ Extraction terminée → sirh_staging prêt")
