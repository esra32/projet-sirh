"""Affiche tous les datasets Superset avec leurs vrais noms de table."""
import requests

SUPERSET_URL = "http://localhost:8088"

# Login
r = requests.post(f"{SUPERSET_URL}/api/v1/security/login",
    json={"username": "admin", "password": "admin", "provider": "db"},
    headers={"Content-Type": "application/json"})
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Récupérer TOUS les datasets (page 1 puis page 2 si nécessaire)
all_datasets = []
for page in range(5):
    resp = requests.get(
        f"{SUPERSET_URL}/api/v1/dataset/",
        params={"q": f"(page:{page},page_size:50)"},
        headers=headers
    )
    if resp.status_code != 200:
        break
    data = resp.json()
    items = data.get("result", [])
    if not items:
        break
    all_datasets.extend(items)
    if len(items) < 50:
        break

print(f"\n{len(all_datasets)} datasets trouvés dans Superset :\n")
print(f"{'ID':>4}  {'table_name':<40}  {'schema':<15}  {'database'}")
print("-" * 85)
for d in all_datasets:
    tid   = d.get("id", "?")
    tname = d.get("table_name", "") or ""
    schema = d.get("schema", "") or ""
    db    = d.get("database", {}).get("database_name", "") if d.get("database") else ""
    print(f"{tid:>4}  {tname:<40}  {schema:<15}  {db}")

print("\nRecherche des tables ML :")
ml_tables = ["ml_turnover_risk", "ml_employee_segments", "ml_high_potentials", "ml_retention_analysis"]
for ml in ml_tables:
    found = [d for d in all_datasets if ml in (d.get("table_name") or "")]
    if found:
        print(f"  ✓ {ml} → id={found[0]['id']}, table_name='{found[0]['table_name']}'")
    else:
        print(f"  ✗ {ml} → NON TROUVÉ dans l'API")
