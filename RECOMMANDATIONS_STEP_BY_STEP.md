# RECOMMANDATIONS — Corrections et Améliorations Step by Step

**Projet :** SIRH - PFE  
**Date :** 2026-04-04  
**Objectif :** Passer de ~55% à un projet complet, défendable, et fonctionnel

---

## PARTIE 1 — CE QUE TU DOIS CORRIGER (Bugs et erreurs actives)

Ces corrections sont **obligatoires**. Elles concernent des bugs qui font planter ou mal fonctionner l'application.

---

### ✅ CORRECTION 1 — Supprimer le double SecurityFilterChain dans recruitment-service

**Problème :** Deux beans `@Bean SecurityFilterChain` existent dans `RecruitmentConfig.java` et `SecurityConfig.java`. Spring n'en garde qu'un seul (le dernier enregistré). Le résultat est imprévisible : soit tout est ouvert, soit tout est bloqué.

**Fichier à modifier :** `recruitment-service/src/main/java/org/example/recruitment/config/RecruitmentConfig.java`

**Action :** Supprimer le bean `SecurityFilterChain` de `RecruitmentConfig`. Garder uniquement la déclaration OpenAPI et `@EnableMethodSecurity`.

```java
// RecruitmentConfig.java — VERSION CORRIGÉE
@Configuration
@EnableMethodSecurity
public class RecruitmentConfig {

    @Bean
    public OpenAPI recruitmentOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Recruitment Service API")
                .description("Publication d'offres, candidatures et matching de compétences")
                .version("1.0"))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
    // PAS de SecurityFilterChain ici
}
```

---

### ✅ CORRECTION 2 — Router et sécuriser /api/chat via la gateway

**Problème :** `ChatController` est accessible directement sur le port 8083 sans authentification. La gateway ne le route pas.

**Étape 1 — Ajouter la route dans gateway**

**Fichier :** `api-gateway/src/main/resources/application.yml`

Ajouter sous les routes existantes de recruitment-service :

```yaml
- id: chat-service
  uri: http://localhost:8083
  predicates:
    - Path=/api/chat/**
  filters:
    - AuthJwtFilter
```

**Étape 2 — Sécuriser le ChatController côté service**

**Fichier :** `recruitment-service/.../controller/ChatController.java`

Ajouter l'annotation Swagger de sécurité et lire l'utilisateur depuis le header :

```java
@RestController
@RequestMapping("/api/chat")
@SecurityRequirement(name = "bearerAuth")
public class ChatController {
    // ... code existant inchangé
}
```

---

### ✅ CORRECTION 3 — Retirer la clé API Gemini des fichiers d'environnement Angular

**Problème :** La clé Gemini est exposée en clair dans le code source versionné. Quiconque accède au repo peut l'utiliser.

**Solution immédiate (pour la soutenance) :** Mettre la clé dans une variable d'environnement Node au build, ou appeler Gemini via le backend (recommandé).

**Fichier :** `sirh-frontend/src/environments/environment.ts`

```typescript
// Remplacer
geminiApiKey: 'ta-vraie-cle-ici',

// Par
geminiApiKey: '',  // Laisser vide, passer par le backend
```

**Fichier :** `sirh-frontend/src/app/core/services/ai.service.ts`

Modifier les appels Gemini pour passer par un endpoint backend :

```typescript
// Au lieu d'appeler Gemini directement
chat(message: string): Observable<string> {
  return this.http.post<{response: string}>('/api/ai/chat', { message })
    .pipe(map(r => r.response));
}
```

**Côté backend** (recruitment-service) — ajouter un controller AiController qui appelle Gemini avec la clé stockée en variable d'environnement (`${GEMINI_API_KEY}`).

---

### ✅ CORRECTION 4 — Fixer la vérification d'email dans EmployeeService

**Problème :** `create()` fait `findAll().stream().anyMatch(...)` — scan de toute la table pour vérifier l'unicité.

**Fichier :** `employee-service/.../service/EmployeeService.java`

```java
// AVANT (mauvais)
boolean emailExists = employeeRepo.findAll().stream()
    .anyMatch(e -> e.getEmail().equalsIgnoreCase(request.getEmail()));

// APRÈS (correct)
if (employeeRepo.existsByEmail(request.getEmail())) {
    throw new IllegalArgumentException("Email déjà utilisé : " + request.getEmail());
}
```

La méthode `existsByEmail(String email)` est déjà déclarée dans `EmployeeRepository`.

---

### ✅ CORRECTION 5 — Persister Keycloak avec une base de données réelle

**Problème :** Keycloak utilise H2 in-memory. Au redémarrage, le realm, les clients, les utilisateurs configurés manuellement sont **perdus**.

**Étape 1 — Créer une base MySQL pour Keycloak**

```sql
CREATE DATABASE keycloak CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'keycloak'@'localhost' IDENTIFIED BY 'keycloak123';
GRANT ALL PRIVILEGES ON keycloak.* TO 'keycloak'@'localhost';
```

**Étape 2 — Configurer `keycloak.conf`**

**Fichier :** `C:\keycloak-26.5.6\keycloak-26.5.6\conf\keycloak.conf`

Décommenter et renseigner :

```properties
db=mysql
db-username=keycloak
db-password=keycloak123
db-url=jdbc:mysql://localhost:3306/keycloak
```

**Étape 3 — Exporter le realm après configuration**

Après avoir configuré ton realm via l'interface Keycloak :

```bash
cd C:\keycloak-26.5.6\keycloak-26.5.6\bin
kc.bat export --dir ../data/export --realm myrealm
```

Versionner le fichier `myrealm-realm.json` dans ton repo.

---

### ✅ CORRECTION 6 — Unifier le préfixe ROLE_ dans tous les services

**Problème :** `auth-service` n'ajoute pas `ROLE_`, `employee-service` et `recruitment-service` l'ajoutent. Les `@PreAuthorize` futurs se comporteront différemment selon le service.

**Décision à prendre :** Choisir **sans préfixe** + utiliser `hasAuthority()` partout.

**Fichier :** `employee-service/.../security/JwtAuthFilter.java`

```java
// AVANT
authorities.add(new SimpleGrantedAuthority("ROLE_" + role));

// APRÈS
authorities.add(new SimpleGrantedAuthority(role));
```

Faire la même chose dans `recruitment-service/.../security/JwtAuthFilter.java`.

Puis utiliser systématiquement :
```java
@PreAuthorize("hasAuthority('HR_ADMIN')")  // et non hasRole('HR_ADMIN')
```

---

### ✅ CORRECTION 7 — Remplacer System.out.println par des logs

**Fichiers concernés :**
- `recruitment-service/.../service/CvSkillExtractorService.java`
- `auth-service/.../keycloak/KeycloakAdminClient.java`

```java
// Ajouter en haut de chaque classe
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

private static final Logger log = LoggerFactory.getLogger(CvSkillExtractorService.class);

// Remplacer
System.out.println("Extracted skills: " + skills);
// Par
log.info("Extracted skills: {}", skills);

System.out.println("Error: " + e.getMessage());
// Par
log.error("Skill extraction failed", e);
```

---

## PARTIE 2 — CE QUE TU DOIS AJOUTER (Éléments manquants du CDC)

Ces éléments sont **requis par le cahier des charges** et absents de l'implémentation actuelle.

---

### 🔴 PRIORITÉ MAXIMALE — Business Intelligence (BI)

Le CDC consacre 50% du projet à la BI. C'est **entièrement absent**. C'est le point le plus critique pour la soutenance.

**Option recommandée pour la soutenance : Apache Superset (open source, gratuit)**

#### ÉTAPE BI-1 — Installer Apache Superset

```bash
pip install apache-superset
superset db upgrade
superset fab create-admin
superset load_examples  # optionnel
superset run -p 8088 --with-threads --reload --debugger
```

Accès : `http://localhost:8088`

#### ÉTAPE BI-2 — Créer le Data Warehouse (schéma étoile)

Créer une base `sirh_dw` dans MySQL :

```sql
CREATE DATABASE sirh_dw;
USE sirh_dw;

-- Dimension Temps
CREATE TABLE dim_temps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date_complete DATE,
    annee INT,
    trimestre INT,
    mois INT,
    semaine INT,
    jour_semaine VARCHAR(20)
);

-- Dimension Employé
CREATE TABLE dim_employe (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255),
    prenom VARCHAR(100),
    nom VARCHAR(100),
    departement VARCHAR(100),
    poste VARCHAR(100),
    type_contrat VARCHAR(50),
    date_embauche DATE,
    date_debut_validite DATE,
    date_fin_validite DATE,
    est_courant BOOLEAN  -- SCD Type 2
);

-- Dimension Poste
CREATE TABLE dim_poste (
    id VARCHAR(36) PRIMARY KEY,
    titre VARCHAR(255),
    departement VARCHAR(100),
    localisation VARCHAR(100)
);

-- Dimension Compétence
CREATE TABLE dim_competence (
    id VARCHAR(36) PRIMARY KEY,
    nom VARCHAR(255)
);

-- Fait Recrutement
CREATE TABLE fait_recrutement (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date_id INT REFERENCES dim_temps(id),
    poste_id VARCHAR(36) REFERENCES dim_poste(id),
    nb_candidatures INT,
    nb_acceptees INT,
    nb_rejetees INT,
    delai_traitement_jours INT,
    score_matching_moyen DECIMAL(5,2)
);

-- Fait Employé (snapshot mensuel)
CREATE TABLE fait_employe_snapshot (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date_id INT REFERENCES dim_temps(id),
    departement VARCHAR(100),
    nb_employes INT,
    nb_cdi INT,
    nb_cdd INT,
    nb_stagiaires INT,
    taux_turnover DECIMAL(5,2)
);
```

#### ÉTAPE BI-3 — Créer le script ETL Python

**Fichier à créer :** `C:\Users\Hp\Desktop\last v\essra\sirh-etl\etl_main.py`

```python
import mysql.connector
from datetime import date, datetime
import schedule
import time

# Connexion source (app DB)
source = mysql.connector.connect(
    host='localhost', user='root', password='root'
)

# Connexion cible (DW)
dw = mysql.connector.connect(
    host='localhost', user='root', password='root', database='sirh_dw'
)

def charger_dim_temps():
    """Charge les dates manquantes dans dim_temps"""
    cur_dw = dw.cursor()
    today = date.today()
    cur_dw.execute("SELECT MAX(date_complete) FROM dim_temps")
    derniere = cur_dw.fetchone()[0] or date(2024, 1, 1)
    # Insérer chaque jour manquant jusqu'à aujourd'hui
    from datetime import timedelta
    d = derniere + timedelta(days=1) if derniere else date(2024,1,1)
    while d <= today:
        cur_dw.execute("""
            INSERT IGNORE INTO dim_temps (date_complete, annee, trimestre, mois, semaine, jour_semaine)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (d, d.year, (d.month-1)//3+1, d.month, d.isocalendar()[1], d.strftime('%A')))
        d += timedelta(days=1)
    dw.commit()

def charger_dim_employes():
    """Copie les employés depuis sirh_employee vers dim_employe"""
    cur_src = source.cursor(dictionary=True)
    cur_dw = dw.cursor()
    cur_src.execute("SELECT * FROM sirh_employee.employees")
    employes = cur_src.fetchall()
    for e in employes:
        cur_dw.execute("""
            INSERT INTO dim_employe (id, email, prenom, nom, departement, poste, type_contrat, date_embauche, date_debut_validite, est_courant)
            VALUES (%s, %s, %s, %s,
                (SELECT name FROM sirh_employee.departments WHERE id = %s),
                (SELECT title FROM sirh_employee.positions WHERE id = %s),
                %s, %s, %s, TRUE)
            ON DUPLICATE KEY UPDATE est_courant = TRUE
        """, (e['id'], e['email'], e['first_name'], e['last_name'],
              e['department_id'], e['position_id'],
              e['contract_type'], e['hire_date'], date.today()))
    dw.commit()

def charger_faits_recrutement():
    """Agrège les candidatures par offre"""
    cur_src = source.cursor(dictionary=True)
    cur_dw = dw.cursor()
    cur_src.execute("""
        SELECT
            jo.id as poste_id,
            COUNT(a.id) as nb_candidatures,
            SUM(CASE WHEN a.status = 'ACCEPTED' THEN 1 ELSE 0 END) as nb_acceptees,
            SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END) as nb_rejetees,
            DATEDIFF(MAX(a.applied_date), jo.published_date) as delai
        FROM sirh_recruitment.job_offers jo
        LEFT JOIN sirh_recruitment.applications a ON a.job_offer_id = jo.id
        WHERE jo.status = 'CLOSED'
        GROUP BY jo.id
    """)
    for row in cur_src.fetchall():
        cur_dw.execute("""
            INSERT INTO fait_recrutement (date_id, poste_id, nb_candidatures, nb_acceptees, nb_rejetees, delai_traitement_jours)
            SELECT d.id, %s, %s, %s, %s, %s
            FROM dim_temps d WHERE d.date_complete = CURDATE()
            LIMIT 1
        """, (row['poste_id'], row['nb_candidatures'], row['nb_acceptees'], row['nb_rejetees'], row['delai']))
    dw.commit()

def run_etl():
    print(f"[ETL] Démarrage {datetime.now()}")
    charger_dim_temps()
    charger_dim_employes()
    charger_faits_recrutement()
    print(f"[ETL] Terminé {datetime.now()}")

# Planification quotidienne
schedule.every().day.at("02:00").do(run_etl)

if __name__ == "__main__":
    run_etl()  # Premier chargement immédiat
    while True:
        schedule.run_pending()
        time.sleep(60)
```

#### ÉTAPE BI-4 — Connecter Superset à MySQL et créer les dashboards

1. Dans Superset → Settings → Database Connections → + Database
2. Choisir MySQL, URI : `mysql://root:root@localhost:3306/sirh_dw`
3. Créer les datasets : `dim_employe`, `fait_recrutement`, `fait_employe_snapshot`
4. Créer les charts :
   - **Pie chart** : Répartition employés par département (dim_employe, GROUP BY departement)
   - **Bar chart** : Candidatures par mois (fait_recrutement + dim_temps)
   - **Big Number** : Taux d'acceptation moyen
   - **Line chart** : Évolution des effectifs dans le temps
5. Assembler en un Dashboard "RH Analytics"

---

### 🟠 PRIORITÉ HAUTE — Notifications

**Problème :** Le CDC exige des notifications d'opportunités basées sur le profil.

**Solution simple (email) :**

**Fichier à créer :** `recruitment-service/.../service/NotificationService.java`

```java
@Service
public class NotificationService {

    // Pour la soutenance : log les notifications (simulation)
    // En production : intégrer Spring Mail

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    public void notifierNouvelleOffre(JobOffer offre, List<Employee> candidatsPotentiels) {
        candidatsPotentiels.forEach(emp -> {
            log.info("NOTIFICATION → {} : Nouvelle offre '{}' correspond à votre profil",
                     emp.getEmail(), offre.getTitle());
            // TODO: envoi email via Spring Mail
        });
    }
}
```

Appeler ce service dans `JobOfferService.publish()`.

---

### 🟠 PRIORITÉ HAUTE — Ajouter @PreAuthorize sur les endpoints

**Problème :** N'importe quel utilisateur authentifié peut créer/modifier/supprimer des employés ou des offres.

**Fichier :** `employee-service/.../controller/EmployeeController.java`

```java
@GetMapping
public ResponseEntity<List<EmployeeDTO>> getAll() { ... }  // Tous rôles OK

@PostMapping
@PreAuthorize("hasAuthority('HR_ADMIN')")
public ResponseEntity<EmployeeDTO> create(@Valid @RequestBody EmployeeRequest req) { ... }

@PutMapping("/{id}")
@PreAuthorize("hasAuthority('HR_ADMIN') or hasAuthority('MANAGER')")
public ResponseEntity<EmployeeDTO> update(...) { ... }

@DeleteMapping("/{id}")
@PreAuthorize("hasAuthority('HR_ADMIN')")
public ResponseEntity<Void> delete(...) { ... }
```

Ajouter `@EnableMethodSecurity` dans `SecurityConfig` de employee-service.

Faire de même pour `DepartmentController`, `PositionController`, `JobOfferController`, `ApplicationController`.

---

### 🟡 PRIORITÉ MOYENNE — Organigramme (Org Chart)

**Problème :** Le CDC exige un organigramme hiérarchique. Actuellement absent.

**Étape 1 — Backend :** Ajouter un champ `managerId` à Employee

```java
// Employee.java
@ManyToOne
@JoinColumn(name = "manager_id")
private Employee manager;
```

Ajouter un endpoint :
```java
// EmployeeController.java
@GetMapping("/orgchart")
public ResponseEntity<List<OrgNodeDTO>> getOrgChart() {
    return ResponseEntity.ok(employeeService.buildOrgChart());
}
```

**Étape 2 — Frontend :** Créer un composant `OrgChartComponent`

Installer : `npm install d3` ou utiliser une librairie CSS pure.

```typescript
// org-chart.component.ts
// Afficher les employés en arbre avec leur manager
// Utiliser un simple ul > li récursif pour la soutenance
```

---

### 🟡 PRIORITÉ MOYENNE — Export de données (CSV/PDF)

**Problème :** Aucun export disponible. Requis pour les rapports RH.

**Frontend — Ajouter dans RhReportsComponent :**

```typescript
exportEmployeesCSV(): void {
  const headers = ['Nom', 'Prénom', 'Email', 'Département', 'Poste', 'Contrat'];
  const rows = this.employees.map(e =>
    [e.lastName, e.firstName, e.email, e.department?.name, e.position?.title, e.contractType]
  );
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `employes_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}
```

---

### 🟡 PRIORITÉ MOYENNE — Profils Spring (dev/prod)

**Problème :** Un seul fichier de config pour tous les environnements.

**Créer pour chaque service :**

`application-dev.properties` :
```properties
spring.jpa.show-sql=true
logging.level.org.example=DEBUG
```

`application-prod.properties` :
```properties
spring.jpa.show-sql=false
logging.level.org.example=WARN
spring.datasource.url=jdbc:mysql://prod-db:3306/sirh_auth
```

Démarrer avec : `java -jar app.jar --spring.profiles.active=dev`

---

### 🟡 PRIORITÉ MOYENNE — Collection Postman

**Requis par le CDC.** Créer un fichier `sirh-api.postman_collection.json` à la racine.

Dossiers à créer dans Postman :
- Auth (register, login, refresh, users)
- Employees (CRUD + search)
- Departments (CRUD)
- Positions (CRUD)
- Job Offers (CRUD + publish + close)
- Applications (submit, review, match)
- Skills (CRUD)
- Chat

Exporter et committer dans le repo.

---

## PARTIE 3 — ÉTAPES STEP BY STEP (Plan d'action)

### SEMAINE 1 — Corrections critiques (backend)

```
Jour 1 : CORRECTION 1 — Supprimer double SecurityFilterChain
Jour 1 : CORRECTION 2 — Router /api/chat via gateway
Jour 2 : CORRECTION 3 — Déplacer clé Gemini vers le backend
Jour 2 : CORRECTION 4 — Fixer existsByEmail dans EmployeeService
Jour 3 : CORRECTION 5 — Keycloak → MySQL (persister le realm)
Jour 3 : Exporter le realm Keycloak en JSON, le versionner
Jour 4 : CORRECTION 6 — Unifier préfixe ROLE_
Jour 4 : CORRECTION 7 — Remplacer System.out par SLF4J
Jour 5 : Ajouter @PreAuthorize sur les endpoints critiques
Jour 5 : Lancer mvn test -pl auth-service, corriger les échecs
```

### SEMAINE 2 — Business Intelligence (priorité maximale)

```
Jour 1 : Installer Apache Superset (pip install)
Jour 1 : Créer la base MySQL sirh_dw
Jour 1 : Exécuter le DDL du schéma étoile (dim + fait tables)
Jour 2 : Écrire et tester etl_main.py
Jour 2 : Vérifier les données dans sirh_dw après le premier ETL
Jour 3 : Connecter Superset à sirh_dw
Jour 3 : Créer les 4 datasets dans Superset
Jour 4 : Créer les 5 charts (pie, bar, line, big number, table)
Jour 4 : Assembler le dashboard "RH Analytics"
Jour 5 : Ajouter le planificateur ETL (cron Python)
Jour 5 : Documenter la BI (architecture + guide utilisation)
```

### SEMAINE 3 — Compléter le frontend

```
Jour 1 : Créer le composant OrgChart (arbre hiérarchique simple)
Jour 1 : Ajouter endpoint /api/employees/orgchart au backend
Jour 2 : Compléter DirectoryComponent (annuaire employés)
Jour 2 : Vérifier et compléter RecruitmentOversightComponent
Jour 3 : Ajouter export CSV dans RhReportsComponent
Jour 3 : Vérifier MobilityPoliciesComponent et RhReportsComponent
Jour 4 : Créer la page Notifications (liste simple)
Jour 4 : Câbler NotificationService dans le backend
Jour 5 : Tests end-to-end Cypress (au moins 3 scénarios critiques)
```

### SEMAINE 4 — Tests, documentation, soutenance

```
Jour 1 : Mesurer la couverture de tests (mvn jacoco:report)
Jour 1 : Ajouter tests manquants pour atteindre 60%
Jour 2 : Créer la collection Postman complète
Jour 2 : Exporter et committer sirh-api.postman_collection.json
Jour 3 : Rédiger le guide d'installation (README complet)
Jour 3 : Documenter l'architecture BI (schéma + ETL + dashboards)
Jour 4 : Préparer la démonstration (scénarios précis)
Jour 4 : Enregistrer la vidéo de démonstration (5-10 min)
Jour 5 : Préparer le PowerPoint de soutenance
Jour 5 : Répétition générale de la démonstration
```

---

## PARTIE 4 — VÉRIFICATIONS AVANT SOUTENANCE

### Checklist technique

```
[ ] Tous les services démarrent sans erreur
[ ] Login fonctionne (JWT + Keycloak)
[ ] CRUD employés fonctionne
[ ] Publication d'offre → candidature → changement de statut fonctionne
[ ] Score matching s'affiche sur les candidatures
[ ] Dashboard RH affiche les charts
[ ] Superset accessible avec le dashboard BI
[ ] ETL a chargé des données dans sirh_dw
[ ] Export CSV fonctionne
[ ] Keycloak redémarre sans perdre la configuration
[ ] Toutes les routes Gateway fonctionnent (tester avec Postman)
[ ] Aucune erreur 500 dans les logs
[ ] Clé Gemini retirée du code frontend
```

### Démonstration à préparer (scénarios)

1. **Scénario Admin RH :**
   - Se connecter en tant que `admin@hr.sirh.com`
   - Créer un département → un poste → un employé
   - Imprimer le contrat de l'employé
   - Voir le dashboard KPI mis à jour

2. **Scénario Recrutement :**
   - Se connecter en tant que `manager@mgr.sirh.com`
   - Créer une offre → la publier
   - Se connecter en tant que `employee@sirh.com`
   - Postuler avec un CV
   - Revenir en manager → voir le score matching → accepter le candidat

3. **Scénario BI :**
   - Ouvrir Superset
   - Montrer le dashboard "RH Analytics"
   - Expliquer le schéma étoile et l'ETL

4. **Scénario IA :**
   - Utiliser le chatbot ARIA pour rechercher des offres
   - Montrer l'analyse Gemini d'un candidat

---

## RÉSUMÉ DES PRIORITÉS

| Priorité | Action | Effort | Impact |
|---|---|---|---|
| 🔴 Critique | Fixer double SecurityFilterChain | 15 min | Stabilité |
| 🔴 Critique | Router /api/chat + sécuriser | 30 min | Sécurité |
| 🔴 Critique | Retirer clé Gemini du frontend | 2h | Sécurité |
| 🔴 Critique | Keycloak → MySQL (persistance) | 1h | Stabilité |
| 🔴 Critique | Implémenter la BI (Superset + ETL) | 3-4 jours | 50% du CDC |
| 🟠 Haute | @PreAuthorize sur les endpoints | 2h | Sécurité |
| 🟠 Haute | Unifier préfixe ROLE_ | 30 min | Cohérence |
| 🟠 Haute | Collection Postman | 3h | Livrable CDC |
| 🟡 Moyenne | Organigramme | 4h | Fonctionnel |
| 🟡 Moyenne | Export CSV | 1h | Fonctionnel |
| 🟡 Moyenne | Profils Spring dev/prod | 1h | Qualité |
| 🟡 Moyenne | Mesure couverture tests (JaCoCo) | 2h | Livrable CDC |