# GUIDE COMPLET — SOUTENANCE BI
## Sections 1.1 · 1.2 · 1.3 du Cahier des Charges
### Ce qui est fait · Comment le tester · Comment l'expliquer au jury

---

## AUDIT RAPIDE — CE QUI EST FAIT

| Point CDC                                       | Statut       | Outil                     |
|-------------------------------------------------|-------------|----------------------------|
| Architecture DWH 4 couches                      | ✅ FAIT     | Python + MySQL + dbt |
| Couches source/staging/intégration/présentation | ✅ FAIT     | Architecture complète |
| Schéma en étoile                                | ✅ FAIT     | 6 dimensions + 4 faits |
| Choix technologie BI                            | ✅ FAIT     | Apache Superset (à installer) |
| Extraction ETL Python                           | ✅ FAIT     | extract_staging.py |
| Conception Data Warehouse                       | ✅ FAIT     | sirh_dwh |
| Tables de faits et dimensions                   | ✅ FAIT     | dbt (18 modèles) |
| Processus ETL                                   | ✅ FAIT     | Python + dbt |
| SCD Type 2                                      | ✅ FAIT     | dbt snapshot + démonstration MySQL |
| Planification automatique                       | ❌ MANQUANT | Airflow/cron à faire |
| Qualité des données                             | ⚠️ PARTIEL  | 50 tests dbt ✅ / Great Expectations ❌ |
| Schéma en étoile complet                        | ✅ FAIT     | fait_recrutement + fait_effectifs + fait_mobilite |
| Dimensions requises                            | ✅ FAIT | dim_temps, dim_employe, dim_departement, dim_poste, dim_competence |
| Métriques calculées                             | ✅ FAIT | ancienneté, scores, catégories, taux |
| Vues agrégées                                   | ✅ FAIT | kpi_rh (8 lignes), vw_effectifs_mensuels (629 lignes) |
| KPIs RH                                         | ✅ FAIT | taux mobilité, taux acceptation, délai recrutement, score moyen |

---

# PARTIE 1.1 — ARCHITECTURE DE LA SOLUTION BI

## C'est quoi en simple ?

Imagine une usine qui transforme du minerai brut en produit fini :
- Le minerai = les données brutes de ton application Spring Boot
- L'usine = le pipeline Python + dbt
- Le produit fini = les tableaux de bord pour le manager RH

Ton architecture a 4 étages (couches) :

```
COUCHE 1 — SOURCE
sirh_employee (base MySQL de l'app Spring Boot)
sirh_recruitment (base MySQL de l'app Spring Boot)
         ↓ extract_staging.py (Python)
COUCHE 2 — STAGING
sirh_staging (copie brute des données)
         ↓ dbt (models/staging/)
COUCHE 3 — INTÉGRATION (Data Warehouse)
sirh_dwh (données transformées, schéma en étoile)
         ↓ Apache Superset
COUCHE 4 — PRÉSENTATION
Dashboards interactifs pour les RH
```

## Pourquoi DWH et pas Data Lake ?

**Data Lake** = stocke TOUT sans tri (comme un lac — on jette tout dedans)
**Data Warehouse** = stocke des données STRUCTURÉES et TRANSFORMÉES (comme un entrepôt bien organisé)

Tu as choisi **Data Warehouse** parce que :
- Les données RH ont une structure claire (employés, départements, offres)
- Les analyses sont connues à l'avance (effectifs, recrutement, compétences)
- Les performances de requête sont importantes pour les dashboards

## Comment tester cette partie

```bash
# Montre la structure complète du DWH
mysql -u root -proot sirh_dwh -e "SHOW TABLES;"
```

Résultat attendu : 19 tables (6 dim + 4 faits + 6 stg views + 2 reporting + 1 snapshot)

```bash
# Montre les 4 couches dans dbt docs
# Ouvre http://localhost:8086 → onglet Lineage Graph
```

## Questions jury sur 1.1 et réponses

**Q : Pourquoi vous avez choisi un Data Warehouse plutôt qu'un Data Lake ?**
R : "Les données de notre SIRH ont une structure métier définie et stable — employés, départements, offres, candidatures. Un Data Warehouse avec schéma en étoile permet des requêtes analytiques rapides et des agrégations efficaces. Un Data Lake serait plus adapté pour des données non structurées comme des emails ou des logs. Notre contexte RH correspond au profil DWH."

**Q : Expliquez vos 4 couches.**
R : "Couche Source : les bases opérationnelles MySQL de l'application Spring Boot. Couche Staging : copie brute extraite par un script Python, sans transformation, pour isoler les systèmes sources. Couche Intégration : le Data Warehouse sirh_dwh avec le schéma en étoile construit par dbt — c'est ici que la valeur analytique est créée. Couche Présentation : Apache Superset pour les dashboards interactifs des managers RH."

**Q : Qu'est-ce que le schéma en étoile ?**
R : "C'est un modèle de données où une table de faits centrale (les mesures à analyser) est entourée de tables de dimensions (le contexte). Dans notre cas, fait_recrutement contient les scores et statuts des candidatures, et elle est reliée à dim_temps, dim_departement et dim_offre pour permettre d'analyser 'combien de candidatures EXCELLENT ont été reçues au Q1 2025 dans le département Informatique'."

---

# PARTIE 1.2 — EXTRACTION ET TRANSFORMATION ETL

## C'est quoi en simple ?

ETL = Extract, Transform, Load (Extraire, Transformer, Charger)

**Sans ETL :** Le manager RH ouvre directement la base MySQL de l'application → lent, dangereux, pas agrégé
**Avec ETL :** Les données sont copiées, nettoyées et préparées dans un espace dédié → rapide, sûr, analytique

Ton pipeline ETL est en 2 étapes :

### Étape 1 — Python (Extract + Load brut)
Fichier : `extract/extract_staging.py`
Ce qu'il fait :
1. Se connecte à sirh_employee et sirh_recruitment
2. Lit toutes les tables (employees, departments, positions, job_offers, applications, skills)
3. Les copie telles quelles dans sirh_staging avec un timestamp extracted_at

### Étape 2 — dbt (Transform + Load propre)
Ce qu'il fait :
1. Staging models : nettoie (TRIM, LOWER, calcul ancienneté)
2. Dimension models : crée les tables de référence (qui ? quand ? où ?)
3. Fact models : crée les tables d'analyse (combien ? quoi ?)
4. Reporting models : agrège en KPIs finaux

## Comment tester cette partie

```bash
# Montre l'extraction Python
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi"
python extract/extract_staging.py
```

```bash
# Vérifie le staging
mysql -u root -proot sirh_staging -e "
SELECT 'stg_employees' as table_name, COUNT(*) as lignes FROM stg_employees
UNION ALL
SELECT 'stg_applications', COUNT(*) FROM stg_applications
UNION ALL
SELECT 'stg_job_offers', COUNT(*) FROM stg_job_offers
UNION ALL
SELECT 'stg_skills', COUNT(*) FROM stg_skills;"
```

```bash
# Lance le pipeline dbt complet
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi\dbt_sirh"
dbt run
```

```bash
# Vérifie les 50 tests qualité
dbt test
```

```bash
# Montre le DWH final
mysql -u root -proot sirh_dwh -e "
SELECT 'fait_recrutement' as table_name, COUNT(*) FROM fait_recrutement
UNION ALL SELECT 'fait_effectifs', COUNT(*) FROM fait_effectifs
UNION ALL SELECT 'fait_mobilite', COUNT(*) FROM fait_mobilite
UNION ALL SELECT 'fait_competences', COUNT(*) FROM fait_competences;"
```

## SCD Type 2 — Explication simple

**Le problème :**
Marie travaille en Informatique depuis 2020. En 2024, elle change pour le département RH.
- Sans SCD Type 2 : on écrase → on perd l'info "elle était en Informatique"
- Avec SCD Type 2 : on garde les 2 lignes avec les dates de validité

**Dans ton projet :**
```sql
-- Montre le SCD Type 2 en action
USE sirh_dwh;
SELECT email, department_nk, dbt_valid_from, dbt_valid_to
FROM snap_employe_historique
WHERE email = 'valerieparis@example.com'
ORDER BY dbt_valid_from;
```

Résultat : 2 lignes pour le même employé
- Ligne 1 : dbt_valid_to = '2026-04-25 16:45:37' → fermée (historique)
- Ligne 2 : dbt_valid_to = NULL → ouverte (version actuelle)

**Outil utilisé : dbt Snapshots**
Fichier : `snapshots/snap_employe_historique.sql`
Commande : `dbt snapshot`

## Qualité des données — Explication simple

Tu as **50 tests automatiques** dans dbt. Chaque test vérifie une règle métier :

| Type de test | Exemple | Ce qu'il vérifie |
|---|---|---|
| not_null | employee_nk not_null | Aucun employé sans identifiant |
| unique | email unique | Pas de doublon d'email |
| accepted_values | type_contrat in CDI,CDD,STAGE | Seuls ces 3 types sont valides |
| test_match_score | score entre 0 et 100 | Le score IA est toujours valide |
| test_dates_valides | date candidature pas dans le futur | Pas de candidatures en 2030 |

```bash
# Lance tous les tests
dbt test
# Résultat : PASS=50 WARN=0 ERROR=0
```

## Planification automatique — Ce qui MANQUE

Le CDC demande un batch quotidien/hebdomadaire. C'est la seule chose manquante.
Pour la soutenance, tu expliques :
"La planification serait implémentée avec Apache Airflow. Le DAG défini exécuterait :
1. `python extract_staging.py` (extraction)
2. `dbt snapshot` (SCD Type 2)
3. `dbt run` (transformation)
4. `dbt test` (validation qualité)
Chaque nuit à 2h du matin."

## Questions jury sur 1.2 et réponses

**Q : Pourquoi Python pour l'extraction et pas Talend ou NiFi ?**
R : "Python avec SQLAlchemy est suffisant pour notre volume de données (1500 employés, 800 candidatures). Talend et NiFi sont des outils d'entreprise adaptés à des volumes massifs et des sources hétérogènes. Pour un projet académique avec une seule source MySQL, Python offre la même fonctionnalité avec plus de flexibilité et sans licence commerciale."

**Q : C'est quoi dbt ? Pourquoi vous l'avez choisi ?**
R : "dbt — data build tool — est l'outil standard de l'industrie pour la transformation de données. Il transforme du SQL simple en pipeline documenté, testé et versionné. Chaque modèle SQL devient une table ou une vue dans le DWH. dbt gère automatiquement l'ordre d'exécution grâce aux références ref() et source(). Il génère aussi la documentation et le lineage graph automatiquement."

**Q : Qu'est-ce que le lineage graph ?**
R : "C'est la carte visuelle du flux de données dans le pipeline. On peut ouvrir http://localhost:8086 et voir en un coup d'œil : depuis les tables sources sirh_staging, comment les données circulent à travers les modèles de staging, puis les dimensions, puis les faits, jusqu'aux KPIs finaux. C'est essentiel pour la maintenance et le débogage."
[Ouvrir dbt docs et montrer le lineage graph pendant la soutenance]

**Q : Comment vous garantissez la qualité des données ?**
R : "Via 50 tests automatiques dbt. Trois types : les tests génériques (not_null, unique, accepted_values) qui vérifient l'intégrité structurelle, et deux tests métier personnalisés — test_match_score vérifie que le score IA est toujours entre 0 et 100, et test_dates_valides vérifie qu'aucune candidature n'a une date dans le futur. Ces tests s'exécutent à chaque pipeline avec dbt test."

**Q : Expliquez le SCD Type 2.**
R : "SCD signifie Slowly Changing Dimension — dimension à évolution lente. Le Type 2 est la technique qui consiste à conserver l'historique des changements au lieu d'écraser les données. Quand un employé change de département, on ferme son ancienne ligne en renseignant dbt_valid_to et on crée une nouvelle ligne avec le nouveau département et dbt_valid_to = NULL. Cela permet de répondre à des questions historiques comme 'combien d'employés étaient dans le département RH en janvier 2024' même si certains ont depuis changé de département."

---

# PARTIE 1.3 — MODÉLISATION DIMENSIONNELLE

## C'est quoi en simple ?

La modélisation dimensionnelle c'est la façon d'organiser les données dans le DWH pour que les analyses soient rapides et naturelles.

**Analogie :** Imagine un tableau Excel avec des données de ventes.
- Les FAITS = les chiffres (montant vendu, quantité, score)
- Les DIMENSIONS = le contexte (qui ? quand ? où ? quoi ?)

"Combien de candidatures EXCELLENT avons-nous reçues en Q1 2025 dans le département Informatique ?"
- FAIT = match_score (le chiffre)
- DIMENSION TEMPS = Q1 2025
- DIMENSION DÉPARTEMENT = Informatique
- DIMENSION SCORE = EXCELLENT

## Tes 6 dimensions — À quoi elles servent

### dim_temps (4748 lignes — tous les jours de 2014 à 2026)
```sql
USE sirh_dwh;
SELECT id_temps_sk, date_jour, nom_mois, libelle_trimestre, annee, est_weekend
FROM dim_temps
WHERE annee = 2025 AND mois = 1
LIMIT 5;
```
Permet de : filtrer par mois, trimestre, année, distinguer jours ouvrés/weekend

### dim_employe (1500 lignes)
```sql
SELECT id_employe_nk, nom_complet, departement, poste, type_contrat, anciennete_jours
FROM dim_employe
LIMIT 5;
```
Permet de : analyser par département, poste, type de contrat, ancienneté

### dim_departement (8 lignes)
```sql
SELECT * FROM dim_departement;
```
Permet de : filtrer toutes les analyses par département

### dim_poste (34 lignes)
```sql
SELECT * FROM dim_poste;
```
Permet de : analyser la répartition des postes

### dim_competence (20 lignes)
```sql
SELECT * FROM dim_competence;
```
Permet de : analyser les compétences les plus demandées

### dim_offre (354 lignes)
```sql
SELECT id_offre_nk, titre, departement, statut, duree_offre_jours
FROM dim_offre
WHERE statut = 'PUBLISHED'
LIMIT 5;
```
Permet de : analyser les offres actives par département

## Tes 4 tables de faits — À quoi elles servent

### fait_recrutement (800 lignes) — 1 ligne par candidature
```sql
SELECT
    id_candidature_nk,
    match_score,
    categorie_score,
    est_accepte,
    a_passe_entretien,
    departement,
    jours_depuis_candidature
FROM fait_recrutement
LIMIT 5;
```
Questions analytiques possibles :
- Quel département a le meilleur taux d'acceptation ?
- Quelle est la distribution des scores IA ?
- Combien de candidats passent en entretien ?

### fait_effectifs (1500 lignes) — 1 ligne par employé
```sql
SELECT
    nom_complet,
    type_contrat,
    anciennete_mois,
    annee_embauche
FROM fait_effectifs
LIMIT 5;
```
Questions analytiques possibles :
- Combien d'employés CDI vs CDD ?
- Répartition par département ?
- Pyramide des anciennetés ?

### fait_mobilite (1175 lignes) — Periodic Snapshot mensuel
```sql
SELECT
    annee_snapshot,
    mois_snapshot,
    libelle_trimestre,
    type_contrat,
    nb_embauches_mois,
    effectif_cumule_dept,
    taux_croissance_pct
FROM fait_mobilite
ORDER BY annee_snapshot, mois_snapshot
LIMIT 10;
```
Questions analytiques possibles :
- Comment évolue l'effectif mois par mois ?
- Quel trimestre a le plus de recrutements ?
- Taux de croissance par département ?

### fait_competences (1601 lignes) — 1 ligne par compétence × offre
```sql
SELECT
    competence,
    titre_offre,
    departement_offre,
    nb_candidats
FROM fait_competences
ORDER BY nb_candidats DESC
LIMIT 10;
```
Questions analytiques possibles :
- Quelles compétences sont les plus demandées ?
- Combien de candidats ont Python pour les offres Data ?
- Gap de compétences par département ?

## Tes KPIs RH — La vue agrégée finale

```sql
-- La requête la plus impressionnante à montrer au jury
SELECT
    departement,
    nb_employes,
    nb_cdi,
    nb_cdd,
    nb_stage,
    ROUND(anciennete_moy_mois / 12, 1) AS anciennete_moy_annees,
    taux_mobilite_pct,
    nb_candidatures,
    taux_acceptation_pct,
    score_moy_candidatures
FROM kpi_rh
ORDER BY nb_employes DESC;
```

Cette requête donne EN UNE SEULE TABLE tous les KPIs RH par département.

## Questions jury sur 1.3 et réponses

**Q : Pourquoi un schéma en étoile et pas en flocon ?**
R : "Le schéma en étoile fait des jointures en un seul niveau — une table de faits rejoint directement les dimensions. Le schéma en flocon normalise davantage les dimensions (ex: une dim_ville séparée dans dim_département). Pour notre cas d'usage BI, l'étoile est préférable : les requêtes sont plus simples, les performances meilleures, et la lisibilité pour les analystes est maximale. La légère redondance des données est acceptable dans un DWH."

**Q : Expliquez la différence entre fait_effectifs et fait_mobilite.**
R : "Ce sont deux patterns Kimball différents. fait_effectifs est une Transaction Fact Table — 1 ligne par événement (ici l'embauche d'un employé), grain très fin. fait_mobilite est une Periodic Snapshot Fact Table — 1 ligne par département × mois, elle capture l'état à intervalles réguliers. fait_effectifs répond à 'qui a été embauché et quand', fait_mobilite répond à 'comment évolue l'effectif mois par mois dans chaque département'."

**Q : C'est quoi la granularité d'une table de faits ?**
R : "La granularité c'est le niveau de détail minimal d'une ligne. Pour fait_recrutement, la granularité est 1 candidature — chaque ligne représente une candidature unique. Pour fait_mobilite, la granularité est 1 département × 1 mois × 1 type de contrat. Définir la granularité est la première décision en modélisation dimensionnelle — elle détermine quelles analyses sont possibles."

**Q : Pourquoi dim_temps avec 4748 jours au lieu d'utiliser directement les dates ?**
R : "dim_temps permet d'enrichir chaque date avec des attributs analytiques calculés à l'avance : nom du mois en français, trimestre, indicateur weekend. Sans dim_temps, pour filtrer sur 'Q1 2025', il faudrait une condition WHERE YEAR()=2025 AND MONTH() IN (1,2,3) dans chaque requête — moins performant et plus complexe. Avec dim_temps, on fait simplement WHERE libelle_trimestre = 'T1' AND annee = 2025."

**Q : Comment vous avez calculé les KPIs RH ?**
R : "Dans le modèle kpi_rh.sql, j'ai utilisé des CTEs (Common Table Expressions) chaînées. Trois CTEs calculent les métriques par département : une pour les effectifs (COUNT, AVG ancienneté, répartition contractuelle), une pour la mobilité (COUNT embauches), une pour le recrutement (COUNT candidatures, SUM acceptées, AVG score). La jointure finale avec dim_departement donne le tableau de bord par département en 8 lignes."

---

# ORDRE DE DÉMONSTRATION RECOMMANDÉ POUR LA SOUTENANCE

## Séquence de 10 minutes

**1. Architecture (2 min)**
- Montrer le schéma 4 couches (dessin ou slide)
- Ouvrir MySQL et montrer `SHOW DATABASES` → sirh_employee, sirh_staging, sirh_dwh

**2. ETL Python (1 min)**
- Montrer le fichier `extract_staging.py` rapidement
- Montrer `SELECT COUNT(*) FROM sirh_staging.stg_employees` → 1500 lignes

**3. dbt Pipeline (3 min)**
- Ouvrir http://localhost:8086 → lineage graph
- Expliquer les 4 niveaux : sources (vert) → staging → dimensions → faits → reporting
- Montrer `dbt run` dans le terminal → PASS=18

**4. Tests qualité (1 min)**
- Lancer `dbt test` → PASS=50
- "50 règles métier vérifiées automatiquement à chaque chargement"

**5. SCD Type 2 (2 min)**
- Montrer la requête avec jointure dim_departement
- Expliquer les 2 lignes : ancienne fermée, nouvelle ouverte

**6. KPIs RH (1 min)**
- Lancer la requête sur kpi_rh
- "En une requête, tous les KPIs RH par département"

---

# CE QUI MANQUE (Sois honnête si le jury pose la question)

**Planification automatique (Airflow) :**
"L'orchestration automatique est prévue avec Apache Airflow. Le DAG est conçu avec 4 tâches : extraction Python, snapshot dbt, transformation dbt run, tests dbt test. Par contrainte de temps, il n'a pas été déployé, mais l'architecture est en place."

**Great Expectations :**
"La qualité des données est assurée par 50 tests dbt intégrés au pipeline. Great Expectations aurait ajouté des rapports HTML visuels sur les données brutes avant ingestion — une amélioration prévue pour la version suivante."

**Apache Superset (Dashboards) :**
"Les dashboards interactifs sont la prochaine étape. Le Data Warehouse est complet et prêt à être connecté à Superset — les tables kpi_rh et vw_effectifs_mensuels sont optimisées pour alimenter directement les dashboards."