# Mini Rapport - Projet ESSRA / SIRH

## 1. Presentation du projet

ESSRA est une plateforme SIRH moderne destinee a centraliser la gestion des ressources humaines. Le projet permet de gerer les employes, les departements, les postes, les contrats, les candidatures, les offres d'emploi et les indicateurs RH.

L'application est composee de trois grandes parties :

- un backend en microservices Spring Boot ;
- un frontend Angular 17 multi-roles ;
- une partie Business Intelligence pour l'analyse des donnees RH.

## 2. Objectif du projet

L'objectif principal est de fournir une solution complete permettant aux services RH de mieux gerer les donnees internes, de securiser les acces, de suivre le recrutement et de produire des tableaux de bord decisionnels.

Le projet vise aussi a automatiser certaines taches, comme le matching entre les candidats et les offres, grace a l'intelligence artificielle.

## 3. Architecture technique

Le backend est organise en quatre services :

- `api-gateway` : point d'entree unique de l'application ;
- `auth-service` : gestion de l'authentification, JWT et roles ;
- `employee-service` : gestion des employes, departements, postes et competences ;
- `recruitment-service` : gestion des offres, candidatures, matching IA et notifications.

Le frontend Angular communique avec le backend via l'API Gateway. Les acces sont controles selon trois roles :

- `EMPLOYEE`
- `MANAGER`
- `HR_ADMIN`

## 4. Securite

La securite repose sur JWT, Spring Security et les guards Angular. Apres connexion, l'utilisateur recoit un token qui est ajoute automatiquement aux requetes. Les routes sont protegees selon le role de l'utilisateur.

Keycloak est aussi prepare pour permettre une authentification centralisee et un futur SSO.

## 5. Frontend

Le frontend propose trois espaces :

- espace employe : profil, offres internes, candidatures, annuaire ;
- espace manager : creation d'offres, suivi des candidats, rapports d'equipe ;
- espace RH admin : dashboard RH, gestion des utilisateurs, departements, postes, contrats, recrutement, BI Analytics.

L'interface contient aussi des graphiques, des tableaux de bord et un assistant RH.

## 6. Business Intelligence

La partie BI transforme les donnees operationnelles en indicateurs decisionnels.

Elle utilise :

- Python pour l'extraction ;
- `sirh_staging` pour les donnees brutes ;
- dbt pour les transformations ;
- `sirh_dwh` comme Data Warehouse ;
- Airflow pour l'orchestration ;
- Superset pour les dashboards ;
- des tests de qualite pour verifier les donnees.

Les dashboards permettent d'analyser les effectifs, les contrats, les recrutements, les competences, le turnover et les tendances RH.

## 7. Intelligence artificielle

Le projet integre l'IA pour :

- extraire les competences depuis les candidatures ;
- calculer un score de matching candidat/offre ;
- generer un profil candidat enrichi ;
- proposer des questions d'entretien ;
- assister l'utilisateur avec un chatbot RH.

## 8. Avancement

Le projet est bien avance. Le backend, le frontend, la securite, les modules RH, le recrutement et la BI sont deja structures. Les prochaines ameliorations concernent surtout la finalisation des tests, la persistance complete de Keycloak, la documentation finale et les captures d'ecran pour la soutenance.

## 9. Conclusion

ESSRA est une solution SIRH complete qui combine gestion RH, securite, recrutement intelligent et Business Intelligence. Le projet montre une architecture moderne et evolutive, capable de repondre aux besoins operationnels et decisionnels d'un service RH.

