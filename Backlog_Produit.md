# Backlog Produit — SIRH (Partie I : Application + Partie II : BI)

> Version corrigée et complétée de `backlog ISRAA.pdf` (Chapitre 2 — Analyse et spécification des besoins).
> Corrections apportées par rapport à la version PDF d'origine :
> 1. Stack technique (E0) : `PostgreSQL` remplacé par `MySQL` (seule base réellement utilisée dans les 3 services — voir `pom.xml`, `init_db.sql`).
> 2. Ajout d'une colonne **Statut** (Fait / À faire / Perspective) pour que le tableau reste honnête sur ce qui est réellement livré, y compris les points non terminés (ex. 1.6 Gouvernance BI) qui doivent apparaître malgré tout.
> 3. Ajout du **Sprint 4 — Infrastructure BI** (Epics E14 à E17), totalement absent de la version PDF d'origine, qui couvre la Partie II du cahier des charges (ETL, modélisation, dashboards, ML, gouvernance).
> 4. US37/US38 (E12, prédiction turnover « via Gemini ») et US40/US41 (E13, ARIA sur les congés et les résumés d'équipe) reformulées et marquées **Perspective** : non implémentées dans le périmètre actuel (la prédiction de turnover réelle vit dans le module BI/ML, pas dans `recruitment-service`/Gemini ; le module Congés/Absences n'existe pas).

---

## Sprint 0 — Initialisation & Infrastructure

| Epic | Feature | US ID | User Story | Priorité | Statut |
|---|---|---|---|---|---|
| E0 | Architecture & Socle Technique | US01 | En tant qu'équipe technique, je souhaite initialiser l'architecture du projet (Spring Boot, Angular, **MySQL**, Keycloak, Gemini API) afin de disposer d'un socle technique stable. | Haute | Fait |
| | | US02 | En tant qu'équipe, je souhaite configurer le pipeline CI/CD afin d'automatiser les déploiements. | Haute | Fait |
| | | US03 | En tant que RH, je souhaite mettre en place l'environnement de développement (Docker Compose) afin de standardiser les environnements. | Moyenne | Fait |

## Sprint 1 — Authentification Keycloak & Gestion de Population

| Epic | Feature | US ID | User Story | Priorité | Statut |
|---|---|---|---|---|---|
| E1 | Authentification SSO | US04 | En tant qu'employé, je souhaite me connecter via Keycloak (SSO) afin d'accéder à mon espace personnel sécurisé. | Haute | Fait |
| | | US05 | En tant qu'administrateur RH, je souhaite gérer les comptes utilisateurs dans Keycloak afin de contrôler les accès à la plateforme. | Haute | Fait |
| | | US06 | En tant que système, je souhaite sécuriser les API REST avec des tokens JWT afin de garantir que seuls les utilisateurs authentifiés accèdent aux ressources. | Haute | Fait |
| E2 | Gestion des Employés | US07 | En tant que RH, je souhaite consulter les informations des employés afin d'avoir une vue complète de la population. | Haute | Fait |
| | | US08 | En tant que RH, je souhaite modifier les informations des employés afin de maintenir les dossiers à jour. | Haute | Fait |
| | | US09 | En tant que RH, je souhaite archiver/supprimer un employé afin de gérer les départs de l'entreprise. | Moyenne | Fait |
| E3 | Structure & Profils | US10 | En tant que RH, je souhaite gérer les départements et postes (CRUD) afin de maintenir la structure organisationnelle. | Haute | Fait |
| | | US11 | En tant que RH, je souhaite gérer les contrats afin de catégoriser les relations de travail. | Haute | Fait |
| | | US12 | En tant qu'employé, je souhaite consulter mon profil (compétences, expériences, formations) afin d'avoir une vision complète de mon parcours. | Haute | Fait |
| | | US13 | En tant qu'employé, je souhaite mettre à jour mes informations personnelles et compétences afin que mon profil reste à jour. | Moyenne | Fait |
| | | US14 | En tant qu'employé, je souhaite consulter l'annuaire interne afin de trouver les coordonnées de mes collègues. | Moyenne | Fait |
| E4 | Documents & Organigramme | US15 | En tant qu'employé, je souhaite consulter l'organigramme hiérarchique afin d'avoir une vue d'ensemble de l'entreprise. | Moyenne | Fait |
| | | US16 | En tant que RH, je souhaite consulter les documents administratifs afin de centraliser le dossier des employés. | Haute | Fait |

## Sprint 2 — Recrutement Interne, Mobilité & Workflow

| Epic | Feature | US ID | User Story | Priorité | Statut |
|---|---|---|---|---|---|
| E5 | Publication & Recrutement | US17 | En tant que Manager, je souhaite créer et soumettre une offre d'emploi interne afin d'exprimer un besoin de recrutement. | Haute | Fait |
| | | US18 | En tant que RH, je souhaite valider, publier ou rejeter une offre d'emploi afin de contrôler le processus de recrutement. | Haute | Fait |
| E6 | Candidatures & Interviews | US19 | En tant qu'employé, je souhaite consulter les offres internes disponibles afin d'explorer les opportunités correspondant à mon profil. | Haute | Fait |
| | | US20 | En tant qu'employé, je souhaite postuler à une offre interne afin de manifester mon intérêt. | Haute | Fait |
| | | US21 | En tant qu'employé, je souhaite consulter l'état de mes candidatures afin d'être informé de leur avancement. | Haute | Fait |
| | | US22 | En tant qu'employé, je souhaite consulter le détail de mes entretiens (date, lieu, interlocuteur) afin de m'y préparer efficacement. | Haute | Fait |
| | | US23 | En tant que Manager, je souhaite évaluer les candidatures de mon département afin de participer au processus de sélection. | Haute | Fait |
| E7 | Mobilité Interne | US24 | En tant qu'employé, je souhaite déposer une demande de mobilité interne afin de candidater à un autre poste ou département. | Haute | Fait |
| | | US25 | En tant que Manager, je souhaite consulter les demandes de mobilité de mon département afin de retenir ou accompagner mes talents. | Haute | Fait |
| | | US26 | En tant que RH, je souhaite suivre l'état des demandes de mobilité (en attente → en cours → acceptée/rejetée) afin de piloter les opportunités d'évolution interne. | Moyenne | Fait |
| E8 | Notifications | US27 | En tant qu'employé, je souhaite être notifié des mises à jour de mes candidatures (validation, rejet) afin d'être informé en temps réel. | Haute | Fait |
| | | US28 | En tant que Manager, je souhaite être notifié des nouvelles candidatures reçues afin de réagir rapidement aux opportunités. | Haute | Fait |
| | | US29 | En tant que RH, je souhaite recevoir des alertes sur les échéances (clôture d'offre, entretiens) afin de ne rien manquer. | Moyenne | Fait |

## Sprint 3 — Intelligence Artificielle (Gemini), Veille & Chatbot

| Epic | Feature | US ID | User Story | Priorité | Statut |
|---|---|---|---|---|---|
| E9 | Extraction IA des Compétences | US30 | En tant que RH, je souhaite analyser et structurer automatiquement le CV d'un candidat (extraction de compétences via Gemini, repli heuristique sinon) afin de gagner du temps sur le tri des candidatures. | Haute | Fait |
| | | US31 | En tant que RH, je souhaite obtenir un score de matching candidat/poste afin de prioriser les candidatures les plus pertinentes. | Haute | Fait |
| E10 | Veille du Marché de l'Emploi | US32 | En tant que RH, je souhaite synchroniser les offres et salaires du marché externe (Adzuna) afin de comparer mes offres internes aux standards du marché. | Moyenne | Fait |
| E11 | Tableau de Bord Recrutement (applicatif) | US33 | En tant que Manager, je souhaite accéder à un tableau de bord avec les indicateurs clés de mon équipe (candidatures, postes ouverts, délais) afin de piloter le recrutement. | Haute | Fait |
| E12 | Analyse Prédictive (Gemini) | US34 | En tant que RH, je souhaite que l'IA suggère des plans de formation à partir des écarts de compétences détectés afin d'aligner les compétences des employés avec les besoins stratégiques. | Faible | Perspective (non implémenté) |
| E13 | ARIA — Assistant RH Intelligent (Chatbot) | US35 | En tant qu'utilisateur (Employé, Manager, RH), je souhaite interagir avec le chatbot ARIA afin d'obtenir une assistance contextuelle sur le recrutement (recherche d'offres, suivi de candidature, conseils d'entretien). | Haute | Fait |
| | | US36 | En tant que RH, je souhaite que les usages du chatbot soient journalisés et limités (rate limiting) afin de garantir un usage maîtrisé et sécurisé de l'IA. | Haute | Fait |
| | | US37 | En tant qu'employé, je souhaite interroger ARIA sur des informations RH personnelles (solde de congés) afin d'accéder rapidement à mes informations. | Moyenne | Perspective — nécessite un module Congés/Absences non développé dans ce périmètre |
| | | US38 | En tant que Manager, je souhaite demander à ARIA un résumé de mon équipe (compétences, demandes en attente) afin d'accélérer mes décisions. | Moyenne | Perspective — hors périmètre du `ChatService` actuel (limité au domaine recrutement) |

## Sprint 4 — Infrastructure Business Intelligence (Partie II du cahier des charges)

| Epic | Feature | US ID | User Story | Priorité | Statut |
|---|---|---|---|---|---|
| E14 | Architecture Data & ETL | US39 | En tant qu'ingénieur data, je souhaite extraire les données des bases sources (auth, employee, recruitment) vers une zone de staging afin de préparer leur intégration dans le Data Warehouse. | Haute | Fait |
| | | US40 | En tant qu'ingénieur data, je souhaite construire un modèle dimensionnel (tables de faits et dimensions) avec dbt afin de structurer les données RH pour l'analyse. | Haute | Fait |
| | | US41 | En tant qu'ingénieur data, je souhaite mettre en place des tests de qualité de données (36 tests dbt) afin de garantir la fiabilité du Data Warehouse. | Moyenne | Fait |
| | | US42 | En tant qu'ingénieur data, je souhaite orchestrer et planifier les chargements ETL avec Apache Airflow afin d'automatiser les rafraîchissements de données. | Moyenne | Fait |
| E15 | Visualisation & Dashboards BI | US43 | En tant que RH/Manager, je souhaite consulter des dashboards Superset (effectifs, turnover, mobilité, recrutement) afin de piloter la fonction RH par les données. | Haute | Fait |
| E16 | Machine Learning RH | US44 | En tant que RH, je souhaite disposer d'un modèle de prédiction du turnover (scikit-learn, AUC 0.757) afin d'anticiper les départs à risque. | Haute | Fait |
| | | US45 | En tant que Data Scientist, je souhaite suivre les expérimentations ML avec MLflow afin de tracer les performances des modèles dans le temps. | Moyenne | Fait |
| E17 | Administration & Gouvernance BI *(1.6)* | US46 | En tant qu'administrateur BI, je souhaite restreindre l'accès aux dashboards par rôle (Row-Level Security) afin que chaque utilisateur ne voie que les données de son périmètre. | Moyenne | À faire |
| | | US47 | En tant qu'équipe projet, je souhaite documenter un catalogue des métriques et indicateurs BI afin de garantir une compréhension partagée des KPIs RH. | Faible | À faire |
| | | US48 | En tant qu'administrateur BI, je souhaite documenter la politique de gouvernance des données (rôles, accès, fréquence de rafraîchissement) afin de cadrer l'exploitation de la solution BI. | Faible | À faire |

---

## Légende Statut

- **Fait** : fonctionnalité implémentée et vérifiée dans le code (`sirh-backend`, `sirh-frontend`, `sirh-bi`).
- **À faire** : planifiée, scope confirmé par le cahier des charges, développement non commencé ou en cours (Sprint 4 / point 1.6 du cahier des charges).
- **Perspective** : hors périmètre retenu pour la version actuelle ; conservée dans le backlog comme évolution possible, à ne pas présenter comme livrée en soutenance.
