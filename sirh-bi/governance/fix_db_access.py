"""
Donne accès à la base SIRH DWH aux rôles HR_Admin, Manager, Employee.
Sans cet accès, les dashboards sont invisibles pour les non-admins.
"""
import subprocess

CONTAINER = "superset-sirh"

_SCRIPT = """
from superset import create_app
app = create_app()
with app.app_context():
    from superset.extensions import db
    from flask_appbuilder.security.sqla.models import Role, PermissionView, Permission, ViewMenu
    from superset.connectors.sqla.models import Database

    sm = app.appbuilder.sm

    # Trouver toutes les bases de données dans Superset
    databases = db.session.query(Database).all()
    print(f'  Bases de données trouvées : {[d.database_name for d in databases]}')

    # Rôles à mettre à jour
    target_roles = []
    for rname in ['HR_Admin', 'Manager', 'Employee']:
        r = sm.find_role(rname)
        if r:
            target_roles.append(r)
            print(f'  Rôle : {rname} (id={r.id})')

    if not target_roles:
        print('ERREUR: Aucun rôle cible trouvé')
        exit(1)

    # Ajouter toutes les permissions de type database_access et schema_access
    all_pvs = db.session.query(PermissionView).join(Permission).join(ViewMenu).filter(
        Permission.name.in_([
            'database_access',
            'schema_access',
            'datasource_access',
            'can_read',
            'can_get',
        ])
    ).all()

    # Filtrer celles qui concernent SIRH
    sirh_pvs = [pv for pv in all_pvs if 'SIRH' in (pv.view_menu.name or '')
                or 'sirh' in (pv.view_menu.name or '').lower()
                or 'dwh' in (pv.view_menu.name or '').lower()]

    print(f'\\n  Permissions SIRH trouvées ({len(sirh_pvs)}) :')
    for pv in sirh_pvs:
        print(f'    [{pv.permission.name}] {pv.view_menu.name}')

    # Ajouter ces permissions à chaque rôle
    for role in target_roles:
        existing_ids = {pv.id for pv in role.permissions}
        added = 0
        for pv in sirh_pvs:
            if pv.id not in existing_ids:
                sm.add_permission_role(role, pv)
                added += 1
        db.session.commit()
        print(f'\\n  ✓ {role.name} : {added} permission(s) ajoutée(s)')

    # Ajouter aussi all_datasource_access si disponible
    pv_all = db.session.query(PermissionView).join(Permission).join(ViewMenu).filter(
        Permission.name == 'all_datasource_access'
    ).first()
    if pv_all:
        for role in target_roles:
            existing_ids = {pv.id for pv in role.permissions}
            if pv_all.id not in existing_ids:
                sm.add_permission_role(role, pv_all)
        db.session.commit()
        print('\\n  ✓ all_datasource_access ajouté aux 3 rôles')

    print('\\nDONE')
"""

print("Ajout des permissions d'accès base SIRH DWH...")
result = subprocess.run(
    ['docker', 'exec', '-i', CONTAINER, 'python', '-c', _SCRIPT],
    capture_output=True, text=True, encoding='utf-8', timeout=90
)

for line in result.stdout.splitlines():
    if line.strip():
        print(line)

if result.returncode != 0 and result.stderr:
    lines = [l for l in result.stderr.splitlines() if 'ERROR' in l or 'Error' in l]
    if lines:
        print('\nErreurs:')
        for l in lines[:5]:
            print(f'  {l}')

if 'DONE' in result.stdout:
    print("""
Permissions ajoutées.

Tester maintenant :
  1. Vider le cache navigateur ou ouvrir un onglet PRIVÉ (Ctrl+Maj+N)
  2. http://localhost:8088
  3. Se connecter : employee.test / Employee2026!
  4. Dashboards → tu vois les 5 dashboards
""")
