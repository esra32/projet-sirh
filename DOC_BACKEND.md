# DOC_BACKEND.md — Documentation Complète Backend SIRH
> Projet : SIRH (Système d'Information des Ressources Humaines)
> Répertoire : `C:\Users\Hp\Desktop\last v\essra\sirh-backend`
> Date : 2026-04-16
> Auteur session : Claude Sonnet 4.6

---

## 1. VUE D'ENSEMBLE

Le backend est une architecture **microservices Spring Boot** composée de 4 modules Maven indépendants qui communiquent via HTTP à travers un API Gateway. Le projet gère 3 domaines métiers :
- **Authentification & Identité** — JWT, rôles, Keycloak optionnel
- **Gestion des Employés** — profils, départements, postes, contrats, compétences
- **Recrutement** — offres d'emploi, candidatures, matching IA, chatbot

### État du projet
- Prototype avancé / late prototype
- Toutes les fonctionnalités CRUD fonctionnent
- Features IA (Gemini CV parsing, scoring) implémentées mais optionnelles
- Données de démonstration : 1000+ employés seedés automatiquement
- **Non production-ready** tel quel (pas de Docker, pas de CI/CD configuré)

---

## 2. ARCHITECTURE SYSTÈME

```
Client (Angular Frontend :4200)
  └─► API Gateway (:8080)          ← point d'entrée unique, validation JWT
        ├─► Auth Service (:8081)    ← /api/auth/**  (public + protégé)
        ├─► Employee Service (:8082)← /api/employees/**, /api/departments/**, /api/positions/**, /api/services/**, /api/orgchart/**
        └─► Recruitment Service (:8083) ← /api/job-offers/**, /api/applications/**, /api/skills/**, /api/chat/**
```

### Flux d'une requête
1. Client envoie `Authorization: Bearer <JWT>` vers Gateway (:8080)
2. `AuthJwtFilter` (gateway) extrait et valide le token HS256
3. Si valide → gateway injecte `X-Auth-User: email` et `X-Auth-Roles: HR_ADMIN,EMPLOYEE`
4. Service downstream reçoit la requête avec ces headers
5. `JwtAuthFilter` (downstream) re-valide le token ET lit les headers pour construire `SecurityContext`
6. Controller → Service → Repository → MySQL → réponse

---

## 3. STRUCTURE DES MODULES MAVEN

### Fichier racine `pom.xml`
```
sirh-backend/
├── pom.xml                    ← parent Maven (Spring Boot 3.x, Java 17)
├── api-gateway/
├── auth-service/
├── employee-service/
└── recruitment-service/
```

### Structure interne de chaque service
```
src/main/java/org/example/<service>/
├── model/          ← Entités JPA (@Entity, @Table)
├── dto/            ← Objets de transfert API (pas d'annotations JPA)
├── repo/           ← Interfaces Spring Data JPA (extends JpaRepository<Entity, String>)
├── service/        ← Logique métier + mapping entity↔DTO (manuel, pas MapStruct)
├── controller/     ← @RestController, mapping HTTP
├── config/         ← SecurityConfig, OpenApiConfig, DataInitializer, GlobalExceptionHandler
├── security/       ← JwtValidator (parsing token)
└── filter/         ← JwtAuthFilter (OncePerRequestFilter, set SecurityContext)
```

---

## 4. TECHNOLOGIES ET DÉPENDANCES

### Java / Spring Boot
| Technologie | Version | Usage |
|---|---|---|
| Java | 17 | Langage |
| Spring Boot | 3.2.x | Framework principal |
| Spring Security | 6.x | Auth, filtres HTTP |
| Spring Data JPA | 3.x | ORM, repositories |
| Hibernate | 6.x | ORM sous Spring Data |
| Spring Cloud Gateway | 4.x | API Gateway réactif (WebFlux) |
| MySQL Connector/J | 8.x | Driver BDD |
| JJWT (io.jsonwebtoken) | 0.12.x | Génération/validation JWT |
| SpringDoc OpenAPI | 2.x | Swagger UI auto-généré |
| Lombok | 1.18.x | @Getter, @Setter, @Builder, @Slf4j |
| Flyway | 9.x | Migrations SQL (désactivé dans recruitment) |

### Base de données
- **MySQL 8+** sur `localhost:3306`
- Credentials par défaut : `root` / `root`
- 3 bases distinctes : `sirh_auth`, `sirh_employee`, `sirh_recruitment`
- **Schéma géré par Hibernate** `spring.jpa.hibernate.ddl-auto=update` (pas Flyway)
- Flyway présent mais `spring.flyway.enabled=false` dans recruitment-service

### Intelligence Artificielle
- **Google Gemini API** (`gemini-1.5-flash` par défaut) — optionnel
- Utilisé dans `CvSkillExtractorService` pour extraction de compétences depuis CV
- Fallback heuristique si `GEMINI_API_KEY` non définie

---

## 5. MODULE API-GATEWAY (:8080)

### Rôle
Point d'entrée unique. Valide les JWTs, route vers les services, agrège Swagger.

### Fichiers clés
```
api-gateway/src/main/resources/application.yml
api-gateway/src/main/java/org/example/gateway/
├── config/
│   ├── GatewayConfig.java       ← routes Spring Cloud Gateway
│   ├── AuthJwtFilter.java       ← filtre validation JWT + injection headers
│   └── JwtValidator.java        ← parsing HS256 + JWKS RSA (Keycloak)
└── GatewayApplication.java
```

### Configuration routes (application.yml)
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: auth-service
          uri: http://localhost:8081
          predicates: [Path=/api/auth/**]
          # Pas de filtre JWT sur /auth/** (public)

        - id: employee-service
          uri: http://localhost:8082
          predicates: [Path=/api/employees/**, /api/departments/**, /api/positions/**, /api/services/**, /api/orgchart/**]
          filters: [AuthJwtFilter]

        - id: recruitment-service
          uri: http://localhost:8083
          predicates: [Path=/api/job-offers/**, /api/applications/**, /api/skills/**, /api/chat/**]
          filters: [AuthJwtFilter]
```

### JWT Secret
```yaml
jwt:
  secret: ${JWT_SECRET:a-very-long-random-secret-key-that-is-at-least-256-bits-long-abc123}
```
**CRITIQUE** : Ce secret doit être identique dans les 4 services.

### Headers injectés par le gateway
- `X-Auth-User: email@example.com`
- `X-Auth-Roles: HR_ADMIN,EMPLOYEE`

---

## 6. MODULE AUTH-SERVICE (:8081)

### Rôle
Gestion des utilisateurs, génération JWT, refresh tokens, bridge Keycloak.

### Entités principales

**User**
```java
@Entity @Table(name = "users")
public class User {
    @Id private String id;          // UUID String
    private String email;
    private String password;        // BCrypt hashé
    @ManyToMany private List<Role> roles;
    private String refreshToken;
    private LocalDateTime createdAt;
}
```

**Role**
```java
@Entity @Table(name = "roles")
public class Role {
    @Id private String id;
    private String name;            // "HR_ADMIN", "MANAGER", "EMPLOYEE"
}
```

### Endpoints

| Méthode | URL | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Inscription (role EMPLOYEE par défaut) |
| POST | /api/auth/login | Public | Connexion, retourne accessToken + refreshToken |
| POST | /api/auth/refresh | Public | Refresh du token |
| GET | /api/auth/me | JWT | Profil utilisateur courant |
| GET | /api/auth/users | JWT HR_ADMIN | Liste tous les utilisateurs |
| PUT | /api/auth/users/{id}/roles | JWT HR_ADMIN | Modifier les rôles |
| DELETE | /api/auth/users/{id} | JWT HR_ADMIN | Supprimer utilisateur |
| POST | /api/auth/keycloak/sync | JWT HR_ADMIN | Sync vers Keycloak |

### Structure du JWT généré
```json
{
  "sub": "email@example.com",
  "roles": ["HR_ADMIN", "EMPLOYEE"],
  "iat": 1713200000,
  "exp": 1713286400
}
```

### Classes importantes

**AuthService**
- `register()` : vérifie email unique, encode password BCrypt, assigne rôle EMPLOYEE
- `login()` : vérifie credentials, génère accessToken (1h) + refreshToken (7j)
- `refresh()` : valide refreshToken en BDD, génère nouveau accessToken
- `JwtService` : génère/valide tokens via JJWT, secret HS256

**KeycloakAdminClient** (optionnel)
- Appelle Keycloak Admin REST API via Java `HttpClient`
- Token admin mis en cache avec 15s de buffer avant expiry
- Gère CRUD utilisateurs + assignation de rôles dans Keycloak

### DataInitializer (Order 1)
Seed 8 utilisateurs de démonstration :
| Email | Password | Rôle |
|---|---|---|
| admin@hr.sirh.com | admin123 | HR_ADMIN |
| manager@mgr.sirh.com | manager123 | MANAGER |
| employee@sirh.com | employee123 | EMPLOYEE |
| karim.design@sirh.com | karim123 | EMPLOYEE |
| lea.data@sirh.com | lea123 | EMPLOYEE |
| youssef.dev@sirh.com | youssef123 | EMPLOYEE |
| clara.mkt@sirh.com | clara123 | EMPLOYEE |
| nadia.mgr@sirh.com | nadia123 | MANAGER |

---

## 7. MODULE EMPLOYEE-SERVICE (:8082)

### Rôle
CRUD des employés, départements, postes, services (ServiceUnit), organigramme, compétences.

### Entités principales

**Employee**
```java
@Entity @Table(name = "employees")
public class Employee {
    @Id private String id;              // UUID
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private LocalDate hireDate;
    @ManyToOne private Department department;
    @ManyToOne private Position position;
    @Enumerated(EnumType.STRING)
    private ContractType contractType;  // CDI, CDD, STAGE, FREELANCE, ALTERNANCE
    @ManyToOne private ServiceUnit service;
    @ManyToOne private Employee manager;
    @OneToMany(cascade=ALL) private List<EmployeeSkill> skills;
}
```

**Department**
```java
@Entity @Table(name = "departments")
public class Department {
    @Id private String id;
    private String name;
    private String description;
    @ManyToOne private Employee manager;  // manager du département
}
```

**Position**
```java
@Entity @Table(name = "positions")
public class Position {
    @Id private String id;
    private String title;
    private String description;
    @ManyToOne private Department department;
}
```

**EmployeeSkill**
```java
@Entity @Table(name = "employee_skills")
public class EmployeeSkill {
    @Id private String id;
    private String skillName;
    @Enumerated(EnumType.STRING)
    private SkillLevel level;   // DEBUTANT(1), INTERMEDIAIRE(2), AVANCE(3), EXPERT(4)
    @ManyToOne private Employee employee;
}
```

**ServiceUnit**
```java
@Entity @Table(name = "service_units")
public class ServiceUnit {
    @Id private String id;
    private String name;
    private String description;
    @ManyToOne private Department department;
    @ManyToOne private ServiceUnit parentService;
}
```

### Endpoints Employee

| Méthode | URL | Auth requis | Description |
|---|---|---|---|
| GET | /api/employees | JWT | Liste (avec filtres search, department) |
| GET | /api/employees/{id} | JWT | Détail employé |
| POST | /api/employees | JWT HR_ADMIN | Créer employé |
| PUT | /api/employees/{id} | JWT HR_ADMIN | Modifier employé |
| DELETE | /api/employees/{id} | JWT HR_ADMIN | Supprimer |
| GET | /api/employees/{id}/skills | JWT | Compétences de l'employé |
| PUT | /api/employees/{id}/skills | JWT HR_ADMIN | MAJ compétences |
| GET | /api/departments | JWT | Liste départements |
| POST | /api/departments | JWT HR_ADMIN | Créer département |
| PUT | /api/departments/{id} | JWT HR_ADMIN | Modifier |
| DELETE | /api/departments/{id} | JWT HR_ADMIN | Supprimer |
| GET | /api/positions | JWT | Liste postes (filtrable par departmentId) |
| POST | /api/positions | JWT HR_ADMIN | Créer poste |
| GET | /api/services | JWT | Liste ServiceUnit |
| GET | /api/orgchart/tree | JWT | Arbre hiérarchique JSON |

### Système de rôles dans les services downstream
```java
// Dans JwtAuthFilter.java (employee-service et recruitment-service)
// Le préfixe ROLE_ est RETIRÉ — correction appliquée
List<SimpleGrantedAuthority> authorities = Arrays.stream(roles.split(","))
    .map(r -> new SimpleGrantedAuthority(r.trim()))  // pas de ROLE_ prefix
    .collect(toList());
```
Donc dans les controllers : `@PreAuthorize("hasAuthority('HR_ADMIN')")`

### DataInitializer employee-service
**Order(1)** — 8 employés de démo coordonnés avec auth-service :
- 4 départements : Informatique, Design & UX, Data & IA, Marketing
- 8 employés avec compétences

**Order(2)** — `fixHierarchy()` : assigne les managers

**Order(3)** — `bulkSeedEmployees()` (guard: count < 15) :
- 4 nouveaux départements : Finance & Comptabilité, Commercial & Ventes, Opérations & Logistique, Direction Générale
- 30+ postes supplémentaires
- 47 nouveaux employés aux noms culturellement diversifiés

**Order(4)** — `BulkEmployeeSeeder.java` (guard: count < 950) :
- **1000 employés générés** avec diversité culturelle
- 4 origines : Tunisian, Arab, French, International
- Noms depuis pools (39-57 prénoms + noms de famille par origine)
- 70 profils PROFILES[] (dept + position + 5 compétences)
- Attribution profil : `i % PROFILES.length`
- Email unique : `prenom.nom.1000+i@sirh.com`
- Accents supprimés via `java.text.Normalizer.normalize(s, NFD)` + strip `\p{InCombiningDiacriticalMarks}`
- Date embauche : `LocalDate.of(2014,1,1).plusDays(i * 4107 / 1000)` (étalement sur 11 ans)
- Contrats : 65% CDI, 17% CDD, 10% STAGE, 8% FREELANCE
- Niveaux compétences selon ancienneté :
  - `yearsExp >= 8` → EXPERT
  - `>= 5` → AVANCE
  - `>= 3` → AVANCE
  - `>= 2` → INTERMEDIAIRE
  - `>= 1` → INTERMEDIAIRE
  - sinon → DEBUTANT

---

## 8. MODULE RECRUITMENT-SERVICE (:8083)

### Rôle
Cycle de vie des offres d'emploi, candidatures, extraction IA de compétences depuis CV, matching candidats, chatbot keyword.

### Entités principales

**JobOffer**
```java
@Entity @Table(name = "job_offers")
public class JobOffer {
    @Id private String id;
    private String title;
    @Lob private String description;
    private String department;
    private String location;
    @Enumerated(EnumType.STRING)
    private OfferStatus status;         // DRAFT, PUBLISHED, CLOSED, CANCELLED, PENDING_VALIDATION
    private LocalDateTime publishedDate;
    private LocalDateTime deadlineDate;
    private LocalDateTime createdAt;
    private String createdByEmail;
    private String createdByName;
    @ManyToMany private List<Skill> requiredSkills;
}
```

**Application**
```java
@Entity @Table(name = "applications")
public class Application {
    @Id private String id;
    @ManyToOne private JobOffer jobOffer;
    private String applicantEmail;
    private String applicantName;
    @Lob private String coverLetter;
    @Lob private byte[] cvFile;         // LONGBLOB PDF
    private String cvFileName;
    @Lob private byte[] letterMotivationPdf;
    private String letterMotivationFileName;
    @Enumerated(EnumType.STRING)
    private ApplicationStatus status;   // PENDING, REVIEWING, INTERVIEW_SCHEDULED, ACCEPTED, REJECTED
    private LocalDateTime appliedDate;
    private int matchScore;             // 0-100, calculé par CvSkillExtractorService
    @ManyToMany private List<Skill> skills;   // compétences extraites du CV
    // Détails entretien
    private LocalDateTime interviewDate;
    private String interviewLocation;
    private String interviewerName;
    private String interviewInstructions;
    private String rejectionReason;
}
```

**Skill**
```java
@Entity @Table(name = "skills")
public class Skill {
    @Id private String id;
    private String name;    // ex: "Java", "React", "Python"
}
```

### Cycle de vie d'une offre
```
DRAFT → PENDING_VALIDATION → PUBLISHED → CLOSED
                           ↘ CANCELLED
```
- Manager crée DRAFT, soumet pour validation
- RH valide → PUBLISHED ou refuse → CANCELLED
- RH peut fermer → CLOSED

### Endpoints

| Méthode | URL | Description |
|---|---|---|
| GET | /api/job-offers | Liste offres (filtrable par status, createdByEmail) |
| GET | /api/job-offers/{id} | Détail offre |
| POST | /api/job-offers | Créer offre |
| POST | /api/job-offers/{id}/publish | Publier offre |
| POST | /api/job-offers/{id}/close | Fermer offre |
| POST | /api/job-offers/{id}/refuse | Refuser offre |
| GET | /api/applications | Toutes candidatures (filtrable offerId, email) |
| GET | /api/applications/{id} | Détail candidature |
| POST | /api/applications | Postuler (multipart avec CV Base64) |
| PUT | /api/applications/{id}/status | MAJ statut + détails entretien |
| GET | /api/applications/match/{offerId} | Matching candidats scorés |
| GET | /api/applications/{id}/cv | Télécharger CV PDF |
| GET | /api/applications/{id}/interview-questions | Questions entretien Gemini |
| GET | /api/skills | Toutes compétences |
| POST | /api/skills | Créer compétence |
| POST | /api/chat | Chatbot (JWT requis) |

### CvSkillExtractorService (classe la plus complexe)
Dual-mode extraction :

**Mode Gemini** (si GEMINI_API_KEY défini) :
- Envoie lettre de motivation + nom du CV vers Google Gemini API
- Parse la réponse JSON pour extraire la liste de compétences
- Model : `gemini-1.5-flash` (configurable via env)

**Mode Heuristique** (fallback) :
- Compare contre 20+ alias de compétences hardcodés
- Matching case-insensitive sur sous-chaînes
- Ex: "react.js" → détecte "React", "JavaScript"

**`computeSmartScore()`** :
- Base : % de compétences requises trouvées × 50
- Bonus expérience (regex `\d+ (ans|years)` dans lettre) :
  - 8+ ans → +12pts
  - 5+ ans → +8pts
  - 3+ ans → +5pts
  - 1+ ans → +2pts
- Bonus confiance : +5 si 4+ compétences matchées
- Score max : 100

### ChatService (chatbot)
- Matching keyword sur titres d'offres, départements, noms de compétences
- Retourne top-5 offres correspondantes formatées en texte
- **Pas de ML / NLP** — matching simple substring
- Endpoint `/api/chat/**` routé via gateway avec JWT (corrigé)

### DataInitializer recruitment-service
**Order(1)** — Données de base :
- 50+ compétences (Java, Python, React, Angular, Docker, K8s, TensorFlow, etc.)
- 10+ offres publiées avec compétences requises
- 5+ candidatures avec profils

**Order(2)** `enrichRecruitmentData()` (guard: count >= 10) :
- 43 nouvelles compétences (Azure, AWS, Terraform, Spark, DAX, Négociation...)
- 8 nouvelles offres publiées : Backend Java Senior, Frontend Angular, Cloud DevOps Azure, Data Engineer, Marketing Digital, Key Account Manager B2B, Cybersécurité OWASP, ML Engineer NLP

---

## 9. SÉCURITÉ JWT — DÉTAIL CRITIQUE

### Rôle prefixe
```
Auth-Service génère : roles: ["HR_ADMIN", "EMPLOYEE"]
Gateway injecte    : X-Auth-Roles: HR_ADMIN,EMPLOYEE
Employee-Service   : SimpleGrantedAuthority("HR_ADMIN")   ← PAS de ROLE_ prefix
Recruitment-Service: SimpleGrantedAuthority("HR_ADMIN")   ← PAS de ROLE_ prefix
```

### Dans les controllers
```java
// Correct pour employee-service et recruitment-service :
@PreAuthorize("hasAuthority('HR_ADMIN')")

// MAUVAIS (provoque 403 partout) :
@PreAuthorize("hasRole('HR_ADMIN')")  // cherche ROLE_HR_ADMIN
```

### JwtAuthFilter (pattern partagé dans tous les services)
```java
@Override
protected void doFilterInternal(HttpServletRequest req, ...) {
    String token = extractBearerToken(req);
    if (token != null) {
        try {
            String email = jwtValidator.extractEmail(token);
            String rolesHeader = req.getHeader("X-Auth-Roles");
            List<GrantedAuthority> authorities = parseRoles(rolesHeader);
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(email, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(auth);
        } catch (JwtException e) {
            // Silencieux — request continue comme anonyme
        }
    }
    filterChain.doFilter(req, response);
}
```

---

## 10. CONFIGURATION PAR SERVICE

### application.properties (employee-service)
```properties
server.port=8082
spring.datasource.url=jdbc:mysql://localhost:3306/sirh_employee?createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=root
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
jwt.secret=${JWT_SECRET:a-very-long-random-secret-key-that-is-at-least-256-bits-long-abc123}
```

### application.properties (recruitment-service)
```properties
server.port=8083
spring.datasource.url=jdbc:mysql://localhost:3306/sirh_recruitment?createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=root
spring.jpa.hibernate.ddl-auto=update
spring.flyway.enabled=false        # IMPORTANT : ne pas activer sans aligner le SQL
gemini.api.key=${GEMINI_API_KEY:}
gemini.model=${GEMINI_MODEL:gemini-1.5-flash}
jwt.secret=${JWT_SECRET:a-very-long-random-secret-key-that-is-at-least-256-bits-long-abc123}
```

---

## 11. VARIABLES D'ENVIRONNEMENT

```bash
# Obligatoire (même valeur dans les 4 services)
export JWT_SECRET="a-very-long-random-secret-key-that-is-at-least-256-bits-long-abc123"

# Optionnel — IA
export GEMINI_API_KEY="your-google-gemini-key"
export GEMINI_MODEL="gemini-1.5-flash"

# Optionnel — Keycloak SSO
export KEYCLOAK_JWKS_URI="http://localhost:8180/realms/myrealm/protocol/openid-connect/certs"
export KEYCLOAK_ISSUER="http://localhost:8180/realms/myrealm"
export KEYCLOAK_AUTH_SERVER_URL="http://localhost:8180"
export KEYCLOAK_REALM="myrealm"
export KEYCLOAK_ADMIN_CLIENT_ID="admin-cli"
export KEYCLOAK_ADMIN_CLIENT_SECRET="your-secret"
```

---

## 12. COMMANDES DE BUILD ET RUN

### Prérequis
- Java 17
- MySQL 8+ sur localhost:3306 (root/root)
- Maven 3.8+

### Build
```bash
# Tout
mvn clean package -DskipTests

# Un seul service
mvn clean package -pl employee-service -DskipTests
```

### Run (ordre important)
```bash
# Terminal 1
mvn -pl auth-service spring-boot:run

# Terminal 2
mvn -pl employee-service spring-boot:run

# Terminal 3
mvn -pl recruitment-service spring-boot:run

# Terminal 4 (en dernier)
mvn -pl api-gateway spring-boot:run
```

### Tests
```bash
mvn test                                              # Tous
mvn test -pl auth-service                             # Un service
mvn test -pl auth-service -Dtest=AuthControllerTest   # Une classe
```

### Swagger UI
- Gateway : http://localhost:8080/swagger-ui.html
- Auth : http://localhost:8081/swagger-ui.html
- Employee : http://localhost:8082/swagger-ui.html
- Recruitment : http://localhost:8083/swagger-ui.html

---

## 13. GESTION DES ERREURS

### GlobalExceptionHandler (dans chaque service)
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ResourceNotFoundException.class)    // → 404
    @ExceptionHandler(IllegalArgumentException.class)     // → 400/409
    @ExceptionHandler(MethodArgumentNotValidException.class) // → 400
    @ExceptionHandler(Exception.class)                    // → 500
}
```

### ResourceNotFoundException
```java
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) { super(message); }
}
```

---

## 14. PROBLÈMES CONNUS ET DETTE TECHNIQUE

### Corrigé dans la session actuelle
| Correction | Fichier | Statut |
|---|---|---|
| Double SecurityFilterChain | RecruitmentConfig.java | ✅ |
| /api/chat/** non routé | api-gateway/application.yml | ✅ |
| Skills 0/50 matching | EmployeeSkill extraction | ✅ |
| Préfixe ROLE_ supprimé | JwtAuthFilter.java ×2 | ✅ |
| Email manager (split @) | PostingBoardComponent | ✅ |

### Encore à traiter
| Problème | Localisation | Priorité |
|---|---|---|
| Flyway V1 SQL manque colonnes LONGBLOB | db/migration/V1__*.sql | High |
| Flyway utilise BIGINT vs UUID JPA | Tous scripts Flyway | High |
| FetchType.EAGER sur requiredSkills/skills | JobOffer.java, Application.java | Medium |
| 4 copies de JwtValidator (duplication) | Tous services | Medium |
| Clé Gemini côté frontend (env.ts) | environment.ts | High |
| Pas de Docker/docker-compose | — | Medium |
| Pas de distributed tracing | — | Low |
| CV stocké en LONGBLOB MySQL | Application.java | Medium |

---

## 15. DONNÉES DE DÉMONSTRATION

### Utilisateurs auth-service
| Email | Mot de passe | Rôle |
|---|---|---|
| admin@hr.sirh.com | admin123 | HR_ADMIN |
| manager@mgr.sirh.com | manager123 | MANAGER |
| employee@sirh.com | employee123 | EMPLOYEE |
| karim.design@sirh.com | karim123 | EMPLOYEE |
| lea.data@sirh.com | lea123 | EMPLOYEE |
| youssef.dev@sirh.com | youssef123 | EMPLOYEE |
| clara.mkt@sirh.com | clara123 | EMPLOYEE |
| nadia.mgr@sirh.com | nadia123 | MANAGER |

### Volumes de données après seed complet
- ~1055 employés (8 démo + 47 bulk + 1000 BulkEmployeeSeeder)
- 8 départements IT + 4 ajoutés = 12 départements total
- 100+ postes
- 1000+ compétences assignées
- 20+ offres d'emploi
- 10+ candidatures de démo

---

## 16. POINTS D'EXTENSION POSSIBLES

1. **Inter-service communication** : Ajouter Feign Client pour que recruitment-service récupère les données employé
2. **Event-driven** : Kafka pour les notifications (entretien planifié → email automatique)
3. **File storage** : Migrer CV LONGBLOB vers MinIO/S3
4. **Shared library** : Extraire JWT, DTOs communs dans un module `sirh-common`
5. **Monitoring** : Ajouter Spring Actuator + Micrometer + Prometheus
6. **Docker** : Créer `docker-compose.yml` pour lancer tout l'environnement
7. **Keycloak** : Activer SSO complet et supprimer auth-service