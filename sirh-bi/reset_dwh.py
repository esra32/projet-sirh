"""
Supprime toutes les tables de sirh_dwh créées par create_databases.py
pour laisser dbt recréer le schéma sans conflits de clés étrangères.
dim_temps est conservée car elle est pré-peuplée et non gérée par dbt.
"""
import sqlalchemy as sa

engine = sa.create_engine("mysql+pymysql://root:root@localhost/sirh_dwh")

tables_to_drop = [
    "fait_competences",
    "fait_recrutement",
    "fait_effectifs",
    "dim_employe",
    "dim_offre",
    "dim_competence",
    "dim_departement",
    "dim_poste",
]

with engine.connect() as conn:
    conn.execute(sa.text("SET FOREIGN_KEY_CHECKS = 0"))
    for table in tables_to_drop:
        conn.execute(sa.text(f"DROP TABLE IF EXISTS `{table}`"))
        print(f"✓ {table} supprimée")
    conn.execute(sa.text("SET FOREIGN_KEY_CHECKS = 1"))
    conn.commit()

print("\n✅ sirh_dwh nettoyée — dim_temps conservée")
print("Lance maintenant : dbt run")