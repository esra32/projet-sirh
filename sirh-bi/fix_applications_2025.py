"""
fix_applications_2025.py
Ajoute ~100 candidatures pour 2025 afin d'aligner le volume
sur les années précédentes (~200/an). Ne touche pas aux autres années.
Après exécution : relancer extract_staging.py puis dbt run.
"""

import uuid
import json
import random
from datetime import date
from faker import Faker
import sqlalchemy as sa

fake = Faker('fr_FR')
random.seed(99)

engine_emp = sa.create_engine("mysql+pymysql://root:root@localhost/sirh_employee", echo=False)
engine_rec = sa.create_engine("mysql+pymysql://root:root@localhost/sirh_recruitment", echo=False)

# ── Lire les données existantes ──────────────────────────────────
with engine_emp.connect() as conn:
    all_emails = [r[0] for r in conn.execute(sa.text("SELECT email FROM employees")).fetchall()]

with engine_rec.connect() as conn:
    offer_ids = [r[0] for r in conn.execute(sa.text("SELECT id FROM job_offers")).fetchall()]
    existing_pairs = set(
        (r[0], r[1]) for r in conn.execute(
            sa.text("SELECT applicant_email, job_offer_id FROM applications")
        ).fetchall()
    )

print(f"  Emails disponibles : {len(all_emails)}")
print(f"  Offres disponibles : {len(offer_ids)}")
print(f"  Paires existantes  : {len(existing_pairs)}")

# ── Fonctions utilitaires ────────────────────────────────────────
APP_STATUSES = ['PENDING', 'REVIEWING', 'INTERVIEW_SCHEDULED', 'ACCEPTED', 'REJECTED']

def pick_status(score):
    if score >= 80:
        return random.choices(APP_STATUSES, weights=[5, 10, 30, 40, 15], k=1)[0]
    elif score >= 55:
        return random.choices(APP_STATUSES, weights=[10, 25, 25, 20, 20], k=1)[0]
    else:
        return random.choices(APP_STATUSES, weights=[15, 20, 10, 5, 50], k=1)[0]

def fake_profile_json(score):
    niveaux = ['Junior', 'Intermédiaire', 'Senior', 'Expert']
    niveau  = niveaux[min(score // 25, 3)]
    return json.dumps({
        "competences":      random.sample(
            ['Python', 'SQL', 'Angular', 'Docker', 'Java', 'Git', 'Linux', 'React'], k=random.randint(2, 4)
        ),
        "anneesExperience": max(0, round((score - 30) / 10)),
        "niveau":           niveau,
        "formation":        random.choice(['Bac+3', 'Bac+5', 'Master', 'Ingénieur']),
        "langues":          random.sample(['Français', 'Anglais', 'Arabe'], k=random.randint(1, 3)),
        "resumeProfil":     fake.sentence(nb_words=12),
    }, ensure_ascii=False)

# ── Générer ~100 candidatures sur les 12 mois de 2025 ───────────
# Répartition cible : ~8-9 par mois pour atteindre ~200 total
MOIS_CIBLES = {1:8, 2:9, 3:9, 4:9, 5:9, 6:8, 7:9, 8:9, 9:9, 10:8, 11:8, 12:10}

new_apps   = []
used_pairs = set(existing_pairs)
attempts   = 0

for mois, nb_cible in MOIS_CIBLES.items():
    ajouts = 0
    while ajouts < nb_cible and attempts < 10000:
        attempts += 1
        email    = random.choice(all_emails)
        offer_id = random.choice(offer_ids)
        pair     = (email, offer_id)
        if pair in used_pairs:
            continue
        used_pairs.add(pair)

        app_id   = str(uuid.uuid4())
        jour     = random.randint(1, 28)
        app_date = date(2025, mois, jour)
        score    = int(max(10, min(100, random.gauss(62, 18))))
        source   = random.choices(['INTERNAL', 'EXTERNAL'], weights=[85, 15], k=1)[0]

        new_apps.append({
            "id":                          app_id,
            "applicant_email":             email,
            "applicant_name":              fake.name(),
            "applied_date":                app_date,
            "cover_letter":                fake.paragraph(nb_sentences=3),
            "cv_url":                      f"https://cv.sirh.internal/{app_id[:8]}.pdf",
            "cv_file":                     None,
            "cv_file_name":                f"cv_{app_id[:8]}.pdf",
            "letter_motivation_pdf":       None,
            "letter_motivation_file_name": f"lettre_{app_id[:8]}.pdf",
            "status":                      pick_status(score),
            "match_score":                 score,
            "candidate_profile_json":      fake_profile_json(score),
            "job_offer_id":                offer_id,
            "source":                      source,
        })
        ajouts += 1

print(f"\n  Candidatures à insérer : {len(new_apps)}")

# ── Insertion ────────────────────────────────────────────────────
with engine_rec.connect() as conn:
    for i in range(0, len(new_apps), 50):
        conn.execute(sa.text("""
            INSERT INTO applications
                (id, applicant_email, applicant_name, applied_date,
                 cover_letter, cv_url, cv_file, cv_file_name,
                 letter_motivation_pdf, letter_motivation_file_name,
                 status, match_score, candidate_profile_json, job_offer_id, source)
            VALUES
                (:id, :applicant_email, :applicant_name, :applied_date,
                 :cover_letter, :cv_url, :cv_file, :cv_file_name,
                 :letter_motivation_pdf, :letter_motivation_file_name,
                 :status, :match_score, :candidate_profile_json, :job_offer_id, :source)
        """), new_apps[i:i+50])
    conn.commit()

# ── Vérification ─────────────────────────────────────────────────
with engine_rec.connect() as conn:
    total = conn.execute(sa.text("SELECT COUNT(*) FROM applications WHERE YEAR(applied_date) = 2025")).scalar()
    print(f"  Total 2025 après fix : {total}")
    rows = conn.execute(sa.text("""
        SELECT MONTH(applied_date) AS mois, COUNT(*) AS nb
        FROM applications
        WHERE YEAR(applied_date) = 2025
        GROUP BY MONTH(applied_date)
        ORDER BY mois
    """)).fetchall()
    print("\n  Répartition 2025 :")
    for r in rows:
        print(f"    Mois {r[0]:02d} : {r[1]}")

print("\n✅ Fix terminé. Lance maintenant :")
print("   python extract/extract_staging.py")
print("   cd dbt_sirh && dbt run --profiles-dir .. --log-path logs_tmp")
