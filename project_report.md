# Rapport de Projet SIRH (Système d'Information des Ressources Humaines)

Ce rapport présente une analyse détaillée de l'architecture, des fonctionnalités et du système de design de l'application SIRH.

## 1. Vue d'Ensemble
Le SIRH est une plateforme de gestion des ressources humaines moderne, conçue pour automatiser les processus de recrutement, la gestion des effectifs et la gouvernance interne. Elle s'articule autour de trois espaces distincts : **Employé**, **Manager**, et **Administrateur RH**.

---

## 2. Architecture Technique

### Backend (Microservices Spring Boot)
L'architecture est basée sur des microservices scalables communiquant via une passerelle API :
- **API Gateway** : Point d'entrée unique et routage des requêtes.
- **Auth Service** : Gestion de l'authentification JWT et des permissions.
- **Employee Service** : Gestion des profils, départements et postes.
- **Recruitment Service** : Gestion des offres d'emploi, des compétences et des candidatures.
- **Base de données** : **MongoDB** (Migration effectuée de JPA vers NoSQL pour une meilleure flexibilité des schémas et compatibilité avec les ObjectIds).

### Frontend (Angular)
- **Framework** : Angular 17+ utilisant les **Standalone Components**.
- **Gestion d'état** : Utilisation intensive des **Signals** d'Angular pour une réactivité optimale.
- **Sécurité** : Guards de route basés sur les rôles (`HR_ADMIN`, `MANAGER`, `EMPLOYEE`).

---

## 3. Système de Design & Identité Visuelle

### Thème : "Obsidian & Azure"
Le projet adopte un style "High-End" et ultra-moderne :
- **Palette de Couleurs** :
  - Fond : Obsidian (#0F172A) avec des dégradés radiaux vers le Deep Blue (#1E1B4B).
  - Accents : Azure (#38BDF8) et Indigo (#818CF8) pour un effet néon.
- **Esthétique Glassmorphism** :
  - Utilisation de `backdrop-filter: blur(12px)` sur les panneaux.
  - Bordures translucides et ombres portées profondes (`shadow-xl`).
- **Typographie** : Polices 'Outfit' et 'Inter' pour un rendu premium et lisible.

---

## 4. Fonctionnalités par Espace

### 📁 Espace Employé
- **Tableau de bord** personnel.
- **Profil** : Édition des informations et gestion des compétences.
- **Mobilité** : Consultation des offres internes et suivi des candidatures.
- **Annuaire** : Recherche de collègues au sein de l'entreprise.

### 👥 Espace Manager
- **Suivi d'Équipe** : Vue d'ensemble des effectifs et des performances.
- **Recrutement** : Publication de postes et révision des candidats.
- **Talent Tracking** : Identification des compétences clés au sein de l'équipe.
- **Reporting** : Statistiques dynamiques sur l'activité du groupe.

### ⚖️ Espace Administrateur RH
- **Gouvernance** : Configuration de la structure (Départements & Postes).
- **Contrats** : Gestion des types de contrats (CDI, CDD, etc.).
- **Recrutement Global** : Oversight de toutes les offres de l'entreprise.
- **Permissions** : Gestion fine des comptes utilisateurs et attribution des rôles.

---

## 5. Points Clés Modernes
- **Migration ID** : Tous les identifiants techniques ont été migrés en `String` pour une intégration native avec MongoDB.
- **Expérience Utilisateur** : Micro-animations CSS, transitions fluides et feedbacks instantanés via les Signals.
- **Sécurité Hardened** : Extraction automatique des rôles via les claims JWT pour une protection robuste des endpoints.
