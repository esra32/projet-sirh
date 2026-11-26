# Rapport PFE detaille Scrum - Projet ESSRA / SIRH

## Page de garde a completer

**Projet de Fin d'Etudes**

**Titre :** Developpement d'une application SIRH en architecture microservices et mise en place d'une infrastructure Business Intelligence

**Projet :** ESSRA - Systeme d'Information des Ressources Humaines

**Etudiant :** A completer

**Encadrant academique :** A completer

**Encadrant professionnel :** A completer

**Etablissement :** A completer

**Annee universitaire :** 2025-2026

---

## Remerciements

Je tiens a remercier toutes les personnes qui ont contribue, directement ou indirectement, a la realisation de ce projet de fin d'etudes. Je remercie mon encadrant academique pour son accompagnement, ses remarques et son suivi tout au long du projet. Je remercie egalement mon encadrant professionnel pour ses orientations techniques et fonctionnelles, ainsi que pour les conseils apportes lors des phases de conception, de developpement et de validation.

Je remercie enfin toute personne ayant participe aux echanges autour des besoins metier RH, de l'architecture microservices, de la securite, de la Business Intelligence et de l'integration de l'intelligence artificielle dans le processus de recrutement.

---

## Resume

Ce projet de fin d'etudes consiste a concevoir et developper une plateforme SIRH moderne dediee a la gestion des ressources humaines, au recrutement interne, a la mobilite, au matching de competences et a l'analyse decisionnelle. L'application est basee sur une architecture microservices Spring Boot pour le backend, une interface Angular pour le frontend, une securite reposant sur JWT avec integration Keycloak, et une infrastructure Business Intelligence composee de MySQL, Python, dbt, Airflow, Superset et MLflow.

Le travail a ete organise selon une demarche Scrum en quatre sprints. Le premier sprint a porte sur l'authentification, la gestion des roles, l'integration Keycloak et la gestion de la population RH. Le deuxieme sprint a ete consacre a la gestion des emplois, des offres, des candidatures et au processus de validation RH. Le troisieme sprint a introduit le workflow de recrutement, le matching classique, le matching IA, la generation de questions d'entretien et le chatbot RH. Le quatrieme sprint a porte sur la mise en place de la chaine BI, la modelisation du Data Warehouse, les tableaux de bord et les modeles de Machine Learning.

La solution obtenue permet a un employe de consulter les opportunites internes, de postuler, de suivre ses candidatures et de mettre a jour ses competences. Elle permet a un manager de proposer des offres, de suivre les candidatures et de participer au processus de recrutement. Elle permet a l'administrateur RH de superviser les utilisateurs, les employes, les departements, les postes, les offres, les candidatures, les dashboards BI et les indicateurs predictifs.

---

## Abstract

This final-year project focuses on the design and implementation of a modern Human Resources Information System based on a microservices architecture. The platform includes employee management, internal recruitment, mobility, AI-assisted matching, HR dashboards and predictive analytics. The backend is developed with Spring Boot, the frontend with Angular, the security layer with JWT and Keycloak integration, and the BI environment with MySQL, Python, dbt, Airflow, Superset and MLflow.

The project was managed using the Scrum methodology and divided into four sprints: authentication and employee population management, job offer and recruitment management, recruitment workflow and AI matching, then Business Intelligence and Machine Learning. The final system provides operational HR features and decision-making dashboards to improve recruitment follow-up, skills analysis and talent management.

---

## Table des matieres

1. Introduction generale
2. Methodologie Scrum adoptee
3. Chapitre 1 - Sprint 1 : Authentification Keycloak/JWT et gestion de population
4. Chapitre 2 - Sprint 2 : Gestion des emplois, offres et processus de recrutement
5. Chapitre 3 - Sprint 3 : Workflow, matching, matching IA et chatbot RH
6. Chapitre 4 - Sprint 4 : Business Intelligence et Machine Learning
7. Conclusion generale
8. Perspectives
9. Annexes

---

# Introduction generale

## Contexte du projet

Les entreprises modernes ont besoin de solutions RH capables de centraliser les informations des employes, de faciliter le recrutement interne, de suivre la mobilite, d'analyser les competences et d'exploiter les donnees pour prendre de meilleures decisions. Un SIRH classique permet souvent de stocker les informations administratives, mais il reste limite lorsqu'il s'agit d'automatiser le matching entre les profils et les offres, de produire des indicateurs decisionnels ou de predire certains phenomenes RH comme le turnover.

Dans ce contexte, le projet ESSRA a pour objectif de developper une plateforme SIRH complete reposant sur deux axes complementaires :

- une application operationnelle en architecture microservices pour gerer les utilisateurs, les employes, les departements, les postes, les offres, les candidatures, les notifications et le matching ;
- une infrastructure Business Intelligence permettant d'extraire, transformer, historiser, visualiser et analyser les donnees issues de l'application.

Le projet ne se limite donc pas a une application CRUD. Il couvre toute la chaine de valeur : identification des besoins metier, conception technique, developpement backend, developpement frontend, securisation des acces, automatisation du workflow de recrutement, integration d'IA, construction d'un Data Warehouse, creation de dashboards et experimentation de modeles ML.

## Problematique

La problematique principale du projet peut etre formulee ainsi :

Comment concevoir une plateforme SIRH moderne, securisee et evolutive, capable de gerer les processus RH operationnels tout en exploitant les donnees produites pour fournir des indicateurs decisionnels et des analyses predictives ?

Cette problematique contient plusieurs sous-problemes :

- comment separer les responsabilites techniques dans une architecture microservices ;
- comment securiser l'acces selon les roles employe, manager et administrateur RH ;
- comment integrer Keycloak tout en conservant un mecanisme JWT interne compatible avec les services ;
- comment gerer la population RH : employes, departements, postes, contrats, competences et organigramme ;
- comment gerer le cycle de vie d'une offre d'emploi depuis sa creation par le manager jusqu'a sa validation par le RH ;
- comment permettre a un candidat ou employe de postuler et suivre l'etat de sa candidature ;
- comment calculer un score de matching entre un candidat et une offre ;
- comment enrichir ce matching avec une IA capable d'extraire des competences et de generer des questions d'entretien ;
- comment construire une infrastructure BI exploitable a partir des bases de donnees operationnelles ;
- comment produire des indicateurs RH, des dashboards et des modeles predictifs.

## Solution proposee

La solution proposee est une plateforme SIRH composee de trois grands blocs :

**Bloc applicatif frontend :** une application Angular 17 organisee par espaces utilisateurs. L'espace employe permet de consulter le profil, les offres internes, les candidatures, la mobilite et l'annuaire. L'espace manager permet de publier des offres, suivre les candidats et consulter des rapports d'equipe. L'espace RH Admin permet de gerer les departements, postes, contrats, utilisateurs, recrutement, organigramme, matching et liens BI.

**Bloc backend microservices :** une architecture Spring Boot 3.2.4 avec quatre modules principaux : `api-gateway`, `auth-service`, `employee-service` et `recruitment-service`. Chaque service possede sa responsabilite propre et expose des API REST securisees.

**Bloc BI et ML :** une infrastructure `sirh-bi` basee sur extraction Python, zone staging, dbt, snapshots SCD Type 2, Data Warehouse, tests qualite, Airflow, Superset et scripts Machine Learning.

## Objectifs fonctionnels

Les principaux objectifs fonctionnels sont :

- authentifier les utilisateurs et gerer les roles ;
- connecter l'application avec Keycloak pour preparer le SSO ;
- gerer les employes, departements, services, postes, contrats et competences ;
- construire un organigramme de l'entreprise ;
- publier, valider, refuser, fermer et supprimer des offres ;
- permettre aux candidats/employes de postuler ;
- suivre les candidatures par statut ;
- calculer un score de matching candidat/offre ;
- enrichir le profil candidat avec l'IA ;
- generer des questions d'entretien personnalisees ;
- proposer un chatbot RH pour assister les utilisateurs ;
- produire des dashboards RH et BI ;
- alimenter des modeles ML pour le turnover, la segmentation, la retention, les high potentials et la prevision des embauches.

## Objectifs techniques

Les objectifs techniques sont :

- appliquer une architecture microservices modulaire ;
- separer les bases de donnees operationnelles ;
- utiliser Spring Security, JWT et Keycloak ;
- exposer les routes via une API Gateway ;
- utiliser Angular standalone components, guards et services ;
- mettre en place un pipeline ETL/ELT ;
- modeliser un schema decisionnel avec dimensions et faits ;
- automatiser les traitements avec Airflow ;
- documenter et tester les transformations avec dbt ;
- visualiser les donnees avec Superset ;
- suivre les experimentations ML avec MLflow.

## Architecture generale

L'architecture globale se presente de la facon suivante :

```text
Utilisateur
    |
    v
Frontend Angular 17
    |
    v
API Gateway Spring Cloud Gateway
    |
    +--> Auth Service        -> Base sirh_auth
    +--> Employee Service    -> Base sirh_employee
    +--> Recruitment Service -> Base sirh_recruitment
    |
    v
Extraction Python / Staging / dbt / Data Warehouse / Superset / MLflow
```

Le frontend communique avec l'API Gateway. La Gateway route les requetes vers le bon microservice et applique un filtre de securite JWT. Les services backend gerent les traitements metier et persistent les donnees. La partie BI extrait les donnees des bases operationnelles vers un staging, les transforme avec dbt et les expose dans un Data Warehouse pour la visualisation et les modeles ML.

## Cahier des charges retenu

Le cahier des charges demande une plateforme SIRH basee sur Angular, Spring Boot et une architecture microservices, ainsi qu'une infrastructure Business Intelligence complete. Les exigences principales retenues pour ce rapport sont :

| Domaine | Exigences du cahier des charges | Couverture dans le rapport |
| --- | --- | --- |
| Frontend | Interface moderne, responsive, espace employe, espace manager, espace RH admin | Sprints 1, 2 et 3 |
| Backend | Microservices d'authentification, employes, recrutement, API Gateway | Sprints 1 et 2 |
| Securite | JWT, roles, permissions, Keycloak, protection des endpoints | Sprint 1 |
| Gestion RH | Employes, departements, postes, contrats, organigramme, documents, competences | Sprint 1 |
| Recrutement | Offres internes, candidatures, validation RH, suivi des statuts | Sprint 2 |
| Matching | Correspondance competences/offres, score de matching, IA | Sprint 3 |
| Chatbot | Assistance RH, questions sur offres, candidatures, matching et mobilite | Sprint 3 |
| BI | Data Warehouse, ETL/ELT, modelisation dimensionnelle, dashboards | Sprint 4 |
| Qualite | Tests dbt, controle des valeurs, fraicheur, integrite | Sprint 4 |
| ML | Turnover, segmentation, retention, high potentials, prevision des embauches | Sprint 4 |

Cette couverture montre que le projet repond a la fois aux besoins operationnels du SIRH et aux besoins analytiques de la partie BI.

---

# Methodologie Scrum adoptee

## Choix de Scrum

La methode Scrum a ete choisie car le projet contient plusieurs modules evolutifs : authentification, gestion RH, recrutement, matching, IA, BI et ML. Une approche sequentielle stricte aurait rendu difficile l'adaptation aux changements fonctionnels et techniques. Scrum permet au contraire de decouper le projet en increments livrables et de valider progressivement chaque partie.

Dans ce projet, chaque sprint correspond a un chapitre de realisation :

- Sprint 1 : securite, Keycloak/JWT et gestion de population ;
- Sprint 2 : gestion des emplois, offres et processus de recrutement ;
- Sprint 3 : workflow, matching, matching IA et chatbot RH ;
- Sprint 4 : Business Intelligence et Machine Learning.

## Roles Scrum

**Product Owner :** represente le besoin RH. Il priorise les fonctionnalites : securite, gestion des employes, recrutement, matching, reporting et BI.

**Scrum Master :** veille au respect de la methode Scrum, a la clarte du backlog et a la levee des blocages techniques.

**Equipe de developpement :** assure l'analyse, la conception, le developpement backend, frontend, BI, tests et documentation.

Dans le cadre d'un PFE, ces roles peuvent etre portes par une meme personne, mais ils restent utiles pour structurer la demarche : definir les besoins, organiser les priorites, developper, tester et presenter les livrables.

## Product Backlog global

Le backlog global a ete constitue a partir du cahier des charges. Les principaux items sont :

| ID | Fonctionnalite | Priorite | Sprint |
| --- | --- | --- | --- |
| PB-01 | Authentification et inscription | Haute | Sprint 1 |
| PB-02 | Gestion des roles EMPLOYEE, MANAGER, HR_ADMIN | Haute | Sprint 1 |
| PB-03 | Integration Keycloak cote frontend/backend | Haute | Sprint 1 |
| PB-04 | Gestion CRUD des employes | Haute | Sprint 1 |
| PB-05 | Gestion des departements, postes et contrats | Haute | Sprint 1 |
| PB-06 | Organigramme et competences employe | Moyenne | Sprint 1 |
| PB-07 | Creation d'offres par le manager | Haute | Sprint 2 |
| PB-08 | Validation/refus des offres par le RH | Haute | Sprint 2 |
| PB-09 | Consultation des offres publiees | Haute | Sprint 2 |
| PB-10 | Depot et suivi des candidatures | Haute | Sprint 2 |
| PB-11 | Notifications et emails de recrutement | Moyenne | Sprint 2 |
| PB-12 | Workflow Kanban de candidature | Haute | Sprint 3 |
| PB-13 | Matching par competences | Haute | Sprint 3 |
| PB-14 | Extraction IA des competences | Haute | Sprint 3 |
| PB-15 | Generation de questions d'entretien | Moyenne | Sprint 3 |
| PB-16 | Chatbot RH ARIA | Moyenne | Sprint 3 |
| PB-17 | Extraction des donnees vers staging | Haute | Sprint 4 |
| PB-18 | Data Warehouse et modele dimensionnel | Haute | Sprint 4 |
| PB-19 | Dashboards BI RH | Haute | Sprint 4 |
| PB-20 | Tests qualite dbt | Moyenne | Sprint 4 |
| PB-21 | Modeles ML RH | Haute | Sprint 4 |
| PB-22 | Suivi MLflow | Moyenne | Sprint 4 |

## Definition of Done

Une fonctionnalite est consideree terminee lorsque :

- le besoin fonctionnel est implemente ;
- les API sont disponibles et testables ;
- le frontend consomme correctement les donnees ;
- les regles de securite sont appliquees ;
- les erreurs principales sont gerees ;
- la documentation technique est mise a jour ;
- le resultat peut etre presente pendant une demonstration.

## Reponse a la question : ou placer le chatbot ?

Le chatbot doit etre place principalement dans le **Chapitre 3 - Sprint 3 : Workflow, matching, matching IA et chatbot RH**.

La raison est que le chatbot n'est pas un simple outil d'affichage BI. Il appartient surtout a la couche IA applicative qui assiste l'utilisateur dans le recrutement : recherche d'offres, explication du processus de candidature, aide au matching, conseils pour ameliorer le profil, informations sur les contrats et preparation aux entretiens.

Dans le rapport, il faut donc le presenter comme une extension du module IA du recrutement, apres le matching classique et le matching IA. Ensuite, dans le chapitre 4, on peut le mentionner en perspective : le chatbot pourrait plus tard interroger les donnees BI pour repondre a des questions analytiques du type "quel departement recrute le plus ?" ou "quels profils ont le plus haut risque de turnover ?".

Structure conseillee :

- Chapitre 3.5 : Chatbot RH intelligent ARIA ;
- Chapitre 3.6 : Securite, rate limiting et journalisation des usages IA ;
- Chapitre 4, perspectives BI : evolution possible vers un chatbot analytique connecte au Data Warehouse.

---

# Chapitre 1 - Sprint 1 : Authentification Keycloak/JWT et gestion de population

## 1.1 Objectif du sprint

Le premier sprint avait pour objectif de mettre en place les fondations de l'application. Avant de developper les modules metier, il etait necessaire de securiser l'acces, d'identifier les utilisateurs, de definir les roles et de creer le module de gestion de population RH.

Ce sprint couvre donc deux grands blocs :

- l'authentification avec JWT et integration Keycloak ;
- la gestion de population : employes, departements, postes, contrats, services, competences et organigramme.

## 1.2 Sprint backlog

| User Story | Description | Critere d'acceptation |
| --- | --- | --- |
| US1 | En tant qu'utilisateur, je veux m'inscrire et me connecter | L'utilisateur recoit un token et accede a son espace |
| US2 | En tant qu'admin RH, je veux gerer les roles | Les roles controlent les routes et API |
| US3 | En tant qu'entreprise, je veux preparer l'integration Keycloak | Le frontend peut initialiser Keycloak et echanger le token |
| US4 | En tant que RH, je veux gerer les employes | CRUD employes fonctionnel |
| US5 | En tant que RH, je veux gerer les departements et postes | CRUD departements/postes fonctionnel |
| US6 | En tant que RH, je veux gerer les competences des employes | Ajout et mise a jour des competences |
| US7 | En tant qu'utilisateur, je veux etre redirige selon mon role | Employee, Manager et RH accedent a leurs espaces |

## 1.3 Analyse du besoin de securite

Le SIRH contient des donnees sensibles : informations personnelles, salaires, contrats, CV, candidatures, competences, statuts de recrutement et indicateurs RH. La securite n'est donc pas une option. Il faut garantir que :

- un employe ne puisse pas acceder aux fonctions d'administration RH ;
- un manager puisse gerer ses besoins de recrutement sans supprimer toute la population ;
- un administrateur RH puisse superviser les utilisateurs et les referentiels ;
- les appels API soient proteges par un token ;
- les routes frontend soient protegees par des guards ;
- les roles soient normalises entre Keycloak, JWT interne, backend et frontend.

Trois roles principaux ont ete retenus :

- `EMPLOYEE` : employe standard ;
- `MANAGER` : responsable d'equipe ou createur d'offres ;
- `HR_ADMIN` : administrateur RH.

## 1.4 Architecture de l'authentification

Le systeme d'authentification repose sur plusieurs composants :

**Auth Service :** il gere l'inscription, la connexion, le refresh token, la gestion des utilisateurs, la gestion des roles et l'echange de token Keycloak.

**JWT Service :** il genere des access tokens et refresh tokens. L'access token contient le sujet, les roles, la date d'emission et l'expiration.

**API Gateway :** elle centralise les routes et applique un filtre JWT avant de laisser passer les requetes vers `employee-service` ou `recruitment-service`.

**Frontend Angular :** il stocke la session, decode le token, extrait les roles, applique les guards et redirige l'utilisateur selon son role.

**Keycloak :** il est integre comme fournisseur d'identite optionnel. Le frontend initialise Keycloak avec `keycloak-js`, puis le backend peut echanger un token Keycloak valide contre une session interne compatible avec les microservices.

Le flux peut etre resume comme suit :

```text
Utilisateur
    |
    v
Login Angular ou Keycloak
    |
    v
Auth Service
    |
    +--> validation identifiants internes
    +--> ou validation token Keycloak
    |
    v
Generation access token + refresh token
    |
    v
Frontend stocke la session
    |
    v
API Gateway valide le JWT pour les appels proteges
```

## 1.5 Demarche realisee pour l'authentification interne

La premiere etape a consiste a creer le service `auth-service`. Ce service contient les entites utilisateurs et roles, les DTO d'inscription et de connexion, les controllers REST et la logique de generation JWT.

Les endpoints principaux sont :

| Endpoint | Methode | Role |
| --- | --- | --- |
| `/api/auth/register` | POST | Inscription interne |
| `/api/auth/login` | POST | Connexion interne |
| `/api/auth/refresh` | POST | Renouvellement du token |
| `/api/auth/users` | GET | Liste des utilisateurs |
| `/api/auth/users/{id}` | DELETE | Suppression utilisateur |
| `/api/auth/keycloak/register` | POST | Creation utilisateur Keycloak |
| `/api/auth/keycloak/exchange` | POST | Echange token Keycloak vers JWT interne |

Lors de l'inscription, l'utilisateur est cree avec le role `EMPLOYEE` par defaut. Ce choix est important pour la securite : un utilisateur public ne peut pas s'auto-attribuer le role `MANAGER` ou `HR_ADMIN`. Les roles eleves doivent etre attribues via un workflow admin.

Lors de la connexion, le backend authentifie l'utilisateur avec Spring Security, recupere ses roles, puis genere :

- un access token de courte duree ;
- un refresh token de duree plus longue.

Le refresh token evite a l'utilisateur de se reconnecter trop souvent, tout en gardant un access token limite dans le temps.

## 1.6 Integration Keycloak

L'objectif de Keycloak est de preparer l'application a un mode SSO professionnel. Keycloak permet de centraliser les identites, les realms, les clients, les roles et les sessions. Dans le cadre du projet, l'integration Keycloak joue un role important car elle montre que le SIRH peut s'ouvrir vers un fournisseur d'identite externe.

Cote frontend, le service `KeycloakAuthService` utilise `keycloak-js`. Il lit la configuration depuis l'environnement Angular :

- URL Keycloak ;
- realm ;
- clientId ;
- activation ou non de Keycloak.

L'initialisation se fait avec :

- `onLoad: check-sso` pour verifier s'il existe deja une session ;
- `pkceMethod: S256` pour renforcer le flux OAuth2/OIDC ;
- `silentCheckSsoRedirectUri` pour permettre une verification silencieuse.

Cote backend, `AuthService` propose une methode d'echange :

1. le frontend recupere un token Keycloak ;
2. le frontend appelle `/api/auth/keycloak/exchange` ;
3. le backend valide le token Keycloak ;
4. il extrait l'email et les roles ;
5. il mappe les roles Keycloak vers les roles internes ;
6. il cree l'utilisateur local si necessaire ;
7. il genere un JWT interne compatible avec les autres services.

Cette approche combine les avantages de Keycloak et la simplicite d'un JWT interne partage par les microservices.

## 1.7 Gestion des roles et guards Angular

Dans Angular, la navigation est organisee en trois espaces :

- `/employee` pour les employes ;
- `/manager` pour les managers ;
- `/rh-admin` pour les administrateurs RH.

Chaque espace est protege par deux niveaux :

- `authGuard` verifie que l'utilisateur est authentifie ;
- `roleGuard` verifie que l'utilisateur possede au moins un role autorise.

La redirection automatique fonctionne de la maniere suivante :

- si l'utilisateur a le role `HR_ADMIN`, il est redirige vers `/rh-admin` ;
- s'il a le role `MANAGER`, il est redirige vers `/manager` ;
- sinon, il est redirige vers `/employee`.

Le frontend normalise aussi les roles pour eviter les incoherences entre `ROLE_HR_ADMIN`, `hr-admin`, `HR.ADMIN` ou `HR_ADMIN`. Cette normalisation est essentielle car Keycloak et Spring Security peuvent representer les roles differemment.

## 1.8 API Gateway et securisation des routes

L'API Gateway expose un point d'entree unique. Les routes principales sont :

| Route Gateway | Service cible |
| --- | --- |
| `/api/auth/**` | auth-service |
| `/api/employees/**` | employee-service |
| `/api/departments/**` | employee-service |
| `/api/positions/**` | employee-service |
| `/api/services/**` | employee-service |
| `/api/orgchart/**` | employee-service |
| `/api/mobility/**` | employee-service |
| `/api/job-offers/**` | recruitment-service |
| `/api/applications/**` | recruitment-service |
| `/api/skills/**` | recruitment-service |
| `/api/notifications/**` | recruitment-service |
| `/api/chat/**` | recruitment-service |
| `/api/market/**` | recruitment-service |

Les routes metier sont protegees par `AuthJwtFilter`. Ce filtre valide le token et empeche les appels non authentifies d'atteindre les microservices.

## 1.9 Gestion de population RH

La gestion de population correspond a la gestion des donnees de base de l'entreprise. Elle constitue le coeur administratif du SIRH.

Les elements geres sont :

- les employes ;
- les departements ;
- les postes ;
- les services ;
- les contrats ;
- les competences ;
- les liens manager-employe ;
- l'organigramme ;
- les demandes de mobilite.

## 1.10 CRUD employes

Le module `employee-service` expose les API de gestion des employes. L'entite `Employee` contient notamment :

- identifiant UUID ;
- prenom ;
- nom ;
- email unique ;
- telephone ;
- adresse ;
- ville ;
- salaire ;
- date d'embauche ;
- departement ;
- poste ;
- type de contrat ;
- service ;
- manager direct ;
- competences.

Les endpoints principaux sont :

| Endpoint | Methode | Description |
| --- | --- | --- |
| `/api/employees` | GET | Liste des employes |
| `/api/employees?search=` | GET | Recherche par nom ou email |
| `/api/employees?department=` | GET | Filtrage par departement |
| `/api/employees/{id}` | GET | Detail employe |
| `/api/employees` | POST | Creation employe |
| `/api/employees/{id}` | PUT | Modification employe |
| `/api/employees/{id}` | DELETE | Suppression employe |
| `/api/employees/{id}/skills` | GET | Liste des competences |
| `/api/employees/{id}/skills` | PUT | Mise a jour des competences |

La creation et la suppression sont reservees au role `HR_ADMIN`. La modification peut etre autorisee au RH et au manager selon le contexte.

## 1.11 Gestion des departements

Les departements representent les grandes entites organisationnelles de l'entreprise : Informatique, Ressources Humaines, Finance, Marketing, Commercial, Data, etc.

Le CRUD departements permet :

- d'ajouter un departement ;
- de modifier son nom ;
- de le consulter ;
- de le supprimer si les contraintes metier le permettent.

Le controller `/api/departments` protege les operations sensibles par `HR_ADMIN`, ce qui evite a un utilisateur simple de modifier la structure de l'entreprise.

## 1.12 Gestion des postes

Les postes representent les fonctions occupees ou ouvertes dans l'entreprise : developpeur, data analyst, manager RH, chef de projet, DevOps, etc.

Les endpoints de postes permettent :

- de lister les postes ;
- de filtrer les postes par departement ;
- de creer un poste ;
- de modifier un poste ;
- de supprimer un poste.

Cette fonctionnalite est importante car elle sert ensuite au recrutement : une offre d'emploi correspond souvent a un poste rattache a un departement.

## 1.13 Gestion des contrats

La gestion des contrats permet de distinguer les types :

- CDI ;
- CDD ;
- STAGE ;
- FREELANCE ;
- ALTERNANCE.

Cette information est utile dans trois dimensions :

- operationnelle : connaitre le statut contractuel d'un employe ;
- BI : analyser la repartition des contrats ;
- ML : utiliser le type de contrat comme variable de prediction du turnover ou de segmentation.

## 1.14 Competences et organigramme

Les competences sont rattachees aux employes avec un niveau. Elles servent au matching candidat/offre et aux analyses BI de gaps de competences.

L'organigramme est construit a partir du lien `manager_id` de l'entite `Employee`. Un employe peut avoir un manager direct ; si le manager est absent, l'employe se trouve au sommet de la hierarchie. Cela permet d'afficher une structure arborescente de l'entreprise.

## 1.15 Interface frontend du sprint 1

Le frontend a ete organise par espace :

**Espace Employe :**

- dashboard personnel ;
- profil ;
- offres internes ;
- candidatures ;
- mobilite ;
- entretiens ;
- annuaire.

**Espace Manager :**

- dashboard manager ;
- profil ;
- postes ;
- candidatures ;
- mobilite equipe ;
- rapports equipe.

**Espace RH Admin :**

- dashboard RH ;
- profil ;
- departements ;
- postes ;
- contrats ;
- recrutement interne ;
- mobilite ;
- politiques mobilite ;
- organigramme ;
- matching employes ;
- utilisateurs ;
- liens BI, dbt et Airflow.

## 1.16 Tests et validation du sprint 1

La validation du sprint 1 s'est faite autour des scenarios suivants :

- creation d'un compte employe ;
- connexion avec email/mot de passe ;
- generation d'un access token et d'un refresh token ;
- redirection selon le role ;
- acces refuse aux routes non autorisees ;
- creation d'un employe par RH ;
- modification d'un employe ;
- recherche d'un employe ;
- creation d'un departement ;
- creation d'un poste ;
- affectation d'un employe a un departement et a un poste ;
- mise a jour des competences.

## 1.17 Difficultes rencontrees et solutions

**Incoherence des roles :** les roles peuvent venir sous plusieurs formats. La solution a ete de normaliser les roles cote frontend et backend.

**Coexistence Keycloak/JWT interne :** Keycloak produit un token OIDC, mais les microservices utilisent un JWT interne. La solution a ete d'ajouter un endpoint d'echange de token.

**Protection des routes :** il fallait proteger a la fois le frontend et le backend. La solution a ete d'utiliser des guards Angular, un interceptor HTTP et un filtre Gateway.

**Gestion des relations employe/departement/poste :** les entites JPA doivent gerer correctement les relations `ManyToOne`. Les DTO permettent d'eviter d'exposer directement les entites.

## 1.18 Bilan du sprint 1

Le sprint 1 a permis de livrer les fondations de la plateforme. A la fin du sprint, l'application disposait d'une authentification fonctionnelle, d'une gestion des roles, d'une integration Keycloak, d'une API Gateway securisee et d'un module de gestion de population RH.

Ce sprint etait indispensable pour demarrer les modules suivants, car le recrutement, le matching, la BI et le ML reposent tous sur des utilisateurs, des employes, des roles et des donnees RH fiables.

---

# Chapitre 2 - Sprint 2 : Gestion des emplois, offres et processus de recrutement

## 2.1 Objectif du sprint

Le deuxieme sprint a porte sur la gestion des emplois et du recrutement. L'objectif etait de permettre a un manager de creer une offre, au RH de la valider ou de la refuser, puis aux employes ou candidats de postuler aux offres publiees.

Ce sprint transforme la plateforme SIRH en outil de recrutement interne. Il introduit la notion d'offre, de candidature, de statut, de CV, de lettre de motivation, de notifications et d'emails.

## 2.2 Sprint backlog

| User Story | Description | Critere d'acceptation |
| --- | --- | --- |
| US1 | En tant que manager, je veux creer une offre | L'offre est creee en attente de validation |
| US2 | En tant que RH, je veux consulter les offres a valider | Les offres `PENDING_VALIDATION` sont visibles |
| US3 | En tant que RH, je veux publier une offre | L'offre passe a `PUBLISHED` |
| US4 | En tant que RH, je veux refuser une offre | L'offre passe a `CANCELLED` avec motif |
| US5 | En tant qu'employe, je veux voir les offres publiees | Seules les offres publiees sont visibles |
| US6 | En tant que candidat, je veux postuler | La candidature est enregistree |
| US7 | En tant que RH/manager, je veux suivre les candidatures | Les statuts sont visibles et modifiables |
| US8 | En tant que candidat, je veux recevoir une notification | Notification/email envoyes |

## 2.3 Analyse du processus de recrutement

Le processus de recrutement implemente repose sur plusieurs acteurs :

**Manager :** il identifie un besoin dans son equipe et cree une offre. Il renseigne le titre, la description, le departement, la localisation, les dates, les competences requises et ses informations de createur.

**Administrateur RH :** il controle la qualite de l'offre. Il peut la valider et la publier, ou la refuser avec un motif. Il supervise aussi les candidatures.

**Employe ou candidat :** il consulte les offres publiees, choisit une offre, complete sa candidature, ajoute une lettre de motivation, un CV et eventuellement des competences.

**Systeme :** il enregistre les donnees, calcule un score, notifie les personnes concernees et conserve l'historique du processus.

## 2.4 Cycle de vie d'une offre

Le cycle de vie d'une offre suit les statuts suivants :

```text
DRAFT
   |
   v
PENDING_VALIDATION
   |
   +--> PUBLISHED
   |        |
   |        v
   |      CLOSED
   |
   +--> CANCELLED
```

Dans le projet, lorsqu'un manager cree une offre, elle passe automatiquement en `PENDING_VALIDATION`. Ce choix reflete un processus RH realiste : une offre ne doit pas etre visible par les employes tant qu'elle n'a pas ete validee.

Lorsque le RH valide l'offre, elle passe en `PUBLISHED` et devient consultable. Si le RH refuse, l'offre passe en `CANCELLED` et une notification peut etre envoyee au manager avec le motif.

## 2.5 CRUD des offres

Le controller `JobOfferController` expose les operations principales :

| Endpoint | Methode | Description |
| --- | --- | --- |
| `/api/job-offers` | GET | Liste des offres |
| `/api/job-offers?status=PUBLISHED` | GET | Offres publiees |
| `/api/job-offers?department=` | GET | Filtrage par departement |
| `/api/job-offers?createdByEmail=` | GET | Offres creees par un manager |
| `/api/job-offers/{id}` | GET | Detail d'une offre |
| `/api/job-offers` | POST | Creation d'une offre |
| `/api/job-offers/{id}` | PUT | Modification d'une offre |
| `/api/job-offers/{id}/publish` | POST | Validation et publication |
| `/api/job-offers/{id}/close` | POST | Fermeture |
| `/api/job-offers/{id}/refuse` | POST | Refus par RH |
| `/api/job-offers/pending-validation` | GET | Offres en attente |
| `/api/job-offers/{id}` | DELETE | Suppression |

Le service `JobOfferService` applique la logique metier. Lors de la creation, il force le statut `PENDING_VALIDATION`, enregistre le createur, sauvegarde l'offre et notifie le RH.

Lors de la publication, il renseigne la date de publication et notifie le manager. Lors du refus, il conserve le statut annule et envoie une notification avec le motif.

## 2.6 Donnees d'une offre

Une offre contient :

- titre ;
- description ;
- departement ;
- localisation ;
- statut ;
- date de publication ;
- date limite ;
- date de creation ;
- email du createur ;
- nom du createur ;
- liste des competences requises.

Les competences requises sont essentielles pour le sprint 3, car elles servent au calcul du matching avec les competences du candidat.

## 2.7 Depot d'une candidature

Le depot d'une candidature est gere par `ApplicationController` et `ApplicationService`.

Un candidat renseigne :

- l'offre concernee ;
- son email ;
- son nom ;
- sa lettre de motivation ;
- son CV ;
- les competences declarees ou detectees ;
- la date de candidature.

Si aucune competence n'est envoyee explicitement, le systeme peut tenter d'extraire automatiquement des competences a partir de la lettre de motivation et du nom du fichier CV. Cette partie prepare le matching IA du sprint 3.

## 2.8 CRUD des candidatures

Les endpoints principaux sont :

| Endpoint | Methode | Description |
| --- | --- | --- |
| `/api/applications` | GET | Liste des candidatures |
| `/api/applications?offerId=` | GET | Candidatures d'une offre |
| `/api/applications?email=` | GET | Candidatures d'un candidat |
| `/api/applications/{id}` | GET | Detail candidature |
| `/api/applications` | POST | Postuler |
| `/api/applications/{id}/status` | PUT | Changement de statut |
| `/api/applications/match/{offerId}` | GET | Matching des candidatures d'une offre |
| `/api/applications/{id}/cv` | GET | Telechargement du CV |
| `/api/applications/{id}` | DELETE | Suppression candidature |
| `/api/applications/{id}/interview-questions` | GET | Questions d'entretien IA |

## 2.9 Statuts d'une candidature

Le workflow de candidature utilise des statuts permettant de suivre l'avancement :

- `PENDING` : candidature recue ;
- `REVIEWING` : candidature en cours d'etude ;
- `INTERVIEW_SCHEDULED` : entretien planifie ;
- `ACCEPTED` : candidature acceptee ;
- `REJECTED` : candidature refusee.

Ces statuts sont importants pour :

- le suivi operationnel dans le frontend ;
- les notifications au candidat ;
- l'entonnoir de recrutement dans la BI ;
- les indicateurs de taux d'acceptation ;
- les donnees d'entrainement ou d'analyse ML.

## 2.10 Notifications et emails

Le sprint 2 integre un mecanisme de notifications et d'emails. Les notifications permettent de signaler :

- une nouvelle offre a valider ;
- une offre validee ;
- une offre refusee ;
- une candidature recue ;
- un entretien planifie ;
- une candidature acceptee ;
- une candidature rejetee ;
- une confirmation d'envoi d'email.

Ces notifications ameliorent l'experience utilisateur, car les acteurs n'ont pas besoin de verifier manuellement chaque changement d'etat.

## 2.11 Interface frontend manager

Dans l'espace manager, le manager peut :

- consulter son dashboard ;
- acceder au tableau de publication des postes ;
- creer une offre ;
- suivre les offres qu'il a soumises ;
- consulter les candidatures ;
- suivre la mobilite de son equipe ;
- consulter les rapports d'equipe.

Le manager n'a pas le meme niveau d'autorisation que le RH. Il exprime le besoin de recrutement, mais la publication finale depend de la validation RH.

## 2.12 Interface frontend RH

Dans l'espace RH Admin, le RH peut :

- consulter le dashboard global ;
- acceder au module recrutement interne ;
- voir les offres en attente de validation ;
- publier ou refuser les offres ;
- superviser les candidatures ;
- visualiser les statuts ;
- gerer les referentiels necessaires au recrutement.

Ce module donne au RH une vision centrale du processus.

## 2.13 Interface frontend employe/candidat

Dans l'espace employe, l'utilisateur peut :

- consulter les offres internes publiees ;
- postuler a une offre ;
- consulter ses candidatures ;
- suivre le statut de chaque candidature ;
- voir ses entretiens ;
- consulter son profil et ses competences.

Ce parcours rend la mobilite interne plus transparente.

## 2.14 Exemple de scenario complet

Un scenario typique est le suivant :

1. Le manager constate un besoin dans son equipe.
2. Il cree une offre pour un poste donne.
3. L'offre passe en `PENDING_VALIDATION`.
4. Le RH recoit une notification.
5. Le RH consulte l'offre.
6. Le RH valide l'offre.
7. L'offre passe en `PUBLISHED`.
8. Les employes peuvent consulter l'offre.
9. Un candidat depose sa candidature.
10. Le systeme enregistre les informations et le CV.
11. Le systeme calcule un premier score de matching.
12. Le RH ou le manager suit la candidature.
13. Le statut passe en entretien, accepte ou refuse.
14. Le candidat recoit une notification ou un email.

## 2.15 Tests et validation du sprint 2

Les tests fonctionnels du sprint 2 portent sur :

- creation d'une offre par manager ;
- controle du statut initial ;
- affichage des offres en attente cote RH ;
- publication d'une offre ;
- affichage des offres publiees cote employe ;
- refus d'une offre avec motif ;
- depot d'une candidature ;
- filtrage des candidatures par offre ;
- filtrage des candidatures par email ;
- changement de statut ;
- telechargement du CV ;
- declenchement des notifications.

## 2.16 Difficultes rencontrees et solutions

**Separation manager/RH :** le manager cree le besoin, mais le RH valide. Cette regle a ete implementee par le statut `PENDING_VALIDATION`.

**Gestion des pieces jointes CV :** le projet permet de stocker le CV sous forme base64 et de le restituer en PDF via un endpoint dedie.

**Statuts multilingues et BI :** certains statuts doivent etre normalises pour les analyses. Cette normalisation est traitee dans les modeles dbt du sprint 4.

**Notifications non bloquantes :** une erreur d'email ne doit pas annuler la creation de l'offre ou de la candidature. Le service capture donc les erreurs et journalise l'echec.

## 2.17 Bilan du sprint 2

Le sprint 2 a permis de livrer le coeur operationnel du recrutement. L'application gere maintenant les offres, les validations, les candidatures, les CV, les statuts, les notifications et les emails.

Ce sprint prepare directement le sprint 3, car le matching et l'IA ont besoin d'offres, de candidatures et de competences pour fonctionner.

---

# Chapitre 3 - Sprint 3 : Workflow, matching, matching IA et chatbot RH

## 3.1 Objectif du sprint

Le troisieme sprint a pour objectif d'automatiser et d'enrichir le processus de recrutement. Apres avoir mis en place les offres et les candidatures, il fallait aider les RH et les managers a classer les candidats, identifier les meilleurs profils et accompagner les utilisateurs dans leurs demarches.

Ce sprint contient quatre parties :

- workflow de recrutement ;
- matching classique par competences ;
- matching IA avec extraction et enrichissement du profil ;
- chatbot RH ARIA.

## 3.2 Sprint backlog

| User Story | Description | Critere d'acceptation |
| --- | --- | --- |
| US1 | En tant que RH, je veux visualiser le pipeline des candidatures | Les candidatures sont organisees par statut |
| US2 | En tant que manager, je veux classer les candidats d'une offre | Les candidats sont tries par score |
| US3 | En tant que RH, je veux un score de matching | Le score est calcule entre 0 et 100 |
| US4 | En tant que RH, je veux extraire automatiquement les competences | L'IA ou l'heuristique detecte les competences |
| US5 | En tant que RH, je veux enrichir le profil candidat | Le systeme produit un profil structure |
| US6 | En tant que RH, je veux des questions d'entretien | Le systeme genere 5 questions adaptees |
| US7 | En tant qu'utilisateur, je veux poser des questions au chatbot RH | ARIA repond sur les offres et procedures |
| US8 | En tant qu'admin, je veux limiter l'usage IA | Le rate limiting protege l'API |

## 3.3 Workflow de recrutement

Le workflow de recrutement correspond a l'enchainement des statuts d'une candidature :

```text
PENDING
   |
   v
REVIEWING
   |
   v
INTERVIEW_SCHEDULED
   |
   +--> ACCEPTED
   |
   +--> REJECTED
```

Ce workflow permet :

- au candidat de suivre l'etat de sa candidature ;
- au RH de piloter l'activite ;
- au manager de savoir quels candidats sont en cours d'etude ;
- au systeme BI de calculer un entonnoir de recrutement.

Le frontend peut presenter ce suivi sous forme de tableau, de pipeline ou de kanban. Le backend conserve le statut dans l'entite candidature.

## 3.4 Matching classique par competences

Le matching classique est base sur une comparaison entre :

- les competences requises par l'offre ;
- les competences du candidat.

La logique est simple :

```text
score = nombre de competences communes / nombre de competences requises * 100
```

Exemple :

- Offre : Java, Spring Boot, Angular, SQL
- Candidat : Java, Angular, Docker
- Competences communes : Java, Angular
- Score : 2 / 4 * 100 = 50

Ce score permet deja de classer les candidats. Il est utile car il est explicable et facile a justifier devant un jury ou un utilisateur RH.

## 3.5 Smart Match Score

Le projet ne se limite pas a un score brut. Le service `CvSkillExtractorService` contient une methode de score plus intelligente. Le score combine :

- le score de base par competences ;
- un bonus d'experience extrait de la lettre de motivation ;
- un bonus de confiance si le candidat possede plusieurs competences pertinentes.

Le score final reste borne entre 0 et 100.

Cette approche est interessante car elle ne depend pas uniquement des cases cochees. Elle tient compte du texte du candidat et de la richesse du profil.

## 3.6 Extraction automatique des competences

Lorsqu'une candidature est deposee, le candidat peut indiquer ses competences. Cependant, il est possible qu'il oublie de les renseigner. Pour eviter une candidature vide, le systeme analyse :

- la lettre de motivation ;
- le nom du fichier CV ;
- les mots-cles et alias de competences.

Le service maintient une liste d'alias. Par exemple :

- Java : `java`, `jdk`, `jvm` ;
- Spring Boot : `spring`, `spring boot`, `springboot` ;
- Angular : `angular`, `angular17` ;
- SQL : `sql`, `mysql`, `postgresql` ;
- BI : `power bi`, `business intelligence`, `tableau` ;
- Machine Learning : `machine learning`, `ml`, `ia`, `scikit`.

Si Gemini est configure, le service peut demander au modele d'extraire les competences sous forme JSON. Si Gemini n'est pas disponible, le systeme bascule vers une extraction heuristique. Ce fallback rend la fonctionnalite robuste.

## 3.7 Enrichissement IA du profil candidat

Le matching IA ne sert pas seulement a calculer un score. Il peut aussi produire un profil candidat enrichi. Le systeme tente d'extraire :

- les competences ;
- les annees d'experience ;
- le niveau : Junior, Confirme ou Senior ;
- la formation ;
- les langues ;
- les soft skills ;
- un resume narratif du profil.

Le resultat est stocke sous forme JSON dans la candidature. Cette structure peut ensuite etre affichee dans le frontend ou exploitee pour l'aide a la decision.

## 3.8 Generation de questions d'entretien

Une autre fonctionnalite IA consiste a generer des questions d'entretien personnalisees. Le systeme utilise :

- le titre du poste ;
- la description de l'offre ;
- les competences requises ;
- la lettre de motivation ;
- le profil du candidat.

Le resultat attendu est une liste de cinq questions :

- deux questions techniques ;
- une question comportementale ;
- une question situationnelle ;
- une question de motivation.

Si Gemini n'est pas configure, le systeme retourne une liste de questions par defaut. Cela garantit que la fonctionnalite reste disponible meme sans API externe.

## 3.9 Matching dans le frontend RH

Le frontend contient des composants dedies au matching, notamment dans l'espace RH Admin. L'objectif est de permettre au RH de :

- choisir une offre ;
- consulter les candidats associes ;
- voir le score de chaque candidat ;
- comparer les profils ;
- identifier les meilleurs candidats ;
- declencher la suite du workflow.

Le matching transforme une liste brute de candidatures en aide a la decision.

## 3.10 Chatbot RH ARIA

Le chatbot doit etre presente dans ce sprint, car il fait partie de l'assistance IA applicative. Il ne doit pas etre place uniquement dans la partie BI, sauf si on le transforme plus tard en chatbot analytique.

Dans le projet, le chatbot est visible cote frontend via un composant flottant `AiChatComponent`. Il s'appelle ARIA et aide l'utilisateur a comprendre et utiliser le SIRH.

Ses cas d'usage sont :

- rechercher des offres internes ;
- expliquer comment postuler ;
- expliquer le score IA ;
- donner des informations sur les contrats ;
- expliquer les delais de recrutement ;
- donner des conseils pour preparer un entretien ;
- guider l'utilisateur dans la mobilite interne ;
- aider a ameliorer un profil candidat.

## 3.11 Architecture du chatbot

Le chatbot est compose de deux niveaux.

**Frontend Angular :**

- bouton flottant ;
- fenetre de discussion ;
- messages utilisateur et assistant ;
- suggestions rapides ;
- chargement du contexte des offres publiees ;
- formatage Markdown simple.

**Backend Recruitment Service :**

- controller `/api/chat` ;
- service `ChatService` ;
- historique des messages ;
- reponses heuristiques ;
- appel Gemini si la cle API est configuree ;
- recherche d'offres publiees ;
- rate limiting ;
- journalisation des usages IA.

Le flux est le suivant :

```text
Utilisateur
    |
    v
Composant ARIA Angular
    |
    v
POST /api/chat/{sessionId}
    |
    v
ChatService
    |
    +--> Gemini si disponible
    +--> FAQ heuristique sinon
    |
    v
Reponse stockee et retournee au frontend
```

## 3.12 Securite du chatbot

Le chatbot etant lie a l'IA et aux donnees RH, il doit etre protege. Le projet applique plusieurs mecanismes :

- route `/api/chat/**` protegee par la Gateway ;
- autorisation pour les roles `EMPLOYEE`, `MANAGER` et `HR_ADMIN` ;
- verification du message vide ;
- rate limiting : maximum 10 requetes par heure ;
- journalisation de l'usage IA ;
- fallback heuristique si Gemini echoue.

Ces mesures permettent de reduire les risques de surconsommation API, d'abus et de fuite involontaire.

## 3.13 Difference entre chatbot et BI

Il est important de distinguer le chatbot de la BI.

Le chatbot actuel est un assistant operationnel. Il repond sur :

- les offres ;
- les candidatures ;
- les contrats ;
- le matching ;
- la mobilite ;
- les procedures RH.

La BI est une couche analytique. Elle repond a des questions comme :

- combien d'employes par departement ;
- quel taux d'acceptation ;
- quel score moyen de matching ;
- quel taux de mobilite ;
- quelles tendances de recrutement ;
- quels risques de turnover.

Dans le rapport, le chatbot est donc dans le sprint 3. Dans les perspectives du sprint 4, on peut proposer une evolution vers un chatbot BI qui interrogerait le Data Warehouse.

## 3.14 Tests et validation du sprint 3

Les scenarios de validation sont :

- calcul du score de matching pour une offre ;
- classement des candidatures par score ;
- extraction de competences depuis une lettre de motivation ;
- fallback heuristique lorsque Gemini n'est pas configure ;
- generation d'un profil candidat ;
- generation de questions d'entretien ;
- changement de statut d'une candidature ;
- affichage du pipeline de recrutement ;
- ouverture du chatbot ;
- question sur les offres disponibles ;
- question sur le processus de candidature ;
- verification du rate limiting.

## 3.15 Difficultes rencontrees et solutions

**Dependance a une API IA externe :** Gemini peut etre indisponible ou non configure. Le systeme utilise donc des heuristiques en fallback.

**Besoin d'explicabilite :** un score IA opaque serait difficile a justifier. Le projet conserve un score de base explicable par competences, puis ajoute des bonus simples.

**Securite de la cle IA :** la cle doit etre placee cote backend et non exposee dans le frontend. Le chatbot backend evite d'appeler directement l'API IA depuis le navigateur.

**Limitation de l'usage :** le rate limiting protege contre les abus et les couts excessifs.

## 3.16 Bilan du sprint 3

Le sprint 3 a transforme le module recrutement en module intelligent. Le systeme ne se contente plus de stocker des candidatures : il les analyse, les classe, enrichit les profils, genere des questions d'entretien et accompagne l'utilisateur avec ARIA.

Ce sprint prepare le sprint 4, car les scores, statuts, offres, candidatures et competences deviennent des donnees exploitables dans le Data Warehouse et les dashboards BI.

---

# Chapitre 4 - Sprint 4 : Business Intelligence et Machine Learning

## 4.1 Objectif du sprint

Le quatrieme sprint a pour objectif d'exploiter les donnees produites par l'application. Apres avoir developpe les modules operationnels, il etait necessaire de construire une couche decisionnelle permettant d'analyser les donnees RH, de produire des tableaux de bord et d'appliquer des modeles ML.

Ce sprint couvre :

- l'extraction des donnees operationnelles ;
- la zone staging ;
- le Data Warehouse ;
- la modelisation dimensionnelle ;
- les transformations dbt ;
- l'orchestration Airflow ;
- la qualite des donnees ;
- les dashboards Superset ;
- les modeles Machine Learning ;
- le suivi MLflow.

## 4.2 Sprint backlog

| User Story | Description | Critere d'acceptation |
| --- | --- | --- |
| US1 | En tant que RH, je veux analyser les effectifs | Dashboard effectifs disponible |
| US2 | En tant que RH, je veux analyser le recrutement | Entonnoir et KPIs recrutement disponibles |
| US3 | En tant que RH, je veux analyser les competences | Skill gaps et top competences visibles |
| US4 | En tant qu'admin BI, je veux extraire les donnees | Staging alimente par Python |
| US5 | En tant qu'admin BI, je veux un Data Warehouse | Dimensions et faits crees avec dbt |
| US6 | En tant qu'admin BI, je veux des tests qualite | dbt test valide les donnees |
| US7 | En tant que RH, je veux predire le turnover | Table ML de risque disponible |
| US8 | En tant que RH, je veux segmenter les employes | Clusters RH disponibles |
| US9 | En tant que RH, je veux identifier les high potentials | Table high potentials disponible |
| US10 | En tant que RH, je veux prevoir les embauches | Previsions sur 6 mois disponibles |

## 4.3 Architecture BI

L'architecture BI suit une logique en couches :

```text
Bases operationnelles
    |
    +--> sirh_employee
    +--> sirh_recruitment
    |
    v
Extraction Python
    |
    v
sirh_staging
    |
    v
dbt staging + snapshots
    |
    v
sirh_dwh
    |
    +--> dimensions
    +--> faits
    +--> reporting
    +--> tables ML
    |
    v
Superset / Dashboards / MLflow
```

Cette architecture separe clairement :

- les donnees sources ;
- les donnees brutes extraites ;
- les donnees nettoyees ;
- les donnees modelisees pour l'analyse ;
- les restitutions BI et ML.

## 4.4 Extraction vers staging

Le script `extract_staging.py` extrait les donnees des bases operationnelles vers `sirh_staging`. Il copie les donnees brutes sans transformation lourde et ajoute une colonne `extracted_at`.

Les tables extraites sont :

- `stg_departments` ;
- `stg_positions` ;
- `stg_employees` ;
- `stg_employee_skills` ;
- `stg_job_offers` ;
- `stg_applications` ;
- `stg_skills` ;
- `stg_application_skills`.

Cette etape est volontairement simple : elle sert a capturer l'etat des sources avant transformation. Les traitements metier sont ensuite geres par dbt.

## 4.5 Modelisation dimensionnelle

Le Data Warehouse suit une modelisation dimensionnelle avec dimensions et faits.

Les dimensions principales sont :

| Dimension | Role |
| --- | --- |
| `dim_temps` | Analyse temporelle par jour, mois, trimestre, annee |
| `dim_employe` | Informations employes et historique |
| `dim_departement` | Axe organisationnel |
| `dim_poste` | Analyse par poste |
| `dim_competence` | Analyse des competences |
| `dim_offre` | Analyse des offres de recrutement |

Les tables de faits sont :

| Table de faits | Grain | Objectif |
| --- | --- | --- |
| `fait_recrutement` | 1 ligne par candidature | Analyser le pipeline de recrutement |
| `fait_effectifs` | 1 ligne par employe/evenement | Analyser les effectifs |
| `fait_mobilite` | 1 ligne par departement/mois | Suivre les mouvements |
| `fait_competences` | 1 ligne par competence/employe ou offre | Analyser les competences |
| `fait_gap_competences` | 1 ligne par ecart de competence | Identifier les besoins |

Cette modelisation permet aux dashboards de repondre rapidement aux questions RH.

## 4.6 Historisation SCD Type 2

Le projet utilise un snapshot dbt `snap_employe_historique` pour historiser les changements importants :

- changement de departement ;
- changement de poste ;
- changement de type de contrat.

Le principe SCD Type 2 est le suivant :

1. si dbt detecte un changement sur une colonne surveillee, il ferme l'ancienne version ;
2. il cree une nouvelle version active ;
3. il conserve les dates de validite ;
4. il permet d'analyser l'historique complet d'un employe.

Cette partie est importante pour un SIRH, car la mobilite interne et l'evolution de carriere ne doivent pas ecraser l'historique.

## 4.7 Transformations dbt

dbt est utilise pour :

- nettoyer les donnees ;
- standardiser les formats ;
- calculer les colonnes derivees ;
- creer les dimensions ;
- creer les faits ;
- creer les tables de reporting ;
- executer les tests qualite ;
- documenter le modele.

Exemples de transformations :

- normalisation des emails en minuscules ;
- calcul de l'anciennete ;
- normalisation des statuts de candidature ;
- categorisation des scores : excellent, bon, moyen, faible ;
- calcul du taux d'acceptation ;
- calcul du taux de mobilite ;
- calcul du score moyen des candidatures ;
- correction des noms de departements pour assurer les jointures.

## 4.8 Tests qualite

La qualite des donnees est controlee avec dbt et un rapport HTML dedie.

Les tests couvrent :

- `not_null` sur les cles ;
- `unique` sur les identifiants ;
- `accepted_values` sur les statuts, contrats et categories ;
- verification que les scores IA sont entre 0 et 100 ;
- verification que les dates de candidature ne sont pas dans le futur ;
- verification de l'integrite referentielle.

Cette partie est essentielle pour la credibilite BI. Un dashboard base sur des donnees non controlees peut conduire a de mauvaises decisions.

## 4.9 Orchestration Airflow

Le DAG `sirh_bi_pipeline` orchestre l'ensemble du pipeline.

La sequence principale est :

```text
extract_staging
    -> dbt_source_freshness
    -> dbt_snapshot
    -> dbt_run
    -> dbt_test
    -> data_quality_report
    -> ml_turnover
    -> ml_segmentation
    -> ml_high_potentials
    -> ml_forecast
    -> ml_correlations
    -> ml_retention
```

Le pipeline est planifie tous les jours a 02h00. Cette planification permet d'avoir des donnees regulierement mises a jour pour les dashboards et les analyses ML.

## 4.10 Dashboards BI

Les dashboards BI repondent aux besoins du cahier des charges :

**Vue d'ensemble RH :**

- nombre d'employes ;
- repartition par departement ;
- repartition par contrat ;
- anciennete moyenne ;
- mobilite ;
- turnover.

**Analyse du recrutement :**

- nombre d'offres ;
- nombre de candidatures ;
- taux d'acceptation ;
- score moyen IA ;
- entonnoir de recrutement ;
- candidatures par offre ;
- delai moyen des offres.

**Analyse des competences :**

- top competences ;
- gaps de competences ;
- heatmap departement/competence ;
- couverture des competences ;
- competences critiques.

**Analyse temporelle :**

- evolution des effectifs ;
- embauches par mois ;
- tendances par departement ;
- previsions.

## 4.11 Indicateurs BI principaux

Les KPIs les plus importants sont :

| KPI | Signification |
| --- | --- |
| Nombre d'employes | Taille de la population RH |
| Taux CDI | Stabilite contractuelle |
| Anciennete moyenne | Experience et retention |
| Nombre de candidatures | Activite recrutement |
| Taux d'acceptation | Efficacite du recrutement |
| Score IA moyen | Qualite du matching |
| Taux de mobilite | Dynamique interne |
| Pression recrutement | Besoin de recrutement par effectif |
| Couverture competences | Adequation competences disponibles/besoins |
| Risque attrition | Risque de depart |

## 4.12 Machine Learning RH

La partie ML apporte une couche predictive a la BI. Elle ne remplace pas la decision RH, mais elle aide a identifier des signaux, des tendances et des priorites d'action.

Les modeles developpes sont :

| Modele | Methode | Sortie |
| --- | --- | --- |
| ML-1 Turnover | Random Forest + SHAP | `ml_turnover_risk` |
| ML-2 Segmentation | K-Means | `ml_employee_segments` |
| ML-3 High Potentials | Scoring multi-criteres | `ml_high_potentials` |
| ML-4 Prevision embauches | Prophet | `ml_forecast_embauches` |
| ML-5 Correlations | Pearson | `ml_correlations` |
| ML-6 Retention | Score composite | `ml_retention_analysis` |

## 4.13 Prediction du turnover

Le modele de prediction du turnover utilise un Random Forest Classifier. L'objectif est d'estimer la probabilite qu'un employe quitte l'entreprise.

Les variables utilisees peuvent inclure :

- anciennete ;
- type de contrat ;
- departement ;
- poste ;
- indicateurs de mobilite ;
- informations derivees des donnees RH.

Le modele produit un score de risque. L'explicabilite est apportee par SHAP, qui permet de comprendre quelles variables influencent le plus la prediction.

Cette analyse aide le RH a anticiper les departs potentiels et a mettre en place des actions de retention.

## 4.14 Segmentation des employes

La segmentation utilise K-Means pour regrouper les employes selon des caracteristiques communes.

Le principe est de creer des groupes comme :

- nouveaux talents ;
- profils stables ;
- profils confirmes ;
- talents a risque ;
- profils seniors.

Le nombre optimal de clusters est selectionne avec le score silhouette. Cette segmentation aide a adapter les actions RH selon les profils.

## 4.15 Identification des high potentials

Le modele High Potentials utilise un scoring multi-criteres. Il croise plusieurs informations :

- anciennete ;
- score de matching ;
- competences critiques ;
- stabilite ;
- profil de segmentation ;
- indicateurs de performance ou de potentiel disponibles.

L'objectif est d'identifier les employes ayant un fort potentiel d'evolution, afin de preparer des plans de carriere, formations ou mobilites internes.

## 4.16 Prevision des embauches

La prevision des embauches utilise Prophet. Elle analyse l'historique mensuel des embauches et prevoit les besoins sur les prochains mois.

Cette fonctionnalite aide a :

- anticiper la charge RH ;
- planifier les onboardings ;
- prevoir le budget ;
- organiser les besoins en managers et formateurs.

Le modele produit une prevision centrale et peut fournir des bornes inferieures et superieures.

## 4.17 Analyse des correlations

L'analyse des correlations cherche des relations statistiques entre les indicateurs RH :

- anciennete et turnover ;
- type de contrat et risque de depart ;
- score de matching et acceptation ;
- mobilite et retention ;
- competences et performance de recrutement.

Ces correlations ne prouvent pas automatiquement une causalite, mais elles aident a formuler des hypotheses metier.

## 4.18 Analyse de retention

L'analyse de retention calcule un score composite pour identifier les employes fideles, fragiles ou a risque immediat.

Cette analyse permet au RH de prioriser :

- les entretiens de retention ;
- les plans de formation ;
- les propositions de mobilite ;
- les ajustements de contrat ;
- les actions de reconnaissance.

## 4.19 Suivi MLflow

MLflow est utilise pour tracer les experimentations ML. Il permet d'enregistrer :

- les parametres des modeles ;
- les metriques ;
- les artefacts ;
- les versions ;
- les modeles entraines.

Cela donne une traçabilite scientifique au travail ML. Le jury peut voir que les modeles ne sont pas seulement des scripts isoles, mais qu'ils sont suivis comme de vraies experimentations.

## 4.20 Lien entre BI et application

La BI exploite les donnees creees par les sprints precedents :

- les employes du sprint 1 alimentent les effectifs ;
- les departements et postes alimentent les dimensions ;
- les offres du sprint 2 alimentent l'analyse recrutement ;
- les candidatures du sprint 2 alimentent l'entonnoir ;
- les scores IA du sprint 3 alimentent les indicateurs de matching ;
- les statuts alimentent les taux d'acceptation ;
- les competences alimentent les analyses de gaps.

La valeur de la BI vient donc de l'integration de tous les modules precedents.

## 4.21 Tests et validation du sprint 4

Les validations principales sont :

- execution du script d'extraction ;
- verification du remplissage des tables staging ;
- execution `dbt snapshot` ;
- execution `dbt run` ;
- execution `dbt test` ;
- generation du rapport qualite ;
- verification des dimensions ;
- verification des faits ;
- connexion Superset au Data Warehouse ;
- affichage des dashboards ;
- execution des scripts ML ;
- verification des tables ML ;
- consultation des runs MLflow.

## 4.22 Difficultes rencontrees et solutions

**Normalisation des donnees :** les noms de departements et statuts peuvent varier. Les transformations dbt normalisent ces valeurs.

**Historisation :** les donnees operationnelles ne suffisent pas pour suivre l'historique. Le snapshot dbt SCD Type 2 conserve les changements.

**Qualite des donnees :** des donnees manquantes ou incoherentes peuvent fausser les dashboards. Les tests dbt et le rapport qualite verifient les regles.

**ML sur donnees RH :** les donnees RH peuvent etre desequilibrees. Les modeles utilisent des techniques comme `class_weight` pour limiter cet effet.

**Interpretation des modeles :** les predictions doivent rester explicables. SHAP, les scores composites et les commentaires metier facilitent la comprehension.

## 4.23 Bilan du sprint 4

Le sprint 4 a permis de transformer le SIRH en systeme decisionnel. Les donnees operationnelles deviennent des indicateurs, des dashboards et des predictions. Le projet couvre ainsi non seulement la gestion RH quotidienne, mais aussi l'aide a la decision strategique.

---

# Conclusion generale

Ce projet a permis de concevoir et developper une plateforme SIRH complete, securisee, modulaire et orientee donnees. La solution repond au cahier des charges en combinant une application microservices, un frontend Angular multi-roles, une securite JWT/Keycloak, un module de recrutement interne, un systeme de matching, un chatbot RH, une infrastructure BI et des analyses Machine Learning.

La demarche Scrum a permis de structurer le travail en quatre sprints coherents. Chaque sprint a produit un increment fonctionnel :

- le sprint 1 a fourni les bases de securite et de gestion de population ;
- le sprint 2 a mis en place la gestion des emplois, offres et candidatures ;
- le sprint 3 a enrichi le recrutement avec workflow, matching, IA et chatbot ;
- le sprint 4 a exploite les donnees avec BI, dashboards, qualite et ML.

L'interet principal du projet est son caractere complet. Il ne s'agit pas uniquement d'une application CRUD, mais d'une plateforme qui couvre l'ensemble du cycle : operationnel, decisionnel et predictif. Le projet montre aussi la complementarite entre microservices, frontend moderne, IA applicative et Business Intelligence.

---

# Perspectives

Plusieurs perspectives peuvent etre proposees :

- connecter Keycloak a une base persistante et a un annuaire d'entreprise ;
- renforcer le role-based access control avec des permissions plus fines ;
- ajouter une vraie gestion documentaire pour les contrats, CV et certificats ;
- transformer le chatbot ARIA en chatbot RAG connecte a la documentation RH ;
- connecter le chatbot au Data Warehouse pour repondre a des questions BI ;
- ajouter Row-Level Security dans Superset pour filtrer les donnees par role ;
- enrichir les modeles ML avec des donnees de performance ;
- ajouter des tests E2E plus complets avec Cypress ;
- mettre en place une CI/CD complete ;
- deployer les microservices avec Docker Compose ou Kubernetes ;
- ajouter un monitoring applicatif avec Prometheus/Grafana ;
- documenter les API avec un portail Swagger centralise.

---

# Annexes

## Annexe 1 - Stack technique

| Couche | Technologies |
| --- | --- |
| Frontend | Angular 17, TypeScript, RxJS, Chart.js, ng2-charts, keycloak-js |
| Backend | Java 17, Spring Boot 3.2.4, Spring Security, Spring Data JPA |
| Gateway | Spring Cloud Gateway |
| Securite | JWT, BCrypt, Keycloak, PKCE |
| Bases operationnelles | MySQL |
| BI | Python, SQLAlchemy, pandas, dbt, Airflow, Superset |
| ML | scikit-learn, SHAP, Prophet, MLflow |
| Tests | JUnit, Cypress, dbt tests |
| Documentation | Markdown, Swagger/OpenAPI |

## Annexe 2 - Ports principaux

| Composant | Port |
| --- | --- |
| API Gateway | 8080 |
| Auth Service | 8081 |
| Employee Service | 8082 |
| Recruitment Service | 8083 |
| Keycloak | 8084 selon configuration |
| Angular | 4200 |
| Superset | 8088 selon configuration |
| Airflow | 8089 selon configuration |
| MLflow | 5000 |

## Annexe 3 - Routes importantes

| Module | Routes |
| --- | --- |
| Auth | `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/keycloak/exchange` |
| Users | `/api/auth/users` |
| Employes | `/api/employees`, `/api/employees/{id}/skills` |
| Departements | `/api/departments` |
| Postes | `/api/positions` |
| Offres | `/api/job-offers`, `/api/job-offers/{id}/publish`, `/api/job-offers/{id}/refuse` |
| Candidatures | `/api/applications`, `/api/applications/{id}/status`, `/api/applications/match/{offerId}` |
| IA | `/api/applications/{id}/interview-questions`, `/api/chat/{sessionId}` |
| BI externe | Superset, dbt docs, Airflow |

## Annexe 4 - Captures conseillees pour le rapport

Pour rendre le rapport plus convaincant, il est conseille d'ajouter les captures suivantes :

1. Page de connexion.
2. Espace employe.
3. Espace manager.
4. Espace RH Admin.
5. Liste des employes.
6. Formulaire de creation employe.
7. Liste des departements.
8. Liste des postes.
9. Creation d'une offre par manager.
10. Validation d'une offre par RH.
11. Offres publiees cote employe.
12. Depot d'une candidature.
13. Pipeline de candidatures.
14. Matching des candidats.
15. Profil candidat enrichi par IA.
16. Questions d'entretien generees.
17. Chatbot ARIA.
18. Dashboard RH.
19. Dashboard recrutement.
20. Dashboard competences.
21. DAG Airflow.
22. Documentation dbt ou lineage.
23. Dashboard Superset.
24. Interface MLflow.

## Annexe 5 - Plan de presentation orale

Un plan de soutenance possible :

1. Presenter le contexte et la problematique.
2. Expliquer l'architecture globale.
3. Presenter la methode Scrum et les quatre sprints.
4. Montrer l'authentification et les roles.
5. Montrer la gestion de population.
6. Montrer le processus d'offre et de candidature.
7. Montrer le matching et le chatbot.
8. Montrer la BI et les dashboards.
9. Presenter les modeles ML.
10. Conclure avec les apports et perspectives.

## Annexe 6 - Formulation courte pour expliquer le chatbot devant le jury

Le chatbot ARIA est place dans le sprint 3 car il fait partie des fonctionnalites IA liees au recrutement. Son role est d'aider les utilisateurs a comprendre les offres, le processus de candidature, les contrats, le matching et la mobilite interne. Techniquement, il est integre au frontend Angular sous forme de composant flottant et au backend dans `recruitment-service` via `/api/chat`. Il utilise Gemini si la cle API est disponible, sinon il repond avec une base heuristique. Il est protege par JWT, limite par rate limiting et ses usages sont journalises. En perspective, il peut evoluer vers un chatbot BI connecte au Data Warehouse.
