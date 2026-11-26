"""
Configuration des connexions bases de données
Projet SIRH BI — Partie 2
"""

import os

# Hôte MySQL — host.docker.internal quand on tourne dans Docker,
# localhost quand on tourne directement sur la machine
_HOST = os.getenv('SIRH_MYSQL_HOST', 'localhost')
_PORT = os.getenv('SIRH_MYSQL_PORT', '3306')
_USER = os.getenv('SIRH_MYSQL_USER', 'root')
_PASS = os.getenv('SIRH_MYSQL_PASSWORD', 'root')

def _url(db):
    return f"mysql+pymysql://{_USER}:{_PASS}@{_HOST}:{_PORT}/{db}"

# ── Sources (Partie 1) ──────────────────────────────────────
SOURCE_EMPLOYEE    = _url('sirh_employee')
SOURCE_RECRUITMENT = _url('sirh_recruitment')
SOURCE_AUTH        = _url('sirh_auth')

# ── Destinations (Partie 2) ─────────────────────────────────
STAGING = _url('sirh_staging')
DWH     = _url('sirh_dwh')

# ── dbt profile (même credentials) ─────────────────────────
DBT_HOST     = _HOST
DBT_PORT     = int(_PORT)
DBT_USER     = _USER
DBT_PASSWORD = _PASS
DBT_DATABASE = "sirh_dwh"