"""
fix_autre_skills.py
Ajoute Google Ads, HubSpot, Linux, SEO a ~60 offres differentes
pour que nb_offres_requierent soit realiste (~60) et le taux < 120%.
"""
import uuid
import sqlalchemy as sa

TARGET_SKILLS = {
    'd1677618-c6e3-45b0-b96f-61630ebc1b13': ('Google Ads', 60),
    'ea78ddc0-f12d-4b58-b941-6ed8767b14f7': ('HubSpot',    60),
    '605f9081-bc21-48fc-bc1d-0094d490a59e': ('Linux',       65),
    '34cc0b62-4108-41fc-a823-cfa2a08baa8b': ('SEO',         55),
}

eng = sa.create_engine('mysql+pymysql://root:root@localhost/sirh_recruitment', echo=False)

with eng.connect() as conn:
    # Une application par offre (pour maximiser la diversite des offres)
    apps = conn.execute(sa.text("""
        SELECT MIN(id) AS id, job_offer_id
        FROM applications
        GROUP BY job_offer_id
        ORDER BY MIN(applied_date)
    """)).fetchall()

    for skill_id, (name, target) in TARGET_SKILLS.items():
        # IDs d applications qui ont deja ce skill
        existing = set(
            r[0] for r in conn.execute(sa.text(
                "SELECT application_id FROM application_skills WHERE skill_id = :s"
            ), {"s": skill_id}).fetchall()
        )

        new_rows = []
        for app_id, offer_id in apps:
            if len(new_rows) >= target:
                break
            if app_id not in existing:
                new_rows.append({"application_id": app_id, "skill_id": skill_id})
                existing.add(app_id)

        for i in range(0, len(new_rows), 50):
            conn.execute(sa.text(
                "INSERT INTO application_skills (application_id, skill_id) VALUES (:application_id, :skill_id)"
            ), new_rows[i:i+50])

        print(f"  {name}: +{len(new_rows)} enregistrements")

    conn.commit()

print("\nVerification:")
with eng.connect() as conn:
    for skill_id, (name, _) in TARGET_SKILLS.items():
        nb = conn.execute(sa.text(
            "SELECT COUNT(*) FROM application_skills WHERE skill_id = :s"
        ), {"s": skill_id}).scalar()
        print(f"  {name}: {nb} application_skills total")
