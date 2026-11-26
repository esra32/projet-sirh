"""
Assigne les rôles HR_Admin, Manager, Employee à tous les dashboards publiés.
Après ce script, tous les utilisateurs connectés voient les dashboards.
"""
import subprocess
import requests

SUPERSET_URL = "http://localhost:8088"
CONTAINER    = "superset-sirh"

# --- Récupérer les IDs des rôles via docker exec ---
_SCRIPT = """
from superset import create_app
app = create_app()
with app.app_context():
    sm = app.appbuilder.sm
    for name in ['HR_Admin', 'Manager', 'Employee', 'Admin', 'Alpha', 'Gamma']:
        r = sm.find_role(name)
        if r:
            print(f'ROLE:{name}:{r.id}')
"""
result = subprocess.run(
    ['docker', 'exec', '-i', CONTAINER, 'python', '-c', _SCRIPT],
    capture_output=True, text=True, timeout=60
)
role_ids = {}
for line in result.stdout.splitlines():
    if line.startswith('ROLE:'):
        _, name, rid = line.split(':')
        role_ids[name] = int(rid)

print(f"Rôles trouvés : {role_ids}")

target_roles = [role_ids[n] for n in ['HR_Admin', 'Manager', 'Employee'] if n in role_ids]
if not target_roles:
    print("✗ Rôles HR_Admin/Manager/Employee introuvables. Lancez setup_rbac.py d'abord.")
    exit(1)

# --- Connexion API Superset ---
r = requests.post(f"{SUPERSET_URL}/api/v1/security/login",
    json={"username": "admin", "password": "admin", "provider": "db"},
    headers={"Content-Type": "application/json"})
token = r.json()["access_token"]
session = requests.Session()
session.headers.update({"Authorization": f"Bearer {token}"})
csrf = session.get(f"{SUPERSET_URL}/api/v1/security/csrf_token/")
if csrf.status_code == 200:
    session.headers.update({"X-CSRFToken": csrf.json().get("result", "")})

# --- Récupérer tous les dashboards ---
all_dashboards = []
for page in range(10):
    resp = session.get(f"{SUPERSET_URL}/api/v1/dashboard/",
                       params={"q": f"(page:{page},page_size:50)"})
    if resp.status_code != 200:
        break
    items = resp.json().get("result", [])
    if not items:
        break
    all_dashboards.extend(items)
    if len(items) < 50:
        break

print(f"\n{len(all_dashboards)} dashboard(s) trouvé(s)\n")

ok = 0
for d in all_dashboards:
    did   = d["id"]
    title = d.get("dashboard_title", "?")

    r = session.put(
        f"{SUPERSET_URL}/api/v1/dashboard/{did}",
        json={"published": True, "roles": target_roles},
        headers={"Content-Type": "application/json"}
    )
    if r.status_code in (200, 201):
        print(f"  ✓ {title}")
        ok += 1
    else:
        print(f"  ✗ {title} — {r.status_code}: {r.text[:100]}")

print(f"""
✓ {ok} dashboard(s) partagés avec HR_Admin, Manager, Employee

Test maintenant :
  1. http://localhost:8088
  2. Se connecter avec employee.test / Employee2026!
  3. Aller dans Dashboards → tu vois les {ok} dashboards
""")
