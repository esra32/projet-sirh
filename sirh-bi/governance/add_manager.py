"""
Crée un 2ème compte Manager pour le département BIG DATA et BI.

Résultat :
  manager.info    / Manager2026!   → voit seulement Informatique
  manager.bigdata / BigData2026!   → voit seulement BIG DATA et BI
"""
import subprocess
import requests

CONTAINER    = "superset-sirh"
SUPERSET_URL = "http://localhost:8088"

NEW_MANAGER = {
    "username":   "manager.bigdata",
    "first_name": "Youssef",
    "last_name":  "Mansouri",
    "email":      "manager.bigdata@sirh.com",
    "password":   "BigData2026!",
    "dept":       "BIG DATA et BI",
    "role_name":  "Manager_BigData",
}

# ── Étape 1 : Créer le rôle Manager_BigData (copie de Gamma) ──────────────
_ROLE_SCRIPT = f"""
from superset import create_app
app = create_app()
with app.app_context():
    sm  = app.appbuilder.sm
    from superset.extensions import db

    role_name = '{NEW_MANAGER["role_name"]}'
    existing  = sm.find_role(role_name)
    if existing:
        print(f'ROLE_EXISTS:{{role_name}}:{{existing.id}}')
    else:
        gamma   = sm.find_role('Gamma')
        role    = sm.add_role(role_name)
        if gamma:
            for perm in gamma.permissions:
                sm.add_permission_role(role, perm)
        db.session.commit()
        nb = len(gamma.permissions) if gamma else 0
        print(f'ROLE_CREATED:{{role_name}}:{{role.id}}:{{nb}}')

    # Créer l'utilisateur
    user_role = sm.find_role(role_name)
    existing_user = sm.find_user(username='{NEW_MANAGER["username"]}')
    if existing_user:
        existing_user.roles = [user_role]
        db.session.commit()
        print(f'USER_UPDATED:{NEW_MANAGER["username"]}')
    else:
        user = sm.add_user(
            '{NEW_MANAGER["username"]}',
            '{NEW_MANAGER["first_name"]}',
            '{NEW_MANAGER["last_name"]}',
            '{NEW_MANAGER["email"]}',
            [user_role],
            '{NEW_MANAGER["password"]}'
        )
        print(f'USER_CREATED:{NEW_MANAGER["username"]}')
"""

print("=" * 55)
print(f"  Création Manager — {NEW_MANAGER['dept']}")
print("=" * 55)

print("\n[1] Création du rôle et de l'utilisateur...")
result = subprocess.run(
    ['docker', 'exec', '-i', CONTAINER, 'python', '-c', _ROLE_SCRIPT],
    capture_output=True, text=True, encoding='utf-8', timeout=60
)

role_id = None
for line in result.stdout.splitlines():
    if not line.strip():
        continue
    if 'ROLE_EXISTS' in line or 'ROLE_CREATED' in line:
        parts = line.split(':')
        role_id = int(parts[2])
        status  = 'existe déjà' if 'EXISTS' in line else f'créé ({parts[3]} permissions)'
        print(f"  ✓ Rôle '{NEW_MANAGER['role_name']}' {status} (id={role_id})")
    elif 'USER_CREATED' in line:
        print(f"  ✓ Utilisateur '{NEW_MANAGER['username']}' créé")
    elif 'USER_UPDATED' in line:
        print(f"  ↻ Utilisateur '{NEW_MANAGER['username']}' mis à jour")

if role_id is None:
    print("  ✗ Erreur création rôle")
    print(result.stderr[:200])
    exit(1)

# ── Étape 2 : Accès base de données (même fix que fix_db_access) ──────────
_DB_SCRIPT = f"""
from superset import create_app
app = create_app()
with app.app_context():
    from superset.extensions import db
    from flask_appbuilder.security.sqla.models import PermissionView, Permission, ViewMenu
    sm = app.appbuilder.sm
    role = sm.find_role('{NEW_MANAGER["role_name"]}')
    if not role:
        print('ROLE_NOT_FOUND')
        exit()
    pvs = db.session.query(PermissionView).join(Permission).join(ViewMenu).filter(
        Permission.name.in_(['database_access','schema_access','all_datasource_access'])
    ).all()
    sirh_pvs = [pv for pv in pvs if 'SIRH' in (pv.view_menu.name or '')
                or 'sirh' in (pv.view_menu.name or '').lower()
                or 'all_datasource' in (pv.permission.name or '')]
    existing = {{pv.id for pv in role.permissions}}
    added = 0
    for pv in sirh_pvs:
        if pv.id not in existing:
            sm.add_permission_role(role, pv)
            added += 1
    db.session.commit()
    print(f'DB_ACCESS_OK:{{added}}')
"""
print("\n[2] Ajout accès base SIRH DWH...")
r2 = subprocess.run(
    ['docker', 'exec', '-i', CONTAINER, 'python', '-c', _DB_SCRIPT],
    capture_output=True, text=True, encoding='utf-8', timeout=60
)
for line in r2.stdout.splitlines():
    if 'DB_ACCESS_OK' in line:
        nb = line.split(':')[1]
        print(f"  ✓ {nb} permission(s) d'accès ajoutée(s)")

# ── Étape 3 : Partager les dashboards avec ce nouveau rôle ────────────────
_DASH_SCRIPT = f"""
from superset import create_app
app = create_app()
with app.app_context():
    from superset.extensions import db
    from superset.models.dashboard import Dashboard
    from flask_appbuilder.security.sqla.models import Role
    sm = app.appbuilder.sm
    new_role = sm.find_role('{NEW_MANAGER["role_name"]}')
    dashboards = db.session.query(Dashboard).all()
    for d in dashboards:
        if new_role not in d.roles:
            d.roles.append(new_role)
    db.session.commit()
    print(f'DASH_OK:{{len(dashboards)}}')
"""
print("\n[3] Partage des dashboards...")
r3 = subprocess.run(
    ['docker', 'exec', '-i', CONTAINER, 'python', '-c', _DASH_SCRIPT],
    capture_output=True, text=True, encoding='utf-8', timeout=60
)
for line in r3.stdout.splitlines():
    if 'DASH_OK' in line:
        print(f"  ✓ {line.split(':')[1]} dashboard(s) partagés")

# ── Étape 4 : Filtre RLS via API REST ─────────────────────────────────────
print("\n[4] Création du filtre RLS...")

r = requests.post(f"{SUPERSET_URL}/api/v1/security/login",
    json={"username": "admin", "password": "admin", "provider": "db"},
    headers={"Content-Type": "application/json"})
token = r.json()["access_token"]
session = requests.Session()
session.headers.update({"Authorization": f"Bearer {token}"})
csrf = session.get(f"{SUPERSET_URL}/api/v1/security/csrf_token/")
if csrf.status_code == 200:
    session.headers.update({"X-CSRFToken": csrf.json().get("result", "")})

# Récupérer tous les datasets (paginé)
all_datasets = {}
for page in range(10):
    resp = session.get(f"{SUPERSET_URL}/api/v1/dataset/",
                       params={"q": f"(page:{page},page_size:50)"})
    if resp.status_code != 200:
        break
    items = resp.json().get("result", [])
    if not items:
        break
    for d in items:
        tname = d.get("table_name") or ""
        if tname:
            all_datasets[tname] = d["id"]
    if len(items) < 50:
        break

TABLES_WITH_DEPT = [
    "ml_turnover_risk", "kpi_rh", "rh_turnover_departement",
    "ml_employee_segments", "ml_high_potentials", "ml_retention_analysis",
    "dim_employe", "fait_effectifs",
]
table_ids = [all_datasets[t] for t in TABLES_WITH_DEPT if t in all_datasets]

# Supprimer ancien filtre BigData si existe
existing_rls = session.get(f"{SUPERSET_URL}/api/v1/rowlevelsecurity/")
if existing_rls.status_code == 200:
    for rls in existing_rls.json().get("result", []):
        if "BigData" in rls["name"] or "BIG DATA" in rls["name"]:
            session.delete(f"{SUPERSET_URL}/api/v1/rowlevelsecurity/{rls['id']}")

# Créer le filtre
dept = NEW_MANAGER["dept"]
rls_resp = session.post(
    f"{SUPERSET_URL}/api/v1/rowlevelsecurity/",
    json={
        "name":        f"SIRH — Manager département {dept}",
        "filter_type": "Regular",
        "clause":      f"departement = '{dept}'",
        "roles":       [role_id],
        "tables":      table_ids,
        "group_key":   "",
        "description": f"Filtre RLS Manager {dept}",
    },
    headers={"Content-Type": "application/json"}
)
if rls_resp.status_code in (200, 201):
    print(f"  ✓ Filtre RLS créé : departement = '{dept}'")
else:
    print(f"  ✗ Erreur RLS : {rls_resp.status_code}")

# ── Résumé ────────────────────────────────────────────────────────────────
print(f"""
{'=' * 55}
  RÉSUMÉ
{'=' * 55}

  2 comptes Manager opérationnels :

  manager.info    / Manager2026!  → Informatique seulement
  manager.bigdata / BigData2026!  → BIG DATA et BI seulement

  Démonstration :
    1. http://localhost:8088
    2. Se connecter manager.info   → voir Informatique
    3. Se connecter manager.bigdata → voir BIG DATA et BI
    4. Se connecter admin           → voir tout
{'=' * 55}
""")
