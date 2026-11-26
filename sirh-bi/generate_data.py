"""
generate_data.py — Version 2 complète pour PFE
Objectif : atteindre les minimums du cahier des charges
  - 1500 employés (ajouter 661)
  - 8 départements (ajouter 3)
  - 15 services (générer)
  - 200 offres (ajouter 150)
  - 800 candidatures (ajouter 503)
  - 200 départs simulés
  - Skills cohérentes par poste
"""

import os
import sys
import random
import json
from datetime import date, timedelta, datetime
from faker import Faker
import sqlalchemy as sa
import uuid

fake = Faker('fr_FR')
random.seed(42)

# ══════════════════════════════════════════════════════════════
# CONNEXIONS
# ══════════════════════════════════════════════════════════════
engine_emp = sa.create_engine("mysql+pymysql://root:root@localhost/sirh_employee", echo=False)
engine_rec = sa.create_engine("mysql+pymysql://root:root@localhost/sirh_recruitment", echo=False)

print("=" * 55)
print("  GÉNÉRATION DONNÉES PFE — VERSION 2")
print("=" * 55)

# ══════════════════════════════════════════════════════════════
# ÉTAPE 0 — LIRE L'EXISTANT
# ══════════════════════════════════════════════════════════════
with engine_emp.connect() as conn:
    depts     = {r[1]: r[0] for r in conn.execute(sa.text("SELECT id, name FROM departments")).fetchall()}
    positions = {r[1]: r[0] for r in conn.execute(sa.text("SELECT id, title FROM positions")).fetchall()}
    nb_emp_avant = conn.execute(sa.text("SELECT COUNT(*) FROM employees")).scalar()

with engine_rec.connect() as conn:
    skills_map = {r[1]: r[0] for r in conn.execute(sa.text("SELECT id, name FROM skills")).fetchall()}
    existing_offers = [r[0] for r in conn.execute(sa.text("SELECT id FROM job_offers")).fetchall()]
    nb_apps_avant = conn.execute(sa.text("SELECT COUNT(*) FROM applications")).scalar()

print(f"\n[AVANT]")
print(f"  Employés       : {nb_emp_avant}")
print(f"  Départements   : {len(depts)}")
print(f"  Postes         : {len(positions)}")
print(f"  Skills ref     : {len(skills_map)}")
print(f"  Offres         : {len(existing_offers)}")
print(f"  Candidatures   : {nb_apps_avant}")

# ══════════════════════════════════════════════════════════════
# ÉTAPE 1 — AJOUTER 3 DÉPARTEMENTS
# ══════════════════════════════════════════════════════════════
print("\n[1] Ajout départements...")

nouveaux_depts = [
    {"id": str(uuid.uuid4()), "name": "Finance & Contrôle de Gestion",
     "description": "Gestion financière, comptabilité et contrôle budgétaire."},
    {"id": str(uuid.uuid4()), "name": "Commercial & Ventes",
     "description": "Développement commercial, prospection et gestion clients."},
    {"id": str(uuid.uuid4()), "name": "Juridique & Conformité",
     "description": "Droit des affaires, conformité réglementaire et contrats."},
]

with engine_emp.connect() as conn:
    for d in nouveaux_depts:
        exists = conn.execute(sa.text(
            "SELECT COUNT(*) FROM departments WHERE name = :name"), {"name": d["name"]}
        ).scalar()
        if not exists:
            conn.execute(sa.text(
                "INSERT INTO departments (id, name, description) VALUES (:id, :name, :description)"
            ), d)
    conn.commit()

with engine_emp.connect() as conn:
    depts = {r[1]: r[0] for r in conn.execute(sa.text("SELECT id, name FROM departments")).fetchall()}

print(f"  ✓ Départements total : {len(depts)}")

# ══════════════════════════════════════════════════════════════
# ÉTAPE 2 — GÉNÉRER 15 SERVICES
# ══════════════════════════════════════════════════════════════
print("\n[2] Génération services...")

services_data = [
    ("Service Développement Backend",    list(depts.values())[0]),
    ("Service Développement Frontend",   list(depts.values())[0]),
    ("Service Infrastructure Cloud",     list(depts.values())[0]),
    ("Service Cybersécurité",            list(depts.values())[0]),
    ("Service Data Engineering",         list(depts.values())[1] if len(depts) > 1 else list(depts.values())[0]),
    ("Service Data Science & ML",        list(depts.values())[1] if len(depts) > 1 else list(depts.values())[0]),
    ("Service Business Intelligence",    list(depts.values())[1] if len(depts) > 1 else list(depts.values())[0]),
    ("Service Recrutement",              list(depts.values())[2] if len(depts) > 2 else list(depts.values())[0]),
    ("Service Formation & Développement",list(depts.values())[2] if len(depts) > 2 else list(depts.values())[0]),
    ("Service Paie & Administration RH", list(depts.values())[2] if len(depts) > 2 else list(depts.values())[0]),
    ("Service Marketing Digital",        list(depts.values())[3] if len(depts) > 3 else list(depts.values())[0]),
    ("Service Communication",            list(depts.values())[3] if len(depts) > 3 else list(depts.values())[0]),
    ("Service Comptabilité",             list(depts.values())[4] if len(depts) > 4 else list(depts.values())[0]),
    ("Service Commercial",               list(depts.values())[5] if len(depts) > 5 else list(depts.values())[0]),
    ("Service Juridique",                list(depts.values())[6] if len(depts) > 6 else list(depts.values())[0]),
]

with engine_emp.connect() as conn:
    nb_services = conn.execute(sa.text("SELECT COUNT(*) FROM services")).scalar()
    if nb_services == 0:
        for nom, dept_id in services_data:
            conn.execute(sa.text(
                "INSERT INTO services (id, name, department_id) VALUES (:id, :name, :dept_id)"
            ), {"id": str(uuid.uuid4()), "name": nom, "dept_id": dept_id})
        conn.commit()
        print(f"  ✓ {len(services_data)} services créés")
    else:
        print(f"  ✓ Services déjà existants : {nb_services}")

with engine_emp.connect() as conn:
    service_ids = [r[0] for r in conn.execute(sa.text("SELECT id FROM services")).fetchall()]

# ══════════════════════════════════════════════════════════════
# ÉTAPE 3 — MAPPING POSTES → SKILLS COHÉRENTES
# ══════════════════════════════════════════════════════════════
skill_ids = list(skills_map.values())
skill_names = list(skills_map.keys())

# Mapping poste → liste de skills cohérentes
POSTE_SKILLS = {
    "Développeur Backend Senior":    ["Python", "Java", "SQL", "Git", "Rest api", "Docker"],
    "Développeur Frontend Senior":   ["Angular", "Typescript", "Git", "Rest api", "Javascript"],
    "Développeur Fullstack":         ["Angular", "Java", "Python", "Sql", "Git", "Docker"],
    "Développeur Mobile":            ["Typescript", "Git", "Rest api", "Javascript"],
    "Développeur Junior":            ["Python", "Git", "Sql", "Javascript"],
    "DevOps Engineer":               ["Docker", "Kubernetes", "Linux", "Terraform", "Git", "Ansible"],
    "Cloud Engineer":                ["Docker", "Kubernetes", "Linux", "Terraform", "Ansible"],
    "Ingénieur Cybersécurité":       ["Linux", "Python", "Git", "Rest api"],
    "Architecte Solution":           ["Java", "Docker", "Kubernetes", "Rest api", "Git"],
    "Ingénieur QA":                  ["Python", "Git", "Sql", "Selenium"],
    "Data Engineer":                 ["Python", "Sql", "Spark", "Docker", "Airflow", "Etl"],
    "Data Scientist":                ["Python", "Statistiques", "Sql", "Analytics", "Spark"],
    "Développeur BI":                ["Sql", "Python", "Analytics", "Etl", "Postgresql"],
    "Data Analyst":                  ["Sql", "Python", "Analytics", "Statistiques", "Postgresql"],
    "Ingénieur ML":                  ["Python", "Statistiques", "Spark", "Analytics", "Docker"],
    "Manager Data":                  ["Python", "Sql", "Analytics", "Statistiques"],
    "Product Owner":                 ["Jira", "Git", "Analytics", "Rest api"],
    "Manager Technique":             ["Git", "Docker", "Java", "Python"],
    "Fullstack DevOps":              ["Docker", "Kubernetes", "Angular", "Python", "Git"],
    "Responsable Marketing":         ["Analytics", "Seo", "Google ads"],
    "Chargé Marketing Digital":      ["Analytics", "Seo", "Google ads"],
    "Community Manager":             ["Analytics", "Canva"],
    "Content Manager":               ["Analytics", "Seo"],
    "Chef de Projet Digital":        ["Analytics", "Jira", "Git"],
    "Chargé de Communication":       ["Canva", "Analytics"],
    "Graphiste":                     ["Canva", "Photoshop", "Figma"],
    "UI/UX Designer":                ["Figma", "Canva", "Photoshop"],
    "Chargé RH":                     ["Sql", "Excel", "Analytics"],
    "HRBP":                          ["Sql", "Analytics", "Excel"],
    "Gestionnaire Paie":             ["Sql", "Excel"],
    "Responsable Formation":         ["Analytics", "Excel"],
    "Administrateur RH":             ["Sql", "Excel"],
}

def get_skills_for_poste(titre_poste: str) -> list:
    """Retourne des skill_ids cohérents pour un poste donné."""
    for poste_key, skill_list in POSTE_SKILLS.items():
        if poste_key.lower() in titre_poste.lower() or titre_poste.lower() in poste_key.lower():
            matched_ids = []
            for sk_name in skill_list:
                for db_name, db_id in skills_map.items():
                    if sk_name.lower() in db_name.lower() or db_name.lower() in sk_name.lower():
                        matched_ids.append(db_id)
                        break
            if len(matched_ids) >= 2:
                nb = random.randint(2, min(5, len(matched_ids)))
                return random.sample(matched_ids, nb)
    # Fallback : skills aléatoires
    nb = random.randint(2, min(4, len(skill_ids)))
    return random.sample(skill_ids, nb)
# ══════════════════════════════════════════════════════════════
# ÉTAPE 4 — GÉNÉRER 661 EMPLOYÉS (pour atteindre 1500)
# ══════════════════════════════════════════════════════════════
print("\n[3] Génération 661 employés avec skills cohérentes...")

NB_A_AJOUTER = 1500 - nb_emp_avant
if NB_A_AJOUTER <= 0:
    print(f"  ✓ Déjà {nb_emp_avant} employés — rien à ajouter")
else:
    dept_ids   = list(depts.values())
    pos_items  = list(positions.items())  # (titre, id)

    # FIX P2 : contrat_weights retiré — le contrat dépend maintenant de l'ancienneté
    # pour garantir la cohérence métier : STAGE ≤ 6 mois, ALTERNANCE ≤ 24 mois, CDD ≤ 30 mois

    new_employees    = []
    new_emp_skills   = []

    today = date.today()

    for _ in range(NB_A_AJOUTER):
        emp_id    = str(uuid.uuid4())
        pos_titre, pos_id = random.choice(pos_items)
        hire_date = fake.date_between(start_date=date(2014, 1, 1), end_date=date(2025, 12, 1))

        # FIX P2 : calcul de l'ancienneté effective pour contraindre le contrat
        anciennete_mois = max(0, (today - hire_date).days // 30)

        # FIX P2 : distribution réaliste basée sur l'ancienneté
        if anciennete_mois <= 6:
            # Récent : tous types possibles, dont STAGE
            ct_pool = ['CDI']*35 + ['CDD']*20 + ['STAGE']*28 + ['FREELANCE']*12 + ['ALTERNANCE']*5
        elif anciennete_mois <= 24:
            # Entre 6 et 24 mois : STAGE improbable, ALTERNANCE encore possible
            ct_pool = ['CDI']*50 + ['CDD']*25 + ['FREELANCE']*18 + ['ALTERNANCE']*7
        elif anciennete_mois <= 30:
            # Entre 24 et 30 mois : plus d'ALTERNANCE, CDD encore possible
            ct_pool = ['CDI']*65 + ['CDD']*15 + ['FREELANCE']*20
        else:
            # > 30 mois : uniquement CDI ou FREELANCE
            ct_pool = ['CDI']*80 + ['FREELANCE']*20

        new_employees.append({
            "id":            emp_id,
            "first_name":    fake.first_name(),
            "last_name":     fake.last_name(),
            "email":         fake.unique.email(),
            "phone":         fake.phone_number()[:20],
            "hire_date":     hire_date,
            "contract_type": random.choice(ct_pool),
            "department_id": random.choice(dept_ids),
            "position_id":   pos_id,
        })

        for sk_id in get_skills_for_poste(pos_titre):
            new_emp_skills.append({
                "id":          str(uuid.uuid4()),
                "employee_id": emp_id,
                "skill_name":  next((n for n, i in skills_map.items() if i == sk_id), "Unknown"),
                "level":       random.choice(["DEBUTANT", "INTERMEDIAIRE", "AVANCE", "EXPERT"]),
            })

    # Insertion par batch de 200
    BATCH = 200
    with engine_emp.connect() as conn:
        for i in range(0, len(new_employees), BATCH):
            conn.execute(sa.text("""
                INSERT INTO employees
                    (id, first_name, last_name, email, phone,
                     hire_date, contract_type, department_id, position_id)
                VALUES
                    (:id, :first_name, :last_name, :email, :phone,
                     :hire_date, :contract_type, :department_id, :position_id)
            """), new_employees[i:i+BATCH])
        conn.commit()

    with engine_emp.connect() as conn:
        for i in range(0, len(new_emp_skills), BATCH):
            conn.execute(sa.text("""
                INSERT INTO employee_skills (id, employee_id, skill_name, level)
                VALUES (:id, :employee_id, :skill_name, :level)
            """), new_emp_skills[i:i+BATCH])
        conn.commit()

    print(f"  ✓ {len(new_employees)} employés insérés")
    print(f"  ✓ {len(new_emp_skills)} employee_skills insérées")

# ══════════════════════════════════════════════════════════════
# ÉTAPE 5 — SIMULER LES DÉPARTS (signal aligné modèle ML)
# ══════════════════════════════════════════════════════════════
# La sélection des partants est déléguée à ml/generate_departures.py :
# départs biaisés par salaire/contrat/ancienneté (source unique de vérité),
# au lieu d'un ORDER BY RAND(). Cela donne un is_parti apprenable par ML-1
# sans patch DWH (fix_dwh_is_parti.py est supprimé).
print("\n[4] Simulation des départs (signal aligné modèle)...")

import subprocess
_dep_script = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           'ml', 'generate_departures.py')
subprocess.run([sys.executable, _dep_script], check=True)

# ══════════════════════════════════════════════════════════════
# ÉTAPE 6 — GÉNÉRER 150 OFFRES D'EMPLOI SUPPLÉMENTAIRES
# ══════════════════════════════════════════════════════════════
print("\n[5] Génération 150 offres d'emploi...")

JOB_TITLES_BI = [
    'Data Engineer Senior',        'Data Scientist',
    'Développeur Backend Java',    'Développeur Frontend Angular',
    'DevOps Engineer',             'Architecte Cloud',
    'Business Intelligence Lead',  'Ingénieur ML',
    'Responsable RH',              'Chef de Projet Digital',
    'Développeur Fullstack',       'Product Owner',
    'Ingénieur Cybersécurité',     'Data Analyst',
    'Community Manager',           'Développeur Mobile',
    'Responsable Marketing',       'Consultant BI',
    'Architecte Solution',         'Manager Data',
]

DEPT_NAMES_ALL = list(depts.keys())
LOCATIONS      = ['Tunis', 'Sfax', 'Sousse', 'Remote', 'Monastir', 'Ariana', 'Ben Arous']
STATUS_WEIGHTS = ['PUBLISHED'] * 30 + ['CLOSED'] * 50 + ['DRAFT'] * 10 + ['PENDING_VALIDATION'] * 10

new_offers    = []
new_offer_ids = []

for _ in range(150):
    offer_id   = str(uuid.uuid4())
    pub_date   = fake.date_between(start_date=date(2021, 1, 1), end_date=date(2025, 6, 1))
    status     = random.choice(STATUS_WEIGHTS)
    created_dt = datetime.combine(pub_date, datetime.min.time())
    titre      = random.choice(JOB_TITLES_BI)

    new_offers.append({
        "id":             offer_id,
        "title":          titre,
        "description":    fake.paragraph(nb_sentences=5),
        "department":     random.choice(DEPT_NAMES_ALL),
        "location":       random.choice(LOCATIONS),
        "status":         status,
        "published_date": pub_date if status not in ['DRAFT'] else None,
        "deadline_date":  pub_date + timedelta(days=random.randint(20, 90)),
        "created_at":     created_dt,
        "updated_at":     created_dt + timedelta(days=random.randint(1, 30)),
    })
    new_offer_ids.append((offer_id, titre))

with engine_rec.connect() as conn:
    for i in range(0, len(new_offers), 100):
        conn.execute(sa.text("""
            INSERT INTO job_offers
                (id, title, description, department, location, status,
                 published_date, deadline_date, created_at, updated_at)
            VALUES
                (:id, :title, :description, :department, :location, :status,
                 :published_date, :deadline_date, :created_at, :updated_at)
        """), new_offers[i:i+100])
    conn.commit()

offer_skills_rows = []
for oid, titre in new_offer_ids:
    matched = get_skills_for_poste(titre)
    for sk_id in matched:
        offer_skills_rows.append({"job_offer_id": oid, "skill_id": sk_id})

with engine_rec.connect() as conn:
    if offer_skills_rows:
        conn.execute(sa.text(
            "INSERT IGNORE INTO job_offer_skills (job_offer_id, skill_id) VALUES (:job_offer_id, :skill_id)"
        ), offer_skills_rows)
        conn.commit()  

print(f"  ✓ {len(new_offers)} offres insérées")
print(f"  ✓ {len(offer_skills_rows)} liens offres↔skills insérés")

# ══════════════════════════════════════════════════════════════
# ÉTAPE 7 — GÉNÉRER 503 CANDIDATURES SUPPLÉMENTAIRES
# ══════════════════════════════════════════════════════════════
print("\n[6] Génération 503 candidatures...")

with engine_emp.connect() as conn:
    all_emails = [r[0] for r in conn.execute(sa.text("SELECT email FROM employees")).fetchall()]

with engine_rec.connect() as conn:
    all_offer_ids_final = [r[0] for r in conn.execute(sa.text("SELECT id FROM job_offers")).fetchall()]
    existing_pairs = set(
        (r[0], r[1]) for r in conn.execute(
            sa.text("SELECT applicant_email, job_offer_id FROM applications")
        ).fetchall()
    )

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
    exp     = max(0, round((score - 30) / 10))
    return json.dumps({
        "competences":      random.sample(
            ['Python', 'SQL', 'Angular', 'Docker', 'Java', 'Spark', 'Git', 'Linux'], k=random.randint(2, 5)
        ),
        "anneesExperience": exp,
        "niveau":           niveau,
        "formation":        random.choice(['Bac+3', 'Bac+5', 'Master', 'Ingénieur']),
        "langues":          random.sample(['Français', 'Anglais', 'Arabe'], k=random.randint(1, 3)),
        "resumeProfil":     fake.sentence(nb_words=12),
    }, ensure_ascii=False)

new_apps        = []
new_app_skills  = []
used_pairs      = set(existing_pairs)
attempts        = 0
NB_APPS_CIBLE   = 503

while len(new_apps) < NB_APPS_CIBLE and attempts < 5000:
    attempts += 1
    email    = random.choice(all_emails)
    offer_id = random.choice(all_offer_ids_final)
    pair     = (email, offer_id)
    if pair in used_pairs:
        continue
    used_pairs.add(pair)

    app_id   = str(uuid.uuid4())
    app_date = fake.date_between(start_date=date(2021, 1, 1), end_date=date(2025, 12, 1))
    score    = int(max(10, min(100, random.gauss(62, 18))))

    new_apps.append({
        "id":                          app_id,
        "applicant_email":             email,
        "applicant_name":              fake.name(),
        "applied_date":                app_date,
        "cover_letter":                fake.paragraph(nb_sentences=4),
        "cv_url":                      f"https://cv.sirh.internal/{app_id[:8]}.pdf",
        "cv_file":                     None,
        "cv_file_name":                f"cv_{app_id[:8]}.pdf",
        "letter_motivation_pdf":       None,
        "letter_motivation_file_name": f"lettre_{app_id[:8]}.pdf",
        "status":                      pick_status(score),
        "match_score":                 score,
        "candidate_profile_json":      fake_profile_json(score),
        "job_offer_id":                offer_id,
    })

    nb_sk = random.randint(1, 4)
    for sk_id in random.sample(skill_ids, min(nb_sk, len(skill_ids))):
        new_app_skills.append({"application_id": app_id, "skill_id": sk_id})

with engine_rec.connect() as conn:
    for i in range(0, len(new_apps), 100):
        conn.execute(sa.text("""
            INSERT INTO applications
                (id, applicant_email, applicant_name, applied_date,
                 cover_letter, cv_url, cv_file, cv_file_name,
                 letter_motivation_pdf, letter_motivation_file_name,
                 status, match_score, candidate_profile_json, job_offer_id)
            VALUES
                (:id, :applicant_email, :applicant_name, :applied_date,
                 :cover_letter, :cv_url, :cv_file, :cv_file_name,
                 :letter_motivation_pdf, :letter_motivation_file_name,
                 :status, :match_score, :candidate_profile_json, :job_offer_id)
        """), new_apps[i:i+100])
    conn.commit()

with engine_rec.connect() as conn:
    for i in range(0, len(new_app_skills), 100):
        conn.execute(sa.text(
            "INSERT INTO application_skills (application_id, skill_id) "
            "VALUES (:application_id, :skill_id)"
        ), new_app_skills[i:i+100])
    conn.commit()

print(f"  ✓ {len(new_apps)} candidatures insérées")
print(f"  ✓ {len(new_app_skills)} liens candidatures↔skills insérés")

# ══════════════════════════════════════════════════════════════
# BILAN FINAL
# ══════════════════════════════════════════════════════════════
with engine_emp.connect() as conn:
    nb_emp    = conn.execute(sa.text("SELECT COUNT(*) FROM employees")).scalar()
    nb_depart = conn.execute(sa.text("SELECT COUNT(*) FROM employees WHERE date_depart IS NOT NULL")).scalar()
    nb_depts  = conn.execute(sa.text("SELECT COUNT(*) FROM departments")).scalar()
    nb_svc    = conn.execute(sa.text("SELECT COUNT(*) FROM services")).scalar()
    nb_eskills= conn.execute(sa.text("SELECT COUNT(*) FROM employee_skills")).scalar()

with engine_rec.connect() as conn:
    nb_off    = conn.execute(sa.text("SELECT COUNT(*) FROM job_offers")).scalar()
    nb_app    = conn.execute(sa.text("SELECT COUNT(*) FROM applications")).scalar()
    nb_scored = conn.execute(sa.text("SELECT COUNT(*) FROM applications WHERE match_score IS NOT NULL")).scalar()

print(f"""
╔══════════════════════════════════════════════════════╗
║           BILAN FINAL — BASE PFE COMPLÈTE            ║
╠══════════════════════════╦═════════╦════════════════╣
║  Donnée                  ║  Total  ║  Objectif PFE  ║
╠══════════════════════════╬═════════╬════════════════╣
║  Employés actifs         ║  {nb_emp:<7} ║  1500          ║
║  Départs simulés         ║  {nb_depart:<7} ║  200           ║
║  Départements            ║  {nb_depts:<7} ║  8             ║
║  Services                ║  {nb_svc:<7} ║  15            ║
║  Employee skills         ║  {nb_eskills:<7} ║  2500+         ║
║  Offres d'emploi         ║  {nb_off:<7} ║  200           ║
║  Candidatures            ║  {nb_app:<7} ║  800           ║
║  Avec match_score        ║  {nb_scored:<7} ║  800           ║
╚══════════════════════════╩═════════╩════════════════╝
""")