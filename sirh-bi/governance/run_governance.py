"""
=============================================================================
SIRH BI — 1.6 : Exécution complète de la Gouvernance
=============================================================================
Lance les 3 scripts de gouvernance dans l'ordre :
    1. setup_rbac.py      — Rôles & utilisateurs Superset
    2. setup_rls.py       — Row-Level Security
    3. metrics_catalog.py — Catalogue des métriques (MySQL)

Usage :
    python governance/run_governance.py

Prérequis :
    - Superset tournant sur http://localhost:8088
    - MySQL sirh_dwh accessible sur localhost:3306
    - pip install requests
=============================================================================
"""

import subprocess
import sys
from datetime import datetime
from pathlib import Path

SCRIPTS = [
    ("1.6.1 — RBAC Superset",         "governance/setup_rbac.py"),
    ("1.6.2 — Row-Level Security",     "governance/setup_rls.py"),
    ("1.6.3 — Catalogue des métriques","governance/metrics_catalog.py"),
]

ROOT = Path(__file__).parent.parent  # dossier sirh-bi

print("=" * 65)
print("  SIRH BI — 1.6 : Gouvernance complète")
print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 65)

results = []

for label, script_path in SCRIPTS:
    print(f"\n{'─' * 65}")
    print(f"  [{label}]")
    print(f"{'─' * 65}")

    result = subprocess.run(
        [sys.executable, ROOT / script_path],
        cwd=ROOT,
        capture_output=False,
    )
    success = result.returncode == 0
    results.append((label, success))

# Résumé final
print(f"\n{'=' * 65}")
print("  BILAN GOUVERNANCE")
print(f"{'=' * 65}")
all_ok = True
for label, ok in results:
    status = "✓" if ok else "✗"
    print(f"  {status}  {label}")
    if not ok:
        all_ok = False

if all_ok:
    print("""
  Tout configuré avec succès !

  Prochaines étapes :
    1. Tester les rôles dans Superset (http://localhost:8088)
       - Connexion admin         → voit tout
       - Connexion manager.info  → voit seulement Informatique
       - Connexion employee.test → dashboards partagés uniquement

    2. Vérifier le catalogue dans MySQL :
       SELECT code, nom, categorie FROM sirh_dwh.bi_metrics_catalog;

    3. Ajouter le dashboard "Catalogue BI" dans Superset
       (voir docs/bi_documentation.md section 7.3)
    """)
else:
    print("\n  Certains scripts ont échoué — vérifiez les logs ci-dessus.")

print("=" * 65)
