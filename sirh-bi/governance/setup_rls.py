"""
=============================================================================
SIRH BI — 1.6.2 : Row-Level Security (RLS)
=============================================================================
Configure les filtres RLS dans Superset :
  Manager → voit UNIQUEMENT le département Informatique

L'ID du rôle Manager est récupéré via docker exec (Python interne Superset).
Le filtre RLS est créé via l'API REST Superset.

Usage :
    python governance/setup_rls.py

Prérequis :
    1. setup_rbac.py déjà exécuté (rôle Manager existant)
    2. Container superset-sirh en état "healthy"
    3. Au moins un dataset sirh_dwh importé dans Superset
=============================================================================
"""

import subprocess
import sys
import requests
from datetime import datetime

CONTAINER    = "superset-sirh"
SUPERSET_URL = "http://localhost:8088"
ADMIN_USER   = "admin"
ADMIN_PASS   = "admin"
MANAGER_DEPT = "Informatique"

TABLES_WITH_DEPT = [
    "ml_turnover_risk",
    "kpi_rh",
    "rh_turnover_departement",
    "ml_employee_segments",
    "ml_high_potentials",
    "ml_retention_analysis",
    "dim_employe",
    "fait_effectifs",
]

# Script Python exécuté dans le container pour récupérer l'ID du rôle Manager
_GET_ROLE_ID_SCRIPT = """
from superset import create_app
app = create_app()
with app.app_context():
    sm = app.appbuilder.sm
    role = sm.find_role('Manager')
    if role:
        print(f'ROLE_ID:{role.id}')
    else:
        print('ROLE_NOT_FOUND')
"""


def run_in_container(script_code):
    result = subprocess.run(
        ['docker', 'exec', '-i', CONTAINER, 'python', '-c', script_code],
        capture_output=True, text=True, encoding='utf-8', timeout=60,
    )
    return result.returncode, result.stdout, result.stderr


# =============================================================================
# Client REST Superset (pour RLS uniquement — pas d'endpoint FAB pour RLS)
# =============================================================================

class SupersetClient:
    def __init__(self, base_url, username, password):
        self.base_url = base_url.rstrip('/')
        self.session  = requests.Session()
        self._login(username, password)

    def _login(self, username, password):
        r = self.session.post(
            f"{self.base_url}/api/v1/security/login",
            json={"username": username, "password": password,
                  "provider": "db", "refresh": True},
            headers={"Content-Type": "application/json"},
            timeout=20,
        )
        r.raise_for_status()
        token = r.json()["access_token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        csrf = self.session.get(f"{self.base_url}/api/v1/security/csrf_token/", timeout=10)
        if csrf.status_code == 200:
            self.session.headers.update({"X-CSRFToken": csrf.json().get("result", "")})
        print(f"  ✓ Connecté à l'API REST Superset")

    def get(self, p, **kw):
        return self.session.get(f"{self.base_url}{p}", timeout=20, **kw)

    def post(self, p, **kw):
        return self.session.post(f"{self.base_url}{p}", timeout=20, **kw)

    def delete(self, p, **kw):
        return self.session.delete(f"{self.base_url}{p}", timeout=20, **kw)


def get_datasets(client):
    """Retourne {table_name: id} pour TOUS les datasets (pagination automatique)."""
    all_datasets = {}
    for page in range(10):  # max 500 datasets (10 pages × 50)
        r = client.get("/api/v1/dataset/",
                       params={"q": f"(page:{page},page_size:50)"})
        if r.status_code != 200:
            break
        items = r.json().get("result", [])
        if not items:
            break
        for d in items:
            tname = d.get("table_name") or ""
            if tname:
                all_datasets[tname] = d["id"]
        if len(items) < 50:
            break
    return all_datasets


def get_existing_rls(client):
    """Retourne {name: id} des filtres RLS existants."""
    r = client.get("/api/v1/rowlevelsecurity/")
    if r.status_code != 200:
        return {}
    data = r.json()
    items = data.get("result", [])
    return {row["name"]: row["id"] for row in items}


def delete_rls(client, rls_id):
    client.delete(f"/api/v1/rowlevelsecurity/{rls_id}")


def create_rls(client, name, clause, role_ids, table_ids):
    r = client.post(
        "/api/v1/rowlevelsecurity/",
        json={
            "name":        name,
            "filter_type": "Regular",
            "clause":      clause,
            "roles":       role_ids,
            "tables":      table_ids,
            "group_key":   "",
            "description": f"Filtre SIRH — {name}",
        },
        headers={"Content-Type": "application/json"},
    )
    if r.status_code in (200, 201):
        return r.json().get("id")
    raise RuntimeError(f"RLS '{name}': {r.status_code} — {r.text[:300]}")


# =============================================================================
# MAIN
# =============================================================================

print("=" * 65)
print("  SIRH BI — 1.6.2 : Row-Level Security")
print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 65)

# ------------------------------------------------------------------
# 1. Récupérer l'ID du rôle Manager via docker exec
# ------------------------------------------------------------------
print(f"\n[1] Récupération de l'ID du rôle Manager (via container)...")
code, stdout, stderr = run_in_container(_GET_ROLE_ID_SCRIPT)

manager_role_id = None
for line in stdout.strip().splitlines():
    if line.startswith('ROLE_ID:'):
        manager_role_id = int(line.split(':')[1])
        break
    if 'ROLE_NOT_FOUND' in line:
        break

if manager_role_id is None:
    print("  ✗ Rôle 'Manager' introuvable.")
    print("    Lancez d'abord : python governance/setup_rbac.py")
    sys.exit(1)

print(f"  ✓ Rôle Manager : id={manager_role_id}")

# ------------------------------------------------------------------
# 2. Connexion REST API pour les datasets et RLS
# ------------------------------------------------------------------
print("\n[2] Connexion à l'API REST Superset...")
try:
    client = SupersetClient(SUPERSET_URL, ADMIN_USER, ADMIN_PASS)
except Exception as e:
    print(f"  ✗ Connexion impossible : {e}")
    sys.exit(1)

# ------------------------------------------------------------------
# 3. Datasets disponibles
# ------------------------------------------------------------------
print("\n[3] Récupération des datasets sirh_dwh...")
datasets = get_datasets(client)
print(f"  {len(datasets)} dataset(s) dans Superset")

if datasets:
    print(f"  Datasets : {sorted(datasets.keys())[:8]}")

available  = [t for t in TABLES_WITH_DEPT if t in datasets]
missing    = [t for t in TABLES_WITH_DEPT if t not in datasets]
table_ids  = [datasets[t] for t in available]

if missing:
    print(f"\n  ⚠️  Tables non encore importées : {missing}")

if not available:
    print("""
  ✗ Aucune table DWH trouvée dans les datasets Superset.

  Comment ajouter la connexion MySQL dans Superset :
    1. http://localhost:8088 → Settings → Database Connections → + Database
    2. Choisir MySQL
    3. SQLAlchemy URI : mysql+pymysql://root:root@host.docker.internal:3306/sirh_dwh
    4. Tester → Connecter
    5. Data → Datasets → + Dataset → Sélectionner les tables sirh_dwh
    6. Relancer ce script.

  Le rôle Manager existe déjà (id={manager_role_id}).
    """)
    sys.exit(0)

print(f"  Tables ciblées ({len(available)}) : {available}")

# ------------------------------------------------------------------
# 4. Nettoyage des anciens filtres SIRH
# ------------------------------------------------------------------
print("\n[4] Nettoyage des anciens filtres RLS SIRH...")
existing = get_existing_rls(client)
old = {n: i for n, i in existing.items() if 'SIRH' in n or 'Manager' in n}
for name, rid in old.items():
    delete_rls(client, rid)
    print(f"  -  Supprimé : '{name}'")
if not old:
    print("  Aucun filtre existant à supprimer.")

# ------------------------------------------------------------------
# 5. Création du filtre RLS
# ------------------------------------------------------------------
print(f"\n[5] Création du filtre RLS — département {MANAGER_DEPT}...")
rls_name   = f"SIRH — Manager département {MANAGER_DEPT}"
rls_clause = f"departement = '{MANAGER_DEPT}'"

try:
    rls_id = create_rls(
        client,
        name      = rls_name,
        clause    = rls_clause,
        role_ids  = [manager_role_id],
        table_ids = table_ids,
    )
    print(f"  ✓ Filtre créé (id={rls_id})")
    print(f"    Clause : {rls_clause}")
    print(f"    Tables : {available}")

except Exception as e:
    print(f"  ✗ Erreur : {e}")
    if not available:
        print("  → Importez d'abord des datasets depuis sirh_dwh dans Superset.")

# ------------------------------------------------------------------
# Résumé
# ------------------------------------------------------------------
print(f"""
{'=' * 65}
  RÉSUMÉ — Row-Level Security
{'=' * 65}

  Filtre actif :
    Rôle    : Manager (id={manager_role_id})
    Clause  : departement = '{MANAGER_DEPT}'
    Tables  : {available}

  ┌─────────────────────────────────────────────────────────┐
  │  DÉMONSTRATION                                          │
  │                                                         │
  │  Compte  admin        → voit TOUS les départements     │
  │  Compte  manager.info → voit SEULEMENT {MANAGER_DEPT:<14}│
  │                                                         │
  │  URL : http://localhost:8088                            │
  └─────────────────────────────────────────────────────────┘

  Prochaine étape :
    python governance/metrics_catalog.py
{'=' * 65}
""")
