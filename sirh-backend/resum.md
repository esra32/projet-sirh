# Resume du projet SIRH Backend

## 1. Vue d'ensemble

Ce projet est un backend SIRH organise en microservices avec Spring Boot 3.2.4 et Java 17. Le depot racine est un agregateur Maven (`packaging=pom`) qui orchestre 4 modules:

- `api-gateway`
- `auth-service`
- `employee-service`
- `recruitment-service`

Le systeme couvre 3 grands domaines metier:

- authentification et gestion des roles
- gestion des employes, departements et postes
- recrutement, offres, candidatures, matching de competences

L'entree principale cote client est l'API Gateway sur le port `8080`.

## 2. Architecture technique

### Style global

L'architecture suit un modele microservices simple:

- un service par domaine metier
- une base MySQL par service
- une gateway HTTP comme point d'entree
- JWT comme mecanisme d'authentification principal
- Swagger/OpenAPI expose par chaque service

### Modules Maven

Le `pom.xml` racine declare ces modules:

- `auth-service`
- `employee-service`
- `recruitment-service`
- `api-gateway`

Chaque module est autonome avec son propre `pom.xml`, ses dependances, sa configuration Spring, ses entites et sa persistence.

### Stack principale

- Java 17
- Spring Boot
- Spring Security
- Spring Data JPA
- MySQL
- Spring Cloud Gateway
- Springdoc OpenAPI / Swagger UI
- JJWT pour la generation et la validation des tokens

### Organisation interne des services

Chaque service metier suit globalement cette structure:

- `controller`: expose les endpoints REST
- `service`: logique metier
- `repo`: acces base de donnees avec Spring Data JPA
- `model`: entites JPA et enums
- `dto`: objets d'entree/sortie API
- `config` / `security`: configuration Spring, securite, Swagger, seed de donnees
- `exception`: gestion centralisee des erreurs

## 3. Flux principal

### Authentification

1. Le client appelle `auth-service` via la gateway sur `/api/auth/...`.
2. `auth-service` authentifie l'utilisateur et emet:
   - un `accessToken`
   - un `refreshToken`
3. Le client reutilise le `Bearer token` sur les appels proteges.
4. La gateway valide le JWT et propage l'identite au service cible via:
   - `X-Auth-User`
   - `X-Auth-Roles`

### Appels metier

- `employee-service` gere les donnees RH internes
- `recruitment-service` gere les offres, candidatures et competences

## 4. Services detailles

### 4.1 `api-gateway`

#### Role

La gateway centralise l'acces HTTP public. Elle route les requetes vers les bons microservices et applique une verification JWT sur les routes protegees.

#### Port

- `8080`

#### Routage

Dans `api-gateway/src/main/resources/application.yml`:

- `/api/auth/**` -> `auth-service` sur `http://localhost:8081`
- `/api/employees/**`, `/api/departments/**`, `/api/positions/**` -> `employee-service` sur `http://localhost:8082`
- `/api/job-offers/**`, `/api/applications/**`, `/api/skills/**` -> `recruitment-service` sur `http://localhost:8083`

#### Securite

- la route auth est publique
- les routes employee et recruitment passent par `AuthJwtFilter`
- le filtre verifie la presence du header `Authorization: Bearer ...`
- en cas de succes, il ajoute `X-Auth-User` et `X-Auth-Roles`

#### Documentation API

La gateway agrege les docs Swagger des 3 services:

- `/v3/api-docs/auth`
- `/v3/api-docs/employee`
- `/v3/api-docs/recruitment`

#### Point d'attention

Le endpoint `/api/chat/**` existe dans `recruitment-service`, mais il n'est pas route par la gateway. En l'etat, il faut appeler directement le service recruitment sur `8083` pour l'utiliser.

### 4.2 `auth-service`

#### Role

`auth-service` gere:

- l'inscription locale
- la connexion locale
- le refresh token
- l'echange d'un token Keycloak contre un token interne
- la gestion des utilisateurs et des roles

#### Port

- `8081`

#### Base de donnees

- MySQL `sirh_auth`

#### Modele principal

- `User`
- `Role`

Roles supportes:

- `HR_ADMIN`
- `MANAGER`
- `EMPLOYEE`

#### Endpoints principaux

Sous `/api/auth`:

- `POST /register`
- `POST /login`
- `POST /refresh`
- `POST /keycloak/register`
- `POST /keycloak/exchange`

Sous `/api/auth/users`:

- `GET /`
- `PATCH /{id}/roles`
- `DELETE /{id}`

#### Regles metier importantes

- l'auto-inscription publique attribue uniquement le role `EMPLOYEE`
- les roles eleves sont reserves aux workflows admin RH
- le login local genere un JWT interne
- le refresh regenere un nouvel access token et un nouveau refresh token
- l'echange Keycloak cree localement un utilisateur s'il n'existe pas

#### Securite

- endpoints publics: login, register, refresh, endpoints Keycloak
- le reste est protege par `JwtAuthFilter`
- les endpoints de gestion utilisateurs exigent `HR_ADMIN` via `@PreAuthorize`

#### Keycloak

Le service contient une integration optionnelle:

- validation JWT Keycloak via `jwks-uri` et `issuer`
- administration Keycloak via `KeycloakAdminClient`
- creation d'utilisateurs et affectation de role realm

#### Initialisation de donnees

`DataInitializer` cree des comptes de demo:

- `admin@hr.sirh.com` / `admin123`
- `manager@mgr.sirh.com` / `manager123`
- `employee@sirh.com` / `employee123`
- autres profils employes de test

#### Cote dev

Points forts:

- separation claire controller/service/repository
- gestion des roles cote methode
- support double: JWT interne + Keycloak

Points a surveiller:

- `spring.jpa.hibernate.ddl-auto=update` en base locale, ce qui n'est pas ideal pour la production
- il existe aussi des scripts Flyway, mais la strategie globale de migration n'est pas entierement coherente

### 4.3 `employee-service`

#### Role

`employee-service` gere le coeur RH interne:

- employes
- departements
- postes

#### Port

- `8082`

#### Base de donnees

- MySQL `sirh_employee`

#### Entites principales

- `Department`
- `Position`
- `Employee`
- `ContractType`

#### Endpoints

`/api/employees`

- `GET /`
- `GET /{id}`
- `POST /`
- `PUT /{id}`
- `DELETE /{id}`

Fonctionnalites du listing:

- `?search=...` recherche par nom ou email
- `?department=...` filtre par departement

`/api/departments`

- `GET /`
- `GET /{id}`
- `POST /`
- `PUT /{id}`
- `DELETE /{id}`

`/api/positions`

- `GET /`
- `GET /department/{deptId}`
- `GET /{id}`
- `POST /`
- `PUT /{id}`
- `DELETE /{id}`

#### Logique metier

- verification d'unicite de l'email employe
- rattachement d'un employe a un departement et un poste
- mapping entite -> DTO explicite
- gestion des erreurs via `ResourceNotFoundException` et `GlobalExceptionHandler`

#### Securite

- toutes les routes metier sont authentifiees
- Swagger et `actuator/health` sont publics
- validation JWT locale via filtre Spring Security

#### Initialisation de donnees

Le service injecte:

- 4 departements
- 8 postes
- 8 employes de demo

Les emails sont alignes avec ceux de `auth-service` pour garder une coherence entre authentification et profil RH.

#### Cote dev

Le service est simple a reprendre. La logique est essentiellement CRUD, avec peu de couplage externe.

Point a surveiller:

- la verification d'unicite email dans `create()` parcourt tous les employes au lieu d'utiliser une requete repository dediee

### 4.4 `recruitment-service`

#### Role

`recruitment-service` couvre le domaine recrutement:

- gestion des competences
- publication d'offres
- depots de candidatures
- calcul de matching
- chat simple de recommandation d'offres
- extraction automatique de competences depuis un CV / lettre

#### Port

- `8083`

#### Base de donnees

- MySQL `sirh_recruitment`

#### Entites principales

- `Skill`
- `JobOffer`
- `Application`
- `ChatMessage`
- `OfferStatus`
- `ApplicationStatus`

#### Endpoints

`/api/job-offers`

- `GET /`
- `GET /{id}`
- `POST /`
- `PUT /{id}`
- `POST /{id}/publish`
- `POST /{id}/close`
- `DELETE /{id}`

Filtres du listing:

- `?status=PUBLISHED`
- `?department=...`

`/api/applications`

- `GET /`
- `GET /{id}`
- `POST /`
- `PUT /{id}/status?status=...`
- `GET /match/{offerId}`
- `GET /{id}/cv`
- `DELETE /{id}`

Filtres du listing:

- `?offerId=...`
- `?email=...`

`/api/skills`

- `GET /`
- `POST /`
- `DELETE /{id}`

`/api/chat`

- `GET /{sessionId}`
- `POST /{sessionId}`

#### Logique metier

##### Offres

- creation et mise a jour des offres
- publication et cloture via changement de statut
- liaison avec un ensemble de competences requises

##### Candidatures

- depot d'une candidature avec email, nom, lettre, CV et competences
- stockage possible du CV en binaire via `cvBase64`
- telechargement du CV en PDF via endpoint dedie
- changement de statut d'une candidature

##### Matching

Le service calcule un score de compatibilite entre:

- competences requises par l'offre
- competences associees a la candidature

Le score est ensuite trie pour obtenir le classement des candidatures par offre.

##### Extraction de competences

`CvSkillExtractorService` fonctionne en 2 modes:

- mode IA optionnel via Gemini si `GEMINI_API_KEY` est configure
- mode heuristique local avec dictionnaire d'alias sinon

Les competences detectees sont mappees sur les `Skill` deja existantes en base.

##### Chat

`ChatService` fournit un chat basique:

- historique par `sessionId`
- reponse bot simple basee sur les offres publiees et la presence de mots-cles

Ce n'est pas un assistant conversationnel avance. La logique repose sur du matching texte direct.

#### Securite

Le module contient deux configurations de securite:

- `SecurityConfig`
- `RecruitmentConfig`

Les deux declarent une `SecurityFilterChain`, ce qui merite d'etre clarifie. L'intention visible est:

- Swagger / actuator publics
- routes metier protegees ou confiees a la gateway
- filtre JWT present dans le service

#### Initialisation de donnees

Le service injecte:

- 20 competences
- 5 offres d'emploi
- 5 candidatures de test

#### Cote dev

Parties interessantes:

- matching candidat/offre deja implemente
- scoring enrichi avec bonus d'experience
- extraction IA optionnelle, mais avec fallback local robuste

Points a surveiller:

- `spring.flyway.enabled=false` alors qu'un script Flyway existe
- le chat n'est pas expose par la gateway
- la coexistence de 2 configurations de securite peut provoquer une comprehension difficile ou un comportement non voulu

## 5. Donnees et persistence

### Bases de donnees

Une base MySQL par service:

- `sirh_auth`
- `sirh_employee`
- `sirh_recruitment`

### Strategie actuelle

- les services utilisent `spring.jpa.hibernate.ddl-auto=update`
- des scripts de migration existent sous `db/migration`
- un script global `init_db.sql` existe a la racine

### Lecture pratique

Le projet est dans un etat hybride:

- Hibernate peut creer ou mettre a jour le schema
- Flyway est partiellement present
- `init_db.sql` sert surtout au demarrage manuel ou aux tests de demonstration

Pour un usage equipe/prod, il faudrait choisir une strategie unique de migration.

## 6. Securite et roles

### JWT

Le socle de securite repose sur un secret partage `JWT_SECRET` entre:

- `auth-service`
- `employee-service`
- `recruitment-service`
- `api-gateway`

Cela permet:

- emission du token dans `auth-service`
- validation dans la gateway
- validation supplementaire dans les services

### Roles

Roles applicatifs:

- `HR_ADMIN`
- `MANAGER`
- `EMPLOYEE`

Usage visible:

- `HR_ADMIN` peut lister, modifier les roles et supprimer des utilisateurs
- les autres services ne montrent pas encore de matrice fine d'autorisations par role

## 7. Documentation et tests

### Swagger

Chaque service expose sa doc OpenAPI. La gateway les agrege.

### Tests presents

Le depot contient des tests mais en quantite limitee:

- `auth-service`: tests auth controller et JWT
- `employee-service`: tests repository/service departement
- `recruitment-service`: tests repository/service offres

Il manque encore des tests plus complets sur:

- securite inter-services
- gateway
- matching de candidatures
- upload/download de CV
- chat

## 8. Lancement local

### Ports

- gateway: `8080`
- auth: `8081`
- employee: `8082`
- recruitment: `8083`

### Pre-requis

- Java 17
- Maven
- MySQL local

### Variables utiles

- `JWT_SECRET`
- `JWT_ACCESS_MS`
- `JWT_REFRESH_MS`
- `KEYCLOAK_JWKS_URI`
- `KEYCLOAK_ISSUER`
- `KEYCLOAK_AUTH_SERVER_URL`
- `KEYCLOAK_REALM`
- `KEYCLOAK_ADMIN_CLIENT_ID`
- `KEYCLOAK_ADMIN_CLIENT_SECRET`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

### Ordre de demarrage conseille

1. demarrer MySQL
2. demarrer `auth-service`
3. demarrer `employee-service`
4. demarrer `recruitment-service`
5. demarrer `api-gateway`

## 9. Ce qui existe vraiment aujourd'hui

### Ce qui est deja bien en place

- architecture modulaire lisible
- authentification JWT fonctionnelle
- gestion des utilisateurs et roles de base
- CRUD RH complet sur employes/departements/postes
- CRUD recrutement complet sur offres/candidatures/competences
- scoring de matching candidat/offre
- integration Keycloak optionnelle
- extraction IA optionnelle via Gemini
- jeux de donnees de demo dans chaque service

### Ce qui ressemble a du chantier encore ouvert

- strategie de migration BD a unifier
- exposition de `/api/chat` a finaliser via gateway
- securite du `recruitment-service` a clarifier
- autorisations par role a raffiner sur les services metier
- tests d'integration encore insuffisants

## 10. Fichiers racine a connaitre

- `pom.xml`: agregateur Maven du monorepo
- `init_db.sql`: script manuel d'initialisation SQL
- `src/main/java/org/example/Main.java`: fichier Java racine de demo, sans role visible dans l'architecture microservices

## 11. Conclusion

Le projet est deja exploitable comme backend SIRH de demonstration avancee. L'architecture est claire et les domaines sont bien separes. Le coeur fonctionnel est present, surtout sur l'authentification, la gestion RH et le recrutement intelligent.

Pour une reprise serieuse en equipe, les priorites techniques seraient:

- normaliser les migrations de base
- verrouiller la securite du service recrutement
- finaliser l'exposition de tous les endpoints via la gateway
- renforcer les tests d'integration et les regles d'autorisation par role
