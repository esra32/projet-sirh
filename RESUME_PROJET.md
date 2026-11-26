# 🌟 Projet SIRH (Système d'Information de Gestion des Ressources Humaines)

## 📌 Présentation Générale
Ce projet est une plateforme SIRH complète, moderne et intelligente, structurée autour d'une architecture orientée microservices pour le backend (Java/Spring Boot) et d'un frontend réactif (Angular 17+). L'objectif est d'offrir une interface premium et automatisée pour la gestion des employés, la sécurité des accès et le processus de recrutement (ATS).

---

## 🏗️ Architecture Globale

Le projet est divisé en deux mondes distincts communicants via des API REST :

1. **Frontend (`sirh-frontend`)** : L'interface utilisateur, conçue pour être responsive, dynamique et professionnelle.
2. **Backend (`sirh-backend`)** : L'intelligence de l'application, subdivisée en microservices scalables et maintenables.

La persistance des données, initialement sous MongoDB, a été migrée avec succès vers **MySQL Server** avec JPA/Hibernate.

---

## 🖥️ 1. Le Frontend (Angular)

L'application SPA (Single Page Application) est développée en **Angular**. Elle offre une expérience utilisateur riche (animations, mode sombre/clair, design glassmorphism, notifications Toast).

### ✨ Fonctionnalités clés :
- **Authentification & Routing :** Redirection intelligente basée sur le rôle de l'utilisateur (Employé, Manager, RH).
- **Dashboard RH Interactif :** Graphiques KPIs dynamiques (Chart.js ou équivalent) pour suivre les effectifs et les recrutements.
- **Gestion des Profils :** Vue d'édition "fantôme" premium et possibilité d'imprimer des contrats de manière isolée via un `@media print` strict.
- **Pipeline de Recrutement Visuel (Kanban) :** Interface drag-and-drop pour déplacer les candidats (candidatures reçues, entretiens, offres).
- **Assistant IA (Gemini) :** Chatbot flottant intégré pour aider le personnel RH à générer des fiches de poste ou à analyser des profils.

---

## ⚙️ 2. Le Backend (Microservices Spring Boot)

Le backend est constitué de **4 microservices principaux** fonctionnant de concert :

### 🚪 **API Gateway (`api-gateway`)**
C'est la porte d'entrée (Port `8080`). Elle intercepte toutes les requêtes du navigateur et les redirige vers le bon microservice de manière transparente. Elle gère la validation globale des tokens JWT.

### 🔐 **Auth Service (`auth-service`)**
Microservice dédié à la sécurité (Port `8081`).
- **Base de données :** `sirh_auth` (Tables: `users`, `user_roles`).
- **Fonctionnalités :** Inscription, Login (`/auth/login`), gestion des Rôles (`EMPLOYEE`, `MANAGER`, `HR_ADMIN`).
- **Intégration Keycloak :** Peut déléguer ou synchroniser les identités via un serveur Keycloak tiers pour du Single Sign-On (SSO).

### 👥 **Employee Service (`employee-service`)**
Microservice gérant le coeur RH (Port `8082`).
- **Base de données :** `sirh_employee` (Tables: `employees`, `departments`, `positions`).
- **Fonctionnalités :** CRUD complet sur les employés (Date d'embauche, types de contrats), les départements technologiques ou commerciaux, et les fiches de postes. 
- **Spécificité :** Permet une recherche intelligente `searchByNameOrEmail` via requêtes JPQL.

### 🎯 **Recruitment Service (`recruitment-service`)**
Microservice spécialisé dans l'acquisition de talents (Port `8083`).
- **Base de données :** `sirh_recruitment` (Tables: `job_offers`, `applications`, `skills`, `chat_messages`).
- **Fonctionnalités :** Centralise la publication d'offres d'emploi, la gestion des candidatures (y compris le stockage LOB des PDF de CV et lettre de motivation), et les compétences (`Skills`) par table de jointure.
- **Intéligence Artificielle (`CvSkillExtractorService`) :** Fait appel à l'API **Google Gemini 1.5 Flash** pour lire automatiquement les lettres de motivation et CV, afin d'en extraire intelligemment des compétences informatiques ou RH (Java, Angular, Communication, etc.) et produire un **"Smart Match Score"** avec l'offre d'emploi.

---

## 🗄️ 3. Modèle de Données & Sécurité

- **Migration MySQL & JPA :** Les modèles utilisent des IDs sous forme de chaînes de caractères (UUIDs autogénérées par Hibernate : `@GeneratedValue(strategy = GenerationType.UUID)`), ce qui permet de conserver parfaitement la structure REST tout en profitant des relations ACID sécurisées.
- **JWT (JSON Web Tokens) :** Après la connexion, un Token d'accès (Access Token) et de rafraichissement (Refresh Token) sont fournis au Frontend. Le token contient les rôles, ce qui permet à l'API Gateway d'interdire l'accès aux portails sensibles pour de simples employés.
- **Mots de passe :** Entièrement hachés en **BCrypt** avant intégration en base de données.

---

## 🚀 Résumé du Flux de travail typique

1. **Un candidat** postule à une offre (`recruitment-service`).
2. **Le système (IA Gemini)** scanne son CV et lui attribue un score de compatibilité par rapport aux compétences demandées (`Skill`).
3. **Le Manager RH** se connecte (`auth-service`), visionne le tableau Kanban du recrutement sur le Frontend (Angular), et déplace le candidat en entretien.
4. Une fois embauché, le candidat est transféré de statut et créé dans le module `employee-service` avec un rôle `EMPLOYEE`. L'employé peut maintenant se connecter à son espace via les mêmes systèmes de sécurité.

> **💡 Note pour le développement :**
> Grâce au fichier `init_db.sql` créé, une simple commande d'exécution SQL dans la base MySQL locale permet de recréer l'ensemble des données de test nécessaires au projet (utilisateurs, fausses offres, fausses candidatures) en quelques secondes.
