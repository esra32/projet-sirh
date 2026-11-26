# 🎓 SOUTENANCE TECHNIQUE — Projet SIRH
### Plateforme Microservices + Infrastructure Business Intelligence & Machine Learning
> **Auteur :** Esra AHMADI · **Organisme d'accueil :** ArabSoft · **Méthodologie :** Scrum (5 sprints)
> **Ce document = votre script de présentation + votre aide-mémoire de lancement + votre préparation aux questions.**

---

## 🧭 SOMMAIRE

1. [Pitch d'ouverture (2 minutes)](#1)
2. [Architecture globale du projet](#2)
3. [Le fil rouge des 5 sprints](#3)
4. [PARTIE A — Lancer la partie DEV (Backend + Frontend + Keycloak)](#4)
5. [PARTIE B — Lancer la partie BI (ETL → dbt → Airflow → Superset)](#5)
6. [PARTIE C — Lancer la partie ML (6 modèles + MLflow)](#6)
7. [🎬 SCÉNARIO DE DÉMONSTRATION (Keycloak → ML)](#7)
8. [Points forts à mettre en avant](#8)
9. [Questions / Réponses anticipées](#9)
10. [Fiche technique récapitulative (ports, credentials, stack)](#10)

---

<a name="1"></a>
## 1. 🎤 PITCH D'OUVERTURE (à dire au début, ~2 min)

> « Mon projet de fin d'études couvre **l'intégralité du cycle de vie d'une application data moderne**, de la ligne de code jusqu'à la décision métier.
>
> J'ai conçu **SIRH**, un Système d'Information des Ressources Humaines, en **deux volets complémentaires** :
>
> **Volet 1 — l'application** : une architecture **microservices Spring Boot** (4 services) avec un **frontend Angular 17**, sécurisée par **JWT + BCrypt** et **Keycloak** pour l'authentification centralisée. Elle gère les employés, les départements, et un module de **recrutement enrichi par l'IA** (Google Gemini) qui lit les CV et calcule un score de compatibilité candidat/poste.
>
> **Volet 2 — la Business Intelligence** : j'ai construit un **Data Warehouse en étoile**, alimenté par un pipeline **ETL Python + dbt**, orchestré par **Apache Airflow**, avec **92 tests qualité** et un historisation **SCD Type 2**. Les données sont visualisées dans **Apache Superset** (dashboards interactifs), et j'ai développé **6 modèles de Machine Learning** — dont un modèle de prédiction du turnover avec un **AUC de 0.757**, au-dessus du seuil critique de 0.70 — tracés avec **MLflow**.
>
> Aujourd'hui, je vais vous faire une démonstration **de bout en bout** : je me connecte via Keycloak, je navigue dans l'application, je montre l'IA de recrutement, puis je remonte jusqu'aux dashboards décisionnels et aux prédictions Machine Learning. »

**Pourquoi ce pitch fonctionne :** il annonce la maîtrise des deux mondes (Dev + Data), il cite des **chiffres concrets** (AUC 0.757, 92 tests, 4 services, 6 modèles), et il pose le plan de la démo.

---

<a name="2"></a>
## 2. 🏗️ ARCHITECTURE GLOBALE

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          VOLET 1 — APPLICATION                             │
│                                                                            │
│   Navigateur                                                               │
│   Angular 17 (:4200) ──JWT──►  API Gateway (:8080)  ── Spring Cloud Gateway│
│        │                              │                                    │
│        │ keycloak-js                  ├──► Auth Service      (:8081)  ─┐    │
│        ▼                              ├──► Employee Service  (:8082)  ─┤    │
│   Keycloak (:8084)                    └──► Recruitment Svc   (:8083)  ─┤    │
│   realm=myrealm                              │  IA Gemini 1.5 Flash    │    │
│                                              ▼                         ▼    │
│                                     MySQL 8 : sirh_auth / sirh_employee /   │
│                                              sirh_recruitment              │
└──────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │  ETL Python (extract_staging.py)
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     VOLET 2 — BUSINESS INTELLIGENCE                         │
│                                                                            │
│  sirh_staging (7 tables brutes)                                            │
│        │  dbt 1.7 (18 modèles, 92 tests, SCD Type 2 snapshot)              │
│        ▼                                                                    │
│  sirh_dwh  ──►  6 dimensions + 4 faits (schéma en étoile / constellation)  │
│        │                                                                    │
│        ├──► Apache Airflow (:8085)  → orchestration quotidienne            │
│        ├──► Apache Superset (:8088) → dashboards RH interactifs            │
│        └──► 6 modèles ML (Python) → tables ml_*  →  MLflow (:5000)         │
└──────────────────────────────────────────────────────────────────────────┘
```

### La communication REST : point important
> ⚠️ **Question fréquente : « Utilisez-vous Eureka ? »**
> **Réponse honnête et maîtrisée :** « L'architecture prévoit le Service Discovery via Eureka comme **option** (mentionné dans le cahier des charges). Dans ma version, la communication REST passe par l'**API Gateway (Spring Cloud Gateway)** avec un **routage statique par URL** : le Gateway reçoit chaque requête sur le port 8080, valide le JWT, puis la redirige vers le microservice concerné (8081/8082/8083). C'est un choix assumé pour un déploiement local maîtrisé ; passer à Eureka (`lb://`) est une évolution directe qui n'impacte que la configuration du Gateway, pas le code métier. »

---

<a name="3"></a>
## 3. 🎯 LE FIL ROUGE DES 5 SPRINTS

| Sprint | Thème | Livrable clé | Ce que vous montrez |
|---|---|---|---|
| **1** | Authentification Keycloak & gestion de la population | Login Keycloak, rôles EMPLOYEE/MANAGER/HR_ADMIN, CRUD employés | Connexion + espaces par rôle |
| **2** | Gestion des emplois & workflow de validation | Offres DRAFT → PUBLISHED → CLOSED, validation manager/RH | Publication d'une offre |
| **3** | Matching intelligent & analyse IA des candidatures | `CvSkillExtractorService` + Gemini, Smart Match Score | Extraction compétences + score |
| **4** | Infrastructure décisionnelle (BI) | DWH étoile, dbt, SCD Type 2, Superset | Dashboards RH |
| **5** | Analyse prédictive des données RH (ML) | 6 modèles, turnover AUC 0.757, MLflow, RLS | Prédictions + gouvernance |

**Phrase de transition à réutiliser :** *« Le sprint N répond au besoin métier X ; techniquement, je l'ai implémenté avec Y. »*

---

<a name="4"></a>
## 4. 🚀 PARTIE A — LANCER LA PARTIE DEV (Backend + Frontend + Keycloak)

> **Objectif :** avoir l'application fonctionnelle et connectable via Keycloak.
> **Prérequis :** Java 17, Maven, Node.js + npm, MySQL 8, Keycloak 26.5.6 (déjà installé dans `C:\keycloak-26.5.6`).

### Étape 0 — Démarrer MySQL
Démarre MySQL 8 (service Windows ou Docker Desktop) sur `localhost:3306`, identifiants `root` / `root`.
Les 3 bases (`sirh_auth`, `sirh_employee`, `sirh_recruitment`) sont créées automatiquement (`createDatabaseIfNotExist=true`) et **peuplées automatiquement** au démarrage (DataInitializer : ~1000 employés, offres, candidatures).

### Étape 1 — Démarrer Keycloak (port 8084)
```bash
cd C:\keycloak-26.5.6\keycloak-26.5.6\bin
kc.bat start-dev --http-port=8084
```
Puis vérifier la console d'admin : **http://localhost:8084** — realm **`myrealm`**, client **`frontend-app`**.
> 💡 Astuce démo : garde un onglet ouvert sur la console Keycloak pour montrer le realm, le client et les utilisateurs.

### Étape 2 — Démarrer les 4 microservices (4 terminaux, dans l'ordre)
```bash
# Terminal 1 — Auth (doit démarrer en premier)
cd "C:\Users\Hp\Desktop\last v\essra\sirh-backend"
mvn -pl auth-service spring-boot:run          # → http://localhost:8081

# Terminal 2 — Employee
mvn -pl employee-service spring-boot:run       # → http://localhost:8082

# Terminal 3 — Recruitment
mvn -pl recruitment-service spring-boot:run    # → http://localhost:8083

# Terminal 4 — API Gateway (EN DERNIER)
mvn -pl api-gateway spring-boot:run            # → http://localhost:8080
```
> ⚠️ **Règle critique à connaître :** le `JWT_SECRET` doit être **identique** dans les 4 services, sinon toutes les requêtes authentifiées échouent silencieusement. (Valeur par défaut déjà alignée dans les configs.)

### Étape 3 — Démarrer le Frontend Angular (port 4200)
```bash
cd "C:\Users\Hp\Desktop\last v\essra\sirh-frontend"
npm install        # première fois seulement
npm start          # = ng serve → http://localhost:4200
```

### ✅ Vérification rapide (sans l'UI, pour rassurer en cas de souci)
```bash
# Login démo → doit renvoyer un accessToken
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hr.sirh.com","password":"admin123"}'
```
Swagger disponible par service : `:8081`, `:8082`, `:8083` → `/swagger-ui.html`.

---

<a name="5"></a>
## 5. 📊 PARTIE B — LANCER LA PARTIE BI (ETL → dbt → Airflow → Superset)

> **Objectif :** alimenter le Data Warehouse et afficher les dashboards.
> **Prérequis :** Python 3.11, Docker Desktop **démarré**, MySQL en marche.

### Étape 1 — Dépendances + création des bases décisionnelles
```bash
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi"
pip install -r requirements.txt
python create_databases.py     # crée sirh_staging + sirh_dwh + dim_temps (3287 jours 2018→2026)
```

### Étape 2 — ETL : extraction vers le staging
```bash
python extract/extract_staging.py
# ✓ stg_employees ~99  |  stg_job_offers 50  |  stg_applications ~293  ...
```

### Étape 3 — Transformation dbt (dimensions, faits, SCD Type 2, qualité)
```bash
cd dbt_sirh
dbt snapshot     # historisation SCD Type 2
dbt run          # 18 modèles → 6 dimensions + 4 faits
dbt test         # 92 tests qualité
```
> 💡 En démo, cette étape est aussi **automatisée par Airflow** (voir étape 4) — tu peux montrer soit le lancement manuel, soit le DAG.

### Étape 4 — Apache Airflow (orchestration, port 8085)
```bash
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi\airflow"
docker compose up -d
```
Interface : **http://localhost:8085** — `admin` / `admin123`.
Montre le **DAG** qui enchaîne : `extract_staging → dbt snapshot → dbt run → dbt test → ML`.

### Étape 5 — Apache Superset (dashboards, port 8088)
```bash
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi"
docker compose -f docker-compose.superset.yml up -d    # attendre 2–3 min
```
Interface : **http://localhost:8088** — `admin` / `admin`.
Dashboards à présenter : **Vue d'ensemble RH**, **Analyse du recrutement**, **Compétences & Talents**, **Démographie** (+ **Analyses ML**).

---

<a name="6"></a>
## 6. 🤖 PARTIE C — LANCER LA PARTIE ML (6 modèles + MLflow)

> **Objectif :** produire les tables `ml_*` et montrer les métriques.
> **Prérequis :** DWH alimenté (Partie B faite), MySQL en marche.

### Étape 1 — Générer les départs (nécessaire au modèle de turnover)
```bash
cd "C:\Users\Hp\Desktop\last v\essra\sirh-bi"
python ml/generate_departures.py     # ~256 départs biaisés (16.5%) → colonne is_parti
```
> ⚠️ À lancer **avant** l'ETL/dbt pour que `dim_employe.is_parti` contienne des employés actifs ET partis (sinon le modèle turnover n'a pas de classe cible).

### Étape 2 — Lancer les 6 modèles ML
```bash
python ml/run_all.py
# Enchaîne : turnover → segmentation → high_potentials → forecast → correlations → retention
# (préflight automatique : vérifie les libs + les tables du DWH avant de démarrer)
```

### Étape 3 — MLflow (tracking des expériences, port 5000)
```bash
mlflow ui --port 5000          # interface — http://localhost:5000
python ml/mlflow_tracking.py   # (re)génère les runs comparables
```

### 📌 Les 6 modèles en une table (à connaître par cœur)
| # | Modèle | Algorithme | Table de sortie | Métrique clé |
|---|---|---|---|---|
| ML-1 | **Prédiction Turnover** | Random Forest + SHAP | `ml_turnover_risk` | **AUC 0.757** (CV 0.755) > 0.70 |
| ML-2 | **Segmentation employés** | K-Means (k choisi par silhouette) | `ml_employee_segments` | **Silhouette 0.544** (k=5) |
| ML-3 | **Hauts potentiels** | Score composite pondéré | `ml_high_potentials` | Top **20 %** |
| ML-4 | **Prévision embauches** | Prophet (série temporelle) | `ml_forecast_embauches` | Horizon **6 mois** + IC 80 % |
| ML-5 | **Corrélations RH** | Pearson + scipy | `ml_correlations` | Significativité **p < 0.05** |
| ML-6 | **Rétention des talents** | Analyse de survie | `ml_retention_analysis` | Indice **0–100** |

> **Phrase forte :** *« La feature la plus explicative du turnover, d'après SHAP, est le salaire — un résultat métier cohérent et directement actionnable par les RH. »*

---

<a name="7"></a>
## 7. 🎬 SCÉNARIO DE DÉMONSTRATION (de Keycloak jusqu'au ML)

> **Durée cible : 12–15 min.** Enchaîne les 6 actes sans hésiter. Chaque acte = 1 message métier + 1 preuve technique.

### 🎬 ACTE 1 — Authentification Keycloak *(Sprint 1)*
1. Ouvre **http://localhost:4200** → clique **Se connecter**.
2. Redirection vers **Keycloak (8084)** → saisis un compte, ex. `admin@hr.sirh.com`.
3. Retour sur l'app authentifié.
- **À dire :** *« L'authentification est déléguée à Keycloak via keycloak-js avec le flux PKCE (S256). Keycloak émet un token OIDC ; le backend sait le valider via JWKS. En parallèle, le service Auth interne génère aussi des JWT HS256 — l'architecture supporte les deux, ce qui prépare un vrai SSO. »*
- **Preuve technique :** montre la console Keycloak (realm `myrealm`, client `frontend-app`).

### 🎬 ACTE 2 — Gestion de la population & rôles *(Sprint 1)*
1. Dans l'**espace RH (HR_ADMIN)**, ouvre la liste des employés (~1000).
2. Montre un CRUD (créer/éditer un employé), les départements, l'organigramme.
- **À dire :** *« Chaque rôle a son espace : Employé, Manager, RH-Admin. L'accès est contrôlé côté Gateway (validation JWT) et côté service (`@PreAuthorize`). »*
- **Preuve technique :** le Gateway injecte `X-Auth-User` et `X-Auth-Roles`, relus par les services downstream.

### 🎬 ACTE 3 — Recrutement + IA de matching *(Sprints 2 & 3)*
1. **Manager** publie une offre (workflow DRAFT → PUBLISHED).
2. Une **candidature** arrive avec un CV/lettre.
3. Montre le **Smart Match Score** et les compétences extraites.
- **À dire :** *« Le `CvSkillExtractorService` fonctionne en double mode : avec Google Gemini 1.5 Flash si la clé API est présente, sinon un moteur heuristique de secours. Le score combine le taux de compétences requises trouvées, un bonus d'expérience (regex sur les années) et un bonus de confiance, plafonné à 100. »*
- **Preuve technique :** endpoint `GET /api/applications/match/{offerId}` → candidats scorés/classés.

### 🎬 ACTE 4 — Le pont vers la BI *(transition Sprint 3 → 4)*
- **À dire :** *« Toutes ces données opérationnelles — employés, offres, candidatures — deviennent la matière première de mon volet décisionnel. Un ETL Python les extrait vers un Data Warehouse. »*
- **Preuve technique :** `extract/extract_staging.py` → `sirh_staging` → **dbt** → `sirh_dwh` (étoile). Cite la **SCD Type 2** : *« l'historique des employés est conservé : si un salaire ou un département change, l'ancienne version reste tracée. »*

### 🎬 ACTE 5 — Dashboards décisionnels Superset *(Sprint 4)*
1. Ouvre **Superset (8088)**.
2. Déroule : **Vue d'ensemble RH** (effectifs, turnover, mobilité) → **Recrutement** (délais, entonnoir) → **Compétences** (heatmap, skill gap) → **Démographie**.
- **À dire :** *« Ces dashboards sont sécurisés : RBAC pour les rôles, et Row-Level Security pour filtrer les données par périmètre. Le rafraîchissement est planifié par Airflow. »*
- **Preuve technique :** montre le **DAG Airflow (8085)** qui alimente ces dashboards chaque jour.

### 🎬 ACTE 6 — Analyse prédictive Machine Learning *(Sprint 5)*
1. Ouvre le **dashboard « Analyses ML »** dans Superset (heatmap risque de turnover, segments, prévision).
2. Ouvre **MLflow (5000)** → montre la comparaison des runs et l'**AUC 0.757**.
- **À dire :** *« Six modèles répondent à six questions RH concrètes : Qui risque de partir ? Quels profils-types ? Qui sont les hauts potentiels ? Combien recruter dans 6 mois ? Quelles corrélations ? Quelle rétention ? Le tout est tracé et reproductible avec MLflow. »*
- **Preuve technique :** table `ml_turnover_risk`, feature SHAP dominante = **salaire**.

### 🏁 Clôture (30 s)
> *« En résumé, j'ai livré une **chaîne complète et cohérente** : une application microservices sécurisée, enrichie par l'IA, et une infrastructure décisionnelle qui transforme ses données en **prédictions actionnables**. Le tout est **orchestré, testé (92 tests qualité) et reproductible**. Je suis à votre disposition pour approfondir n'importe quel composant. »*

---

<a name="8"></a>
## 8. 💪 POINTS FORTS À METTRE EN AVANT

- **Couverture end-to-end** rare en PFE : du code microservices jusqu'au ML, en passant par la BI.
- **Sécurité sérieuse** : JWT HS256 + BCrypt + Keycloak/OIDC (PKCE) + `@PreAuthorize` + validation en 2 points (Gateway + service).
- **IA appliquée et utile** : extraction de compétences + scoring candidat, avec **fallback robuste** (pas de dépendance dure à une API externe).
- **BI aux standards professionnels** : Data Warehouse en étoile, **dbt** (transformation *as code*), **92 tests qualité**, **SCD Type 2**, orchestration **Airflow**.
- **ML mesurable et gouverné** : métriques réelles (AUC 0.757 > seuil), **MLflow** pour la reproductibilité, **RLS/RBAC** pour la gouvernance des données.
- **Volumétrie réaliste** : ~1000 employés, ~293 candidatures → les dashboards et modèles sont testés sur du volume, pas sur 3 lignes.

---

<a name="9"></a>
## 9. ❓ QUESTIONS / RÉPONSES ANTICIPÉES

> Objectif : répondre **avec assurance** à ce que les encadrants risquent de demander.

**Q1 — Pourquoi des microservices et pas un monolithe ?**
> Séparation des responsabilités (auth / employés / recrutement), montée en charge indépendante, et déploiement isolé. Le Gateway centralise sécurité et routage.

**Q2 — Utilisez-vous Eureka / Service Discovery ?**
> Eureka est prévu comme option (cahier des charges). Ma version utilise le routage statique du Gateway. Le passage à Eureka (`lb://`) ne modifie que la config du Gateway — le code métier reste inchangé.

**Q3 — Comment un service sait-il qui est l'utilisateur ?**
> Le Gateway valide le JWT et injecte `X-Auth-User` + `X-Auth-Roles`. Chaque service reconstruit le `SecurityContext` via son `JwtAuthFilter`. Défense en profondeur : la validation existe au Gateway **et** dans le service.

**Q4 — Keycloak et votre Auth-service font-ils double emploi ?**
> Non : c'est une architecture **hybride assumée**. L'Auth-service gère les JWT internes (HS256) et le seed de données ; Keycloak apporte l'OIDC/SSO standardisé. Le backend sait valider les deux (HS256 + RSA via JWKS). C'est un chemin de migration progressif vers un SSO complet.

**Q5 — Que se passe-t-il si l'API Gemini est indisponible ?**
> Le `CvSkillExtractorService` bascule sur son **moteur heuristique** (dictionnaire d'alias de compétences + regex d'expérience). L'application ne dépend jamais d'un service externe pour fonctionner.

**Q6 — Pourquoi un schéma en étoile plutôt qu'en flocon ?**
> Simplicité de requêtage et performance analytique : moins de jointures, dimensions dénormalisées. J'ai une **constellation** (plusieurs faits partageant les mêmes dimensions : recrutement, effectifs, compétences, mobilité).

**Q7 — Qu'est-ce que la SCD Type 2 et pourquoi ?**
> Slowly Changing Dimension Type 2 : à chaque changement (salaire, département…), on **crée une nouvelle version** de la ligne au lieu d'écraser. On garde l'historique complet, indispensable pour analyser l'évolution dans le temps. Implémentée via **dbt snapshots**.

**Q8 — Comment garantissez-vous la qualité des données ?**
> **92 tests dbt** (unicité, non-nullité, intégrité référentielle, valeurs acceptées) exécutés à chaque run, et intégrés au DAG Airflow. Une donnée invalide fait échouer le pipeline avant d'atteindre les dashboards.

**Q9 — Votre modèle de turnover est-il fiable ? Le chiffre 0.757 est-il bon ?**
> AUC 0.757 en test, 0.755 en validation croisée 5-fold → **pas de surapprentissage** et **au-dessus du seuil critique 0.70**. J'utilise **SHAP** pour l'explicabilité : la variable dominante est le salaire, ce qui est métier-cohérent. Ce n'est pas une boîte noire.

**Q10 — Comment choisissez-vous k dans le K-Means ?**
> Le script teste automatiquement k de 2 à 7 et retient celui qui **maximise le score silhouette**. Résultat : k=5, silhouette 0.544 (> 0.30, clustering de bonne qualité).

**Q11 — Les calculs BI du frontend et le Data Warehouse font-ils doublon ?**
> Non, ce sont deux niveaux : le frontend calcule des **KPIs temps réel** pour l'utilisateur RH ; le Data Warehouse sert l'**analyse historique lourde**, les prévisions et le ML. Complémentaires.

**Q12 — Est-ce prêt pour la production ?**
> C'est un **prototype avancé** fonctionnel de bout en bout. Les évolutions identifiées : stockage objet pour les CV (au lieu de LONGBLOB), Eureka + tracing distribué, et une librairie partagée pour mutualiser le code JWT. Je connais mes axes d'amélioration.

**Q13 — Sécurité des données BI ?**
> **RBAC** dans Superset (chaque rôle voit ses tableaux) + **Row-Level Security** (filtrage des lignes par périmètre/rôle). Documenté dans le catalogue des métriques.

---

<a name="10"></a>
## 10. 📋 FICHE TECHNIQUE RÉCAPITULATIVE

### Ports (à mémoriser)
| Service | Port | Service | Port |
|---|---|---|---|
| Frontend Angular | 4200 | Keycloak | 8084 |
| API Gateway | 8080 | Airflow | 8085 |
| Auth Service | 8081 | dbt docs | 8086 |
| Employee Service | 8082 | Superset | 8088 |
| Recruitment Service | 8083 | MLflow | 5000 |
| MySQL | 3306 | | |

### Comptes de démonstration (application)
| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@hr.sirh.com` | `admin123` | HR_ADMIN |
| `manager@mgr.sirh.com` | `manager123` | MANAGER |
| `employee@sirh.com` | `employee123` | EMPLOYEE |

### Accès BI / ML
| Outil | URL | Login |
|---|---|---|
| Airflow | http://localhost:8085 | admin / admin123 |
| Superset | http://localhost:8088 | admin / admin |
| MLflow | http://localhost:5000 | (sans login) |
| Keycloak | http://localhost:8084 | (console admin) |

### Stack technique complète
| Couche | Technologies |
|---|---|
| **Frontend** | Angular 17, TypeScript, RxJS, Angular Signals, Chart.js, ng2-charts, keycloak-js, Cypress |
| **Backend** | Java 17, Spring Boot 3.2, Spring Cloud Gateway, Spring Security 6, Spring Data JPA/Hibernate, JJWT, Lombok, SpringDoc/OpenAPI |
| **Sécurité** | JWT (HS256), BCrypt, Keycloak 26.5.6 (OIDC/PKCE), `@PreAuthorize` |
| **IA** | Google Gemini 1.5 Flash (+ fallback heuristique) |
| **Base de données** | MySQL 8 (opérationnel + `sirh_staging` + `sirh_dwh`) |
| **ETL / Transform** | Python, SQLAlchemy, PyMySQL, dbt 1.7 (18 modèles, 92 tests, SCD2) |
| **Orchestration** | Apache Airflow 2.8 (Docker) |
| **Visualisation** | Apache Superset 3.x (Docker) — RBAC + RLS |
| **Machine Learning** | scikit-learn (Random Forest, K-Means), Prophet, SHAP, scipy, MLflow |

### Ordre de lancement complet (checklist démo)
```
[ ] 1. Docker Desktop démarré + MySQL en marche
[ ] 2. Keycloak      : kc.bat start-dev --http-port=8084
[ ] 3. Backend       : auth → employee → recruitment → gateway
[ ] 4. Frontend      : npm start (4200)
[ ] 5. BI bases      : create_databases.py → extract_staging.py → dbt run/test
[ ] 6. Airflow       : docker compose up -d   (8085)
[ ] 7. Superset      : docker compose -f docker-compose.superset.yml up -d  (8088)
[ ] 8. ML            : generate_departures.py → run_all.py
[ ] 9. MLflow        : mlflow ui --port 5000
```

---

> **Conseil final :** lance **tout 30 minutes avant** la présentation (Superset met 2–3 min à démarrer). Garde ce document ouvert comme antisèche. Parle **métier d'abord, technique ensuite**. Tu maîtrises ton sujet de A à Z — montre-le avec calme et des chiffres. 🚀
</content>
</invoke>