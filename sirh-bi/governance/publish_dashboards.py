"""Publie tous les dashboards Superset (Draft → Published)."""
import requests

SUPERSET_URL = "http://localhost:8088"

# Login
r = requests.post(f"{SUPERSET_URL}/api/v1/security/login",
    json={"username": "admin", "password": "admin", "provider": "db"},
    headers={"Content-Type": "application/json"})
token = r.json()["access_token"]
session = requests.Session()
session.headers.update({"Authorization": f"Bearer {token}"})

csrf = session.get(f"{SUPERSET_URL}/api/v1/security/csrf_token/")
if csrf.status_code == 200:
    session.headers.update({"X-CSRFToken": csrf.json().get("result", "")})

# Récupérer tous les dashboards
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

print(f"{len(all_dashboards)} dashboards trouvés\n")

published = 0
already   = 0

for d in all_dashboards:
    did    = d["id"]
    title  = d.get("dashboard_title", "?")
    status = d.get("status", "")

    if status == "published":
        print(f"  ✓ déjà publié : {title}")
        already += 1
    else:
        r = session.put(
            f"{SUPERSET_URL}/api/v1/dashboard/{did}",
            json={"published": True},
            headers={"Content-Type": "application/json"}
        )
        if r.status_code in (200, 201):
            print(f"  → publié : {title}")
            published += 1
        else:
            print(f"  ✗ erreur {r.status_code} : {title}")

print(f"\n✓ {published} dashboard(s) publiés, {already} déjà publiés")
print("Tester maintenant avec employee.test / Employee2026! → http://localhost:8088")
