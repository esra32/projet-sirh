# DOC_BI.md — Documentation BI Analytics SIRH
> Partie : Business Intelligence / Analytique RH


---

## 1. VUE D'ENSEMBLE BI

Le module BI du SIRH est constitué de **3 composants Angular** qui exploitent les données de 1000+ employés pour produire des analyses RH avancées. Toutes les analyses sont **calculées côté frontend** à partir des données brutes renvoyées par les APIs REST.

### Composants BI
| Composant | Route | Rôle |
|---|---|---|
| `rh-dashboard.component.ts` | `/rh-admin` | Vue d'ensemble KPIs + charts principaux |
| `rh-reports.component.ts` | `/rh-admin/rapports` | Rapports détaillés + export CSV |
| `bi-analytics.component.ts` | `/rh-admin/analytics` | Analytique avancée + indicateurs prédictifs |

### Sources de données
- **Employee Service** (:8082) — 1000+ employés avec hireDate, department, contractType, skills, position
- **Recruitment Service** (:8083) — offres d'emploi, candidatures avec matchScore, statuts

### Accès
- Rôle requis : **HR_ADMIN** uniquement
- Données chargées au montage du composant via `forkJoin` (requêtes parallèles)

---

## 2. COMPOSANT rh-dashboard.component.ts

### Fichier
```
sirh-frontend/src/app/features/rh-admin/rh-dashboard.component.ts
```

### Données chargées
```typescript
forkJoin({
  employees:   employeeService.getEmployees(),
  departments: employeeService.getDepartments(),
  positions:   employeeService.getPositions(),
  offers:      recruitmentService.getJobOffers()
})
```

### KPIs affichés (5 cards)
| KPI | Calcul | Couleur |
|---|---|---|
| Effectifs Total | `employees.length` + `+X recrutés (12 mois)` | Bleu |
| Départements | `departments.length` | Vert |
| Offres Ouvertes | `offers.filter(o => o.status === 'PUBLISHED').length` | Orange |
| Postes Définis | `positions.length` | Violet |
| Ancienneté Moy. | `Σ(now - hireDate) / n / (365.25 * 86400000)` arrondi 1 décimale | Teal |

### Chart 1 — Doughnut Départements
```typescript
deptChartData: ChartData<'doughnut'>
// Labels = noms de départements
// Data = count employés par département
// 12 couleurs disponibles (gère jusqu'à 12 départements)
// Triés par count décroissant
```
Palette 12 couleurs :
```
'#38BDF8','#818CF8','#10B981','#F59E0B','#EF4444',
'#A78BFA','#F472B6','#34D399','#FB923C','#60A5FA','#FBBF24','#4ADE80'
```

### Chart 2 — Bar Embauches par Année
```typescript
hireChartData: ChartData<'bar'>
// Groupement par new Date(hireDate).getFullYear()
// Labels = toutes les années présentes dans les données
// Couleur : dégradé HSL 210° + variation par index
```
Calcul :
```typescript
const hireByYear: Record<number, number> = {};
employees.forEach(e => {
  const yr = new Date(e.hireDate).getFullYear();
  hireByYear[yr] = (hireByYear[yr] ?? 0) + 1;
});
```

### Chart 3 — Bar Candidatures par Offre
```typescript
appChartData: ChartData<'bar'>
// Chargé après le forkJoin principal
// Max 12 offres (slice(0, 12))
// Titres tronqués à 24 chars pour lisibilité
```

### Mix Contrats (CSS natif, pas Chart.js)
```typescript
contractMix = signal<{ label, count, pct, color }[]>([])
// Calculé depuis employees.contractType
// Barres horizontales en CSS
// Couleurs : CDI=#10b981, CDD=#3b82f6, STAGE=#f59e0b, FREELANCE=#ec4899
```

---

## 3. COMPOSANT rh-reports.component.ts

### Fichier
```
sirh-frontend/src/app/features/rh-admin/rh-reports.component.ts
```

### Données chargées
```typescript
forkJoin({
  employees:   employeeService.getEmployees(),
  departments: employeeService.getDepartments(),
  offers:      recruitmentService.getJobOffers()
})
```

### KPIs (6 cards)
| KPI | Calcul |
|---|---|
| Effectifs Globaux | `employees.length` |
| Départements Actifs | `deptStats().length` (ceux avec >0 employés) |
| Nouvelles Recrues 12 mois | `employees.filter(e => new Date(e.hireDate) >= cutoff).length` |
| Ancienneté Moyenne | `Σ(now - hireDate) / n / (365.25 × 86400000)` |
| Durée Moy. Offre | `Σ(deadlineDate - publishedDate) / n` en jours |
| Taux CDI | `employees.filter(e => e.contractType === 'CDI').length / total × 100` |

### Section 1 — Barres Départements
```typescript
deptStats = signal<DeptStat[]>([])
// { name, count, pct, color }
// pct = Math.round(count / total * 100)
// Triés par count décroissant
// Filtrés (count > 0)
```

### Section 2 — Grille Contrats
```typescript
contractStats = signal<{ type, count, pct, color }[]>([])
// Groupement depuis employees.contractType
// Type "N/A" pour les cas sans contractType
```

### Section 3 — Pyramide des Anciennetés (NOUVEAU)
```typescript
seniorityBands = signal<SeniorityBand[]>([])
// 5 tranches d'ancienneté :
const bands = [
  { label: '< 1 an',     min: 0,  max: 1,    color: '#FDE68A' },  // Jaune clair
  { label: '1 – 3 ans',  min: 1,  max: 3,    color: '#FCD34D' },  // Jaune
  { label: '3 – 5 ans',  min: 3,  max: 5,    color: '#10B981' },  // Vert
  { label: '5 – 10 ans', min: 5,  max: 10,   color: '#3B82F6' },  // Bleu
  { label: '> 10 ans',   min: 10, max: 9999, color: '#7C3AED' },  // Violet
];
// Calcul ancienneté :
const yrs = (now - new Date(e.hireDate).getTime()) / (365.25 * 86_400_000);
```

### Section 4 — Top 15 Compétences (NOUVEAU)
```typescript
topSkills = signal<SkillStat[]>([])
// Agrégation sur employee.skills[].skillName
// Normalisation : .toLowerCase().trim()
// Tri décroissant par count
// slice(0, 15)
// pct = Math.round(count / maxSkill * 100) pour barres relatives
```
Calcul :
```typescript
const skillMap: Record<string, number> = {};
employees.forEach(e => {
  (e.skills ?? []).forEach(sk => {
    const n = sk.skillName?.toLowerCase().trim();
    if (n) skillMap[n] = (skillMap[n] ?? 0) + 1;
  });
});
```

### Section 5 — Histogramme Embauches par Année (NOUVEAU)
```typescript
hireTrend = signal<{ year, count, relPct }[]>([])
// CSS natif — pas Chart.js
// relPct = Math.round(count / maxH * 100) pour hauteur relative
// Hauteur colonne : [style.height.%]="y.relPct"
```
Template CSS :
```html
<div class="hire-trend">
  <div class="ht-col" *ngFor="let y of hireTrend()">
    <div class="ht-bar-wrap">
      <span class="ht-count">{{ y.count }}</span>
      <div class="ht-bar" [style.height.%]="y.relPct"></div>
    </div>
    <div class="ht-year">{{ y.year }}</div>
  </div>
</div>
```

### Export CSV
```typescript
exportCSV(): void {
  const header = ['Nom','Prénom','Email','Département','Poste','Contrat','Date embauche'];
  const rows = allEmployees.map(e => [ ... ]);
  const csv = [header, ...rows].map(row =>
    row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(';')
  ).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  // BOM \uFEFF pour Excel UTF-8
}
```

---

## 4. COMPOSANT bi-analytics.component.ts (NOUVEAU)

### Fichier
```
sirh-frontend/src/app/features/rh-admin/bi-analytics.component.ts
```

### Route
`/rh-admin/analytics`

### Données chargées
```typescript
forkJoin({
  employees:   employeeService.getEmployees(),
  departments: employeeService.getDepartments(),
  offers:      recruitmentService.getJobOffers(),
  apps:        recruitmentService.getApplications()  // TOUTES les candidatures
})
```

---

### Section 1 — Skill Gap Analysis

**Objectif** : Identifier les compétences critiques manquantes en interne par rapport aux besoins exprimés dans les offres actives.

**Algorithme** :
```typescript
// 1. Construire la map des compétences disponibles en interne
const employeeSkillMap: Record<string, number> = {};
employees.forEach(e => (e.skills ?? []).forEach(sk => {
  const n = sk.skillName?.toLowerCase().trim();
  if (n) employeeSkillMap[n] = (employeeSkillMap[n] ?? 0) + 1;
}));

// 2. Construire la map des compétences requises (offres PUBLISHED)
const offerSkillReq: Record<string, number> = {};
offers.filter(o => o.status === 'PUBLISHED').forEach(o => {
  (o.requiredSkills ?? []).forEach(sk => {
    const n = sk.name?.toLowerCase().trim();
    if (n) offerSkillReq[n] = (offerSkillReq[n] ?? 0) + 1;
  });
});

// 3. Calculer le taux de couverture pour chaque compétence requise
const gaps: SkillGap[] = Object.entries(offerSkillReq)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)   // Top 20 compétences les plus demandées
  .map(([skillName, required]) => {
    const available = employeeSkillMap[skillName] ?? 0;
    const coverageRate = Math.min(100, Math.round((available / required) * 100));
    return { skillName, required, available, gap: required - available, coverageRate };
  })
  .sort((a, b) => a.coverageRate - b.coverageRate);  // Les plus critiques en premier
```

**Interface SkillGap** :
```typescript
interface SkillGap {
  skillName: string;
  required: number;       // Nb d'offres qui demandent cette compétence
  available: number;      // Nb d'employés qui ont cette compétence
  gap: number;            // required - available
  coverageRate: number;   // 0-100% (min 100, pas de dépassement)
}
```

**Visualisation** :
- Barre colorée :
  - `>= 70%` → `#10b981` (vert) — bonne couverture
  - `30-70%` → `#f59e0b` (orange) — couverture partielle
  - `< 30%` → `#ef4444` (rouge) — compétence critique manquante
- Détail : `X/Y offres` (employés disponibles / offres qui demandent)

---

### Section 2 — Distribution des Scores IA

**Objectif** : Visualiser la qualité globale des candidatures reçues.

**Algorithme** :
```typescript
// 10 tranches de 10 points chacune
const scoreBuckets = [0,10,20,30,40,50,60,70,80,90,100];
const bucketCounts = new Array(10).fill(0);
apps.forEach(a => {
  const idx = Math.min(Math.floor((a.matchScore ?? 0) / 10), 9);
  bucketCounts[idx]++;
});
```

**Chart** : Bar Chart.js, couleurs en dégradé HSL 200°→340°

**Interprétation** :
- Majorité à gauche (0-40%) → offres mal ciblées ou candidats non qualifiés
- Majorité à droite (70-100%) → pipeline de qualité

---

### Section 3 — Entonnoir Recrutement

**Objectif** : Visualiser le taux de conversion à chaque étape du processus.

**Données** :
```typescript
const statusOrder = [
  { label: 'Candidatures reçues',  status: '' },        // toutes
  { label: 'En revue',             status: 'REVIEWING' },
  { label: 'Entretien prévu',      status: 'INTERVIEW_SCHEDULED' },
  { label: 'Acceptées',            status: 'ACCEPTED' },
  { label: 'Refusées',             status: 'REJECTED' },
];
```

**Calcul largeur** :
```typescript
pct: Math.max(20, Math.round((count / totalApplications) * 100))
// min 20% pour que les petites valeurs restent visibles
```

**Couleurs** : `['#38BDF8','#818CF8','#F59E0B','#10B981','#EF4444']`

---

### Section 4 — Tendances Effectifs par Département (Line Chart)

**Objectif** : Visualiser la croissance historique de chaque département depuis 2014.

**Algorithme** (effectifs cumulés par année) :
```typescript
const allYears = [...new Set(
  employees.filter(e => e.hireDate)
    .map(e => new Date(e.hireDate).getFullYear())
)].sort();

const datasets = departments.slice(0, 8).map((d, di) => {
  let cumul = 0;
  const data = allYears.map(yr => {
    cumul += employees.filter(e =>
      e.department?.id === d.id &&
      new Date(e.hireDate).getFullYear() === yr
    ).length;
    return cumul;   // CUMULATIF
  });
  return {
    label: d.name,
    data,
    borderColor: DEPT_COLORS_LINE[di % DEPT_COLORS_LINE.length],
    fill: false
  };
});
```

**Note** : Max 8 départements pour la lisibilité du line chart.
**Options** : `elements: { line: { tension: 0.4 }, point: { radius: 2 } }` (courbes lissées)

---

### Section 5 — Heatmap Niveaux × Département

**Objectif** : Cartographier la distribution des niveaux de compétences dans chaque département.

**Structure du tableau** :
```
Département    | DEBUTANT | INTERMEDIAIRE | AVANCE | EXPERT | Total
────────────────────────────────────────────────────────────────────
Informatique   |    45    |     120       |  230   |   85   |  480
Marketing      |    30    |      60       |   45   |   12   |  147
Finance        |    ...   |     ...       |  ...   |  ...   |  ...
```

**Calcul** :
```typescript
const heatRows = departments.slice(0, 10).map(d => {
  const deptEmps = employees.filter(e => e.department?.id === d.id);
  const counts: Record<string, number> = {};
  let total = 0;
  deptEmps.forEach(e => (e.skills ?? []).forEach(sk => {
    counts[sk.level] = (counts[sk.level] ?? 0) + 1;
    total++;
  }));
  const maxCount = Math.max(...Object.values(counts), 1);
  return { dept: d.name, counts, total, maxCount };
}).filter(r => r.total > 0);
```

**Couleur cellule** :
```typescript
heatColor(val: number, max: number): string {
  if (!max || !val) return '#F8FAFC';   // blanc si 0
  const pct = val / max;               // 0.0 → 1.0
  const lightness = Math.round(95 - pct * 45);  // 95% (clair) → 50% (foncé)
  return `hsl(210, 80%, ${lightness}%)`;  // Bleu clair → bleu foncé
}
```

**Colonnes** : `readonly levels = ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'EXPERT']`

---

### Section 6 — Indicateurs Prédictifs (6 cards)

Chaque card a : icône, titre, valeur principale, description, barre de progression.

#### 1. Score IA Moyen
```typescript
const avgScore = apps.length
  ? Math.round(apps.reduce((s, a) => s + (a.matchScore ?? 0), 0) / apps.length)
  : 0;
// Couleur : vert ≥60, orange ≥40, rouge <40
// barPct = avgScore (0-100)
```

#### 2. Taux d'Acceptation
```typescript
const acceptanceRate = apps.length
  ? Math.round(apps.filter(a => a.status === 'ACCEPTED').length / apps.length * 100)
  : 0;
// Couleur : vert ≥20%, orange sinon
```

#### 3. Risque Attrition
```typescript
const seniorCount = employees.filter(e => {
  const yrs = (now - new Date(e.hireDate).getTime()) / (365.25 * 86_400_000);
  return yrs > 10;
}).length;
const attritionRisk = Math.round(seniorCount / total * 100);
// Heuristique : employés >10 ans = population potentiellement proche de la retraite
// Couleur : rouge ≥30%, orange ≥15%, vert sinon
```

#### 4. Pression Recrutement
```typescript
const openOffers = offers.filter(o => o.status === 'PUBLISHED').length;
const openPressure = Math.min(100, Math.round(openOffers / departments.length * 20));
// Couleur : rouge ≥50%, orange ≥30%, vert sinon
```

#### 5. Ancienneté Moyenne
```typescript
const avgSen = employees.reduce((s, e) =>
  s + (now - new Date(e.hireDate).getTime()), 0
) / employees.length / (365.25 * 86_400_000);
// barPct = Math.min(100, Math.round(avgSen / 12 * 100))
// Couleur : toujours violet #818CF8
```

#### 6. Couverture Compétences
```typescript
const covered = skillGaps().filter(g => g.coverageRate >= 70).length;
const total   = skillGaps().length;
// Affichage : "X/Y" compétences bien couvertes
// barPct = Math.round(covered / total * 100)
// Couleur : toujours bleu #38BDF8
```

---

## 5. DONNÉES NÉCESSAIRES POUR LE BI

### Volume attendu après seed complet
- **~1055 employés** avec hireDate de 2014 à 2026
- **12+ départements**
- **100+ postes** (positions)
- **1000+ entrées EmployeeSkill** (avg 3-5 skills par employé)
- **20+ offres d'emploi** dont plusieurs PUBLISHED avec requiredSkills
- **10+ candidatures** avec matchScore 0-100

### Champs critiques pour le BI
| Entité | Champ | Utilisé pour |
|---|---|---|
| Employee | `hireDate` (String ISO) | Embauches par an, ancienneté, pyramide |
| Employee | `department.id` | Répartition, tendances, heatmap |
| Employee | `contractType` | Mix contrats, taux CDI |
| Employee | `skills[].skillName` | Top compétences, skill gap, heatmap |
| Employee | `skills[].level` | Heatmap niveaux, scoring matching |
| Application | `matchScore` | Distribution scores IA, score moyen |
| Application | `status` | Entonnoir recrutement |
| Application | `appliedDate` | "Il y a X jours" dans le pipeline |
| JobOffer | `status` | Filtrage PUBLISHED |
| JobOffer | `requiredSkills[].name` | Skill gap analysis |
| JobOffer | `publishedDate` + `deadlineDate` | Durée moy. offre |

---

## 6. APIS BACKEND UTILISÉES PAR LE BI

### Employee Service (:8082)
```
GET /api/employees                    → Employee[] (avec skills si chargées)
GET /api/employees/{id}/skills        → EmployeeSkill[]
GET /api/departments                  → Department[]
GET /api/positions                    → Position[]
```

### Recruitment Service (:8083)
```
GET /api/job-offers                   → JobOffer[] (avec requiredSkills)
GET /api/applications                 → Application[] (toutes, sans filtre)
GET /api/applications?offerId=XXX     → Application[] (par offre)
```

### Important — API `/api/applications` sans filtre
Cette méthode a été **ajoutée** dans `recruitment.service.ts` :
```typescript
/** Toutes les candidatures (sans filtre) — usage BI */
getApplications(): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.base}/applications`);
}
```
Le backend `ApplicationController` supporte déjà `findAll()` quand aucun paramètre n'est fourni.

### Attention — Employee skills non incluses par défaut
`GET /api/employees` retourne les employés mais les skills peuvent ne pas être incluses selon la configuration JPA (FetchType). Si `employee.skills` est vide dans les réponses, utiliser :
```typescript
this.employeeService.getEmployeeSkills(employeeId).subscribe(skills => { ... })
```

---

## 7. ARCHITECTURE DES CALCULS BI

Tous les calculs sont **en mémoire côté frontend** — pas d'API analytique dédiée côté backend.

### Avantages
- Simple à implémenter
- Pas de endpoints backend supplémentaires
- Fonctionne avec les APIs existantes

### Limites avec 1000+ employés
- `getEmployees()` charge ~1000 objets Employee en JSON → ~500KB-2MB selon les skills incluses
- Si les skills sont chargées par défaut : OK pour le BI
- Si non chargées : nécessite N requêtes `getEmployeeSkills(id)` → **problème de performance**
- Solution recommandée : endpoint backend `/api/employees/full` qui retourne employees + skills inclus

### Optimisation recommandée (future)
```java
// Backend : ajouter endpoint avec skills eager
@GetMapping("/full")
public List<EmployeeDTO> getAllWithSkills() {
    return employeeRepository.findAllWithSkills()
        .stream().map(this::toFullDto).collect(toList());
}
```

---

## 8. CONFIGURATION CHART.JS

### Enregistrement global
```typescript
// app.config.ts
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
// ...
provideCharts(withDefaultRegisterables())
```

### Options communes
```typescript
// Options bar
barOpts: ChartConfiguration<'bar'>['options'] = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { ticks: { color: '#475569' }, grid: { color: 'rgba(148,163,184,.2)' } },
    x: { ticks: { color: '#475569' }, grid: { display: false } }
  }
};

// Options line
lineOpts: ChartConfiguration<'line'>['options'] = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'right', labels: { ... } } },
  elements: { line: { tension: 0.4 }, point: { radius: 2 } }
};

// Options doughnut
pieOptions: ChartConfiguration<'doughnut'>['options'] = {
  responsive: true, maintainAspectRatio: false, cutout: '70%',
  plugins: { legend: { position: 'right' } }
};
```

### Conteneur requis
```html
<!-- IMPORTANT : height fixe nécessaire pour Chart.js responsive -->
<div style="position:relative; height:240px;">
  <canvas baseChart [data]="..." [options]="..." [type]="'bar'"></canvas>
</div>
```

---

## 9. GUIDE D'EXTENSION BI

### Ajouter un nouveau graphique dans bi-analytics

1. Déclarer les données dans le composant :
```typescript
myNewChart: ChartData<'bar'> = { labels: [], datasets: [] };
```

2. Calculer dans `ngOnInit` après le forkJoin :
```typescript
this.myNewChart = {
  labels: [...],
  datasets: [{ data: [...], backgroundColor: '...', borderRadius: 6 }]
};
```

3. Ajouter dans le template :
```html
<div class="chart-box">
  <h3>Mon Nouveau Graphique</h3>
  <div class="chart-container">
    <canvas baseChart [data]="myNewChart" [options]="barOpts" [type]="'bar'"></canvas>
  </div>
</div>
```

### Analyses possibles à ajouter

| Analyse | Données nécessaires | Complexité |
|---|---|---|
| Turnover par département | hireDate + (date de départ si existant) | Moyen |
| Prédiction besoins recrutement | Tendances embauches passées | Complexe |
| Matrice compétences requises vs présentes | requiredSkills + employee.skills | Implémenté |
| Salary analytics | Champ salary (non encore dans le modèle) | Requiert modèle |
| Absentéisme | Nécessite module présences | Requiert nouveau module |
| Performance review | Nécessite module évaluations | Requiert nouveau module |
| Mobilité interne | applications internes vs externes | Partiellement disponible |
| Succession planning | ancienneté + niveaux compétences | Possible avec données actuelles |

---

## 10. PROBLÈMES CONNUS BI

| Problème | Impact | Solution |
|---|---|---|
| Skills non chargées dans getEmployees() | Skill Gap = vide, Top Skills = vide | Charger via getEmployeeSkills(id) ou endpoint /employees/full |
| matchScore absent sur anciennes candidatures | Distribution scores biaisée | Recalculer via /applications/match/{offerId} |
| Calcul côté frontend sur 1000+ employés | Légère latence au chargement | Ajouter indicateur de chargement + pagination si >5000 |
| Heatmap limitée à 10 depts | Les depts 11+ ne s'affichent pas | Augmenter slice(0, 10) si besoin |
| Line chart limité à 8 depts | Idem | Augmenter slice(0, 8) si besoin |

---

## 11. RÉSUMÉ TECHNIQUE

### Technologies BI
| Technologie | Usage |
|---|---|
| Angular Signals | State management réactif des données calculées |
| RxJS forkJoin | Chargement parallèle de 3-4 sources de données |
| Chart.js 4 + ng2-charts 5 | Doughnut, Bar, Line charts |
| CSS natif | Barres de progression, histogrammes, heatmap, entonnoir |
| TypeScript | Calculs analytiques typés |

### Approche méthodologique
- **ETL simplifié** : Extract (forkJoin APIs) → Transform (calculs TS) → Load (signals → template)
- **Pas de backend BI dédié** : analytics dans le frontend
- **Calculs déterministes** : même données = même résultats (pas de cache)
- **Responsive** : tous les charts utilisent `maintainAspectRatio: false`

### Ordre d'affichage recommandé pour une démo
1. `rh-dashboard` — vue d'ensemble rapide, KPIs et charts principaux
2. `bi-analytics` — analyse approfondie (skill gap, tendances, heatmap, prédictifs)
3. `rh-reports` — rapports détaillés + export CSV