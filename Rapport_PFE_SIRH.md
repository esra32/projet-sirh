# Rapport de Projet de Fin d'Études

---

**Titre :** Développement d'une Application Microservices SIRH et Mise en Place d'une Infrastructure Business Intelligence

**Filière :** Génie Logiciel / Systèmes d'Information

**Étudiant :** Esra

**Année universitaire :** 2025 – 2026

**Méthodologie :** Scrum (4 Sprints)

---

## Résumé

Ce projet de fin d'études porte sur la conception et le développement d'un **Système d'Information des Ressources Humaines (SIRH)** complet, reposant sur une architecture microservices moderne. Le projet couvre l'intégralité du cycle de vie d'une application logicielle d'entreprise : de la sécurisation des accès jusqu'à l'exploitation décisionnelle des données.

La partie applicative, développée avec **Spring Boot 3** et une **API Gateway Spring Cloud**, implémente trois domaines fonctionnels : l'authentification sécurisée avec intégration Keycloak, la gestion des ressources humaines (employés, départements, postes), et un module de recrutement interne intégrant une intelligence artificielle pour l'extraction automatique de compétences, le scoring des candidats et un chatbot RH conversationnel.

La partie décisionnelle, orchestrée par **Apache Airflow**, repose sur un pipeline ETL automatisé, une modélisation dimensionnelle **dbt** (18 modèles, 50 tests qualité) et six modèles de **Machine Learning** couvrant la prédiction du turnover (AUC = 0,757), la segmentation des employés, la prévision des embauches et l'analyse de rétention.

Le projet a été conduit selon la méthodologie **Scrum**, organisé en quatre sprints successifs, chacun livrant un incrément fonctionnel testé et intégré.

**Mots-clés :** Microservices, Spring Boot, JWT, Keycloak, Recrutement, IA, Gemini, dbt, Airflow, Machine Learning, Business Intelligence, SIRH.

---

## Table des Matières

1. Introduction Générale
2. Sprint 1 — Authentification Keycloak et Gestion des Employés
3. Sprint 2 — Module de Recrutement et Chatbot RH
4. Sprint 3 — Matching Intelligent et Intelligence Artificielle
5. Sprint 4 — Infrastructure Business Intelligence et Machine Learning
6. Conclusion Générale
7. Bibliographie

---

## Introduction Générale

### 1.1 Contexte et Motivations

Les entreprises modernes font face à une gestion de plus en plus complexe de leurs ressources humaines. La multiplicité des processus RH — recrutement, suivi des employés, mobilité interne, analyse des performances — génère des volumes de données importants dont l'exploitation manuelle est inefficace et source d'erreurs. Dans ce contexte, les systèmes d'information RH (SIRH) jouent un rôle stratégique en centralisant, automatisant et enrichissant ces processus.

Ce projet s'inscrit dans la double tendance actuelle du développement logiciel : d'une part, l'adoption généralisée des **architectures microservices** qui offrent flexibilité, scalabilité et indépendance des équipes de développement ; d'autre part, la **démocratisation de l'intelligence artificielle** et du **Business Intelligence**, qui permettent aux organisations d'extraire de la valeur concrète à partir de leurs données opérationnelles.

### 1.2 Problématique

Comment concevoir et développer une plateforme SIRH complète qui soit à la fois :
- **Sécurisée** : gestion des identités et des droits d'accès robuste, compatible avec des standards industriels tels que Keycloak/OpenID Connect ;
- **Modulaire** : architecture microservices permettant l'évolution et la maintenance indépendante de chaque domaine fonctionnel ;
- **Intelligente** : capacités d'analyse automatique des candidatures par intelligence artificielle (Google Gemini) ;
- **Décisionnelle** : infrastructure BI permettant aux managers et aux RH d'exploiter les données historiques pour anticiper les besoins en talents ?

### 1.3 Objectifs du Projet

Les objectifs principaux de ce projet sont les suivants :

**Objectifs applicatifs :**
- Développer un système d'authentification JWT sécurisé avec intégration Keycloak (SSO) ;
- Implémenter la gestion complète des employés, départements, postes et contrats ;
- Concevoir un module de recrutement interne avec workflow de validation des offres ;
- Intégrer un chatbot RH conversationnel alimenté par l'API Google Gemini ;
- Développer un moteur de matching IA pour scorer automatiquement les candidats.

**Objectifs décisionnels :**
- Mettre en place un pipeline ETL automatisé avec Apache Airflow ;
- Construire un Data Warehouse dimensionnel avec dbt (18 modèles) ;
- Implémenter 6 modèles de Machine Learning pour l'analyse RH prédictive ;
- Assurer la qualité des données avec 50 tests automatisés.

### 1.4 Méthodologie Scrum Adoptée

Le projet a été conduit selon la méthodologie **Scrum**, un cadre de travail agile adapté aux projets de développement logiciel complexes. Scrum organise le travail en itérations courtes et fixes appelées **Sprints**, chacune livrant un incrément potentiellement déployable du produit.

**Principes Scrum appliqués :**

| Concept Scrum | Application dans ce projet |
|---|---|
| Product Backlog | Liste priorisée de toutes les fonctionnalités SIRH à développer |
| Sprint | Itération de développement focalisée sur un domaine fonctionnel |
| Sprint Goal | Objectif clair et mesurable pour chaque sprint |
| Definition of Done | Fonctionnalité implémentée, testée, documentée et intégrée |
| Incrément | Livrable fonctionnel à la fin de chaque sprint |

**Organisation des sprints :**

| Sprint | Domaine | Durée estimée | Livrable |
|---|---|---|---|
| Sprint 1 | Authentification (JWT + Keycloak) + Gestion des Employés | 3 semaines | Auth Service + Employee Service opérationnels |
| Sprint 2 | Module Recrutement + Chatbot RH | 3 semaines | Recruitment Service complet avec chatbot |
| Sprint 3 | Matching IA + Scoring des candidats | 2 semaines | Moteur IA de matching fonctionnel |
| Sprint 4 | Infrastructure BI + Machine Learning | 4 semaines | Pipeline Airflow/dbt + 6 modèles ML |

### 1.5 Architecture Globale du Système

L'architecture retenue est une architecture **microservices** exposée derrière une API Gateway unique. Chaque service est autonome, possède sa propre base de données et communique via des API REST sécurisées par JWT.

```
                         Client (Angular Frontend)
                                    │
                         ┌──────────▼──────────┐
                         │    API Gateway       │  :8080
                         │  (Spring Cloud GW)   │
                         │  ┌───────────────┐   │
                         │  │ AuthJwtFilter │   │  ← Validation JWT
                         │  │ JwtValidator  │   │  ← HS256 + JWKS Keycloak
                         │  └───────────────┘   │
                         └──┬──────┬────────┬───┘
                            │      │        │
               ┌────────────▼┐  ┌──▼──────┐ ┌▼────────────────┐
               │ Auth Service│  │Employee │ │Recruitment      │
               │   :8081     │  │Service  │ │Service  :8083   │
               │             │  │ :8082   │ │                 │
               │ /api/auth/**│  │/api/emp/│ │/api/job-offers/ │
               │             │  │/api/dpt/│ │/api/applications│
               │ MySQL       │  │         │ │/api/skills/     │
               │ sirh_auth   │  │MySQL    │ │/api/chat/       │
               └─────────────┘  │sirh_emp │ │MySQL            │
                                └─────────┘ │sirh_recruit     │
                                            └─────────────────┘
                                                    │
                              ┌─────────────────────▼──────────────┐
                              │         SIRH BI (Python)            │
                              │  extract_staging → dbt → Airflow    │
                              │  sirh_staging → sirh_dwh → ML tables│
                              │  Apache Superset (Dashboards)        │
                              └────────────────────────────────────-─┘
```

**Flux de requête authentifiée :**
1. Le client envoie une requête avec l'en-tête `Authorization: Bearer <token>` ;
2. L'API Gateway extrait et valide le token JWT (algorithme HS256) ;
3. En cas de validité, la gateway injecte `X-Auth-User: <email>` et `X-Auth-Roles: <rôles>` ;
4. Le service cible reçoit la requête enrichie et reconstruit le `SecurityContext` Spring ;
5. Le contrôleur traite la requête et retourne la réponse.

### 1.6 Stack Technique Complète

| Couche      | Technologies |
|-------------|--------------|
| API Gateway   | Spring Cloud Gateway 4.1, Spring Security 6.2 |
| Microservices | Spring Boot 3.2, Spring Data JPA, Hibernate |
| Base de données | MySQL 8.0 (4 schémas séparés) |
| Sécurité | JWT HS256, BCrypt, Keycloak 23+ |
| IA / ML | Google Gemini API, Python scikit-learn, Prophet, SHAP |
| ETL / BI | Apache Airflow 2.9.1, dbt-mysql 1.7.0, Apache Superset |
| Documentation | Swagger/OpenAPI 3, dbt docs |
| Containerisation | Docker, Docker Compose |
| Build | Maven 3.9 |

---

## Chapitre 1 — Sprint 1 : Authentification Keycloak et Gestion des Employés

### 1.1 Objectifs du Sprint

Ce premier sprint pose les fondations de toute la plateforme SIRH. Deux domaines fonctionnels sont couverts :
- La **sécurité et l'identité** : tout utilisateur de la plateforme doit s'authentifier ; ses droits déterminent ce qu'il peut voir et faire ;
- La **gestion des ressources humaines de base** : la donnée centrale du SIRH est le profil employé, avec ses relations organisationnelles (département, poste, manager).

**Sprint Goal :** À l'issue de ce sprint, un utilisateur peut s'inscrire, se connecter via JWT ou Keycloak, et les données des employés sont accessibles aux utilisateurs authentifiés selon leur rôle.

### 1.2 Backlog du Sprint 1

| ID | User Story | Priorité |
|---|---|---|
| US-01 | En tant qu'employé, je veux m'inscrire sur la plateforme avec mon email et mot de passe | Haute |
| US-02 | En tant qu'employé, je veux me connecter et recevoir un token JWT | Haute |
| US-03 | En tant que système, je veux pouvoir renouveler un token expiré via refresh token | Haute |
| US-04 | En tant qu'administrateur Keycloak, je veux synchroniser les comptes SIRH avec Keycloak | Moyenne |
| US-05 | En tant que RH admin, je veux créer, lire, modifier et supprimer des fiches employés | Haute |
| US-06 | En tant que manager, je veux consulter les employés de mon département | Haute |
| US-07 | En tant que RH admin, je veux gérer les départements et les postes | Haute |
| US-08 | En tant que système, je veux que les données de démonstration soient initialisées automatiquement | Moyenne |

### 1.3 Architecture du Service d'Authentification

#### 1.3.1 Qu'est-ce que JWT (JSON Web Token) ?

JWT (RFC 7519) est un standard ouvert pour la transmission sécurisée d'informations entre parties sous forme d'un objet JSON signé. Dans ce projet, les tokens JWT sont utilisés pour l'authentification **sans état** (*stateless*) : le serveur n'a pas besoin de stocker de session ; toutes les informations nécessaires sont dans le token lui-même.

Un token JWT se compose de trois parties encodées en Base64url, séparées par des points :

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9    ← Header (algorithme + type)
.
eyJzdWIiOiJhZG1pbkBoci5zaXJoLmNvbSIsInJvbGVzIjpbIkhSX0FETUlOIl0sImlhdCI6MTcxNzA2Nzk0MCwiZXhwIjoxNzE3MDcxNTQwfQ==    ← Payload (claims)
.
HMAC-SHA256-Signature    ← Signature (vérification d'intégrité)
```

**Payload du token SIRH :**
```json
{
  "sub": "admin@hr.sirh.com",
  "roles": ["HR_ADMIN"],
  "iat": 1717067940,
  "exp": 1717071540
}
```

#### 1.3.2 Algorithme et Secret

Le projet utilise l'algorithme **HS256** (HMAC-SHA256). La clé secrète doit être **identique dans tous les services** (API Gateway, Auth Service, Employee Service, Recruitment Service) — c'est une règle critique du projet. Elle est injectée via la variable d'environnement `JWT_SECRET`.

```yaml
# application.yml — Auth Service
jwt:
  secret: ${JWT_SECRET:change-me-in-production-min-256-bits}
  expiration: 3600000        # 1 heure en millisecondes
  refresh-expiration: 86400000  # 24 heures
```

#### 1.3.3 Endpoints du Service d'Authentification

Le `AuthController` expose les endpoints suivants à l'adresse `/api/auth/**` :

| Méthode | Endpoint | Description | Accès |
|---|---|---|---|
| POST | `/api/auth/register` | Créer un nouveau compte | Public |
| POST | `/api/auth/login` | Se connecter et obtenir JWT + refresh | Public |
| POST | `/api/auth/refresh` | Renouveler le token d'accès | Public |
| POST | `/api/auth/keycloak/register` | Créer un compte synchronisé avec Keycloak | Public |
| POST | `/api/auth/keycloak/exchange` | Échanger un token Keycloak contre un token SIRH | Public |

**Exemple d'appel — Inscription :**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "nouveau.employe@sirh.com",
  "password": "motdepasse123",
  "role": "EMPLOYEE"
}
```

**Réponse :**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "email": "nouveau.employe@sirh.com",
  "roles": ["EMPLOYEE"]
}
```

#### 1.3.4 Gestion des Rôles

Le SIRH définit trois niveaux d'accès hiérarchiques :

| Rôle | Description | Permissions principales |
|---|---|---|
| `HR_ADMIN` | Administrateur RH | Accès total : CRUD employés, gestion recrutement, accès rapports |
| `MANAGER` | Responsable d'équipe | Lecture employés de son département, publication d'offres, review candidatures |
| `EMPLOYEE` | Employé standard | Consultation de son profil, candidatures internes, chatbot |

**Important — Gestion du préfixe `ROLE_` :**

Spring Security gère les rôles avec le préfixe `ROLE_` implicitement via `hasRole()`, mais avec `hasAuthority()` le préfixe doit être explicite. Dans ce projet :
- Les tokens JWT contiennent les rôles **sans préfixe** : `["HR_ADMIN", "EMPLOYEE"]`
- Les `JwtAuthFilter` des services Employee et Recruitment **ajoutent le préfixe `ROLE_`** lors de la création du `SecurityContext`
- Résultat : les annotations `@PreAuthorize("hasRole('HR_ADMIN')")` fonctionnent dans ces services

```java
// JwtAuthFilter.java — Employee/Recruitment Service
List<GrantedAuthority> authorities = roles.stream()
    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
    .collect(Collectors.toList());
```

#### 1.3.5 Mécanisme de Refresh Token

La durée de vie d'un access token est volontairement courte (1 heure) pour limiter les risques en cas de vol. Le refresh token (24 heures) permet de renouveler l'access token sans redemander les identifiants.

```
Client                    Auth Service
  │                           │
  │── POST /api/auth/login ──►│
  │◄── accessToken (1h) ──────│
  │◄── refreshToken (24h) ────│
  │                           │
  │  [55 minutes plus tard]   │
  │── POST /api/auth/refresh ─►│  { "refreshToken": "..." }
  │◄── nouveau accessToken ───│
```

### 1.4 Intégration Keycloak

#### 1.4.1 Qu'est-ce que Keycloak ?

**Keycloak** est un serveur d'identité et d'accès (IAM — Identity and Access Management) open-source développé par Red Hat. Il implémente les protocoles standards **OpenID Connect** (OIDC), **OAuth 2.0** et **SAML 2.0**.

Dans un contexte d'entreprise, Keycloak centralise la gestion des identités pour l'ensemble des applications. Une seule authentification (SSO — Single Sign-On) permet d'accéder à toutes les applications de l'organisation sans se reconnecter.

#### 1.4.2 Objectifs de Keycloak dans le SIRH

| Objectif | Bénéfice |
|---|---|
| SSO (Single Sign-On) | L'employé se connecte une seule fois et accède à toutes les applications d'entreprise |
| Centralisation des identités | Un seul référentiel d'utilisateurs pour toutes les applications |
| Délégation de l'authentification | Le SIRH n'a plus besoin de gérer les mots de passe en interne |
| MFA (Multi-Factor Authentication) | Keycloak gère l'authentification à deux facteurs nativement |
| Fédération d'identités | Connexion via Active Directory, LDAP, ou réseaux sociaux |

#### 1.4.3 Architecture de l'Intégration Keycloak

```
Employé                SIRH Frontend           Keycloak (:8180)        SIRH Backend
   │                       │                        │                      │
   │── login Keycloak ─────►                        │                      │
   │                       │── redirect ───────────►│                      │
   │                       │                        │ (authentification)   │
   │                       │◄── Keycloak Token ─────│                      │
   │                       │── /keycloak/exchange ──────────────────────►  │
   │                       │                        │   (validation JWKS)  │
   │                       │◄── SIRH JWT ──────────────────────────────────│
   │◄── accès dashboard ───│                        │                      │
```

#### 1.4.4 Implémentation — KeycloakAdminClient

La classe `KeycloakAdminClient` implémente le client pour l'API d'administration Keycloak. Elle utilise le `HttpClient` natif de Java 17 pour les appels REST vers l'endpoint d'admin Keycloak.

**Fonctionnalités implémentées :**
- Obtention et cache du token d'administration (avec buffer de 15 secondes avant expiration)
- Création d'un utilisateur dans un realm Keycloak
- Attribution de rôles Keycloak
- Gestion des erreurs HTTP (409 Conflict si utilisateur existant)

```java
// Pattern de cache du token admin Keycloak
private String cachedAdminToken;
private long tokenExpiry;

private String getAdminToken() throws Exception {
    if (cachedAdminToken != null && System.currentTimeMillis() < tokenExpiry - 15000) {
        return cachedAdminToken;  // Réutilise le token si encore valide (avec buffer 15s)
    }
    // Sinon, demande un nouveau token via client_credentials
    // POST /realms/{realm}/protocol/openid-connect/token
    // grant_type=client_credentials&client_id=admin-cli&client_secret=...
}
```

#### 1.4.5 Validation des Tokens Keycloak dans la Gateway

L'API Gateway supporte deux types de tokens :
- **Tokens SIRH** (HS256) : validés avec la clé secrète partagée
- **Tokens Keycloak** (RSA RS256) : validés via le **JWKS endpoint** (JSON Web Key Set)

```yaml
# api-gateway/application.yml
keycloak:
  jwks-uri: ${KEYCLOAK_JWKS_URI:http://localhost:8180/realms/myrealm/protocol/openid-connect/certs}
  issuer: ${KEYCLOAK_ISSUER:http://localhost:8180/realms/myrealm}
```

Le `JwtValidator` de la gateway tente d'abord la validation HS256 ; en cas d'échec, il télécharge les clés publiques JWKS de Keycloak et valide la signature RSA.

### 1.5 API Gateway — Routage et Sécurité Centralisée

L'API Gateway (port 8080) est le **seul point d'entrée** public de la plateforme. Elle assure :

1. **Le routage** : chaque préfixe d'URL est dirigé vers le service approprié
2. **La validation JWT** : `AuthJwtFilter` intercepte toutes les requêtes sur les routes protégées
3. **L'injection d'en-têtes** : après validation, `X-Auth-User` et `X-Auth-Roles` sont ajoutés
4. **L'agrégation Swagger** : une interface Swagger unifiée liste toutes les APIs

```yaml
# api-gateway/application.yml — Routes configurées
spring:
  cloud:
    gateway:
      routes:
        - id: auth-service
          uri: http://localhost:8081
          predicates:
            - Path=/api/auth/**
          filters:
            - name: AuthJwtFilter   # Pas de validation JWT sur /api/auth/** (public)

        - id: employee-service
          uri: http://localhost:8082
          predicates:
            - Path=/api/employees/**,/api/departments/**,/api/positions/**
          filters:
            - name: AuthJwtFilter   # JWT obligatoire

        - id: recruitment-service
          uri: http://localhost:8083
          predicates:
            - Path=/api/job-offers/**,/api/applications/**,/api/skills/**,/api/chat/**
          filters:
            - name: AuthJwtFilter   # JWT obligatoire
```

### 1.6 Service de Gestion des Employés (Employee Service)

#### 1.6.1 Modèle de Données — Entité Employee

L'entité `Employee` est la pièce centrale du service. Elle représente le profil complet d'un employé dans l'organisation.

```java
@Entity
@Table(name = "employees")
public class Employee {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;                    // UUID généré automatiquement

    private String firstName;             // Prénom
    private String lastName;              // Nom de famille
    @Column(unique = true)
    private String email;                 // Email unique (clé fonctionnelle)
    private String phone;                 // Téléphone
    private String address;              // Adresse postale
    private String city;                  // Ville
    private Integer salary;               // Salaire brut annuel

    private LocalDate hireDate;           // Date d'embauche

    @ManyToOne(fetch = FetchType.LAZY)
    private Department department;        // Département d'appartenance

    @ManyToOne(fetch = FetchType.LAZY)
    private Position position;            // Poste occupé

    @Enumerated(EnumType.STRING)
    private ContractType contractType;    // CDI / CDD / STAGE

    @ManyToOne(fetch = FetchType.LAZY)
    private ServiceUnit service;          // Unité de service (sous-département)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private Employee manager;             // Manager direct (auto-référence)

    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL)
    private List<EmployeeSkill> skills;   // Compétences avec niveaux
}
```

**Points clés du modèle :**
- **UUID String** comme identifiant primaire (généré par Hibernate, stratégie `UUID`) ;
- **Auto-référence** pour la hiérarchie managériale (`manager_id` → `employee.id`) ;
- **Relation ManyToOne** avec Department et Position (chargement lazy pour performance) ;
- **Énumération** pour le type de contrat (stockée en `VARCHAR(20)` en base).

#### 1.6.2 Entités Associées

**Department** — Département de l'entreprise :
```
id (UUID) | name | description
```
Exemples : Informatique, Marketing, Ressources Humaines, Finance

**Position** — Poste de travail :
```
id (UUID) | title | description | department_id (FK)
```
Exemples : Développeur Full-Stack, Chef de Projet, Responsable Marketing

**ContractType** — Énumération des types de contrat :
```java
public enum ContractType {
    CDI,    // Contrat à Durée Indéterminée
    CDD,    // Contrat à Durée Déterminée
    STAGE   // Stage / Convention de stage
}
```

**ServiceUnit** — Unité de service (niveau organisationnel intermédiaire) :
```
id (UUID) | name | department_id (FK)
```

**EmployeeSkill** — Compétences de l'employé avec niveau :
```
id | employee_id (FK) | skill_name | level (JUNIOR/CONFIRMED/SENIOR)
```

#### 1.6.3 Endpoints REST — EmployeeController

| Méthode | Endpoint | Description | Rôle requis |
|---|---|---|---|
| GET | `/api/employees` | Lister tous les employés | Authentifié |
| GET | `/api/employees/{id}` | Récupérer un employé par ID | Authentifié |
| POST | `/api/employees` | Créer un nouvel employé | `HR_ADMIN` |
| PUT | `/api/employees/{id}` | Modifier un employé | `HR_ADMIN` |
| DELETE | `/api/employees/{id}` | Supprimer un employé | `HR_ADMIN` |
| GET | `/api/departments` | Lister les départements | Authentifié |
| POST | `/api/departments` | Créer un département | `HR_ADMIN` |
| GET | `/api/positions` | Lister les postes | Authentifié |
| POST | `/api/positions` | Créer un poste | `HR_ADMIN` |

**Contrôle d'accès avec `@PreAuthorize` :**
```java
@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    @GetMapping
    public ResponseEntity<List<EmployeeDTO>> findAll() {
        return ResponseEntity.ok(service.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<EmployeeDTO> create(@RequestBody @Valid EmployeeRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('HR_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

#### 1.6.4 Logique Métier — EmployeeService

Le service implémente les règles métier suivantes :

- **Unicité de l'email** : avant de créer un employé, `existsByEmail()` est appelé pour éviter les doublons (optimisé via requête SQL directe, sans charger toute la liste)
- **Mapping DTO ↔ Entité** : réalisé manuellement dans les méthodes privées `toDto()` et `toEntity()`
- **Vérification d'existence** : `findById()` lance une `ResourceNotFoundException` (→ HTTP 404) si l'employé n'est pas trouvé

#### 1.6.5 Initialisation des Données de Démonstration

La classe `DataInitializer` (implémente `CommandLineRunner`) peuple automatiquement la base de données au démarrage avec des données cohérentes couvrant tous les cas d'utilisation.

**8 employés seed coordonnés :**

| Email | Rôle Auth | Département | Poste | Contrat |
|---|---|---|---|---|
| `admin@hr.sirh.com` | `HR_ADMIN` | Ressources Humaines | DRH | CDI |
| `manager@mgr.sirh.com` | `MANAGER` | Informatique | Chef de Projet IT | CDI |
| `employee@sirh.com` | `EMPLOYEE` | Informatique | Développeur Full-Stack | CDI |
| `karim.design@sirh.com` | `EMPLOYEE` | Design | Designer UX | CDI |
| `lea.data@sirh.com` | `EMPLOYEE` | Data | Data Analyst | CDD |
| `youssef.dev@sirh.com` | `EMPLOYEE` | Informatique | Développeur Backend | STAGE |
| `clara.mkt@sirh.com` | `EMPLOYEE` | Marketing | Chargée Marketing | CDI |
| `nadia.mgr@sirh.com` | `MANAGER` | Marketing | Responsable Marketing | CDI |

**Mécanisme anti-doublon :**
```java
@Override
public void run(String... args) {
    if (employeeRepository.existsByEmail("admin@hr.sirh.com")) {
        return;  // Données déjà initialisées — ne pas réinsérer
    }
    // ... insertion des données
}
```

### 1.7 Tests et Résultats du Sprint 1

**Validation des endpoints — Tests curl :**

```bash
# 1. Inscription
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
# → 200 OK : {"accessToken":"eyJ...","refreshToken":"eyJ..."}

# 2. Connexion admin
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hr.sirh.com","password":"admin123"}'
# → 200 OK : {"accessToken":"eyJ..."}

# 3. Liste employés (token requis)
curl http://localhost:8080/api/employees \
  -H "Authorization: Bearer eyJ..."
# → 200 OK : [{"id":"...","firstName":"Admin",...}]

# 4. Tentative sans token
curl http://localhost:8080/api/employees
# → 401 Unauthorized
```

### 1.8 Bilan du Sprint 1

À l'issue du Sprint 1, les fonctionnalités suivantes sont livrées et opérationnelles :

- ✅ Inscription et connexion JWT avec génération de tokens HS256
- ✅ Mécanisme de refresh token (durée : 24h)
- ✅ Gestion des rôles : HR_ADMIN, MANAGER, EMPLOYEE
- ✅ Intégration Keycloak : synchronisation des comptes et échange de tokens
- ✅ API Gateway avec validation JWT centralisée et injection d'en-têtes
- ✅ CRUD complet des employés avec contrôle d'accès par rôle
- ✅ Gestion des départements, postes et types de contrat
- ✅ Structure hiérarchique avec référence manager
- ✅ Données de démonstration initialisées (8 employés, 5 départements)
- ✅ Documentation Swagger/OpenAPI sur chaque service

---

## Chapitre 2 — Sprint 2 : Module de Recrutement et Chatbot RH

### 2.1 Objectifs du Sprint

Ce sprint implémente le cœur métier du recrutement interne. L'objectif est de permettre :
- Aux managers de publier des offres d'emploi internes avec un cycle de vie contrôlé ;
- Aux employés de soumettre leurs candidatures avec CV et lettre de motivation ;
- À tous les utilisateurs d'interagir avec un chatbot RH intelligent pour découvrir les opportunités.

**Sprint Goal :** À l'issue de ce sprint, le processus complet de recrutement interne est fonctionnel, du moment où un manager exprime un besoin jusqu'à la réception des candidatures.

### 2.2 Backlog du Sprint 2

| ID | User Story | Priorité |
|---|---|---|
| US-09 | En tant que manager, je veux créer une offre d'emploi en état brouillon | Haute |
| US-10 | En tant que manager, je veux publier une offre pour la rendre visible aux employés | Haute |
| US-11 | En tant que manager, je veux clôturer une offre quand le poste est pourvu | Haute |
| US-12 | En tant qu'employé, je veux voir toutes les offres publiées | Haute |
| US-13 | En tant qu'employé, je veux soumettre ma candidature avec mon CV et ma lettre de motivation | Haute |
| US-14 | En tant que RH admin, je veux gérer le catalogue des compétences | Moyenne |
| US-15 | En tant qu'employé, je veux interroger un chatbot pour trouver des offres correspondant à mon profil | Moyenne |
| US-16 | En tant qu'employé, je veux consulter l'historique de ma conversation avec le chatbot | Basse |

### 2.3 Workflow des Offres d'Emploi

#### 2.3.1 Cycle de Vie d'une Offre

Le processus de publication d'une offre suit un **workflow en trois états** :

```
            [Manager crée l'offre]
                     │
                     ▼
              ┌─────────────┐
              │   DRAFT     │  ← Brouillon, non visible aux employés
              │  (Brouillon)│     Le manager peut modifier librement
              └──────┬──────┘
                     │  [Manager publie]
                     ▼
              ┌─────────────┐
              │  PUBLISHED  │  ← Visible à tous les employés authentifiés
              │  (Publiée)  │     Les candidatures sont acceptées
              └──────┬──────┘
                     │  [Manager clôture / date limite dépassée]
                     ▼
              ┌─────────────┐
              │   CLOSED    │  ← Plus de candidature possible
              │  (Clôturée) │     Données archivées pour analyse BI
              └─────────────┘
```

**Règles métier du workflow :**
- Seul un `HR_ADMIN` ou `MANAGER` peut créer ou modifier le statut d'une offre
- Une offre `CLOSED` ne peut pas revenir à `PUBLISHED`
- Les candidatures ne sont acceptées que sur les offres `PUBLISHED`

#### 2.3.2 Modèle de Données — JobOffer

```
Table job_offers :
├── id             (UUID, PK)
├── title          (VARCHAR) — ex: "Développeur Full-Stack Java/Angular"
├── description    (TEXT)    — description détaillée du poste
├── department     (VARCHAR) — département ciblé
├── location       (VARCHAR) — lieu de travail
├── contract_type  (VARCHAR) — CDI / CDD / STAGE
├── status         (ENUM)    — DRAFT / PUBLISHED / CLOSED
├── deadline_date  (DATE)    — date limite de candidature
├── created_at     (DATETIME)
└── required_skills (ManyToMany → skills table)
```

#### 2.3.3 Endpoints REST — JobOfferController

| Méthode | Endpoint | Description | Accès |
|---|---|---|---|
| GET | `/api/job-offers` | Lister toutes les offres | Authentifié |
| GET | `/api/job-offers/published` | Offres publiées seulement | Authentifié |
| GET | `/api/job-offers/{id}` | Détail d'une offre | Authentifié |
| POST | `/api/job-offers` | Créer une offre (DRAFT) | `HR_ADMIN` / `MANAGER` |
| PUT | `/api/job-offers/{id}` | Modifier une offre | `HR_ADMIN` / `MANAGER` |
| PATCH | `/api/job-offers/{id}/publish` | Passer au statut PUBLISHED | `HR_ADMIN` / `MANAGER` |
| PATCH | `/api/job-offers/{id}/close` | Passer au statut CLOSED | `HR_ADMIN` / `MANAGER` |
| DELETE | `/api/job-offers/{id}` | Supprimer une offre | `HR_ADMIN` |

### 2.4 Processus de Candidature

#### 2.4.1 Soumission d'une Candidature

Quand un employé souhaite candidater à une offre publiée, il soumet un formulaire contenant :
1. **Sa lettre de motivation** (texte libre) — analysée par l'IA pour extraire les compétences
2. **Son CV** (fichier PDF, encodé en Base64) — stocké en `LONGBLOB` dans MySQL
3. **Un nom de fichier CV** — utilisé également par l'IA heuristique pour l'analyse des compétences

#### 2.4.2 Modèle de Données — Application

```
Table applications :
├── id                       (UUID, PK)
├── job_offer_id             (UUID, FK → job_offers)
├── candidate_name           (VARCHAR)
├── candidate_email          (VARCHAR)
├── cover_letter             (TEXT)           ← Lettre de motivation
├── cv_file                  (LONGBLOB)       ← Fichier CV binaire
├── cv_file_name             (VARCHAR)        ← Nom original du fichier
├── letter_motivation_pdf    (LONGBLOB)       ← Lettre PDF optionnelle
├── letter_motivation_file_name (VARCHAR)
├── status                   (ENUM: PENDING/REVIEWED/ACCEPTED/REJECTED)
├── match_score              (INT)            ← Score IA (0-100, calculé au Sprint 3)
├── applied_at               (DATETIME)
└── skills (ManyToMany → skills)              ← Compétences extraites par IA
```

#### 2.4.3 Endpoints REST — ApplicationController

| Méthode | Endpoint | Description | Accès |
|---|---|---|---|
| POST | `/api/applications` | Soumettre une candidature | Authentifié |
| GET | `/api/applications` | Lister toutes les candidatures | `HR_ADMIN` / `MANAGER` |
| GET | `/api/applications/{id}` | Détail d'une candidature | Authentifié |
| GET | `/api/applications/offer/{offerId}` | Candidatures pour une offre | `HR_ADMIN` / `MANAGER` |
| GET | `/api/applications/match/{offerId}` | Matching IA pour une offre | `HR_ADMIN` / `MANAGER` |
| PATCH | `/api/applications/{id}/status` | Changer le statut | `HR_ADMIN` / `MANAGER` |

### 2.5 Gestion des Compétences (Skills)

Le catalogue des compétences est partagé entre les offres (compétences requises) et les candidatures (compétences du candidat).

**Entité Skill :**
```
Table skills :
├── id    (UUID, PK)
└── name  (VARCHAR, UNIQUE) — ex: "Java", "Spring Boot", "Angular", "Python"
```

**Compétences seeds (DataInitializer) :**
Java, Spring Boot, Angular, TypeScript, Python, Docker, Kubernetes, React, SQL, Git, CI/CD, Machine Learning, Power BI, Figma, UX Design, Scrum, Communication, Gestion de projet.

### 2.6 Chatbot RH — ChatService et ChatController

#### 2.6.1 Pourquoi un Chatbot dans le Sprint 2 ?

Le chatbot RH est un outil de **découverte d'offres et d'aide à la candidature**. Il répond aux questions des employés sur les offres disponibles, les processus de recrutement et les contrats. Comme il est directement lié au module recrutement (il interroge la table `job_offers` et guide vers la candidature), il est intégré au Sprint 2 plutôt qu'au Sprint 3 (qui traite le matching post-candidature).

#### 2.6.2 Architecture Duale : Heuristique + Gemini

Le `ChatService` implémente deux modes de fonctionnement :

```
Requête utilisateur
        │
        ▼
   GEMINI_API_KEY configurée ?
        │                │
       OUI               NON
        │                │
        ▼                ▼
  Mode Gemini      Mode Heuristique
  (IA générative)  (Règles + FAQ)
        │                │
        ▼                ▼
   Réponse contextualisée avec
   l'historique de conversation
   et les offres publiées en temps réel
```

#### 2.6.3 Mode Heuristique — Fonctionnement

Le mode heuristique repose sur une **FAQ statique** de 12 entrées couvrant les thèmes les plus fréquents, plus un moteur de **recherche d'offres par mots-clés**.

**Thèmes couverts par la FAQ :**
- Salutations (bonjour/salut/hello)
- Processus de candidature (comment postuler, étapes, délais)
- Offres disponibles (déclenchement de la recherche)
- Types de contrats (CDI, CDD, STAGE — définitions et différences)
- Score de matching IA (explication de l'algorithme)
- Départements de l'entreprise
- Délais du processus RH
- Conseils pour les entretiens
- Amélioration du profil candidat
- Gestion des refus
- Mobilité interne
- Menu d'aide général

**Algorithme de recherche d'offres :**
```
1. Supprimer les stop words français (offre, cherche, je veux, y a-t-il...)
2. Extraire le mot-clé de recherche résiduel
3. Parcourir toutes les offres PUBLISHED
4. Pour chaque offre : vérifier si le mot-clé apparaît dans
   title | department | description | skill.name
5. Retourner les 5 premières correspondances
6. Formater la réponse avec titre, département, lieu, date limite, compétences
```

#### 2.6.4 Mode Gemini — Fonctionnement

Quand la variable `GEMINI_API_KEY` est définie, le chatbot devient **conversationnel et contextuel** :

1. **Récupération de l'historique** : les 10 derniers messages de la session sont inclus
2. **Contexte des offres en temps réel** : jusqu'à 10 offres PUBLISHED sont injectées dans le prompt système
3. **System prompt RH** : Gemini reçoit des instructions précises (répondre en français, utiliser des emojis, rester sous 300 mots, se limiter aux sujets RH)
4. **Conservation du contexte** : la conversation multi-tours est gérée via les rôles `user` / `model` de l'API Gemini

```
System Prompt envoyé à Gemini :
┌────────────────────────────────────────────────────────┐
│ "Tu es l'assistant RH virtuel du SIRH...               │
│  RÈGLES : Réponds en français, max 300 mots, emojis    │
│                                                         │
│  OFFRES ACTUELLEMENT PUBLIÉES :                        │
│  - Développeur Java | Informatique | Paris | Java, Spring│
│  - Data Analyst | Data | Lyon | Python, SQL, Power BI  │
│  - ..."                                                │
└────────────────────────────────────────────────────────┘
```

#### 2.6.5 Persistance des Conversations

Chaque message est persisté dans la table `chat_messages` avec :
- `session_id` : identifiant unique de session (UUID généré côté client)
- `sender` : `USER` ou `BOT`
- `content` : texte du message
- `timestamp` : horodatage

Cela permet aux employés de consulter l'historique de leurs échanges avec le chatbot.

#### 2.6.6 Endpoints REST — ChatController

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/{sessionId}` | Envoyer un message et recevoir une réponse | 
| GET | `/api/chat/{sessionId}/history` | Récupérer l'historique d'une session |

**Sécurité :** Le chatbot est sécurisé par JWT via la gateway. Seuls les utilisateurs authentifiés peuvent y accéder. L'identité de l'utilisateur est disponible via l'en-tête `X-Auth-User`.

### 2.7 Bilan du Sprint 2

À l'issue du Sprint 2, les fonctionnalités suivantes sont livrées :

- ✅ Workflow complet des offres : DRAFT → PUBLISHED → CLOSED
- ✅ CRUD complet des offres avec contrôle d'accès par rôle
- ✅ Soumission de candidatures avec upload de CV (Base64/LONGBLOB)
- ✅ Gestion du catalogue de compétences
- ✅ Chatbot RH en mode heuristique (FAQ + recherche offres)
- ✅ Chatbot RH en mode Gemini (IA conversationnelle avec contexte)
- ✅ Persistance de l'historique des conversations
- ✅ Routage du chatbot via la gateway avec JWT obligatoire
- ✅ Données de démonstration : 5 offres publiées, 5 candidatures

---

## Chapitre 3 — Sprint 3 : Matching Intelligent et Intelligence Artificielle

### 3.1 Objectifs du Sprint

Ce sprint constitue la **valeur ajoutée principale** de la plateforme SIRH par rapport à un système traditionnel. L'objectif est de donner aux recruteurs et managers des outils automatisés pour évaluer objectivement les candidatures :

- Extraction automatique des compétences depuis la lettre de motivation et le CV ;
- Calcul d'un score de matching entre un candidat et une offre ;
- Extraction d'un profil candidat enrichi (expérience, niveau, formation, langues, soft skills) ;
- Génération automatique de questions d'entretien personnalisées.

**Sprint Goal :** À l'issue de ce sprint, chaque candidature reçoit automatiquement un score IA de 0 à 100, et les recruteurs peuvent trier les candidats par pertinence en un clic.

### 3.2 Backlog du Sprint 3

| ID | User Story | Priorité |
|---|---|---|
| US-17 | En tant que système, je veux extraire automatiquement les compétences d'une candidature | Haute |
| US-18 | En tant que système, je veux calculer un score de matching entre candidat et offre | Haute |
| US-19 | En tant que recruteur, je veux voir les candidats triés par score pour une offre | Haute |
| US-20 | En tant que système, je veux extraire un profil enrichi du candidat via Gemini | Moyenne |
| US-21 | En tant que recruteur, je veux générer automatiquement des questions d'entretien | Moyenne |
| US-22 | En tant que système, je veux utiliser Gemini comme extracteur primaire avec fallback heuristique | Haute |

### 3.3 Architecture du Système de Matching IA

```
Candidature soumise
        │
        ▼
CvSkillExtractorService
        │
   ┌────┴────┐
   │         │
GEMINI_API_KEY    Pas de clé
   │         │
   ▼         ▼
Mode Gemini  Mode Heuristique
(extraction  (matching 20
 JSON strict) aliases, corpus)
   │         │
   └────┬────┘
        │
        ▼
   Set<Skill> extrait
        │
        ▼
computeSmartScore()
   ├── base score      = (compétences matchées / requises) × 100
   ├── experience bonus = regex "N ans/years" → +2 / +5 / +8 / +12 pts
   └── confidence bonus = ≥4 compétences matchées → +5 pts
        │
        ▼
   Score final [0-100] → stocké dans application.match_score
```

### 3.4 Extraction de Compétences — CvSkillExtractorService

#### 3.4.1 Les 20 Compétences Canoniques

Le système reconnaît 20 compétences canoniques, chacune associée à une liste d'alias synonymes :

| Compétence Canonique | Alias reconnus (exemples) |
|---|---|
| Java | java, jdk, jvm, openjdk, java17, java11 |
| Spring Boot | spring, spring boot, springboot, spring framework |
| Angular | angular, angular17, angularjs |
| TypeScript | typescript, ts, type script |
| Python | python, python3, py, pandas, numpy, jupyter |
| Docker | docker, conteneur, container, dockerfile |
| Kubernetes | kubernetes, k8s, kube, orchestration |
| SQL | sql, mysql, postgresql, postgres, oracle db |
| Machine Learning | machine learning, ml, deep learning, ia, tensorflow, scikit |
| CI/CD | ci/cd, jenkins, github actions, pipeline, devops |
| Scrum | scrum, agile, kanban, sprint, méthodologie agile |
| *(et 9 autres)* | ... |

#### 3.4.2 Mode Heuristique — Algorithme

```
1. Construire le corpus :
   corpus = coverLetter.toLowerCase() + cvFileName.replaceAll("[_\\-.]", " ").toLowerCase()
   
   Exemple : "Je maîtrise spring boot et docker" + "CV_Java_Angular_2024.pdf"
   → "je maîtrise spring boot et docker cv java angular 2024"

2. Pour chaque compétence canonique dans SKILL_ALIASES :
   Pour chaque alias dans la liste d'alias :
     Si corpus.contains(alias) → ajouter la compétence canonique, stop
     
3. Résoudre les noms canoniques en entités Skill via skillRepo.findByName()
4. Retourner le Set<Skill> trouvé
```

#### 3.4.3 Mode Gemini — Extraction par IA

Lorsque la clé `GEMINI_API_KEY` est configurée, l'extraction est déléguée à Google Gemini avec un **prompt structuré strict** :

```
Prompt envoyé à Gemini (temperature=0.2, maxTokens=200) :
"You are an HR assistant. Extract skills from the following text.
Return ONLY valid JSON with this shape:
{"skills":["Java", "Docker", "Python"]}
Rules:
- Use ONLY these canonical skill names: Java, Spring Boot, Angular, ...
- If none found, return {"skills":[]}
- Do not include markdown or extra keys.

Cover letter:
[texte de la lettre de motivation]
CV filename:
[nom du fichier CV]"
```

**Avantages du mode Gemini :**
- Compréhension sémantique (reconnaît "je connais le framework Spring" → Spring Boot)
- Résistance aux fautes d'orthographe
- Meilleure précision sur les descriptions longues et complexes

**Stratégie de fallback :**
```java
if (geminiApiKey != null && !geminiApiKey.isBlank()) {
    try {
        Set<Skill> skills = extractSkillsViaGemini(coverLetter, cvFileName);
        if (skills != null && !skills.isEmpty()) return skills;  // Succès Gemini
    } catch (Exception e) {
        log.warn("Gemini failed, falling back: {}", e.getMessage());
    }
}
return extractSkillsHeuristic(coverLetter, cvFileName);  // Fallback heuristique
```

### 3.5 Algorithme de Scoring — Détail Complet

#### 3.5.1 Score de Base — computeMatchScore()

Le score de base mesure l'**intersection entre les compétences du candidat et les compétences requises** par l'offre :

```
score_base = (nb_compétences_matchées / nb_compétences_requises) × 100

Exemple :
  Offre requiert : {Java, Spring Boot, Docker, Kubernetes}  → 4 compétences
  Candidat a    : {Java, Spring Boot, Python, Docker}       → 3 matches sur 4
  score_base    = (3 / 4) × 100 = 75
```

#### 3.5.2 Bonus d'Expérience — estimateExperienceBonus()

Le système analyse la lettre de motivation avec une **expression régulière** pour détecter les mentions d'années d'expérience :

```java
Pattern pattern = Pattern.compile("(\\d{1,2})\\s*(ans|years)");
// Détecte : "5 ans", "10 years", "3 ans d'expérience", etc.
```

**Barème des bonus :**

| Années d'expérience détectées | Bonus accordé | Justification |
|---|---|---|
| ≥ 8 ans | +12 points | Profil senior, haute valeur |
| ≥ 5 ans | +8 points | Profil confirmé |
| ≥ 3 ans | +5 points | Profil intermédiaire |
| ≥ 1 an | +2 points | Profil junior avec expérience |
| 0 (non mentionné) | 0 point | Pas d'information |

Si plusieurs mentions d'années apparaissent dans la lettre, seule la **valeur maximale** est retenue.

#### 3.5.3 Bonus de Confiance

Un bonus supplémentaire de **+5 points** est accordé lorsque le candidat présente **au moins 4 compétences matchées**, signalant un profil très bien aligné avec le poste :

```java
int confidenceBonus = candidateSkills != null && candidateSkills.size() >= 4 ? 5 : 0;
```

#### 3.5.4 Score Final — computeSmartScore()

```java
public int computeSmartScore(Set<Skill> candidateSkills, Set<Skill> requiredSkills, String coverLetter) {
    int base            = computeMatchScore(candidateSkills, requiredSkills);
    int experienceBonus = estimateExperienceBonus(coverLetter);
    int confidenceBonus = (candidateSkills != null && candidateSkills.size() >= 4) ? 5 : 0;
    return Math.min(100, base + experienceBonus + confidenceBonus);
}
```

**Exemple complet de calcul :**
```
Offre : Développeur Java Senior (requiert : Java, Spring Boot, Docker, Kubernetes)
Candidat : "Développeur Java avec 6 ans d'expérience... maîtrise Spring Boot et Docker"

1. Extraction : {Java, Spring Boot, Docker}          (3 compétences, pas Kubernetes)
2. score_base = 3/4 × 100 = 75
3. Bonus expérience : "6 ans" → ≥5 ans → +8
4. Bonus confiance : 3 compétences < 4 → 0
5. Score final : min(100, 75 + 8 + 0) = 83/100
```

### 3.6 Extraction de Profil Candidat Enrichi

Au-delà du simple scoring, le système peut extraire un **profil candidat complet** via Gemini :

#### 3.6.1 CandidateProfileDTO

```java
public class CandidateProfileDTO {
    List<String> competences;     // ["Java", "Spring Boot", "Docker"]
    int anneesExperience;         // 6
    String niveau;                // "Senior" (Junior/Confirmé/Senior)
    String formation;             // "Ingénieur Informatique"
    List<String> langues;         // ["Français", "Anglais"]
    List<String> softSkills;      // ["Leadership", "Travail en équipe"]
    String resumeProfil;          // "Profil narratif 2-3 phrases"
}
```

#### 3.6.2 Détermination Automatique du Niveau

| Condition | Niveau assigné |
|---|---|
| `anneesExperience >= 6` | Senior |
| `anneesExperience >= 3` | Confirmé |
| `anneesExperience < 3` | Junior |

#### 3.6.3 Prompt Gemini pour l'Extraction de Profil

```json
Prompt (temperature=0.3, maxTokens=500) :
"Tu es un assistant RH expert. Analyse la lettre de motivation et le nom du CV.
Retourne UNIQUEMENT un JSON valide :
{
  "competences": ["Java", "Spring Boot"],
  "annees_experience": 5,
  "niveau": "Confirmé",
  "formation": "Ingénieur Informatique",
  "langues": ["Français", "Anglais"],
  "soft_skills": ["Leadership"],
  "resume_profil": "Résumé narratif en 2-3 phrases."
}
Règles : niveau = Junior/Confirmé/Senior, valeurs vides si absent."
```

### 3.7 Génération de Questions d'Entretien

#### 3.7.1 Objectif

Pour chaque candidature, le système peut générer **5 questions d'entretien personnalisées** prenant en compte le poste, les compétences requises et la lettre de motivation du candidat.

#### 3.7.2 Structure des Questions

Gemini reçoit le titre du poste, la description, les compétences requises et la lettre de motivation, et génère exactement 5 questions selon la répartition suivante :

| Type de question | Description |
|---|---|
| 2 questions techniques | Évaluation des compétences clés du poste |
| 1 question comportementale | Situation passée / méthode de résolution |
| 1 question situationnelle | Réaction face à un scénario hypothétique |
| 1 question de motivation | Pourquoi ce poste, vision à 6 mois |

**Questions par défaut (sans Gemini) :**
1. *Décrivez votre expérience la plus significative pour ce poste.*
2. *Quelles sont vos principales compétences techniques ?*
3. *Décrivez une situation difficile et comment vous l'avez résolue.*
4. *Pourquoi souhaitez-vous évoluer vers ce poste en interne ?*
5. *Comment envisagez-vous votre contribution dans les 6 premiers mois ?*

### 3.8 Endpoint de Matching

```http
GET /api/applications/match/{offerId}
Authorization: Bearer <token HR_ADMIN ou MANAGER>

Réponse :
[
  {
    "id": "app-uuid-1",
    "candidateName": "Youssef Dev",
    "matchScore": 83,
    "skills": ["Java", "Spring Boot", "Docker"],
    "niveau": "Confirmé",
    "anneesExperience": 6,
    "resumeProfil": "Développeur backend expérimenté..."
  },
  {
    "id": "app-uuid-2",
    "candidateName": "Clara Marketing",
    "matchScore": 45,
    ...
  }
]
// Trié par matchScore décroissant
```

### 3.9 Bilan du Sprint 3

- ✅ Extraction de compétences en mode heuristique (20 compétences, aliases)
- ✅ Extraction de compétences via Google Gemini API (JSON strict)
- ✅ Algorithme `computeSmartScore()` : base + expérience + confiance, plafonné à 100
- ✅ Extraction de profil enrichi : niveau, formation, langues, soft skills, résumé narratif
- ✅ Génération de questions d'entretien personnalisées (5 questions Gemini)
- ✅ Endpoint de matching `GET /api/applications/match/{offerId}` trié par score
- ✅ Fallback automatique heuristique si Gemini indisponible ou sans clé API
- ✅ Logging SLF4J sur tous les appels IA

---

## Chapitre 4 — Sprint 4 : Infrastructure Business Intelligence et Machine Learning

### 4.1 Objectifs du Sprint

Ce sprint introduit la **couche décisionnelle** du projet. L'objectif est de transformer les données opérationnelles générées par l'application SIRH en **insights actionnables** pour les décideurs RH.

**Deux niveaux d'analyse sont mis en place :**
1. **BI Descriptive** : dashboards montrant l'état actuel et historique des RH (effectifs, mobilité, recrutement)
2. **BI Prédictive** : modèles de Machine Learning anticipant les comportements futurs (départs, embauches, potentiels)

**Sprint Goal :** À l'issue de ce sprint, un pipeline automatisé extrait quotidiennement les données SIRH, les transforme dans un Data Warehouse, valide leur qualité, puis alimente 6 modèles ML et prépare les données pour Superset.

### 4.2 Architecture Globale de la Solution BI

```
┌─────────────────────────────────────────────────────────────────┐
│                    SOURCES OPÉRATIONNELLES                      │
│                                                                 │
│   sirh_employee (MySQL)        sirh_recruitment (MySQL)         │
│   ├── employees                ├── job_offers                  │
│   ├── departments              ├── applications                │
│   ├── positions                ├── application_skills          │
│   └── employee_skills          └── skills                     │
└────────────────────────┬────────────────────────────────────────┘
                         │  extract_staging.py (ETL Python)
                         ▼  [horodatage extracted_at]
┌─────────────────────────────────────────────────────────────────┐
│                      SIRH_STAGING (MySQL)                       │
│   Tables brutes avec extracted_at pour traçabilité              │
│   stg_employees, stg_departments, stg_positions                 │
│   stg_job_offers, stg_applications, stg_application_skills      │
└────────────────────────┬────────────────────────────────────────┘
                         │  dbt snapshot (SCD Type 2)
                         ▼  snap_employe_historique
                         │  dbt run (18 modèles)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SIRH_DWH (MySQL)                          │
│                                                                 │
│  DIMENSIONS          FAITS                  REPORTING           │
│  dim_temps           fait_recrutement       kpi_rh              │
│  dim_employe         fait_effectifs         vw_effectifs_       │
│  dim_departement     fait_mobilite          mensuels            │
│  dim_poste           fait_competences                           │
│  dim_competence                                                 │
│  dim_offre                                                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
               ┌─────────┴──────────┐
               │                    │
               ▼                    ▼
┌─────────────────────┐   ┌─────────────────────────────────┐
│   MACHINE LEARNING  │   │       APACHE SUPERSET           │
│   (tables ml_*)     │   │   (Dashboards interactifs)      │
│                     │   │                                 │
│   ml_turnover_risk  │   │   Tableau de bord RH global    │
│   ml_employee_segs  │   │   Analyse recrutement          │
│   ml_high_potentials│   │   Suivi compétences            │
│   ml_forecast_emb.  │   │   Prédictions ML               │
│   ml_correlations   │   │                                │
│   ml_retention_anal.│   │                                │
└─────────────────────┘   └─────────────────────────────────┘
```

### 4.3 Phase ETL — Extract & Staging

#### 4.3.1 Script extract_staging.py

Le script `extract_staging.py` est la première étape du pipeline. Il se connecte directement aux bases opérationnelles du SIRH et copie les données dans la base de staging avec un horodatage.

**Données extraites :**
- Depuis `sirh_employee` : employees, departments, positions, employee_skills
- Depuis `sirh_recruitment` : job_offers, applications, application_skills, skills

**Horodatage de fraîcheur :**
```python
# Chaque ligne extraite reçoit un timestamp
df['extracted_at'] = datetime.now()
df.to_sql('stg_employees', engine, if_exists='replace', index=False)
```

Ce timestamp est utilisé par dbt pour vérifier la fraîcheur des données (source freshness).

### 4.4 Modélisation Dimensionnelle avec dbt

#### 4.4.1 Qu'est-ce que dbt ?

**dbt (data build tool)** est un outil de transformation de données qui applique les principes du génie logiciel (versioning, tests, documentation) aux transformations SQL. Chaque modèle dbt est un fichier SQL `SELECT` qui produit une table ou une vue dans le Data Warehouse.

#### 4.4.2 Les 18 Modèles dbt du Projet

**Couche Staging — 6 vues (nettoyage et standardisation) :**
```sql
-- stg_employees.sql : standardisation des données employés
SELECT
    id,
    TRIM(UPPER(first_name))                   AS first_name,
    TRIM(UPPER(last_name))                    AS last_name,
    LOWER(email)                              AS email,
    COALESCE(salary, 0)                       AS salary,
    contract_type,
    hire_date,
    department_id,
    position_id,
    date_depart,
    CASE WHEN date_depart IS NOT NULL THEN 1 ELSE 0 END AS is_parti,
    extracted_at
FROM sirh_staging.stg_employees
```

**Couche Dimensions — 6 tables :**

| Table | Description | Colonnes clés |
|---|---|---|
| `dim_temps` | Calendrier complet | date, jour, mois, trimestre, annee, jour_semaine |
| `dim_employe` | Profil employé complet | employe_id, nom, prenom, email, salaire, is_parti, anciennete_annees |
| `dim_departement` | Départements | dept_id, nom, description |
| `dim_poste` | Postes de travail | poste_id, titre, description, dept_id |
| `dim_competence` | Catalogue compétences | competence_id, nom |
| `dim_offre` | Offres d'emploi | offre_id, titre, statut, dept, date_creation |

**Couche Faits — 4 tables :**

| Table | Description | Métriques |
|---|---|---|
| `fait_recrutement` | Candidatures et matching | match_score, delai_traitement_jours, nb_candidatures_offre |
| `fait_effectifs` | Effectifs mensuels | nb_actifs, nb_departs, nb_embauches, taux_turnover_mensuel |
| `fait_mobilite` | Mouvements internes | nb_mutations, nb_promotions par département |
| `fait_competences` | Compétences par employé/offre | niveau, nb_employes_competence |

**Couche Reporting — 2 tables :**

| Table | Description |
|---|---|
| `kpi_rh` | KPIs globaux : taux de turnover annuel, temps moyen de recrutement, score IA moyen, nb_employes_actifs |
| `vw_effectifs_mensuels` | Vue des effectifs par mois et département pour graphiques temporels |

#### 4.4.3 Snapshot SCD Type 2 — Historique des Changements

Le **Slowly Changing Dimension Type 2** (SCD2) permet de conserver l'historique des changements de département, de poste ou de contrat d'un employé. Sans ce mécanisme, seul l'état actuel est disponible.

```sql
-- dbt/snapshots/snap_employe_historique.sql
{% snapshot snap_employe_historique %}
{{
    config(
        target_schema='sirh_dwh',
        unique_key='id',
        strategy='check',
        check_cols=['department_id', 'position_id', 'contract_type', 'salary']
    )
}}
SELECT * FROM {{ source('staging', 'stg_employees') }}
{% endsnapshot %}
```

**Fonctionnement :**
- Si un employé change de département, dbt ferme l'ancienne ligne (`dbt_valid_to = NOW()`)
- Une nouvelle ligne est créée avec `dbt_valid_to = NULL` (ligne courante)
- L'historique complet est ainsi consultable pour toute analyse temporelle

### 4.5 Qualité des Données — 50 Tests Automatisés

#### 4.5.1 Types de Tests dbt

```yaml
# schema.yml — Exemple de tests configurés
models:
  - name: dim_employe
    columns:
      - name: employe_id
        tests:
          - not_null       # Aucun ID null
          - unique         # Pas de doublons
      - name: salaire
        tests:
          - not_null
      - name: contract_type
        tests:
          - accepted_values:
              values: ['CDI', 'CDD', 'STAGE']  # Seules ces valeurs acceptées

  - name: fait_recrutement
    columns:
      - name: match_score
        tests:
          - not_null
          - dbt_utils.accepted_range:
              min_value: 0
              max_value: 100   # Score IA toujours dans [0, 100]
```

**Répartition des 50 tests :**

| Type de test | Nb | Description |
|---|---|---|
| `not_null` | 18 | Aucune valeur manquante sur les clés et métriques critiques |
| `unique` | 8 | Pas de doublons sur les identifiants |
| `accepted_values` | 10 | Valeurs dans des listes définies (types de contrat, statuts) |
| `test_dates_valides` | 6 | Aucune date dans le futur pour les dates d'embauche |
| `test_match_score` | 4 | Scores IA dans l'intervalle [0, 100] |
| Intégrité référentielle | 4 | Clés étrangères valides |

#### 4.5.2 dbt Source Freshness

```yaml
# sources.yml — Configuration de la fraîcheur
sources:
  - name: staging
    tables:
      - name: stg_employees
        loaded_at_field: extracted_at
        freshness:
          warn_after: {count: 25, period: hour}   # Alerte si > 25h
          error_after: {count: 48, period: hour}  # Erreur si > 48h
```

Si les données ne sont pas chargées depuis plus de 25 heures, le pipeline est alerté. Au-delà de 48 heures, la tâche échoue.

#### 4.5.3 Rapport de Qualité HTML

Le script `data_quality_report.py` génère un rapport HTML récapitulatif après chaque exécution dbt, avec un résumé visuel PASS / WARN / FAIL pour chaque règle testée.

### 4.6 Orchestration avec Apache Airflow

#### 4.6.1 Présentation d'Apache Airflow

**Apache Airflow** est une plateforme open-source d'orchestration de workflows. Un **DAG** (Directed Acyclic Graph) définit les tâches et leurs dépendances. Airflow planifie et surveille l'exécution de ces DAGs selon un calendrier défini.

Dans ce projet, Airflow est déployé via Docker Compose en mode **standalone** (webserver + scheduler dans un seul conteneur) avec le `SequentialExecutor` (adapté à un pipeline mono-tâche séquentiel).

#### 4.6.2 DAG sirh_bi_pipeline — 11 Tâches

```
extract_staging
    │
    ▼
dbt_source_freshness (vérification fraîcheur)
    │
    ▼
dbt_snapshot (SCD Type 2)
    │
    ▼
dbt_run (18 modèles → sirh_dwh)
    │
    ▼
dbt_test (50 tests qualité)
    │
    ▼
data_quality_report (rapport HTML)
    │
    ▼
ml_turnover → ml_segmentation → ml_high_potentials
                                        │
                                        ▼
                              ml_forecast → ml_correlations → ml_retention
```

**Planification :** Tous les jours à **02h00** (Europe/Paris) — heure creuse pour ne pas impacter les performances de la base opérationnelle.

**Politique de retry :** En cas d'échec, chaque tâche est **retentée 1 fois après 5 minutes**. Les tâches suivantes sont bloquées jusqu'à résolution.

#### 4.6.3 Détail des Tâches Airflow

| Tâche | Type | Durée estimée | Description |
|---|---|---|---|
| `extract_staging` | BashOperator | 5-10 sec | Exécute extract_staging.py |
| `dbt_source_freshness` | BashOperator | 2-3 sec | `dbt source freshness` |
| `dbt_snapshot` | BashOperator | 1-2 sec | `dbt snapshot` (SCD2) |
| `dbt_run` | BashOperator | 3-5 sec | `dbt run` (18 modèles) |
| `dbt_test` | BashOperator | 5-10 sec | `dbt test` (50 tests) |
| `data_quality_report` | BashOperator | 5-10 sec | Rapport HTML qualité |
| `ml_turnover` | BashOperator | 30-60 sec | Random Forest + SHAP |
| `ml_segmentation` | BashOperator | 10-20 sec | K-Means clustering |
| `ml_high_potentials` | BashOperator | 10-20 sec | Identification potentiels |
| `ml_forecast` | BashOperator | 30-60 sec | Prophet 6 mois |
| `ml_correlations` | BashOperator | 10-20 sec | Matrice de corrélations |
| `ml_retention` | BashOperator | 10-20 sec | Analyse de rétention |

**Accès Airflow UI :** http://localhost:8085 — `admin` / `admin123`

### 4.7 Modèles de Machine Learning

#### 4.7.1 ML-1 : Prédiction du Turnover (Random Forest + SHAP)

**Objectif :** Identifier les employés à risque de départ pour permettre aux RH d'agir de manière proactive.

**Modèle :** Random Forest Classifier avec calibration (`CalibratedClassifierCV`)

**Features utilisées :**
- Salaire, ancienneté, département, type de contrat
- Score de matching aux offres (indication d'intérêt pour un autre poste)
- Variables indicatrices de valeurs manquantes

**Variable cible — is_parti :**
La colonne `is_parti` est dérivée de `date_depart` dans la table source `sirh_employee.employees`. Les départs sont générés de manière contrôlée par `generate_departures.py` avec les paramètres suivants :

```python
TEMPERATURE = 0.22  # Contrôle le bruit aléatoire
# Distribution des départs :
# - 72% : employés avec salaire sous la médiane de leur département
# - 18% : employés en CDD avec ancienneté > 1 an, ou CDI > 5 ans
# - 10% : bruit aléatoire
```

Ce modèle réaliste génère environ **16,5% de départs** (256 départs sur ~1550 employés).

**Résultats :**

| Métrique | Valeur |
|---|---|
| AUC-ROC | **0,757** |
| AUC-ROC (Cross-Validation 5-fold) | **0,755** |
| Minimum acceptable (cahier des charges) | 0,70 |
| Top feature SHAP | **Salaire** |

L'AUC de 0,757 dépasse le seuil critique de 0,70 du cahier des charges. La feature SHAP la plus importante est le salaire, ce qui confirme l'hypothèse métier (les employés sous-payés par rapport à leur département sont plus susceptibles de partir).

**Output :** Table `sirh_dwh.ml_turnover_risk`
```
employe_id | proba_depart | risk_level (LOW/MEDIUM/HIGH) | shap_top_feature | computed_at
```

#### 4.7.2 ML-2 : Segmentation des Employés (K-Means Clustering)

**Objectif :** Identifier automatiquement des groupes d'employés homogènes pour personnaliser la politique RH (formation, mobilité, rétention).

**Modèle :** K-Means avec k=4 clusters, après standardisation `StandardScaler`

**Features :** Salaire, ancienneté, département (one-hot encodé), type de contrat, score de compétences

**Validation :** Silhouette score pour évaluer la qualité des clusters

**4 segments identifiés (exemple) :**
- Segment 0 : Jeunes profils, CDD, salaires bas → futurs hauts potentiels
- Segment 1 : Cadres seniors, CDI, hauts salaires → talent à fidéliser
- Segment 2 : Profils intermédiaires stables → population cœur
- Segment 3 : Profils à risque (salaire bas, CDD long) → priorité rétention

**Output :** Table `sirh_dwh.ml_employee_segments`
```
employe_id | segment_id | segment_label | distance_centroid | computed_at
```

#### 4.7.3 ML-3 : Identification des Hauts Potentiels

**Objectif :** Identifier automatiquement les employés qui combinent haute performance, faible risque de départ et fort potentiel d'évolution.

**Approche :** Scoring composite basé sur des règles métier :
- Score de compétences (nombre et niveau des compétences maîtrisées)
- Ancienneté dans les bornes optimales (ni trop junior, ni trop senior sans évolution)
- Probabilité de rétention (1 - proba_depart du modèle ML-1)
- Historique de mobilité interne positive

**Output :** Table `sirh_dwh.ml_high_potentials`
```
employe_id | score_potentiel | rang | top_10_pct | computed_at
```

#### 4.7.4 ML-4 : Prévision Temporelle des Embauches (Prophet)

**Objectif :** Prévoir le nombre d'embauches par département pour les 6 prochains mois, permettant une planification proactive du recrutement.

**Modèle :** Facebook Prophet — modèle de séries temporelles adapté aux données saisonnières avec possibilité de détecter les tendances et les jours fériés.

**Source :** Données de `fait_mobilite` (embauches mensuelles par département) depuis `sirh_dwh`

**Configuration Prophet :**
```python
model = Prophet(
    yearly_seasonality=True,    # Saisonnalité annuelle (rentrées septembre)
    weekly_seasonality=False,   # Pas pertinent pour données mensuelles
    daily_seasonality=False
)
model.fit(df[['ds', 'y']])  # ds = date, y = nb_embauches
forecast = model.predict(future_6_months)
```

**Output :** Table `sirh_dwh.ml_forecast_embauches`
```
departement | mois_cible | nb_embauches_prevu | yhat_lower | yhat_upper | computed_at
```

#### 4.7.5 ML-5 : Analyse des Corrélations RH

**Objectif :** Identifier les corrélations significatives entre les variables RH pour guider les décisions managériales (ex: la corrélation entre salaire et turnover, entre ancienneté et promotion).

**Approche :** Matrices de corrélation Pearson (variables continues) et Spearman (variables ordinales ou non-normales), avec test de significativité statistique (p-value).

**Corrélations analysées :**
- Salaire ↔ Probabilité de départ
- Ancienneté ↔ Probabilité de promotion
- Score de matching ↔ Acceptation de candidature
- Taille d'équipe ↔ Taux de turnover du département

**Output :** Table `sirh_dwh.ml_correlations`
```
variable_1 | variable_2 | pearson_r | spearman_r | p_value | significant | computed_at
```

#### 4.7.6 ML-6 : Analyse de Rétention des Talents

**Objectif :** Analyser les facteurs qui favorisent la rétention des employés à haute valeur, et produire des recommandations personnalisées.

**Approche :** Analyse de survie (durée avant départ) combinée avec le scoring BI des hauts potentiels (ML-3) pour identifier les leviers de rétention par profil.

**Output :** Table `sirh_dwh.ml_retention_analysis`
```
employe_id | score_retention | actions_recommandees | priorite | computed_at
```

### 4.8 Superset — Visualisation et Dashboards

#### 4.8.1 Présentation d'Apache Superset

**Apache Superset** est une plateforme open-source de Business Intelligence et de visualisation de données. Elle permet de créer des dashboards interactifs connectés directement au Data Warehouse `sirh_dwh`.

#### 4.8.2 Dashboards Prévus

**Dashboard 1 — Vue d'ensemble RH :**
- Effectif total actif et évolution mensuelle (graphique en aires)
- Taux de turnover mensuel (courbe + objectif)
- Répartition par département (camembert)
- Répartition par type de contrat (barres)

**Dashboard 2 — Recrutement et Matching IA :**
- Offres par statut (DRAFT / PUBLISHED / CLOSED)
- Distribution des scores de matching (histogramme)
- Délai moyen de traitement des candidatures
- Top compétences demandées (nuage de mots ou barres horizontales)

**Dashboard 3 — Machine Learning RH :**
- Liste des employés à risque élevé de départ (ML-1)
- Carte des segments d'employés (ML-2)
- Prévisions d'embauches 6 mois (ML-4)
- Top 10 hauts potentiels (ML-3)

**Dashboard 4 — Qualité des Données :**
- Résultat des 50 tests dbt (PASS / WARN / FAIL)
- Fraîcheur des données par source
- Historique des runs du pipeline

#### 4.8.3 Connexion Superset ↔ sirh_dwh

```python
# superset_config.py — Configuration de la connexion MySQL
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:root@host.docker.internal:3306/sirh_dwh'

# Paramètres de sécurité Superset
SECRET_KEY = 'sirh-superset-secret-key'
WTF_CSRF_ENABLED = True
```

### 4.9 Dépendances ML et Compatibilité

Un point technique important concerne les versions des bibliothèques ML dans le conteneur Airflow. Les versions suivantes sont définies dans `_PIP_ADDITIONAL_REQUIREMENTS` du `docker-compose.yml` :

```
scikit-learn==1.4.2   # Stable avec numpy 1.26 / Python 3.12
scipy==1.13.1         # Compatibilité sklearn
shap==0.45.1          # Explainabilité SHAP
prophet==1.1.5        # Prévision temporelle
cmdstanpy==1.2.4      # IMPÉRATIF : la version 1.3.0 casse prophet 1.1.5
                       # (makefile manquant → "no attribute stan_backend")
```

### 4.10 Bilan du Sprint 4

- ✅ Pipeline ETL `extract_staging.py` : extraction des 6 tables opérationnelles
- ✅ Modélisation dbt : 18 modèles (6 staging + 6 dim + 4 faits + 2 reporting)
- ✅ Snapshot SCD Type 2 pour l'historique des changements employés
- ✅ 50 tests de qualité des données avec rapport HTML
- ✅ dbt source freshness (alerte >25h, erreur >48h)
- ✅ DAG Airflow `sirh_bi_pipeline` : 11 tâches, planification 02h00 quotidien
- ✅ ML-1 Turnover (Random Forest + SHAP) : AUC = 0,757 > 0,70 requis
- ✅ ML-2 Segmentation K-Means (4 clusters)
- ✅ ML-3 Identification des hauts potentiels
- ✅ ML-4 Prévision Prophet (6 mois)
- ✅ ML-5 Analyse des corrélations RH
- ✅ ML-6 Analyse de rétention
- 🔄 Superset : configuration initiale présente (`superset_config.py`), dashboards en cours

---

## Conclusion Générale

### Synthèse des Réalisations

Ce projet de fin d'études a abouti à la conception et au développement complet d'une plateforme SIRH moderne et intelligente. Les quatre sprints Scrum ont chacun livré des incréments fonctionnels indépendants mais cohérents :

| Sprint | Domaine | Statut |
|---|---|---|
| Sprint 1 | Auth JWT + Keycloak SSO + Gestion RH de base | ✅ Terminé |
| Sprint 2 | Recrutement complet + Chatbot RH Gemini | ✅ Terminé |
| Sprint 3 | Matching IA + Scoring + Profil enrichi | ✅ Terminé |
| Sprint 4 | Pipeline BI Airflow/dbt + 6 modèles ML | ✅ Terminé (Superset en cours) |

### Valeur Ajoutée Technique

**Architecture :** L'architecture microservices adoptée assure une séparation claire des responsabilités. Chaque service peut être déployé, mis à l'échelle et maintenu indépendamment. L'API Gateway centralise la sécurité et simplifie l'évolution du système.

**Sécurité :** L'intégration Keycloak positionne la plateforme dans un écosystème d'entreprise standard (SSO, MFA, LDAP). La double validation JWT (gateway + service) assure une défense en profondeur.

**Intelligence Artificielle :** L'intégration de l'API Google Gemini apporte trois fonctionnalités à forte valeur ajoutée : l'extraction automatique de compétences depuis les CVs, la génération de questions d'entretien personnalisées, et un chatbot RH conversationnel. Le système est conçu avec un fallback heuristique pour fonctionner sans clé API.

**Business Intelligence :** Le pipeline Airflow/dbt constitue une infrastructure BI professionnelle et reproductible. Les 50 tests automatisés garantissent la fiabilité des données. Le modèle de turnover avec AUC = 0,757 démontre la faisabilité d'une IA prédictive RH avec des données réalistes.

### Compétences Développées

- Architecture logicielle microservices (Spring Boot, Spring Cloud Gateway)
- Sécurité applicative (JWT, Spring Security, Keycloak/OAuth2)
- Intégration d'APIs d'IA (Google Gemini Generative Language API)
- Data Engineering (ETL Python, dbt, modélisation dimensionnelle)
- Machine Learning appliqué aux RH (scikit-learn, Prophet, SHAP)
- Orchestration de pipelines de données (Apache Airflow, Docker)
- Méthodologie Scrum appliquée à un projet réel

### Perspectives d'Évolution

**Court terme :**
- Finalisation des dashboards Superset
- Implémentation d'un service de notification (email/Slack) quand un candidat atteint un score > 80
- Interface frontend Angular complète

**Moyen terme :**
- Migration du stockage CV de LONGBLOB vers un service objet (MinIO/S3)
- Extraction d'une librairie partagée pour les classes dupliquées (JwtValidator, DTOs)
- Ajout de tracing distribué (Jaeger, Zipkin) pour l'observabilité

**Long terme :**
- Entraînement du modèle de turnover sur des données réelles de l'entreprise
- Tableau de bord Superset accessible en self-service pour les managers
- Extension du matching aux mobilités internes (employé existant → poste interne)

---

## Bibliographie

1. **Spring Framework Documentation** — Spring Boot 3.2, Spring Cloud Gateway 4.1, Spring Security 6.2. https://spring.io/projects/spring-boot

2. **JWT RFC 7519** — M. Jones, J. Bradley, N. Sakimura. "JSON Web Token (JWT)". IETF, 2015.

3. **Keycloak Documentation** — Red Hat. "Keycloak 23.0 Server Administration Guide". https://www.keycloak.org/documentation

4. **Google Gemini API Reference** — Google DeepMind. "Gemini API Developer Documentation". https://ai.google.dev/docs

5. **dbt Documentation** — dbt Labs. "dbt Core Documentation — Build, Test, and Document Data Models". https://docs.getdbt.com

6. **Apache Airflow Documentation** — Apache Software Foundation. "Airflow 2.9.1 Documentation". https://airflow.apache.org/docs/

7. **Scikit-learn** — Pedregosa et al. "Scikit-learn: Machine Learning in Python". Journal of Machine Learning Research, 2011.

8. **SHAP** — S. Lundberg, S. Lee. "A Unified Approach to Interpreting Model Predictions". NeurIPS, 2017.

9. **Prophet** — S. Taylor, B. Letham. "Forecasting at Scale". The American Statistician, 2018. Facebook Research.

10. **Kimball, R., Ross, M.** — "The Data Warehouse Toolkit: The Definitive Guide to Dimensional Modeling". Wiley, 3rd Edition, 2013.

11. **Schwaber, K., Sutherland, J.** — "The Scrum Guide". Scrum.org, 2020.

12. **Richardson, C.** — "Microservices Patterns: With Examples in Java". Manning Publications, 2018.

---

*Rapport rédigé dans le cadre du Projet de Fin d'Études — Année universitaire 2025-2026*

*Toutes les données présentées dans ce rapport sont des données de démonstration générées synthétiquement.*
