# Taches SIRH (pick-list)

## Backend
- [x] Squelette Maven multi-modules (auth-service, employee-service, recruitment-service, api-gateway) avec poms de base [sirh-backend/auth-service/pom.xml](sirh-backend/auth-service/pom.xml) [sirh-backend/employee-service/pom.xml](sirh-backend/employee-service/pom.xml) [sirh-backend/recruitment-service/pom.xml](sirh-backend/recruitment-service/pom.xml) [sirh-backend/pom.xml](sirh-backend/pom.xml)
- [x] Config datasource MySQL par microservice [sirh-backend/auth-service/src/main/resources/application.properties](sirh-backend/auth-service/src/main/resources/application.properties) [sirh-backend/employee-service/src/main/resources/application.properties](sirh-backend/employee-service/src/main/resources/application.properties) [sirh-backend/recruitment-service/src/main/resources/application.properties](sirh-backend/recruitment-service/src/main/resources/application.properties)
- [x] Parent Maven complet (modules declares, packaging pom, plugin Spring Boot, versions centralisees)
- [x] Generer src/main/java et classes Spring Boot de demarrage pour chaque service
- [x] Auth service : modeles/repositories/services/controllers; Spring Security 6 + BCrypt; JWT access+refresh; roles/permissions; endpoints login/register/refresh; CORS/CSRF; tests
- [x] Employee service : entites Employe/Departement/Poste/Contrat; CRUD + recherches; validation/exceptions; DTO mapping; tests JPA/service/controller
- [x] Recruitment service : entites Offre/Candidature/Competence; publication/offres/candidatures/matching; notifications (a definir); tests
- [x] API Gateway : routes vers services, option Eureka, filtres JWT centralises, rate limiting basique
- [x] Scripts DB et migrations (Flyway/Liquibase) pour chaque service
- [x] Swagger/OpenAPI 3 expose sur chaque service

## Frontend
- [x] Projet Angular initialise (template placeholder) [sirh-frontend/src/app/app.component.ts](sirh-frontend/src/app/app.component.ts) [sirh-frontend/src/app/app.routes.ts](sirh-frontend/src/app/app.routes.ts) [sirh-frontend/src/app/app.component.html](sirh-frontend/src/app/app.component.html)
- [x] Routing modulaire (espaces employe, manager, rh admin) et layout de base
- [x] Auth JWT : services HTTP, interceptor, guards, stockage tokens, refresh flow
- [x] Dashboards et composants principaux (profils, offres internes, candidatures, organigramme, reporting)
- [x] UI/UX responsive (Bootstrap ou Material) et theming commun
- [x] Connexion API Gateway + gestion erreurs/feedback
- [x] Tests unitaires (Jest/Karma) et e2e (Cypress/Playwright)

## CI/CD et documentation
- [x] README general avec informations projet, credentials, architecture [sirh-frontend/README.md](sirh-frontend/README.md)
- [x] Strategie Git : .gitignore racine, .gitattributes (LF), PR template [.gitignore](.gitignore) [.gitattributes](.gitattributes) [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)
- [x] Pipeline CI GitHub Actions : jobs backend (Maven multi-modules, Java 21), frontend (ng build + ng test headless), E2E Cypress sur main [.github/workflows/ci.yml](.github/workflows/ci.yml)

## Business Intelligence
- [ ] Architecture BI (DW vs Data Lake) et schema dimensionnel cible (etoile/flocon)
- [ ] Choix ETL (Talend/NiFi/Python) et planification (Airflow/Cron); flux de collecte
- [ ] Tables de faits (recrutement, employes, mobilite) et dimensions (temps, employe, departement, poste, competence) avec SCD2 et qualite donnees
- [ ] Dashboards RH dans l outil choisi (Power BI/Tableau/Metabase/Superset) avec KPIs clefs
- [ ] Documentation BI et gouvernance (securite, RLS, catalogue de metriques)
