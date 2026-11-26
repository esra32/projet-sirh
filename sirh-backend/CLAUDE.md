# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**SIRH** (Système d'Information des Ressources Humaines) is a French HR management backend. It handles three core domains:

1. **Authentication & Identity** — user registration, JWT login, role management, optional Keycloak SSO
2. **Employee Management** — employee profiles, departments, positions, contract types
3. **Recruitment** — job offers, applications, skill tracking, AI-powered CV skill extraction, candidate matching, and a basic chatbot for offer discovery

The project is in **active development / late prototype** stage. Core CRUD and auth flows work. AI features (Gemini CV parsing, smart scoring) are implemented but optional. Known structural issues exist (see Current State section). Not production-ready as-is.

---

## Architecture & Data Flow

### System Topology

```
Client
  └─► API Gateway (:8080)          ← single entry point, JWT validation
        ├─► Auth Service (:8081)    ← /api/auth/** (public)
        ├─► Employee Service (:8082)← /api/employees/**, /api/departments/**, /api/positions/**
        └─► Recruitment Service (:8083) ← /api/job-offers/**, /api/applications/**, /api/skills/**

NOTE: /api/chat/** exists in Recruitment Service but is NOT routed through gateway.
```

### Request Lifecycle

1. Request hits gateway on port 8080
2. For protected routes, `AuthJwtFilter` (gateway) extracts the Bearer token
3. `JwtValidator` (gateway) validates HS256 signature using `JWT_SECRET`; optionally validates RSA tokens from Keycloak via JWKS endpoint
4. On success, gateway injects `X-Auth-User: <email>` and `X-Auth-Roles: <comma-separated>` headers into the forwarded request
5. Downstream service's `JwtAuthFilter` re-validates the token and reads these headers to build a `SecurityContext`
6. Controller → Service → Repository → MySQL → response back to client

### How JWT Roles Work (Critical Detail)

- Auth-service generates tokens with a `roles` claim containing plain names: `["HR_ADMIN", "EMPLOYEE"]`
- Gateway forwards them as-is in `X-Auth-Roles`
- **Employee and Recruitment service JwtAuthFilters add `ROLE_` prefix** when building `GrantedAuthority` objects
- Auth-service's own filter does NOT add the prefix
- Result: `@PreAuthorize("hasAuthority('HR_ADMIN')")` works in auth-service, but in other services you'd need `hasRole('HR_ADMIN')` (which implicitly uses `ROLE_` prefix). Currently no `@PreAuthorize` exists on employee/recruitment endpoints — everything is authenticated-only.

### Module Responsibilities

| Module | Package root | Role |
|---|---|---|
| `api-gateway` | `org.example.gateway` | Routing, JWT validation, Swagger aggregation |
| `auth-service` | `org.example.auth` | Users, roles, JWT generation, Keycloak bridge |
| `employee-service` | `org.example.employee` | Employees, departments, positions |
| `recruitment-service` | `org.example.recruitment` | Job offers, applications, skills, AI matching, chat |

### Per-Module File Map

Each service follows identical layering:

```
model/       — JPA entities (@Entity)
dto/         — API request/response objects (no JPA annotations)
repo/        — Spring Data JPA interfaces (extends JpaRepository)
service/     — Business logic, entity↔DTO mapping
controller/  — @RestController, maps HTTP to service calls
config/      — SecurityConfig, OpenApiConfig, DataInitializer, GlobalExceptionHandler
security/    — JwtValidator (token parsing)
filter/      — JwtAuthFilter (OncePerRequestFilter, sets SecurityContext)
exception/   — ResourceNotFoundException
```

### Notable Classes

**`CvSkillExtractorService`** (recruitment) — the most complex class. Dual-mode skill extraction:
- **Gemini mode**: if `GEMINI_API_KEY` is set, sends cover letter + CV filename to Google Gemini API, parses JSON skill list
- **Heuristic mode** (fallback): matches against 20 hardcoded skill aliases using case-insensitive substring match
- `computeSmartScore()` adds experience bonuses parsed from cover letter via regex (`\d+ (ans|years)`): 8+yrs → +12pts, 5+yrs → +8pts, 3+yrs → +5pts, 1+yrs → +2pts; confidence bonus +5 if 4+ skills matched; capped at 100

**`KeycloakAdminClient`** (auth) — calls Keycloak Admin REST API using cached access token (Java `HttpClient`). Handles user CRUD and role assignment. Token is cached with 15-second buffer before expiry.

**`JwtValidator`** — exists independently in all 3 non-gateway services AND the gateway (4 copies, similar but not identical). The gateway version supports JWKS-based RSA validation for Keycloak tokens.

**`DataInitializer`** — all 3 business services seed demo data on startup using `CommandLineRunner`. The emails are coordinated: the same 8 emails appear in auth-service (users) and employee-service (employees), 5 of them appear in recruitment (applications).

**`ChatService`** (recruitment) — keyword-based chatbot. Matches user query against published job offer titles, departments, and skill names. Returns top-5 matches formatted as text. No ML, no NLP.

---

## Key Conventions & Patterns

### Naming
- Classes: PascalCase. Entities end in no suffix (`Employee`, `JobOffer`). Services end in `Service`. Repos in `Repository`. DTOs use suffix `DTO` or `Request`. Filters end in `Filter`.
- REST endpoints: lowercase kebab-case (`/api/job-offers`, `/api/applications`)
- Fields: camelCase Java, snake_case in DB (Spring default mapping)
- Packages: `org.example.<service-name>.<layer>`

### Error Handling
- Each service has a `GlobalExceptionHandler` (`@RestControllerAdvice`)
- `ResourceNotFoundException` → 404; `IllegalArgumentException` → 400/409; `MethodArgumentNotValidException` → 400; generic `Exception` → 500
- JwtAuthFilter catches `JwtException` silently (no logging, no re-throw) — allows request to proceed as anonymous if token is malformed

### Configuration Loading
- All config via `application.yml` (gateway, auth) or `application.properties` (employee, recruitment)
- Secrets via environment variables with defaults: `${JWT_SECRET:change-me-...}`, `${GEMINI_API_KEY:}`
- No Spring profiles defined (no `application-dev.yml`, `application-prod.yml`)

### Data Access
- All repos extend `JpaRepository<Entity, String>` (UUID String IDs)
- Custom queries use Spring Data method naming or `@Query` with JPQL
- Transactions: services rely on Spring's default transactional behavior; no explicit `@Transactional` on most methods

### DTO Mapping
- Done manually in service layer via `toDto(Entity)` private methods. No MapStruct or ModelMapper.

### Database Seeding
- `DataInitializer implements CommandLineRunner` with `@Order` to control sequence
- Guards with `existsBy...` checks to avoid duplicate seeding on restart

---

## Critical Rules — Never Violate These

1. **JWT_SECRET must be identical across all 4 services.** Gateway validates tokens; downstream services also validate. A mismatch means all authenticated requests fail silently.

2. **Un seul `@Bean SecurityFilterChain` par service.** ✅ Corrigé : `RecruitmentConfig` ne déclare plus de `SecurityFilterChain`. Seul `SecurityConfig.java` en 
3. 
4. 
5. 
6. 
7. 
8. je Aucun employé ne correspond aux critères sélectionnés.
9. 
10. 
11. 
12. 
13. 
14. 
15. 
16. 
17. contient un dans recruitment-service.

3. **Entity IDs are UUID Strings.** Repositories use `JpaRepository<Entity, String>`. Flyway migration scripts use `BIGINT` — those scripts are NOT the actual schema source (Hibernate `ddl-auto=update` is). Do not trust Flyway scripts as the ground truth for schema.

4. **The gateway is the only public-facing entry point.** Services bind to localhost ports (8081–8083) and should not be directly accessible in production. Auth checks in downstream services are defense-in-depth only.

5. **Recruitment-service has `spring.flyway.enabled=false`.** Do not enable it without first aligning the migration SQL with the actual Hibernate-generated schema — the existing V1 script is missing the `cv_file`, `cv_file_name`, `letter_motivation_pdf`, `letter_motivation_file_name` columns.

6. **DataInitializer seeds only if data is absent.** The guards use `existsBy...` queries. If you add new seed data, add the corresponding guard, or it will duplicate on every restart with `ddl-auto=create-drop`.

---

## Current State & Known Issues

### Working
- Full auth flow: register → login → JWT → refresh → role management
- Employee/department/position CRUD
- Job offer lifecycle: DRAFT → PUBLISHED → CLOSED
- Application submission with optional Base64 CV upload
- Smart candidate matching (`GET /api/applications/match/{offerId}`)
- AI skill extraction (heuristic always; Gemini when key provided)
- Keycloak user bridge (optional, tested endpoints exist)
- Swagger UI per service + aggregation at gateway
- Coordinated demo data across all services

### Corrigé (2026-04-04)

| Correction | Fichier | Statut |
|---|---|---|
| Double `SecurityFilterChain` supprimé | `RecruitmentConfig.java` | ✅ |
| `/api/chat/**` routé via gateway avec JWT | `api-gateway/application.yml` | ✅ |
| `ChatController` sécurisé + validation | `ChatController.java` | ✅ |
| `EmployeeService.create()` → `existsByEmail()` | `EmployeeService.java` | ✅ |
| Préfixe `ROLE_` supprimé (employee + recruitment) | `JwtAuthFilter.java` ×2 | ✅ |
| `@PreAuthorize` ajouté sur Employee + Department | Controllers | ✅ |
| SLF4J logging dans `CvSkillExtractorService` | Service | ✅ |
| Profils `application-dev.*` créés | Tous services | ✅ |

### Encore à traiter

| Issue | Location | Priorité |
|---|---|---|
| Flyway schema manque colonnes LONGBLOB | `db/migration/V1__*.sql` | High |
| Flyway ID (`BIGINT`) vs JPA UUID | Tous scripts Flyway | High |
| Fetch EAGER sur `requiredSkills` et `skills` | `JobOffer.java`, `Application.java` | Medium |
| 4 copies de `JwtValidator` (duplication) | gateway, auth, employee, recruitment | Medium |
| Clé Gemini toujours côté frontend | `environment.ts` | High |

### Technical Debt
- No shared library module — DTOs, exceptions, and JWT logic are copy-pasted across services
- No inter-service communication (employee data not linked to auth users programmatically)
- CV files stored as `LONGBLOB` in MySQL — will cause performance issues at scale; should use object storage
- No distributed tracing or correlation IDs

---

## Development Commands

### Prerequisites
- Java 17
- MySQL 8+ running on `localhost:3306`, credentials `root`/`root` (or update `application.properties`)
- Maven (`mvn`) or `mvnd` (faster daemon)

### Environment Variables
```bash
export JWT_SECRET="a-very-long-random-secret-key-that-is-at-least-256-bits-long-abc123"
# Optional:
export GEMINI_API_KEY="your-google-gemini-key"
export GEMINI_MODEL="gemini-1.5-flash"
export KEYCLOAK_JWKS_URI="http://localhost:8180/realms/myrealm/protocol/openid-connect/certs"
export KEYCLOAK_ISSUER="http://localhost:8180/realms/myrealm"
export KEYCLOAK_AUTH_SERVER_URL="http://localhost:8180"
export KEYCLOAK_REALM="myrealm"
export KEYCLOAK_ADMIN_CLIENT_ID="admin-cli"
export KEYCLOAK_ADMIN_CLIENT_SECRET="your-secret"
```

### Build
```bash
# Build all modules
mvn clean package -DskipTests

# Build one service
mvn clean package -pl auth-service -DskipTests
```

### Run (each in its own terminal, start services before gateway)
```bash
mvn -pl auth-service spring-boot:run
mvn -pl employee-service spring-boot:run
mvn -pl recruitment-service spring-boot:run
mvn -pl api-gateway spring-boot:run
```

### Tests
```bash
# All services
mvn test

# Single service
mvn test -pl auth-service

# Single test class
mvn test -pl auth-service -Dtest=AuthControllerTest

# Single test method
mvn test -pl auth-service -Dtest=JwtServiceTest#generateAndValidateToken
```

### Verify a Running System
```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Login — copy accessToken from response
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hr.sirh.com","password":"admin123"}'

# Use token
curl http://localhost:8080/api/employees \
  -H "Authorization: Bearer <accessToken>"

# Swagger UI per service
http://localhost:8081/swagger-ui.html   # auth
http://localhost:8082/swagger-ui.html   # employee
http://localhost:8083/swagger-ui.html   # recruitment
```

### Demo Credentials (seeded by DataInitializer)
| Email | Password | Role |
|---|---|---|
| `admin@hr.sirh.com` | `admin123` | HR_ADMIN |
| `manager@mgr.sirh.com` | `manager123` | MANAGER |
| `employee@sirh.com` | `employee123` | EMPLOYEE |
| `karim.design@sirh.com` | `karim123` | EMPLOYEE |
| `lea.data@sirh.com` | `lea123` | EMPLOYEE |
| `youssef.dev@sirh.com` | `youssef123` | EMPLOYEE |
| `clara.mkt@sirh.com` | `clara123` | EMPLOYEE |
| `nadia.mgr@sirh.com` | `nadia123` | MANAGER |

---

## Goals & Next Priorities

Based on the codebase state:

1. **Fix duplicate SecurityFilterChain** in recruitment-service — currently unpredictable which config wins
2. **Expose `/api/chat`** via gateway and secure it with JWT
3. **Unify role authority format** — pick `ROLE_` prefix or no prefix everywhere
4. **Add `@PreAuthorize` role checks** to employee and recruitment endpoints (HR_ADMIN for mutations, all roles for reads)
5. **Replace `findAll()` email check** in `EmployeeService.create()` with `existsByEmail()`
6. **Replace `System.out.println`** with SLF4J `@Slf4j` logger throughout
7. **Add Spring profiles** (`application-dev.properties`, `application-prod.properties`) to separate concerns