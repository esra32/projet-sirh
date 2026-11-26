# ÉTAPE 1 — Comment lancer

## 1. Installer les dépendances
```bash
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi"
pip install sqlalchemy pymysql faker pandas numpy
```

## 2. Créer les bases + schéma DWH
```bash
python create_databases.py
```
Tu dois voir :
```
✓ Bases sirh_staging et sirh_dwh créées
✓ Tables sirh_staging créées
✓ Tables sirh_dwh créées (schéma en étoile)
✓ dim_temps remplie (3287 jours : 2018 → 2026)
```

## 3. Extraire les données vers staging
```bash
python extract/extract_staging.py
```
Tu dois voir :
```
✓ stg_employees       : 99 lignes
✓ stg_job_offers      : 50 lignes
✓ stg_applications    : 293 lignes
...
```

## Structure créée
```
sirh_staging/         sirh_dwh/
├── stg_employees     ├── dim_temps      ← 3287 jours
├── stg_departments   ├── dim_departement
├── stg_positions     ├── dim_poste
├── stg_job_offers    ├── dim_employe    ← SCD Type 2
├── stg_applications  ├── dim_offre
├── stg_skills        ├── dim_competence
└── stg_app_skills    ├── fait_recrutement
                      ├── fait_effectifs
                      └── fait_competences
```