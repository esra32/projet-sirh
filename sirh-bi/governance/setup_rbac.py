"""
=============================================================================
SIRH BI — 1.6.1 : Configuration RBAC Superset
=============================================================================
Crée les rôles HR_Admin / Manager / Employee et les utilisateurs de test
directement via l'API Python interne de Superset (docker exec).

Rôles créés :
  HR_Admin  → permissions copiées depuis Alpha
  Manager   → permissions copiées depuis Gamma  (+ RLS dept via setup_rls.py)
  Employee  → permissions copiées depuis Gamma  (lecture seule)

Utilisateurs de test :
  hr.admin@sirh.com      / HrAdmin2026!   → HR_Admin
  manager.info@sirh.com  / Manager2026!   → Manager
  employee.test@sirh.com / Employee2026!  → Employee

Usage :
    python governance/setup_rbac.py

Prérequis :
    Docker + container superset-sirh en état "healthy"
    (docker compose -f docker-compose.superset.yml up -d)
=============================================================================
"""

import subprocess
import sys
from datetime import datetime

CONTAINER = "superset-sirh"

# Script Python exécuté à l'intérieur du container Superset
_INNER_SCRIPT = r"""
import sys
from superset import create_app

app = create_app()
with app.app_context():
    sm  = app.appbuilder.sm
    from superset.extensions import db

    # ── Rôles ──────────────────────────────────────────────────────────────
    roles_config = [
        ('HR_Admin',  'Alpha'),
        ('Manager',   'Gamma'),
        ('Employee',  'Gamma'),
    ]

    role_ids = {}
    for role_name, template_name in roles_config:
        template = sm.find_role(template_name)
        existing = sm.find_role(role_name)
        if existing:
            print(f'ROLE_EXISTS:{role_name}:{existing.id}')
            role_ids[role_name] = existing.id
        else:
            role = sm.add_role(role_name)
            if template:
                for perm in template.permissions:
                    sm.add_permission_role(role, perm)
                db.session.commit()
            role_ids[role_name] = role.id
            nb = len(template.permissions) if template else 0
            print(f'ROLE_CREATED:{role_name}:{role.id}:{nb}')

    # ── Utilisateurs ───────────────────────────────────────────────────────
    users_config = [
        ('hr.admin',      'Hassan', 'Alaoui',  'hr.admin@sirh.com',      'HrAdmin2026!',  'HR_Admin'),
        ('manager.info',  'Karim',  'Benali',  'manager.info@sirh.com',  'Manager2026!',  'Manager'),
        ('employee.test', 'Sara',   'Chraibi', 'employee.test@sirh.com', 'Employee2026!', 'Employee'),
    ]

    for username, first, last, email, password, role_name in users_config:
        role    = sm.find_role(role_name)
        existing = sm.find_user(username=username)
        if existing:
            # Mettre à jour le rôle si besoin
            existing.roles = [role]
            db.session.commit()
            print(f'USER_UPDATED:{username}:{role_name}')
        else:
            user = sm.add_user(username, first, last, email, [role], password)
            if user:
                print(f'USER_CREATED:{username}:{email}:{role_name}')
            else:
                print(f'USER_FAILED:{username}')

    print('DONE')
"""


def run_in_container(script_code):
    """Exécute du code Python à l'intérieur du container Superset."""
    result = subprocess.run(
        ['docker', 'exec', '-i', CONTAINER, 'python', '-c', script_code],
        capture_output=True,
        text=True,
        encoding='utf-8',
        timeout=120,
    )
    return result.returncode, result.stdout, result.stderr


def check_container():
    """Vérifie que le container Superset est accessible."""
    r = subprocess.run(
        ['docker', 'inspect', '--format', '{{.State.Status}}', CONTAINER],
        capture_output=True, text=True
    )
    if r.returncode != 0 or 'running' not in r.stdout:
        return False
    return True


# =============================================================================
# MAIN
# =============================================================================

print("=" * 65)
print("  SIRH BI — 1.6.1 : Configuration RBAC Superset")
print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 65)

# Vérification du container
print(f"\n[0] Vérification du container '{CONTAINER}'...")
if not check_container():
    print(f"  ✗ Container '{CONTAINER}' non trouvé ou arrêté.")
    print("    Lancer : docker compose -f docker-compose.superset.yml up -d")
    sys.exit(1)
print("  ✓ Container accessible")

# Exécution du script interne
print("\n[1] Configuration des rôles et utilisateurs...")
code, stdout, stderr = run_in_container(_INNER_SCRIPT)

if code != 0:
    print(f"  ✗ Erreur dans le container (code {code})")
    if stderr:
        print(f"    STDERR:\n{stderr[:400]}")
    if stdout:
        print(f"    STDOUT:\n{stdout[:400]}")
    sys.exit(1)

# Afficher les résultats ligne par ligne
print()
roles_ok = []
users_ok = []

for line in stdout.strip().splitlines():
    line = line.strip()
    if not line:
        continue

    if line.startswith('ROLE_EXISTS:'):
        _, name, rid = line.split(':', 2)
        print(f"  ↻  Rôle '{name}' existe déjà (id={rid})")
        roles_ok.append(name)

    elif line.startswith('ROLE_CREATED:'):
        parts = line.split(':')
        name, rid, nb = parts[1], parts[2], parts[3]
        print(f"  +  Rôle '{name}' créé (id={rid}) — {nb} permissions copiées")
        roles_ok.append(name)

    elif line.startswith('USER_CREATED:'):
        _, uname, email, role = line.split(':', 3)
        print(f"  +  Utilisateur '{uname}' ({email}) → {role}")
        users_ok.append(uname)

    elif line.startswith('USER_UPDATED:'):
        _, uname, role = line.split(':', 2)
        print(f"  ↻  Utilisateur '{uname}' mis à jour → {role}")
        users_ok.append(uname)

    elif line.startswith('USER_FAILED:'):
        _, uname = line.split(':', 1)
        print(f"  ✗  Échec création '{uname}'")

    elif line == 'DONE':
        pass

    elif stderr and 'WARNING' not in line and 'INFO' not in line:
        pass  # ignorer les logs Flask/SQLAlchemy

# Résumé
print(f"""
{'=' * 65}
  RÉSUMÉ — RBAC Superset
{'=' * 65}

  Rôles configurés  : {', '.join(roles_ok) if roles_ok else 'aucun'}
  Utilisateurs      : {len(users_ok)} compte(s)

  Comptes de test :
    hr.admin       / HrAdmin2026!   → HR_Admin
    manager.info   / Manager2026!   → Manager
    employee.test  / Employee2026!  → Employee

  Test :
    Ouvrir http://localhost:8088
    Se connecter avec chaque compte pour vérifier les accès

  Prochaine étape :
    python governance/setup_rls.py
{'=' * 65}
""")
