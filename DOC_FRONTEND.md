# DOC_FRONTEND.md — Documentation Complète Frontend SIRH
> Projet : SIRH (Système d'Information des Ressources Humaines)
> Répertoire : `C:\Users\Hp\Desktop\last v\essra\sirh-frontend`
> Date : 2026-04-16

---

## 1. VUE D'ENSEMBLE

Application Angular 17 en **standalone components** (pas de NgModules).
Interface multi-rôles avec 3 espaces distincts :
- **Espace Employé** — profil, offres internes, candidatures, entretiens, annuaire
- **Espace Manager** — dashboard, publication d'offres, revue des candidatures, rapports équipe
- **Espace RH Admin** — gouvernance complète, recrutement, matching IA, BI analytics

### Lancement
```bash
cd sirh-frontend
npm install
ng serve                   # http://localhost:4200
ng build --configuration production
```

---

## 2. TECHNOLOGIES ET DÉPENDANCES

| Technologie | Version | Usage |
|---|---|---|
| Angular | 17.x | Framework principal |
| TypeScript | 5.x | Langage |
| RxJS | 7.x | Observables, forkJoin, catchError |
| Angular Signals | 17.x | State management réactif (`signal()`, `computed()`, `effect()`) |
| ng2-charts | 5.x | Wrapper Angular pour Chart.js |
| Chart.js | 4.x | Graphiques (doughnut, bar, line) |
| Angular Router | 17.x | Navigation SPA, lazy loading |
| HttpClient | 17.x | Appels REST API |
| Angular Forms | 17.x | Reactive Forms + Template Forms |

### Aucune bibliothèque UI externe
- **Pas de Angular Material**
- **Pas de Bootstrap**
- **Pas de Angular CDK**
- Tout le CSS est custom (Tailwind-inspired utilities via classes inline)
- Drag & drop : HTML5 natif (pas CDK)

---

## 3. STRUCTURE DES FICHIERS

```
sirh-frontend/src/app/
├── app.component.ts           ← Composant racine + router-outlet
├── app.config.ts              ← Configuration application (providers, HTTP interceptors)
├── app.routes.ts              ← Toutes les routes de l'application
│
├── core/
│   ├── auth/
│   │   ├── auth.service.ts    ← Login, logout, gestion token
│   │   ├── auth.models.ts     ← Interfaces LoginRequest, AuthResponse, User
│   │   ├── auth.guard.ts      ← Guard : utilisateur connecté
│   │   ├── role.guard.ts      ← Guard : vérification rôle
│   │   ├── home-redirect.guard.ts ← Redirection selon rôle
│   │   ├── jwt.interceptor.ts ← Injecte Bearer token dans chaque requête HTTP
│   │   └── keycloak-auth.service.ts ← Bridge Keycloak (optionnel)
│   │
│   └── services/
│       ├── employee.models.ts  ← Interfaces TypeScript : Employee, Department, Position, EmployeeSkill...
│       ├── employee.service.ts ← Tous les appels HTTP employee-service
│       ├── recruitment.models.ts ← JobOffer, Application, Skill, CandidateProfile...
│       ├── recruitment.service.ts ← Tous les appels HTTP recruitment-service
│       ├── user-admin.models.ts ← User admin models
│       ├── user-admin.service.ts ← Gestion utilisateurs (admin)
│       ├── ai.service.ts       ← Appels Gemini AI (chatbot)
│       └── notification.service.ts ← Notifications in-app
│
├── features/
│   ├── auth/
│   │   ├── login.page.ts      ← Page de connexion
│   │   └── register.page.ts   ← Page d'inscription
│   │
│   ├── home/
│   │   └── home.page.ts       ← Page d'accueil (redirection selon rôle)
│   │
│   ├── employee/              ← Espace Employé
│   │   ├── employee-dashboard.component.ts
│   │   ├── employee-profile.component.ts
│   │   ├── internal-offers.component.ts
│   │   ├── my-applications.component.ts
│   │   ├── interviews.component.ts
│   │   └── directory.component.ts
│   │
│   ├── manager/               ← Espace Manager
│   │   ├── manager-dashboard.component.ts
│   │   ├── posting-board.component.ts      ← Gestion offres + nom manager (corrigé)
│   │   ├── candidate-review.component.ts
│   │   ├── talent-tracking.component.ts
│   │   └── team-reports.component.ts
│   │
│   └── rh-admin/              ← Espace RH Admin
│       ├── rh-dashboard.component.ts       ← Dashboard KPI + charts (mis à jour)
│       ├── rh-reports.component.ts         ← Rapports RH enrichis (mis à jour)
│       ├── bi-analytics.component.ts       ← NOUVEAU : BI Analytics avancée
│       ├── departments.component.ts
│       ├── positions.component.ts
│       ├── contracts.component.ts
│       ├── users-permissions.component.ts
│       ├── recruitment-oversight.component.ts ← Pipeline Kanban (mis à jour)
│       ├── employee-matching.component.ts   ← Matching IA (mis à jour)
│       ├── mobility-policies.component.ts
│       └── orgchart.component.ts
│
└── shared/
    ├── layout/
    │   └── main-layout.component.ts  ← Layout principal avec sidebar/navbar
    ├── ui/
    │   ├── not-found.component.ts
    │   ├── toast/
    │   │   ├── toast.service.ts
    │   │   └── toasts.component.ts
    │   ├── chatbot/
    │   │   └── chatbot.component.ts
    │   └── command-palette/
    │       └── command-palette.component.ts
    └── components/
        └── ai-chat/
            └── ai-chat.component.ts
```

---

## 4. ROUTING ET GUARDS

### Structure des routes (`app.routes.ts`)

```typescript
export const routes: Routes = [
  { path: '', canActivate: [homeRedirectGuard], ... },  // redirige selon rôle
  { path: 'auth/login', component: LoginPageComponent },
  { path: 'auth/register', component: RegisterPageComponent },
  {
    path: 'employee',
    component: MainLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['EMPLOYEE', 'MANAGER', 'HR_ADMIN'] },
    children: [
      { path: '', component: EmployeeDashboardComponent },
      { path: 'profil', component: EmployeeProfileComponent },
      { path: 'offres', component: InternalOffersComponent },
      { path: 'candidatures', component: MyApplicationsComponent },
      { path: 'entretiens', component: InterviewsComponent },
      { path: 'annuaire', component: DirectoryComponent },
    ]
  },
  {
    path: 'manager',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['MANAGER', 'HR_ADMIN'] },
    children: [
      { path: '', component: ManagerDashboardComponent },
      { path: 'profil', component: EmployeeProfileComponent },
      { path: 'postes', component: PostingBoardComponent },
      { path: 'candidatures', component: CandidateReviewComponent },
      { path: 'rapports', component: TeamReportsComponent },
    ]
  },
  {
    path: 'rh-admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['HR_ADMIN'] },
    children: [
      { path: '', component: RhDashboardComponent },
      { path: 'departements', component: DepartmentsComponent },
      { path: 'postes', component: PositionsComponent },
      { path: 'contrats', component: ContractsComponent },
      { path: 'recrutement', component: RecruitmentOversightComponent },
      { path: 'mobilite', component: MobilityPoliciesComponent },
      { path: 'organigramme', component: OrgchartComponent },
      { path: 'matching', component: EmployeeMatchingComponent },
      { path: 'analytics', component: BiAnalyticsComponent },  // NOUVEAU
      { path: 'rapports', component: RhReportsComponent },
      { path: 'utilisateurs', component: UsersPermissionsComponent },
    ]
  }
]
```

### Guards

**authGuard** : vérifie si `localStorage.getItem('access_token')` existe, sinon redirige vers `/auth/login`

**roleGuard** : lit `data.roles` de la route, compare avec le rôle décodé du JWT. Si non autorisé → redirige vers la page appropriée selon le rôle réel

**homeRedirectGuard** : décode le token, lit le rôle, redirige :
- `HR_ADMIN` → `/rh-admin`
- `MANAGER` → `/manager`
- `EMPLOYEE` → `/employee`
- Non connecté → `/auth/login`

---

## 5. MODÈLES TypeScript

### employee.models.ts
```typescript
export interface Department {
    id: string; name: string; description: string;
    managerEmployeeId?: string | null; managerName?: string | null;
}

export interface Position {
    id: string; title: string; description: string; departmentId: string;
}

export type ContractType = 'CDI' | 'CDD' | 'STAGE' | 'FREELANCE' | 'ALTERNANCE';
export type SkillLevel = 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE' | 'EXPERT';

export interface EmployeeSkill {
    id?: string; skillName: string; level: SkillLevel;
}

export interface ServiceUnit {
    id: string; name: string; description?: string;
    departmentId?: string; departmentName?: string;
    parentServiceId?: string | null; parentServiceName?: string | null;
}

export interface Employee {
    id: string; firstName: string; lastName: string;
    email: string; phone: string; hireDate: string;
    department: Department; position: Position;
    contractType: ContractType;
    serviceId?: string | null; serviceName?: string | null;
    managerId?: string | null; managerName?: string | null;
    skills?: EmployeeSkill[];
}

export interface OrgNode {
    id: string; firstName: string; lastName: string;
    positionTitle?: string; departmentName?: string;
    email?: string; contractType?: string;
    managerId?: string | null; children: OrgNode[];
}
```

### recruitment.models.ts
```typescript
export interface Skill { id: string; name: string; }

export type OfferStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'CANCELLED' | 'PENDING_VALIDATION';
export type ApplicationStatus = 'PENDING' | 'REVIEWING' | 'INTERVIEW_SCHEDULED' | 'ACCEPTED' | 'REJECTED';

export interface JobOffer {
    id: string; title: string; description: string;
    department: string; location: string; status: OfferStatus;
    publishedDate: string | null; deadlineDate: string | null;
    createdAt: string; requiredSkills: Skill[];
    createdByEmail?: string; createdByName?: string;
}

export interface CandidateProfile {
    competences: string[]; anneesExperience: number; niveau: string;
    formation: string; langues: string[]; softSkills: string[];
    resumeProfil: string;
}

export interface Application {
    id: string; jobOfferId: string; jobOfferTitle: string;
    applicantEmail: string; applicantName: string;
    coverLetter: string; cvUrl?: string; cvFileName?: string;
    status: ApplicationStatus; appliedDate: string;
    skills: Skill[]; matchScore: number;
    candidateProfile?: CandidateProfile;
}

export interface ApplicationStatusUpdateRequest {
    status: string; interviewDate?: string;
    interviewLocation?: string; interviewerName?: string;
    interviewInstructions?: string; rejectionReason?: string;
}
```

---

## 6. SERVICES ANGULAR

### AuthService (`auth.service.ts`)
```typescript
login(email, password): Observable<AuthResponse>
// Stocke accessToken + refreshToken dans localStorage
// Décode le JWT pour extraire email + rôles

logout(): void
// Supprime tokens du localStorage, redirige vers /auth/login

getToken(): string | null
// Retourne le token courant

getCurrentUserEmail(): string
// Décode JWT, extrait "sub"

getCurrentUserRole(): string
// Décode JWT, extrait "roles[0]"

isLoggedIn(): boolean
```

### EmployeeService (`employee.service.ts`)
```typescript
// Employees
getEmployees(search?, department?): Observable<Employee[]>
getEmployeeById(id): Observable<Employee>
createEmployee(req): Observable<Employee>
updateEmployee(id, req): Observable<Employee>
deleteEmployee(id): Observable<void>
getEmployeeSkills(id): Observable<EmployeeSkill[]>
updateEmployeeSkills(id, skills): Observable<EmployeeSkill[]>

// Departments
getDepartments(): Observable<Department[]>
getDepartmentById(id): Observable<Department>
createDepartment(dept): Observable<Department>
updateDepartment(id, dept): Observable<Department>
deleteDepartment(id): Observable<void>

// Positions
getPositions(departmentId?): Observable<Position[]>
getPositionById(id): Observable<Position>
createPosition(pos): Observable<Position>
updatePosition(id, pos): Observable<Position>
deletePosition(id): Observable<void>

// Services (ServiceUnit)
getServices(departmentId?): Observable<ServiceUnit[]>
createService(s): Observable<ServiceUnit>
updateService(id, s): Observable<ServiceUnit>
deleteService(id): Observable<void>

// OrgChart
getOrgTree(): Observable<OrgNode[]>
```

### RecruitmentService (`recruitment.service.ts`)
```typescript
// Job Offers
getJobOffers(status?): Observable<JobOffer[]>
getJobOffersByCreator(email): Observable<JobOffer[]>
getPendingValidationOffers(): Observable<JobOffer[]>
getJobOffer(id): Observable<JobOffer>
createJobOffer(offer): Observable<JobOffer>
validateJobOffer(id): Observable<JobOffer>
refuseJobOffer(id, reason): Observable<JobOffer>
closeJobOffer(id): Observable<JobOffer>

// Applications
getApplications(): Observable<Application[]>              // AJOUTÉ — usage BI
getApplicationsByOffer(offerId): Observable<Application[]>
getMatchedApplicationsByOffer(offerId): Observable<Application[]>
getMyApplications(email): Observable<Application[]>
applyToJob(application): Observable<Application>
updateApplicationStatus(id, req): Observable<Application>
downloadCv(appId, fileName?): void
getInterviewQuestions(applicationId): Observable<{questions: string[]}>

// Skills
getAllSkills(): Observable<Skill[]>
createSkill(name): Observable<Skill>
```

### JwtInterceptor (`jwt.interceptor.ts`)
```typescript
// Injecte automatiquement le Bearer token dans chaque requête HTTP
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        req = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
        });
    }
    return next(req);
};
```

---

## 7. COMPOSANTS — ESPACE RH ADMIN

### rh-dashboard.component.ts (mis à jour)
**Route** : `/rh-admin`
**Technologies** : Signals, forkJoin, Chart.js (doughnut + bar)

**KPIs affichés** :
1. Effectifs Total (+ nouvelles recrues 12 mois)
2. Départements actifs
3. Offres ouvertes (PUBLISHED)
4. Postes définis
5. Ancienneté Moyenne (en années)

**Charts** :
- `deptChartData` : Doughnut répartition par département (12 couleurs)
- `hireChartData` : Bar embauches par année (calculé depuis `employee.hireDate`)
- `appChartData` : Bar candidatures par offre ouverte
- `contractMix` : Barres horizontales CSS natif (CDI/CDD/STAGE/FREELANCE)

**Données chargées** : `forkJoin({ employees, departments, positions, offers })`

**Quick links** : Départements, Postes, Contrats, Recrutement, Matching IA, **BI Analytics** (nouveau), Rapports RH, Utilisateurs

---

### rh-reports.component.ts (enrichi)
**Route** : `/rh-admin/rapports`
**Technologies** : Signals, forkJoin, CSS bars natif

**KPIs** : Effectifs, Départements actifs, Nouvelles recrues (12 mois), Ancienneté moy., Durée moy. offre, Taux CDI

**Sections** :
1. Répartition effectifs par département (barres CSS)
2. Répartition contrats (grille de cards)
3. **Pyramide des Anciennetés** (5 tranches : <1an, 1-3ans, 3-5ans, 5-10ans, >10ans)
4. **Top 15 Compétences** de l'entreprise (calculé depuis `employee.skills`)
5. **Histogramme embauches par année** (CSS natif, pas Chart.js)

**Export CSV** : génère rapport-rh-YYYY-MM-DD.csv avec BOM UTF-8

---

### bi-analytics.component.ts (NOUVEAU)
**Route** : `/rh-admin/analytics`
**Technologies** : Signals, forkJoin, Chart.js (bar + line), CSS natif

**Sections** :

**1. Skill Gap Analysis**
- Compare compétences requises (offres PUBLISHED) vs disponibles (employee.skills)
- Taux de couverture = (employés avec la compétence / offres qui la requièrent) × 100
- Barre colorée : vert ≥70%, orange 30-70%, rouge <30%
- Top 20 compétences les plus requises, triées par couverture croissante

**2. Distribution Scores IA**
- Histogramme 10 tranches (0-10, 10-20, ..., 90-100)
- Basé sur `application.matchScore`
- Chart.js bar

**3. Entonnoir Recrutement**
- 5 étapes : reçues → en revue → entretien → acceptées / refusées
- CSS funnel natif (divs de largeur décroissante)

**4. Tendances Effectifs par Département**
- Line chart Chart.js — effectifs cumulés par année pour chaque département
- Données depuis `employee.hireDate` groupées par année
- Max 8 départements (lisibilité)

**5. Heatmap Niveaux × Département**
- Tableau HTML : lignes = départements, colonnes = DEBUTANT/INTERMEDIAIRE/AVANCE/EXPERT
- Couleur cellule : dégradé bleu clair → bleu foncé selon densité
- `heatColor(val, max)` : calcul lightness HSL

**6. Indicateurs Prédictifs (6 cards)**
- Score IA Moyen — vert ≥60, orange ≥40, rouge <40
- Taux d'Acceptation — % candidatures → ACCEPTED
- Risque Attrition — % employés avec +10 ans ancienneté
- Pression Recrutement — offres ouvertes / nb départements × 20
- Ancienneté Moy. — fidélité organisation
- Couverture Compétences — nb compétences ≥70% couvertes / total

---

### recruitment-oversight.component.ts (Pipeline Kanban)
**Route** : `/rh-admin/recrutement`

**Fonctionnalités** :
- Pipeline Kanban avec colonnes : PENDING → REVIEWING → INTERVIEW_SCHEDULED → ACCEPTED → REJECTED
- **Drag & Drop HTML5 natif** (dragstart, dragover, dragleave, drop)
- Score IA coloré : ≥80% vert, 60-80% orange, <60% rouge
- Détail score IA au clic (modal/panel)
- Cartes candidats avec **avatar initiales + couleur déterministe**
- **"Il y a X jours"** depuis la candidature (basé sur `appliedDate`)
- Bouton "En revue" = couleur violette distincte
- Badge `⚠️ Charge élevée` si >8 cartes dans une colonne

**Méthodes clés** :
```typescript
avatarInitials(name: string): string      // "Jean Dupont" → "JD"
avatarColor(name: string): string         // hash du nom → une des 10 couleurs
daysAgo(dateStr: string): string          // "Il y a 3 jours"
onDragStart(app: Application): void       // stocke app draggée
onDragOver(event, colStatus): void        // preventDefault + visual feedback
onDrop(event, newStatus): void            // appelle updateApplicationStatus()
scoreColor(score: number): string         // ≥80 → green, ≥60 → orange, sinon red
```

**Signals utilisés** :
```typescript
applications = signal<Application[]>([])
offers = signal<JobOffer[]>([])
selectedOfferId = signal<string>('')
dragOverCol = signal<string | null>(null)
draggedApp: Application | null = null
```

---

### employee-matching.component.ts (Matching IA)
**Route** : `/rh-admin/matching`

**Fonctionnalités** :
- Sélection d'une offre d'emploi (dropdown dédupliqué par titre+département)
- Calcul de score de correspondance employé/offre :
  - **Score Compétences (0-50)** : matching bidirectionnel normalisé
  - **Score Expérience (0-30)** : basé sur ancienneté
  - **Score Disponibilité (0-20)** : basé sur type contrat
- Banner `⚠️ Aucun candidat interne qualifié — envisager un recrutement externe` si tous scores < 70
- Bouton **"Proposer mobilité"** sur chaque card (avec toast de confirmation)
- Chargement des compétences manquantes via `getEmployeeSkills(id)`

**Algorithme de matching compétences** :
```typescript
private normalizeSkill(s: string): string {
  return s.toLowerCase()
    .replace(/[.\-\/+#]/g, ' ')     // .js → " js"
    .replace(/\b(js)\b/g, 'javascript')
    .replace(/\bts\b/g, 'typescript')
    .replace(/\bml\b/g, 'machine learning')
    .replace(/\s+/g, ' ').trim();
}

private skillMatch(required: string, candidate: string): boolean {
  const r = normalizeSkill(required);
  const c = normalizeSkill(candidate);
  if (r === c) return true;
  const rt = r.split(/\s+/).filter(t => t.length > 1);
  const ct = c.split(/\s+/).filter(t => t.length > 1);
  // Bidirectionnel : si un token de r est dans ct OU vice-versa
  return rt.some(t => ct.includes(t)) || ct.some(t => rt.includes(t));
}
```

**Déduplication des offres** :
```typescript
const seen = new Set<string>();
const deduped = offers.filter(o => {
  const key = `${o.title?.toLowerCase()}|${o.department?.toLowerCase()}`;
  if (seen.has(key)) return false;
  seen.add(key); return true;
});
```

**Signals** :
```typescript
results = signal<MatchResult[]>([])
selectedOfferId = signal<string>('')
noQualifiedCandidates = computed(() => results().every(m => m.totalScore < 70))
mobilityProposed = signal<Set<string>>(new Set())
toastMobilityMsg = signal('')
```

---

### posting-board.component.ts (Manager)
**Route** : `/manager/postes`

**Correction appliquée** :
```typescript
// AVANT (mauvais) :
const createdByName = email.split('@')[0];

// APRÈS (correct) :
const emp = this.currentEmployee();
const fullName = emp ? `${emp.firstName} ${emp.lastName}` : (email.split('@')[0] || 'Manager');
```

Charge l'employé courant via `getEmployees()` + filtre par email du token JWT.

---

## 8. PATTERNS ANGULAR 17 UTILISÉS

### Signals
```typescript
// Déclaration
myData = signal<Employee[]>([]);
loading = signal(true);

// Computed (dérivé d'un signal)
count = computed(() => this.myData().length);

// Mise à jour
this.myData.set(newData);          // remplace
this.myData.update(d => [...d, newItem]);  // modifie

// Lecture dans le template
{{ myData().length }}
*ngIf="loading()"
```

### forkJoin — appels parallèles
```typescript
forkJoin({
  employees:   this.employeeService.getEmployees(),
  departments: this.employeeService.getDepartments(),
  offers:      this.recruitmentService.getJobOffers()
}).subscribe({
  next: ({ employees, departments, offers }) => { ... },
  error: (err) => { ... }
});
```

### catchError — gestion erreurs dans forkJoin
```typescript
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

this.employeeService.getEmployees()
  .pipe(catchError(() => of([] as Employee[])))
```

### Standalone Components
```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, RouterLink, BaseChartDirective],
  template: `...`,
  styles: [`...`]
})
export class ExampleComponent implements OnInit {
  private service = inject(ExampleService);  // inject() au lieu de constructor
}
```

### IMPORTANT — Interfaces avant @Component
```typescript
// CORRECT — l'interface doit être AVANT le décorateur
interface ScoreBreakdown { label: string; value: number; }

@Component({ ... })
export class MyComponent { ... }

// INTERDIT — TS1206 si interface entre }) et export class
@Component({ ... })
interface ScoreBreakdown { ... }  // ← ERREUR
export class MyComponent { ... }
```

---

## 9. STYLES ET DESIGN

### Système de couleurs
```css
/* Palette principale */
--blue:   #38BDF8  /* Sky 400 */
--indigo: #818CF8  /* Indigo 400 */
--green:  #10B981  /* Emerald 500 */
--orange: #F59E0B  /* Amber 500 */
--red:    #EF4444  /* Red 500 */
--purple: #A78BFA  /* Violet 400 */
--pink:   #F472B6  /* Pink 400 */

/* Texte */
--text-primary:  #0F172A  /* Slate 900 */
--text-secondary:#64748B  /* Slate 500 */
--text-muted:    #94A3B8  /* Slate 400 */

/* Fond */
--bg-page: #F8FAFC  /* Slate 50 */
--bg-card: #FFFFFF
--border:  #E5E7EB  /* Gray 200 */
```

### Animations récurrentes
```css
@keyframes fadeUp {
  from { opacity:0; transform:translateY(12px); }
  to   { opacity:1; transform:translateY(0); }
}

@keyframes shimmer {
  0%   { background-position:200%; }
  100% { background-position:-200%; }
}

@keyframes spin {
  to { transform:rotate(360deg); }
}
```

### Cards pattern
```css
.card {
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
  transition: transform .2s, box-shadow .2s;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,.1);
}
```

---

## 10. CHART.JS CONFIGURATION

### Dépendances
```typescript
// app.config.ts — enregistrement Chart.js
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
providers: [provideCharts(withDefaultRegisterables())]
```

### Import dans composant
```typescript
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  imports: [CommonModule, BaseChartDirective],
})
```

### Usage template
```html
<canvas baseChart
  [data]="myChartData"
  [options]="myChartOptions"
  [type]="'bar'">
</canvas>
```

### Doughnut (répartition départements)
```typescript
deptChartData: ChartData<'doughnut'> = {
  labels: ['IT', 'Marketing', ...],
  datasets: [{
    data: [450, 120, ...],
    backgroundColor: ['#38BDF8', '#818CF8', ...],  // 12 couleurs
    borderWidth: 0,
    hoverOffset: 10
  }]
};
```

### Bar (embauches par année)
```typescript
hireChartData: ChartData<'bar'> = {
  labels: ['2014', '2015', ..., '2026'],
  datasets: [{
    label: 'Embauches',
    data: [85, 92, ...],
    backgroundColor: '#38BDF8',
    borderRadius: 6
  }]
};
```

### Line (tendances par département)
```typescript
deptTrendChart: ChartData<'line'> = {
  labels: ['2014', ..., '2026'],
  datasets: [{
    label: 'Informatique',
    data: [10, 22, 45, ...],  // effectifs cumulés
    borderColor: '#38BDF8',
    backgroundColor: 'transparent',
    borderWidth: 2,
    fill: false
  }, ...]
};
```

---

## 11. ENVIRONNEMENT ET API URL

### environment.ts
```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080/api'  // Via API Gateway
};
```

**IMPORTANT** : Toutes les requêtes passent par le gateway (:8080), jamais directement vers les services (:8081-8083).

---

## 12. GESTION DE L'AUTHENTIFICATION

### Flux de connexion
1. User saisit email + password dans `login.page.ts`
2. `AuthService.login()` → POST `/api/auth/login`
3. Réponse : `{ accessToken, refreshToken, email, roles }`
4. Tokens stockés dans `localStorage`
5. `homeRedirectGuard` redirige vers l'espace selon le rôle

### Décoder le JWT côté frontend
```typescript
decodeToken(token: string): any {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}
// Extrait : { sub: "email", roles: ["HR_ADMIN"], exp: 1234... }
```

### Intercepteur automatique
`JwtInterceptor` est enregistré dans `app.config.ts` :
```typescript
provideHttpClient(withInterceptors([jwtInterceptor]))
```
Il injecte `Authorization: Bearer <token>` dans **toutes** les requêtes HTTP.

---

## 13. PROBLÈMES CONNUS ET CORRECTIONS APPLIQUÉES

| Problème | Correction | Fichier |
|---|---|---|
| Manager affichait email.split('@') | Chargement employé courant par email | posting-board.component.ts |
| Skills 0/50 en matching | normalizeSkill() + matching bidirectionnel | employee-matching.component.ts |
| TS1206 interface après @Component | Interface déplacée avant le décorateur | recruitment-oversight.component.ts |
| Drag & drop sans CDK | HTML5 natif dragstart/dragover/drop | recruitment-oversight.component.ts |
| Offres dupliquées dans dropdown | Déduplication par titre+département | employee-matching.component.ts |
| app.createdAt inexistant | Remplacé par app.appliedDate | recruitment-oversight.component.ts |

---

## 14. NAV LINKS ESPACE RH ADMIN

```typescript
const rhLinks: NavLink[] = [
  { label: 'Dashboard',          path: '/rh-admin' },
  { label: 'Profil',             path: '/rh-admin/profil' },
  { label: 'Departements',       path: '/rh-admin/departements' },
  { label: 'Postes',             path: '/rh-admin/postes' },
  { label: 'Contrats',           path: '/rh-admin/contrats' },
  { label: 'Recrutement interne',path: '/rh-admin/recrutement' },
  { label: 'Mobilité',           path: '/rh-admin/mobilite' },
  { label: 'Organigramme',       path: '/rh-admin/organigramme' },
  { label: 'Matching Employés',  path: '/rh-admin/matching' },
  { label: 'BI Analytics',       path: '/rh-admin/analytics' },  // NOUVEAU
  { label: 'Rapports RH',        path: '/rh-admin/rapports' },
  { label: 'Utilisateurs',       path: '/rh-admin/utilisateurs' },
];
```

---

## 15. EXTENSIONS POSSIBLES

1. **Lazy loading** — passer à `loadComponent: () => import(...)` pour chaque route
2. **NgRx ou Signals Store** — pour partager l'état entre composants (employee courant, etc.)
3. **PWA** — `@angular/pwa` pour mode hors-ligne
4. **i18n** — Angular i18n ou ngx-translate (actuellement tout en français)
5. **Dark mode** — CSS variables + toggle en localStorage
6. **Tests E2E** — Cypress ou Playwright
7. **Tests unitaires** — Jest + Angular Testing Library
8. **Notifications temps réel** — WebSocket ou SSE pour updates pipeline