# Rapport Final Complet - Projet ESSRA / SIRH

Projet : ESSRA - Systeme d'Information des Ressources Humaines  
Annee : 2026  
Chemin du projet : `C:\Users\Hp\Desktop\last v\essra`

---

## Page de garde a completer

Etablissement : ................................................  
Filiere : .......................................................  
Realise par : ...................................................  
Encadre par : ...................................................  
Sujet : Conception et realisation d'une plateforme SIRH moderne avec microservices, securite, intelligence artificielle et Business Intelligence.  
Annee universitaire : 2025 / 2026

---

## Remerciements

Je tiens a remercier toutes les personnes qui ont contribue, directement ou indirectement, a la realisation de ce projet. Je remercie particulierement mon encadrant pour son accompagnement, ses remarques et ses conseils tout au long du travail. Je remercie egalement les enseignants et les membres du jury pour le temps consacre a l'evaluation de ce projet.

Ce projet m'a permis de mettre en pratique plusieurs competences techniques importantes, notamment le developpement backend, le developpement frontend, la securite applicative, l'architecture microservices, la Business Intelligence et l'integration de l'intelligence artificielle dans un contexte metier.

---

## Resume

Le projet ESSRA est une plateforme SIRH moderne destinee a centraliser et automatiser la gestion des ressources humaines. La solution permet de gerer les employes, les departements, les postes, les contrats, les offres d'emploi, les candidatures, les competences et les indicateurs RH.

L'application repose sur une architecture microservices developpee avec Spring Boot. Elle comprend une API Gateway, un service d'authentification, un service de gestion des employes et un service de recrutement. Le frontend est realise avec Angular 17 et propose trois espaces utilisateurs : employe, manager et administrateur RH. La securite repose sur JWT, les roles, les guards Angular et une integration Keycloak preparee pour le Single Sign-On.

Le projet integre aussi une partie Business Intelligence permettant d'extraire les donnees operationnelles, de les transformer avec dbt, de les stocker dans un Data Warehouse, de les orchestrer avec Airflow et de les visualiser avec Superset. Enfin, des fonctionnalites avancees d'intelligence artificielle sont ajoutees pour le matching des candidatures, l'analyse de competences, le chatbot RH et les analyses predictives.

Mots cles : SIRH, Spring Boot, Angular, Microservices, JWT, Keycloak, Business Intelligence, dbt, Airflow, Superset, Intelligence Artificielle.

---

## Abstract

ESSRA is a modern Human Resources Information System designed to centralize and automate HR management. The platform manages employees, departments, positions, contracts, job offers, applications, skills and HR indicators.

The application is based on a Spring Boot microservices architecture composed of an API Gateway, an authentication service, an employee management service and a recruitment service. The frontend is developed with Angular 17 and provides three user spaces: employee, manager and HR administrator. Security is handled using JWT, role-based access control, Angular guards and a Keycloak integration prepared for Single Sign-On.

The project also includes a Business Intelligence layer that extracts operational data, transforms it using dbt, stores it in a Data Warehouse, orchestrates workflows with Airflow and visualizes indicators with Superset. Advanced artificial intelligence features are also integrated for candidate matching, skill extraction, HR chatbot and predictive analytics.

Keywords: HRIS, Spring Boot, Angular, Microservices, JWT, Keycloak, Business Intelligence, dbt, Airflow, Superset, Artificial Intelligence.

---

## Table des matieres

1. Introduction generale  
2. Chapitre 1 - Contexte general et etude de l'existant  
3. Chapitre 2 - Analyse des besoins et conception  
4. Chapitre 3 - Realisation du backend et de la securite  
5. Chapitre 4 - Realisation du frontend Angular  
6. Chapitre 5 - Business Intelligence et analyse decisionnelle  
7. Chapitre 6 - Intelligence artificielle et analyses avancees  
8. Chapitre 7 - Tests, validation et deploiement local  
9. Conclusion generale et perspectives  
10. Annexes

---

# Introduction generale

La transformation digitale occupe aujourd'hui une place essentielle dans les organisations. Les services des ressources humaines manipulent un volume important de donnees sensibles : informations personnelles des employes, contrats, postes, competences, candidatures, historiques de recrutement et indicateurs sociaux. Lorsque ces informations sont gerees avec des outils disperses, comme des fichiers Excel ou des applications non connectees, il devient difficile de garantir leur fiabilite, leur securite et leur exploitation decisionnelle.

Dans ce contexte, la mise en place d'un Systeme d'Information des Ressources Humaines devient une solution importante. Un SIRH permet de centraliser les donnees RH, d'automatiser les processus, de securiser les acces et d'aider les responsables a prendre des decisions basees sur des indicateurs fiables.

Le projet ESSRA s'inscrit dans cette logique. Il consiste a concevoir et realiser une plateforme SIRH moderne, securisee et evolutive. La solution couvre la gestion des employes, des departements, des postes, des contrats, des utilisateurs, du recrutement, des candidatures et des competences. Elle ajoute egalement une couche Business Intelligence pour transformer les donnees operationnelles en tableaux de bord decisionnels.

Le projet ne se limite pas a une simple application de gestion. Il combine plusieurs domaines techniques : architecture microservices, securite JWT, integration Keycloak, frontend Angular, visualisation de donnees, ETL, Data Warehouse, dbt, Airflow, Superset et intelligence artificielle.

La problematique principale peut etre formulee ainsi :

> Comment concevoir et realiser une plateforme SIRH moderne, securisee et decisionnelle permettant de centraliser la gestion RH, d'automatiser le recrutement et de fournir des indicateurs fiables aux responsables RH ?

Ce rapport presente les differentes phases de realisation du projet. Le premier chapitre introduit le contexte et l'etude de l'existant. Le deuxieme chapitre presente l'analyse des besoins et la conception. Les chapitres suivants decrivent la realisation technique du backend, du frontend, de la BI, de l'intelligence artificielle, ainsi que les tests et validations.

---

# Chapitre 1 - Contexte general et etude de l'existant

## 1.1 Contexte du projet

La gestion des ressources humaines joue un role central dans toute organisation. Elle couvre plusieurs activites : recrutement, integration des collaborateurs, suivi des contrats, gestion des competences, mobilite interne, gestion des postes, reporting social et pilotage strategique.

Cependant, ces activites sont souvent gerees avec plusieurs outils separes. Les informations peuvent etre stockees dans des fichiers, des bases differentes ou des applications independantes. Cette situation entraine plusieurs difficultes :

- duplication des donnees ;
- perte de temps dans la recherche d'information ;
- risque d'erreurs de saisie ;
- manque de tracabilite ;
- difficulte a produire des indicateurs fiables ;
- securite insuffisante ;
- suivi manuel du recrutement ;
- absence de vision claire sur les competences.

Le projet ESSRA vise a repondre a ces difficultes a travers une plateforme centralisee.

## 1.2 Etude de l'existant

Dans un fonctionnement classique, les ressources humaines peuvent utiliser :

- des fichiers Excel pour les employes ;
- des documents separes pour les contrats ;
- des emails pour les candidatures ;
- des fichiers manuels pour les postes ;
- des outils externes pour les offres ;
- des rapports construits manuellement.

Cette organisation presente plusieurs limites :

| Limite | Consequence |
| --- | --- |
| Donnees dispersees | Difficultes de recherche et de consolidation |
| Absence de workflow | Suivi du recrutement peu structure |
| Faible securite | Risque d'acces non autorise |
| Peu d'automatisation | Perte de temps pour les RH |
| Reporting manuel | Indicateurs lents et parfois incoherents |
| Pas de BI | Difficultes de prise de decision |

## 1.3 Solution proposee

La solution proposee est une plateforme SIRH complete nommee ESSRA. Elle permet :

- la gestion centralisee des employes ;
- la gestion des departements, postes et services ;
- la gestion des utilisateurs et des roles ;
- la gestion du processus de recrutement ;
- l'analyse automatique des candidatures ;
- l'affichage de tableaux de bord RH ;
- la transformation des donnees en indicateurs decisionnels ;
- la preparation d'une authentification SSO avec Keycloak.

## 1.4 Objectifs du projet

### Objectif general

Concevoir et realiser une plateforme SIRH moderne permettant de gerer les ressources humaines, le recrutement, la securite et l'analyse decisionnelle.

### Objectifs fonctionnels

- Gerer les employes.
- Gerer les departements.
- Gerer les postes.
- Gerer les services.
- Gerer les contrats.
- Gerer les utilisateurs.
- Gerer les roles.
- Publier et valider des offres d'emploi.
- Recevoir et suivre les candidatures.
- Calculer un score de matching.
- Afficher des dashboards RH.
- Produire des analyses BI.

### Objectifs techniques

- Utiliser une architecture microservices.
- Centraliser les appels avec une API Gateway.
- Securiser les APIs avec JWT.
- Integrer Keycloak.
- Developper une interface Angular 17.
- Mettre en place un Data Warehouse.
- Utiliser dbt pour les transformations.
- Orchestrer le pipeline BI avec Airflow.
- Visualiser les donnees avec Superset.
- Ajouter des modules d'intelligence artificielle.

## 1.5 Methodologie de travail

La realisation du projet a suivi une demarche progressive :

1. Analyse du besoin RH.
2. Definition des acteurs et fonctionnalites.
3. Conception de l'architecture globale.
4. Developpement du backend microservices.
5. Developpement du frontend Angular.
6. Mise en place de la securite.
7. Integration du recrutement et de l'IA.
8. Mise en place de la partie BI.
9. Tests et validation.
10. Documentation et preparation de la soutenance.

---

# Chapitre 2 - Analyse des besoins et conception

## 2.1 Acteurs du systeme

Le systeme comporte trois acteurs principaux.

### Employe

L'employe peut :

- consulter son tableau de bord ;
- consulter ou modifier son profil ;
- consulter les offres internes ;
- postuler a une offre ;
- suivre ses candidatures ;
- consulter ses entretiens ;
- acceder a l'annuaire.

### Manager

Le manager peut :

- consulter son dashboard ;
- creer des offres ;
- suivre les candidatures ;
- analyser les profils candidats ;
- consulter les rapports de son equipe ;
- suivre les talents.

### Administrateur RH

L'administrateur RH peut :

- gerer les employes ;
- gerer les departements ;
- gerer les postes ;
- gerer les contrats ;
- valider les offres ;
- gerer les utilisateurs et leurs roles ;
- consulter les dashboards RH ;
- acceder aux rapports BI ;
- suivre la mobilite et l'organigramme.

## 2.2 Besoins fonctionnels

Les besoins fonctionnels principaux sont :

- authentification et inscription ;
- controle d'acces selon le role ;
- gestion des employes ;
- gestion de la structure RH ;
- gestion des offres d'emploi ;
- gestion des candidatures ;
- suivi du processus de recrutement ;
- analyse de competences ;
- affichage d'indicateurs RH ;
- generation de rapports decisionnels ;
- integration d'un assistant RH.

## 2.3 Besoins non fonctionnels

Le projet doit respecter plusieurs besoins non fonctionnels :

- securite des donnees ;
- modularite ;
- maintenabilite ;
- evolutivite ;
- separation des responsabilites ;
- interface responsive ;
- performance acceptable ;
- tracabilite des traitements BI ;
- qualite des donnees ;
- facilite de deploiement local.

## 2.4 Architecture globale

L'architecture generale repose sur quatre couches :

```text
Frontend Angular
      |
      v
API Gateway
      |
      +--> Auth Service
      +--> Employee Service
      +--> Recruitment Service
      |
      v
Bases operationnelles MySQL
      |
      v
Pipeline BI : Python + dbt + Airflow + Superset
```

## 2.5 Architecture backend

Le backend est compose de quatre modules :

| Service | Role | Port |
| --- | --- | --- |
| API Gateway | Routage et filtre JWT | 8080 |
| Auth Service | Authentification et roles | 8081 |
| Employee Service | Gestion RH | 8082 |
| Recruitment Service | Recrutement et IA | 8083 |

## 2.6 Architecture frontend

Le frontend est organise en plusieurs dossiers :

```text
src/app/core
src/app/features
src/app/shared
```

Le dossier `core` contient les services, l'authentification et les guards.  
Le dossier `features` contient les pages metier.  
Le dossier `shared` contient les composants communs comme le layout, les toasts et le chatbot.

## 2.7 Architecture BI

La BI suit une architecture en couches :

```text
Sources operationnelles
      |
      v
sirh_staging
      |
      v
dbt staging
      |
      v
Dimensions + Faits
      |
      v
Reporting
      |
      v
Superset dashboards
```

## 2.8 Modele de donnees

Les bases principales sont :

- `sirh_auth` : utilisateurs et roles ;
- `sirh_employee` : employes, departements, postes, services ;
- `sirh_recruitment` : offres, candidatures, competences ;
- `sirh_staging` : donnees brutes extraites ;
- `sirh_dwh` : Data Warehouse.

## 2.9 Securite prevue

La securite est basee sur :

- JWT ;
- refresh token ;
- Spring Security ;
- BCrypt ;
- guards Angular ;
- role-based access control ;
- integration Keycloak.

---

# Chapitre 3 - Realisation du backend et de la securite

## 3.1 Environnement backend

Technologies utilisees :

- Java 17 ;
- Spring Boot 3.2.4 ;
- Spring Security ;
- Spring Data JPA ;
- Spring Cloud Gateway ;
- Maven ;
- MySQL ;
- Docker ;
- Swagger / OpenAPI.

## 3.2 API Gateway

L'API Gateway est le point d'entree unique du backend. Elle route les requetes vers les services internes.

Routes principales :

- `/api/auth/**` vers Auth Service ;
- `/api/employees/**` vers Employee Service ;
- `/api/departments/**` vers Employee Service ;
- `/api/positions/**` vers Employee Service ;
- `/api/job-offers/**` vers Recruitment Service ;
- `/api/applications/**` vers Recruitment Service ;
- `/api/chat/**` vers Recruitment Service ;
- `/api/market/**` vers Recruitment Service.

Le filtre JWT de la gateway verifie la presence et la validite du token. Si le token est valide, la gateway transmet :

```text
X-Auth-User
X-Auth-Roles
```

## 3.3 Auth Service

Le service d'authentification gere :

- inscription ;
- connexion ;
- generation JWT ;
- refresh token ;
- gestion utilisateurs ;
- gestion roles ;
- echange token Keycloak.

Endpoints :

| Methode | Endpoint |
| --- | --- |
| POST | `/api/auth/register` |
| POST | `/api/auth/login` |
| POST | `/api/auth/refresh` |
| GET | `/api/auth/users` |
| PATCH | `/api/auth/users/{id}/roles` |
| DELETE | `/api/auth/users/{id}` |
| POST | `/api/auth/keycloak/exchange` |

Les roles sont :

- `EMPLOYEE`
- `MANAGER`
- `HR_ADMIN`

## 3.4 Employee Service

Le service employee gere :

- employees ;
- departements ;
- postes ;
- services ;
- competences ;
- organigramme.

Endpoints principaux :

- `/api/employees`
- `/api/departments`
- `/api/positions`
- `/api/services`
- `/api/orgchart/tree`
- `/api/employees/{id}/skills`

Les actions sensibles sont reservees au role `HR_ADMIN`.

## 3.5 Recruitment Service

Le service recrutement gere :

- offres d'emploi ;
- candidatures ;
- competences ;
- notifications ;
- chatbot ;
- intelligence marche ;
- matching IA.

Cycle de vie d'une offre :

```text
DRAFT -> PENDING_VALIDATION -> PUBLISHED -> CLOSED
```

Cycle de vie d'une candidature :

```text
PENDING -> REVIEWING -> INTERVIEW_SCHEDULED -> ACCEPTED / REJECTED
```

## 3.6 Matching IA

Le service `CvSkillExtractorService` extrait les competences d'un candidat depuis :

- la lettre de motivation ;
- le nom du CV ;
- Gemini si la cle API est disponible ;
- une methode heuristique si Gemini n'est pas configure.

Le score de matching est calcule en comparant les competences du candidat avec les competences requises pour l'offre.

## 3.7 Integration Keycloak

Keycloak est prepare pour l'authentification centralisee. Le frontend utilise `keycloak-js`, tandis que le backend sait verifier les tokens Keycloak via JWKS.

Configuration principale :

- URL : `http://localhost:8084`
- realm : `myrealm`
- client : `frontend-app`

Keycloak permet de preparer le projet a un futur SSO.

## 3.8 Securite backend

La securite backend repose sur :

- Spring Security ;
- JWT ;
- BCrypt ;
- `@PreAuthorize` ;
- validation du token par la gateway ;
- verification des roles dans les services.

---

# Chapitre 4 - Realisation du frontend Angular

## 4.1 Environnement frontend

Technologies utilisees :

- Angular 17 ;
- TypeScript ;
- Angular Router ;
- Angular Signals ;
- HttpClient ;
- Chart.js ;
- ng2-charts ;
- keycloak-js ;
- Cypress.

## 4.2 Structure du frontend

La structure principale est :

```text
src/app/core/auth
src/app/core/services
src/app/features/auth
src/app/features/employee
src/app/features/manager
src/app/features/rh-admin
src/app/shared
```

## 4.3 Authentification frontend

Le frontend gere :

- stockage du token ;
- refresh token ;
- extraction des roles ;
- redirection selon role ;
- ajout automatique du token dans les requetes ;
- integration Keycloak.

Composants techniques :

- `AuthService`
- `KeycloakAuthService`
- `authGuard`
- `roleGuard`
- `homeRedirectGuard`
- `jwtInterceptor`

## 4.4 Espaces utilisateurs

### Espace employe

Fonctionnalites :

- dashboard ;
- profil ;
- offres internes ;
- candidatures ;
- entretiens ;
- annuaire.

### Espace manager

Fonctionnalites :

- dashboard manager ;
- creation d'offres ;
- suivi des candidatures ;
- revue des candidats ;
- rapports d'equipe.

### Espace RH Admin

Fonctionnalites :

- dashboard RH ;
- departements ;
- postes ;
- contrats ;
- recrutement ;
- mobilite ;
- organigramme ;
- matching ;
- BI Analytics ;
- rapports RH ;
- utilisateurs.

## 4.5 Dashboards Angular

Les dashboards affichent :

- nombre total d'employes ;
- repartition par departement ;
- offres ouvertes ;
- anciennete moyenne ;
- embauches par annee ;
- candidatures par offre ;
- mix contrats ;
- distribution des scores IA ;
- entonnoir de recrutement ;
- heatmap des competences ;
- indicateurs predictifs.

## 4.6 Services Angular

Services principaux :

| Service | Role |
| --- | --- |
| `EmployeeService` | Appels API RH |
| `RecruitmentService` | Offres et candidatures |
| `AuthService` | Authentification |
| `AiService` | Assistant IA |
| `NotificationService` | Notifications |
| `MarketIntelligenceService` | Donnees marche |
| `UserAdminService` | Utilisateurs |

## 4.7 Experience utilisateur

L'interface propose :

- navigation adaptee au role ;
- tableaux et formulaires ;
- graphiques ;
- notifications ;
- assistant RH ;
- composants responsive ;
- dashboards metier.

---

# Chapitre 5 - Business Intelligence et analyse decisionnelle

## 5.1 Objectif BI

La partie BI transforme les donnees operationnelles en indicateurs utiles pour la prise de decision RH.

Elle permet d'analyser :

- effectifs ;
- recrutements ;
- contrats ;
- competences ;
- mobilite ;
- turnover ;
- tendances annuelles ;
- performance du recrutement.

## 5.2 Architecture BI

La chaine BI est composee de :

- scripts Python ;
- base `sirh_staging` ;
- dbt ;
- base `sirh_dwh` ;
- Airflow ;
- Superset ;
- rapport qualite.

Flux :

```text
sirh_employee + sirh_recruitment
      |
      v
extract_staging.py
      |
      v
sirh_staging
      |
      v
dbt run + dbt test
      |
      v
sirh_dwh
      |
      v
Superset
```

## 5.3 Extraction

Le script `extract_staging.py` extrait les donnees depuis les bases operationnelles et les charge dans `sirh_staging`.

Tables extraites :

- employees ;
- departments ;
- positions ;
- employee_skills ;
- job_offers ;
- applications ;
- skills ;
- application_skills.

## 5.4 Data Warehouse

Le Data Warehouse contient :

Dimensions :

- `dim_temps`
- `dim_employe`
- `dim_departement`
- `dim_poste`
- `dim_competence`
- `dim_offre`

Tables de faits :

- `fait_recrutement`
- `fait_effectifs`
- `fait_mobilite`
- `fait_competences`
- `fait_gap_competences`

Tables de reporting :

- `kpi_rh`
- `vw_effectifs_mensuels`
- `rh_kpi_annuel`
- `rh_contrats_annuel`
- `rh_funnel_recrutement`
- `rh_turnover_departement`

## 5.5 dbt

dbt permet :

- de nettoyer les donnees ;
- de construire les dimensions ;
- de construire les faits ;
- de creer les tables de reporting ;
- de tester la qualite ;
- de documenter les transformations.

Tests dbt :

- `not_null`
- `unique`
- `accepted_values`
- dates valides ;
- scores entre 0 et 100 ;
- fraicheur des sources.

## 5.6 Airflow

Airflow orchestre le pipeline BI.

DAG :

```text
sirh_bi_pipeline
```

Taches :

- `extract_staging`
- `dbt_source_freshness`
- `dbt_snapshot`
- `dbt_run`
- `dbt_test`
- `data_quality_report`
- scripts ML.

## 5.7 Superset

Superset permet de creer les dashboards BI :

- vue d'ensemble RH ;
- analyse demographique ;
- analyse competences ;
- analyse recrutement ;
- suivi Airflow.

## 5.8 Qualite des donnees

Un rapport HTML est genere par :

```text
quality/data_quality_report.py
```

Il verifie :

- valeurs nulles ;
- unicite ;
- valeurs acceptees ;
- integrite referentielle ;
- bornes des scores ;
- coherence des dates.

---

# Chapitre 6 - Intelligence artificielle et analyses avancees

## 6.1 IA dans le recrutement

L'IA aide a analyser les candidatures. Le systeme extrait les competences d'un candidat et calcule un score de compatibilite avec l'offre.

Le matching prend en compte :

- competences requises ;
- competences detectees ;
- experience ;
- qualite du profil ;
- confiance dans l'extraction.

## 6.2 Chatbot RH

Le chatbot RH permet d'assister l'utilisateur dans ses questions liees aux offres, candidatures, contrats, mobilite et processus RH.

## 6.3 Questions d'entretien

Le systeme peut proposer des questions d'entretien adaptees au profil candidat et a l'offre.

## 6.4 Intelligence marche

Le module marche utilise l'API Adzuna pour :

- recuperer des offres externes ;
- analyser les tendances du marche ;
- comparer les offres internes et externes ;
- fournir une vision plus large au service RH.

## 6.5 Machine Learning RH

Le dossier `sirh-bi/ml` contient des scripts pour :

- prediction du turnover ;
- segmentation des employes ;
- detection des hauts potentiels ;
- prevision des embauches ;
- correlations RH ;
- analyse de retention ;
- suivi avec MLflow.

Ces modules montrent que le projet va au-dela du reporting classique.

---

# Chapitre 7 - Tests, validation et deploiement local

## 7.1 Tests backend

Des tests existent pour :

- Auth Service ;
- JWT ;
- controllers ;
- repositories ;
- services employes ;
- recrutement.

Commande :

```bash
mvn test
```

## 7.2 Tests frontend

Le frontend contient des tests Angular et une configuration Cypress.

Commandes :

```bash
npm test
npm run test:ci
npm run e2e
```

## 7.3 Tests BI

Commandes :

```bash
dbt source freshness
dbt test
python quality/data_quality_report.py
```

## 7.4 Lancement backend

Avec Docker :

```bash
cd sirh-backend
docker compose up -d
```

En local :

```bash
mvn clean install
mvn -pl auth-service spring-boot:run
mvn -pl employee-service spring-boot:run
mvn -pl recruitment-service spring-boot:run
mvn -pl api-gateway spring-boot:run
```

## 7.5 Lancement frontend

```bash
cd sirh-frontend
npm install
npm start
```

URL :

```text
http://localhost:4200
```

## 7.6 Lancement BI

```bash
cd sirh-bi
python create_databases.py
python generate_data.py
python extract/extract_staging.py
```

dbt :

```bash
cd dbt_sirh
dbt snapshot
dbt run
dbt test
```

Airflow :

```bash
cd airflow
docker compose up -d
```

Superset :

```bash
docker compose -f docker-compose.superset.yml up -d
```

## 7.7 Difficultes rencontrees

Principales difficultes :

- harmoniser les roles entre JWT et Keycloak ;
- securiser les routes frontend et backend ;
- maintenir un fallback IA si Gemini n'est pas configure ;
- construire une BI compatible avec dbt ;
- generer des donnees suffisantes pour les dashboards ;
- organiser une architecture microservices claire.

Solutions :

- normalisation des roles ;
- guards Angular ;
- filtre JWT gateway ;
- `@PreAuthorize` ;
- variables d'environnement ;
- scripts de generation de donnees ;
- tests dbt et rapport qualite.

---

# Conclusion generale et perspectives

Le projet ESSRA a permis de realiser une plateforme SIRH complete, moderne et evolutive. La solution repond aux besoins principaux de la gestion des ressources humaines : gestion des employes, gestion de la structure interne, suivi du recrutement, securite des acces, dashboards RH et analyse decisionnelle.

L'architecture microservices a permis de separer les responsabilites entre l'authentification, la gestion des employes et le recrutement. Le frontend Angular offre une interface adaptee aux differents roles de l'application. La securite repose sur JWT, Spring Security, les guards Angular et une integration Keycloak preparee. La partie BI ajoute une valeur importante en transformant les donnees operationnelles en indicateurs strategiques exploitables.

Le projet integre egalement l'intelligence artificielle pour ameliorer le processus de recrutement, calculer des scores de matching, analyser les competences et assister les utilisateurs.

Perspectives d'amelioration :

- finaliser la persistance Keycloak avec MySQL ;
- exporter et versionner le realm Keycloak ;
- renforcer les tests d'integration ;
- ajouter une CI/CD complete ;
- ameliorer la gestion des secrets ;
- ajouter plus de dashboards Superset ;
- enrichir les modeles ML ;
- deployer l'application dans un environnement cloud ;
- ajouter une documentation utilisateur detaillee.

En conclusion, ESSRA constitue une solution complete qui combine gestion operationnelle, securite, intelligence artificielle et Business Intelligence. Le projet montre une maitrise de plusieurs technologies modernes et propose une base solide pour une future version de production.

---

# Annexes

## Annexe 1 - Liste des technologies

Backend :

- Java 17
- Spring Boot
- Spring Security
- Spring Data JPA
- Spring Cloud Gateway
- MySQL
- JWT
- Docker

Frontend :

- Angular 17
- TypeScript
- Chart.js
- ng2-charts
- keycloak-js
- Cypress

BI :

- Python
- SQLAlchemy
- pandas
- dbt
- Airflow
- Superset
- MLflow
- scikit-learn

## Annexe 2 - Ports principaux

| Service | Port |
| --- | --- |
| Frontend Angular | 4200 |
| API Gateway | 8080 |
| Auth Service | 8081 |
| Employee Service | 8082 |
| Recruitment Service | 8083 |
| Keycloak | 8084 |
| Airflow | 8085 |
| Superset | 8088 |

## Annexe 3 - Captures conseillees

Pour enrichir le rapport, ajouter les captures suivantes :

1. Page de connexion.
2. Dashboard RH.
3. Espace employe.
4. Espace manager.
5. Gestion des offres.
6. Pipeline de candidatures.
7. Score de matching IA.
8. Organigramme.
9. BI Analytics.
10. Airflow DAG.
11. Superset dashboard.
12. Rapport qualite.
13. Swagger API.
14. Tables du Data Warehouse.

## Annexe 4 - Resume oral

ESSRA est une plateforme SIRH complete qui centralise la gestion des ressources humaines. Le projet repose sur un backend microservices Spring Boot, un frontend Angular 17, une securite JWT avec integration Keycloak et une couche Business Intelligence. Il permet de gerer les employes, les postes, les departements, les offres, les candidatures et les indicateurs RH. La partie BI utilise Python, dbt, Airflow et Superset pour produire des tableaux de bord decisionnels. Le projet integre aussi l'intelligence artificielle pour le matching des candidatures, le chatbot RH et les analyses predictives.

