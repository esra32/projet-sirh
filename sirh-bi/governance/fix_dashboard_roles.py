"""
Assigne directement les rôles aux dashboards via SQLAlchemy interne Superset.
Plus fiable que l'API REST pour cette opération.
"""
import subprocess

CONTAINER = "superset-sirh"

_SCRIPT = """
from superset import create_app
app = create_app()
with app.app_context():
    from superset.extensions import db
    from superset.models.dashboard import Dashboard
    from flask_appbuilder.security.sqla.models import Role

    sm = app.appbuilder.sm

    # Récupérer les rôles à assigner
    role_names = ['HR_Admin', 'Manager', 'Employee', 'Alpha', 'Admin']
    roles = []
    for name in role_names:
        r = sm.find_role(name)
        if r:
            roles.append(r)
            print(f'  Role trouvé : {name} (id={r.id})')

    # Assigner à tous les dashboards
    dashboards = db.session.query(Dashboard).all()
    print(f'\\n  {len(dashboards)} dashboard(s) à mettre à jour...')

    for d in dashboards:
        d.roles = roles
        print(f'  ✓ {d.dashboard_title}')

    db.session.commit()
    print(f'\\nDONE:{len(dashboards)}')
"""

print("Assignation des rôles aux dashboards (via container)...")
result = subprocess.run(
    ['docker', 'exec', '-i', CONTAINER, 'python', '-c', _SCRIPT],
    capture_output=True, text=True, encoding='utf-8', timeout=60
)

for line in result.stdout.splitlines():
    if line.strip():
        print(line)

if result.returncode != 0 and result.stderr:
    print(f"Erreur : {result.stderr[:300]}")

if 'DONE' in result.stdout:
    print("""
Terminé. Maintenant :
  1. http://localhost:8088
  2. Se connecter : employee.test / Employee2026!
  3. Dashboards → tu dois voir les 5 dashboards
""")
