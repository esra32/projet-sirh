import sqlalchemy as sa
from collections import defaultdict

engine = sa.create_engine("mysql+pymysql://root:root@localhost/sirh_employee")

with engine.connect() as conn:
    emps = conn.execute(sa.text("""
        SELECT id, department_id, manager_id
        FROM employees
        ORDER BY department_id, hire_date
    """)).fetchall()

    by_dept = defaultdict(list)
    for emp in emps:
        by_dept[emp.department_id].append(emp)

    updates = []
    for dept_id, dept_emps in by_dept.items():
        directeur = dept_emps[0]
        managers = dept_emps[1:6] if len(dept_emps) > 1 else []

        for mgr in managers:
            if mgr.manager_id is None:
                updates.append({"emp_id": mgr.id, "mgr_id": directeur.id})

        employes = dept_emps[6:] if len(dept_emps) > 6 else []
        for i, emp in enumerate(employes):
            if emp.manager_id is None and managers:
                mgr = managers[i % len(managers)]
                updates.append({"emp_id": emp.id, "mgr_id": mgr.id})

    for u in updates:
        conn.execute(sa.text(
            "UPDATE employees SET manager_id = :mgr WHERE id = :emp AND manager_id IS NULL"
        ), {"mgr": u["mgr_id"], "emp": u["emp_id"]})

    conn.commit()
    print(f"✓ {len(updates)} managers assignés")

    result = conn.execute(sa.text(
        "SELECT COUNT(*) FROM employees WHERE manager_id IS NULL"
    )).scalar()
    print(f"✓ Employés sans manager (directeurs) : {result}")