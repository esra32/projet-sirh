# ANALYSE COMPARATIVE — Cahier des Charges vs Implémentation Actuelle

**Projet :** SIRH - Système d'Information des Ressources Humaines  
**Date d'analyse :** 2026-04-04  
**Backend :** Spring Boot 3.2.4 (4 microservices)  
**Frontend :** Angular 17.3  
**Keycloak :** 26.5.6  

---

## LÉGENDE

| Symbole | Signification |
|---|---|
| ✅ | Implémenté et fonctionnel |
| ⚠️ | Partiellement implémenté ou avec défauts |
| ❌ | Absent / Non implémenté |
| 🔴 | Erreur / Bug critique |

---

## 1. MICROSERVICES BACKEND

### 1.1 Auth Service (/api/auth)

| Exigence du CDC | Statut | Détail |
|---|---|---|
| Inscription employé (`POST /api/auth/register`) | ✅ | Fonctionnel, BCrypt, rôle EMPLOYEE par défaut |
| Connexion (`POST /api/auth/login`) | ✅ | JWT Access + Refresh token |
| Refresh token (`POST /api/auth/refresh`) | ✅ | Renouvellement du token d'accès |
| Gestion des rôles (EMPLOYEE, MANAGER, HR_ADMIN) | ✅ | 3 rôles enum définis |
| Gestion des permissions par module | ⚠️ | Rôles définis mais `@PreAuthorize` absent sur employee/recruitment |
| Endpoint `/api/auth/roles` | ❌ | Endpoint non créé |
| Intégration Keycloak | ✅ | Bridge Keycloak : register, exchange token |
| Gestion des utilisateurs (liste, PATCH rôles, DELETE) | ✅ | `/api/auth/users/**` opérationnel |

### 1.2 Employee Service (/api/employees)

| Exigence du CDC | Statut | Détail |
|---|---|---|
| CRUD employés | ✅ | Complet avec search |
| Gestion des départements | ✅ | CRUD complet |
| Gestion des postes | ✅ | CRUD complet |
| Gestion des contrats (CDI, CDD, Stage) | ✅ | Enum ContractType |
| Informations personnelles (coordonnées, contact) | ✅ | firstName, lastName, email, phone, hireDate |
| Organigramme hiérarchique | ❌ | Aucun endpoint de hiérarchie |
| Upload de documents (CV, certificats) | ❌ | Absent dans employee-service |
| Endpoint `/api/employees/{id}` | ✅ | |
| Endpoint `/api/departments` | ✅ | |
| Endpoint `/api/positions` | ✅ | |

### 1.3 Recruitment Service (Recrutement interne)

| Exigence du CDC | Statut | Détail |
|---|---|---|
| Publication de postes vacants | ✅ | DRAFT → PUBLISHED → CLOSED |
| Gestion des candidatures internes | ✅ | Statuts PENDING→REVIEWING→INTERVIEW→ACCEPTED/REJECTED |
| Matching compétences employé/poste | ✅ | Smart score + Gemini AI |
| Notification d'opportunités selon profil | ❌ | Aucun système de notification |
| Endpoint `/api/internal-jobs` | ⚠️ | Exposé comme `/api/job-offers` (nom différent du CDC) |
| Endpoint `/api/applications` | ✅ | |
| Endpoint `/api/applications/{id}/review` | ⚠️ | Implémenté via `PUT /api/applications/{id}/status` |
| Chatbot IA pour découverte des offres | ✅ | ChatService implémenté mais non routé par la gateway |

### 1.4 API Gateway

| Exigence du CDC | Statut | Détail |
|---|---|---|
| Routage des requêtes | ✅ | Spring Cloud Gateway |
| Load balancing | ❌ | Non configuré (adresses hardcodées localhost) |
| Authentification centralisée (JWT filter) | ✅ | AuthJwtFilter opérationnel |
| Rate limiting | ❌ | Absent |
| CORS | ✅ | Configuré (wildcard `*`) |

### 1.5 Services non implémentés du CDC (commentés dans le spec)

| Service | Statut | Note |
|---|---|---|
| Leave Service (congés) | ❌ | Mentionné dans l'architecture commentée du CDC |
| Evaluation Service (évaluations) | ❌ | Mentionné dans l'architecture commentée du CDC |

---

## 2. FRONTEND ANGULAR

### 2.1 Espace Employé

| Fonctionnalité CDC | Statut | Détail |
|---|---|---|
| Tableau de bord personnel (opportunités, actualités) | ✅ | KPIs + flux d'offres récentes |
| Mon profil et mes compétences | ✅ | Édition profil + gestion skills |
| Postes internes disponibles | ✅ | Filtres titre/localisation/compétences, candidature avec CV |
| Mes candidatures et statut | ✅ | Pipeline visuel 4 étapes |
| Annuaire des employés | ⚠️ | Route définie, composant potentiellement incomplet |
| Consultation des fiches de paie | ❌ | Commenté dans CDC (optionnel) |
| Évaluations et objectifs | ❌ | Commenté dans CDC (optionnel) |

### 2.2 Espace Manager

| Fonctionnalité CDC | Statut | Détail |
|---|---|---|
| Tableau de bord équipe | ✅ | Stats équipe, pipeline recrutement |
| Publication de postes vacants | ✅ | PostingBoardComponent |
| Examen des candidatures internes | ✅ | CandidateReviewComponent avec scoring IA |
| Évaluation des employés | ❌ | Absent |
| Suivi des talents et de la mobilité | ✅ | TalentTrackingComponent (séniorité, filtres) |
| Rapports et statistiques équipe | ⚠️ | TeamReportsComponent défini mais non audité |

### 2.3 Espace RH Administrateur

| Fonctionnalité CDC | Statut | Détail |
|---|---|---|
| Tableau de bord global avec statistiques RH | ✅ | KPIs + Chart.js (donut + barres) |
| Gestion complète des employés (CRUD) | ✅ | ContractsComponent (511 lignes) |
| Gestion des départements | ✅ | DepartmentsComponent |
| Gestion des postes | ✅ | PositionsComponent |
| Gestion des types de contrats | ✅ | Via ContractsComponent |
| Supervision du recrutement interne | ⚠️ | RecruitmentOversightComponent (non audité en détail) |
| Configuration de la politique de mobilité | ⚠️ | MobilityPoliciesComponent (non audité) |
| Campagnes d'évaluation annuelles | ❌ | Absent |
| Rapports RH (turnover, mobilité, effectifs) | ⚠️ | RhReportsComponent défini, contenu non audité |
| Gestion des utilisateurs et permissions | ✅ | UsersPermissionsComponent avec Keycloak |
| Impression de contrats | ✅ | Template légal professionnel avec @media print |

### 2.4 Pages / Composants transverses

| Élément | Statut | Détail |
|---|---|---|
| Page de connexion | ✅ | |
| Page d'inscription | ✅ | |
| Navigation / sidebar | ✅ | Role-aware, glassmorphism |
| Design responsive | ✅ | Breakpoints 960/768/640px |
| Notifications toast | ✅ | Auto-dismiss 4s, 4 types |
| 404 page | ✅ | |
| Chatbot IA (ARIA) | ✅ | Gemini intégré côté client |
| Command palette | ✅ | CommandPaletteComponent |

---

## 3. SÉCURITÉ

| Exigence CDC | Statut | Détail |
|---|---|---|
| JWT stateless | ✅ | JJWT 0.11.5, HS256 |
| Spring Security | ✅ | Configuré sur tous les services |
| HTTPS | ❌ | Aucun profil de production configuré |
| CORS | ✅ | Wildcard (trop permissif pour la prod) |
| Bean Validation (JSR-380) | ⚠️ | Partiel — certains DTOs n'ont pas @NotBlank/@Email |
| Protection CSRF | ⚠️ | Désactivée (OK pour API stateless, mais non documenté) |
| Hachage BCrypt | ✅ | |
| Row-Level Security (RLS) pour BI | ❌ | BI non implémenté |
| `@PreAuthorize` sur les endpoints | ⚠️ | Uniquement sur `/api/auth/users/**` |

---

## 4. INTÉGRATION KEYCLOAK

| Élément | Statut | Détail |
|---|---|---|
| Keycloak installé et démarrable | ✅ | Port 8084, mode dev, H2 |
| Intégration frontend (keycloak-js 26.2.3) | ✅ | PKCE, check-sso |
| `silent-check-sso.html` | ✅ | Fichier présent |
| Bridge backend (exchange token) | ✅ | `/api/auth/keycloak/exchange` |
| Export de realm documenté | ❌ | Aucun fichier d'export realm, H2 perdu au redémarrage |
| Keycloak configuré avec base persistante | ❌ | H2 in-memory → config perdue à chaque restart |

---

## 5. BUSINESS INTELLIGENCE (BI)

C'est la partie **la plus importante manquante**. Le CDC lui consacre 50% des exigences.

| Exigence CDC | Statut | Détail |
|---|---|---|
| Architecture Data Warehouse | ❌ | Non commencé |
| Modélisation dimensionnelle (star schema) | ❌ | |
| Processus ETL (Talend / NiFi / Python) | ❌ | |
| Tableaux de bord interactifs (Power BI / Superset / Metabase) | ❌ | |
| Rapports analytiques RH | ❌ | |
| Analyse prédictive (ML basique) | ❌ | |
| SCD Type 2 (données historiques) | ❌ | |
| Planification des chargements (Cron/Airflow) | ❌ | |
| Gouvernance et qualité des données | ❌ | |
| Sécurité RLS dans la couche BI | ❌ | |

**→ Toute la partie BI est à 0%. C'est le déficit le plus grave par rapport au CDC.**

---

## 6. TESTS

| Exigence CDC | Statut | Détail |
|---|---|---|
| Couverture minimum 60% | ⚠️ | Tests présents mais couverture non mesurée |
| Tests unitaires backend | ⚠️ | 7 classes de test présentes (JUnit 5 + Mockito) |
| Tests d'intégration frontend | ⚠️ | Karma/Jasmine configuré, spec files présents |
| Collection Postman | ❌ | Non trouvée |
| Tests E2E Cypress | ⚠️ | Configuré, scripts CI/CD présents, contenu non audité |

---

## 7. DOCUMENTATION

| Livrable CDC | Statut | Détail |
|---|---|---|
| Guide d'architecture | ⚠️ | CLAUDE.md + RESUME_PROJET.md partiels |
| Guide de développement | ⚠️ | CLAUDE.md présent |
| Documentation API (Swagger) | ✅ | Swagger UI sur chaque service + agrégation gateway |
| Guide BI | ❌ | |
| Catalogue de données | ❌ | |
| Guide d'installation complet | ❌ | |
| Guide d'utilisation des dashboards | ❌ | |
| Guide de maintenance ETL | ❌ | |
| Guide de dépannage | ❌ | |
| Rapport PFE (100-150 pages) | ❌ | Non commencé |
| Vidéo de démonstration | ❌ | |
| Présentation PowerPoint | ❌ | |

---

## 8. SCORECARD GLOBAL

| Domaine | Complété | Score |
|---|---|---|
| Auth Service | 7/8 exigences | **87%** |
| Employee Service | 5/8 exigences | **62%** |
| Recruitment Service | 5/7 exigences | **71%** |
| API Gateway | 3/5 exigences | **60%** |
| Espace Employé (frontend) | 4/6 exigences | **67%** |
| Espace Manager (frontend) | 4/6 exigences | **67%** |
| Espace RH Admin (frontend) | 6/9 exigences | **67%** |
| Sécurité | 5/9 exigences | **56%** |
| Intégration Keycloak | 4/6 exigences | **67%** |
| Business Intelligence | 0/10 exigences | **0%** |
| Tests | 2/5 exigences | **40%** |
| Documentation | 3/13 livrables | **23%** |
| **TOTAL GLOBAL** | **~48/87** | **~55%** |

---

## 9. ERREURS IDENTIFIÉES (Bugs actifs)

### Critiques
1. **🔴 Double SecurityFilterChain** — `recruitment-service` a deux beans `SecurityFilterChain` (`SecurityConfig.java` : tout permis vs `RecruitmentConfig.java` : authentification requise). Spring choisit un seul, résultat imprévisible.
2. **🔴 `/api/chat/**` non routé** — `ChatController` existe mais pas exposé via gateway. Endpoint accessible en direct sans authentification sur le port 8083.
3. **🔴 Clé API Gemini exposée** — `geminiApiKey` visible en clair dans `environment.ts` / `environment.development.ts` (commentaire TODO visible).
4. **🔴 Keycloak H2 non persistant** — La configuration Keycloak (realm, clients, users) est stockée en H2 mémoire. Un redémarrage de Keycloak efface tout.

### Hautes
5. **⚠️ Incohérence préfixe `ROLE_`** — `auth-service` n'ajoute pas `ROLE_`, `employee-service` et `recruitment-service` l'ajoutent. Les futures annotations `@PreAuthorize` donneront des résultats différents selon le service.
6. **⚠️ `EmployeeService.create()` scan complet** — Vérification d'unicité email via `findAll().stream()` au lieu de `existsByEmail()` → problème de performance en production.
7. **⚠️ Flyway inutilisable** — Scripts Flyway définissent des colonnes `BIGINT AUTO_INCREMENT` mais les entités JPA utilisent `UUID`. Activer Flyway ferait planter l'application.
8. **⚠️ Pas de profils Spring** — Aucun `application-dev.yml` / `application-prod.yml`. Un seul fichier de config pour tous les environnements.

### Moyennes
9. **⚠️ Tokens JWT en localStorage** — Vulnérabilité XSS : les tokens sont accessibles par du JavaScript malveillant.
10. **⚠️ `System.out.println` en production** — Utilisé dans `CvSkillExtractorService`, `KeycloakAdminClient` au lieu de SLF4J.
11. **⚠️ Fetch EAGER sur skills** — `JobOffer.requiredSkills` et `Application.skills` sont `EAGER` → problème N+1 queries.
12. **⚠️ Duplication de `JwtValidator`** — 4 copies quasi-identiques (gateway, auth, employee, recruitment).