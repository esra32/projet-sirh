import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Employee } from '../../core/services/employee.models';
import { EmployeeService } from '../../core/services/employee.service';
import { RecruitmentService } from '../../core/services/recruitment.service';
import { filterActiveEmployees } from '../../core/services/employee-activity';
import { JobOffer, Application } from '../../core/services/recruitment.models';

interface SkillGap {
  skillName: string;
  required: number;   // # job offers requiring it
  available: number;  // # employees with it
  gap: number;        // required - available (can be negative)
  coverageRate: number; // 0-100%
}

interface DeptTrend {
  dept: string;
  byYear: Record<number, number>;
}

@Component({
  selector: 'app-bi-analytics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="bi">

      <!-- Header -->
      <div class="bi-header">
        <div>
          <h2>BI Analytics RH</h2>
          <p class="muted">Analytique avancée — compétences, tendances et indicateurs prédictifs</p>
        </div>
        <div class="header-meta" *ngIf="!loading()">
          <span class="badge badge-blue">{{ totalEmployees() }} employés</span>
          <span class="badge badge-purple">{{ totalOffers() }} offres</span>
          <span class="badge badge-green">{{ totalApps() }} candidatures</span>
        </div>
      </div>

      <div *ngIf="loading()" class="loader-wrap">
        <div class="loader-spinner"></div>
        <p>Analyse en cours…</p>
      </div>

      <ng-container *ngIf="!loading()">

        <!-- ── Section 1 — Skill Gap Analysis ── -->
        <div class="section-title">
          <span class="sec-icon">🎯</span>
          Analyse des Écarts de Compétences
          <span class="sec-sub">Compétences requises par les offres vs disponibles en interne</span>
        </div>
        <div class="chart-box">
          <div class="chart-top">
            <h3>Couverture Interne par Compétence Requise</h3>
            <div class="legend-inline">
              <span class="dot" style="background:#10b981"></span> Bonne couverture (&gt;70%)
              <span class="dot ml" style="background:#f59e0b"></span> Partielle (30-70%)
              <span class="dot ml" style="background:#ef4444"></span> Critique (&lt;30%)
            </div>
          </div>
          <div class="skill-gap-list" *ngIf="skillGaps().length > 0">
            <div class="sg-row" *ngFor="let sg of skillGaps()">
              <div class="sg-name" [title]="sg.skillName">{{ sg.skillName }}</div>
              <div class="sg-bars">
                <div class="sg-track">
                  <div class="sg-bar" [style.width.%]="sg.coverageRate"
                       [style.background]="sg.coverageRate >= 70 ? '#10b981' : sg.coverageRate >= 30 ? '#f59e0b' : '#ef4444'">
                  </div>
                </div>
              </div>
              <span class="sg-pct" [style.color]="sg.coverageRate >= 70 ? '#10b981' : sg.coverageRate >= 30 ? '#f59e0b' : '#ef4444'">
                {{ sg.coverageRate }}%
              </span>
              <span class="sg-detail">{{ sg.available }}/{{ sg.required }} offres</span>
            </div>
          </div>
          <div *ngIf="skillGaps().length === 0" class="empty-state">Aucune compétence commune entre offres et employés détectée.</div>
        </div>

        <!-- ── Section 2 — Charts row ── -->
        <div class="section-title">
          <span class="sec-icon">📈</span>
          Tendances & Distributions
        </div>
        <div class="two-col">

          <!-- Score distribution -->
          <div class="chart-box">
            <h3>Distribution des Scores IA (candidatures)</h3>
            <div class="chart-container">
              <canvas baseChart [data]="scoreDistChart" [options]="barOpts" [type]="'bar'"></canvas>
            </div>
          </div>

          <!-- Application funnel -->
          <div class="chart-box">
            <h3>Entonnoir Recrutement</h3>
            <div class="funnel">
              <div class="funnel-step" *ngFor="let step of funnel(); let i = index"
                   [style.width.%]="step.pct" [style.background]="funnelColor(i)">
                <span class="funnel-label">{{ step.label }}</span>
                <span class="funnel-val">{{ step.count }}</span>
              </div>
            </div>
            <div class="funnel-legend">
              <div class="fl-row" *ngFor="let step of funnel(); let i = index">
                <span class="fl-dot" [style.background]="funnelColor(i)"></span>
                <span class="fl-name">{{ step.label }}</span>
                <span class="fl-n">{{ step.count }}</span>
                <span class="fl-pct">({{ step.pct }}%)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Section 3 — Dept headcount trend ── -->
        <div class="section-title">
          <span class="sec-icon">🏢</span>
          Évolution des Effectifs par Département (Embauches cumulées)
        </div>
        <div class="chart-box">
          <div class="chart-container-lg">
            <canvas baseChart [data]="deptTrendChart" [options]="lineOpts" [type]="'line'"></canvas>
          </div>
        </div>

        <!-- ── Section 4 — Level heatmap ── -->
        <div class="section-title">
          <span class="sec-icon">🔥</span>
          Heatmap Niveaux de Compétences par Département
        </div>
        <div class="chart-box">
          <div class="heatmap-scroll">
            <table class="heatmap">
              <thead>
                <tr>
                  <th class="hm-dept-h">Département</th>
                  <th *ngFor="let lv of levels">{{ lv }}</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of heatmapRows()">
                  <td class="hm-dept">{{ row.dept }}</td>
                  <td *ngFor="let lv of levels" class="hm-cell"
                      [style.background]="heatColor(row.counts[lv] ?? 0, row.maxCount)">
                    {{ row.counts[lv] ?? 0 }}
                  </td>
                  <td class="hm-total">{{ row.total }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="hm-legend">
            <span>Faible</span>
            <div class="hm-gradient"></div>
            <span>Élevé</span>
          </div>
        </div>

        <!-- ── Section 5 — Predictive indicators ── -->
        <div class="section-title">
          <span class="sec-icon">🔮</span>
          Indicateurs Prédictifs
        </div>
        <div class="pred-grid">
          <div class="pred-card" *ngFor="let p of predictors()">
            <div class="pred-header">
              <span class="pred-icon">{{ p.icon }}</span>
              <span class="pred-title">{{ p.title }}</span>
            </div>
            <div class="pred-val" [style.color]="p.color">{{ p.value }}</div>
            <p class="pred-desc">{{ p.desc }}</p>
            <div class="pred-bar-track">
              <div class="pred-bar" [style.width.%]="p.barPct" [style.background]="p.color"></div>
            </div>
          </div>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    .bi { animation:fadeUp .4s ease; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

    .bi-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.75rem; flex-wrap:wrap; gap:1rem; }
    h2 { margin:0 0 .3rem; font-size:1.75rem; font-weight:800; color:#0F172A; letter-spacing:-.02em; }
    .muted { color:#94A3B8; margin:0; font-size:.875rem; }
    .header-meta { display:flex; gap:.5rem; flex-wrap:wrap; }
    .badge { font-size:.78rem; font-weight:700; padding:.3rem .75rem; border-radius:20px; }
    .badge-blue { background:#DBEAFE; color:#1D4ED8; }
    .badge-purple { background:#EDE9FE; color:#6D28D9; }
    .badge-green { background:#DCFCE7; color:#15803D; }

    /* Loader */
    .loader-wrap { display:flex; flex-direction:column; align-items:center; padding:3rem; color:#94A3B8; }
    .loader-spinner { width:36px; height:36px; border:3px solid #E5E7EB; border-top-color:#38BDF8; border-radius:50%; animation:spin .8s linear infinite; margin-bottom:.75rem; }
    @keyframes spin { to{transform:rotate(360deg)} }

    /* Section titles */
    .section-title {
      display:flex; align-items:center; gap:.5rem; font-size:.95rem; font-weight:800; color:#1e293b;
      margin:1.75rem 0 .85rem; padding-bottom:.5rem; border-bottom:2px solid #F1F5F9;
    }
    .sec-icon { font-size:1.1rem; }
    .sec-sub { font-size:.78rem; color:#94A3B8; font-weight:400; margin-left:.25rem; }

    /* Chart boxes */
    .chart-box { background:#fff; border:1px solid #E5E7EB; border-radius:16px; padding:1.5rem; box-shadow:0 1px 6px rgba(0,0,0,.05); margin-bottom:1.25rem; }
    .chart-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:.5rem; }
    .chart-box h3 { margin:0 0 1.1rem; font-size:.9rem; color:#1e293b; font-weight:700; }
    .chart-container { position:relative; height:220px; }
    .chart-container-lg { position:relative; height:280px; }

    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; margin-bottom:1.25rem; }

    /* Legend inline */
    .legend-inline { display:flex; align-items:center; gap:.4rem; font-size:.75rem; color:#64748B; flex-wrap:wrap; }
    .dot { display:inline-block; width:10px; height:10px; border-radius:50%; }
    .ml { margin-left:.5rem; }

    /* Skill gap list */
    .skill-gap-list { display:flex; flex-direction:column; gap:.65rem; max-height:380px; overflow-y:auto; }
    .sg-row { display:flex; align-items:center; gap:.65rem; }
    .sg-name { width:160px; font-size:.8rem; color:#1e293b; flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:600; }
    .sg-bars { flex:1; }
    .sg-track { height:9px; background:#F1F5F9; border-radius:999px; overflow:hidden; }
    .sg-bar { height:100%; border-radius:999px; transition:width .5s ease; }
    .sg-pct { font-size:.78rem; font-weight:700; width:40px; text-align:right; flex-shrink:0; }
    .sg-detail { font-size:.72rem; color:#94A3B8; width:80px; text-align:right; flex-shrink:0; }
    .empty-state { color:#94A3B8; font-size:.875rem; text-align:center; padding:2rem; }

    /* Funnel */
    .funnel { display:flex; flex-direction:column; align-items:center; gap:.4rem; padding:.5rem 0; }
    .funnel-step { display:flex; justify-content:space-between; align-items:center; padding:.55rem 1rem; border-radius:8px; color:#fff; font-size:.82rem; font-weight:700; min-width:60%; transition:width .5s ease; }
    .funnel-label { flex:1; }
    .funnel-val { font-size:1rem; }
    .funnel-legend { display:flex; flex-direction:column; gap:.3rem; margin-top:.85rem; }
    .fl-row { display:flex; align-items:center; gap:.5rem; font-size:.78rem; }
    .fl-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
    .fl-name { flex:1; color:#374151; }
    .fl-n { font-weight:700; color:#1e293b; }
    .fl-pct { color:#94A3B8; }

    /* Heatmap */
    .heatmap-scroll { overflow-x:auto; }
    .heatmap { border-collapse:collapse; width:100%; font-size:.78rem; }
    .heatmap th { padding:.5rem .75rem; background:#F8FAFC; color:#64748B; font-weight:700; text-align:center; border:1px solid #E5E7EB; white-space:nowrap; }
    .hm-dept-h { text-align:left; }
    .hm-dept { padding:.45rem .75rem; font-weight:600; color:#1e293b; border:1px solid #E5E7EB; white-space:nowrap; }
    .hm-cell { padding:.45rem .75rem; text-align:center; border:1px solid #E5E7EB; font-weight:700; transition:background .3s; }
    .hm-total { padding:.45rem .75rem; text-align:center; border:1px solid #E5E7EB; font-weight:800; color:#1e293b; background:#F8FAFC; }
    .hm-legend { display:flex; align-items:center; gap:.5rem; margin-top:.75rem; font-size:.75rem; color:#64748B; }
    .hm-gradient { flex:1; max-width:180px; height:10px; border-radius:999px; background:linear-gradient(90deg,#EFF6FF,#3B82F6); }

    /* Predictors */
    .pred-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:1rem; }
    .pred-card { background:#fff; border:1px solid #E5E7EB; border-radius:14px; padding:1.25rem; box-shadow:0 1px 4px rgba(0,0,0,.05); }
    .pred-header { display:flex; align-items:center; gap:.5rem; margin-bottom:.5rem; }
    .pred-icon { font-size:1.3rem; }
    .pred-title { font-size:.8rem; font-weight:700; color:#64748B; text-transform:uppercase; letter-spacing:.05em; }
    .pred-val { font-size:1.9rem; font-weight:900; margin:.35rem 0 .25rem; line-height:1; }
    .pred-desc { font-size:.75rem; color:#94A3B8; margin:0 0 .75rem; }
    .pred-bar-track { height:6px; background:#F1F5F9; border-radius:999px; overflow:hidden; }
    .pred-bar { height:100%; border-radius:999px; transition:width .6s ease; }

    @media (max-width:768px) { .two-col { grid-template-columns:1fr; } }
  `]
})
export class BiAnalyticsComponent implements OnInit {
  private employeeService    = inject(EmployeeService);
  private recruitmentService = inject(RecruitmentService);

  loading        = signal(true);
  totalEmployees = signal(0);
  totalOffers    = signal(0);
  totalApps      = signal(0);
  skillGaps      = signal<SkillGap[]>([]);
  funnel         = signal<{ label: string; count: number; pct: number }[]>([]);
  heatmapRows    = signal<{ dept: string; counts: Record<string, number>; total: number; maxCount: number }[]>([]);
  predictors     = signal<{ icon: string; title: string; value: string; desc: string; color: string; barPct: number }[]>([]);

  readonly levels = ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'EXPERT'];

  private readonly FUNNEL_COLORS = ['#38BDF8','#818CF8','#F59E0B','#10B981','#EF4444'];

  scoreDistChart: ChartData<'bar'> = { labels: [], datasets: [] };
  deptTrendChart: ChartData<'line'> = { labels: [], datasets: [] };

  barOpts: ChartConfiguration<'bar'>['options'] = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { ticks: { color: '#475569' }, grid: { color: 'rgba(148,163,184,.2)' } },
      x: { ticks: { color: '#475569' }, grid: { display: false } }
    }
  };

  lineOpts: ChartConfiguration<'line'>['options'] = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'right', labels: { color: '#334155', font: { size: 11 }, boxWidth: 12, padding: 8 } } },
    scales: {
      y: { ticks: { color: '#475569' }, grid: { color: 'rgba(148,163,184,.2)' } },
      x: { ticks: { color: '#475569' }, grid: { display: false } }
    },
    elements: { line: { tension: 0.4 }, point: { radius: 2 } }
  };

  funnelColor(i: number): string { return this.FUNNEL_COLORS[i % this.FUNNEL_COLORS.length]; }

  heatColor(val: number, max: number): string {
    if (!max || !val) return '#F8FAFC';
    const pct = val / max;
    const r = Math.round(59 + (255 - 59) * (1 - pct));
    const g = Math.round(130 + (248 - 130) * (1 - pct));
    const b = Math.round(246 + (246 - 246) * (1 - pct));
    // Blue gradient: light → deep blue
    const lightness = Math.round(95 - pct * 45);
    return `hsl(210,80%,${lightness}%)`;
  }

  ngOnInit(): void {
    forkJoin({
      employees:   this.employeeService.getEmployees().pipe(catchError(() => of([] as Employee[]))),
      departments: this.employeeService.getDepartments().pipe(catchError(() => of([]))),
      offers:      this.recruitmentService.getJobOffers().pipe(catchError(() => of([] as JobOffer[]))),
      apps:        this.recruitmentService.getApplications().pipe(catchError(() => of([] as Application[])))
    }).subscribe({
      next: ({ employees, departments, offers, apps }) => {
        const activeEmployees = filterActiveEmployees(employees);
        this.totalEmployees.set(activeEmployees.length);
        this.totalOffers.set(offers.length);
        this.totalApps.set(apps.length);

        // ── Skill gap analysis ─────────────────────────────────────
        const employeeSkillMap: Record<string, number> = {};
        activeEmployees.forEach(e => (e.skills ?? []).forEach(sk => {
          const n = sk.skillName?.toLowerCase().trim();
          if (n) employeeSkillMap[n] = (employeeSkillMap[n] ?? 0) + 1;
        }));

        const offerSkillReq: Record<string, number> = {};
        offers.filter(o => o.status === 'PUBLISHED').forEach(o => {
          (o.requiredSkills ?? []).forEach(sk => {
            const n = sk.name?.toLowerCase().trim();
            if (n) offerSkillReq[n] = (offerSkillReq[n] ?? 0) + 1;
          });
        });

        const maxReq = Math.max(...Object.values(offerSkillReq), 1);
        const gaps: SkillGap[] = Object.entries(offerSkillReq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([skillName, required]) => {
            const available = employeeSkillMap[skillName] ?? 0;
            const coverageRate = Math.min(100, Math.round((available / required) * 100));
            return { skillName: skillName.charAt(0).toUpperCase() + skillName.slice(1), required, available, gap: required - available, coverageRate };
          })
          .sort((a, b) => a.coverageRate - b.coverageRate);
        this.skillGaps.set(gaps);

        // ── Score distribution ─────────────────────────────────────
        const scoreBuckets = [0,10,20,30,40,50,60,70,80,90,100];
        const bucketLabels = scoreBuckets.slice(0, -1).map((v, i) => `${v}–${scoreBuckets[i+1]}`);
        const bucketCounts = new Array(scoreBuckets.length - 1).fill(0);
        apps.forEach(a => {
          const idx = Math.min(Math.floor((a.matchScore ?? 0) / 10), 9);
          bucketCounts[idx]++;
        });
        this.scoreDistChart = {
          labels: bucketLabels,
          datasets: [{
            label: 'Candidatures',
            data: bucketCounts,
            backgroundColor: bucketLabels.map((_, i) => `hsl(${200 + i * 14},70%,56%)`),
            borderRadius: 6
          }]
        };

        // ── Funnel ─────────────────────────────────────────────────
        const totalA = apps.length || 1;
        const statusOrder: { label: string; status: string }[] = [
          { label: 'Candidatures reçues', status: '' },
          { label: 'En revue',            status: 'REVIEWING' },
          { label: 'Entretien prévu',     status: 'INTERVIEW_SCHEDULED' },
          { label: 'Acceptées',           status: 'ACCEPTED' },
          { label: 'Refusées',            status: 'REJECTED' },
        ];
        const funnelData = statusOrder.map((s, i) => {
          const count = i === 0 ? apps.length : apps.filter(a => a.status === s.status).length;
          return { label: s.label, count, pct: Math.max(20, Math.round((count / totalA) * 100)) };
        });
        this.funnel.set(funnelData);

        // ── Dept headcount trend (line chart by year) ──────────────
        const allYears = [...new Set(employees
          .filter(e => e.hireDate)
          .map(e => new Date(e.hireDate).getFullYear())
        )].sort();

        const DEPT_COLORS_LINE = ['#38BDF8','#818CF8','#10B981','#F59E0B','#EF4444','#A78BFA','#F472B6','#34D399','#FB923C','#60A5FA'];

        const depts = departments.slice(0, 8); // max 8 for readability
        const datasets = depts.map((d, di) => {
          let cumul = 0;
          const data = allYears.map(yr => {
            cumul += activeEmployees.filter(e => e.department?.id === d.id && new Date(e.hireDate).getFullYear() === yr).length;
            return cumul;
          });
          return {
            label: d.name,
            data,
            borderColor: DEPT_COLORS_LINE[di % DEPT_COLORS_LINE.length],
            backgroundColor: 'transparent',
            borderWidth: 2,
            fill: false
          };
        });
        this.deptTrendChart = { labels: allYears.map(String), datasets };

        // ── Heatmap: dept × skill level ────────────────────────────
        const heatRows = departments.slice(0, 10).map(d => {
          const deptEmps = activeEmployees.filter(e => e.department?.id === d.id);
          const counts: Record<string, number> = {};
          let total = 0;
          deptEmps.forEach(e => (e.skills ?? []).forEach(sk => {
            counts[sk.level] = (counts[sk.level] ?? 0) + 1;
            total++;
          }));
          const maxCount = Math.max(...Object.values(counts), 1);
          return { dept: d.name, counts, total, maxCount };
        }).filter(r => r.total > 0);
        this.heatmapRows.set(heatRows);

        // ── Predictive indicators ──────────────────────────────────
        const now = Date.now();
        const avgSen = activeEmployees.length
          ? activeEmployees.reduce((s, e) => s + (now - new Date(e.hireDate).getTime()), 0) / activeEmployees.length / (365.25 * 86_400_000)
          : 0;
        const seniorCount = activeEmployees.filter(e => {
          const yrs = (now - new Date(e.hireDate).getTime()) / (365.25 * 86_400_000);
          return yrs > 10;
        }).length;
        const attritionRisk = Math.round((seniorCount / (activeEmployees.length || 1)) * 100);

        const acceptanceRate = apps.length ? Math.round((apps.filter(a => a.status === 'ACCEPTED').length / apps.length) * 100) : 0;
        const avgScore = apps.length ? Math.round(apps.reduce((s, a) => s + (a.matchScore ?? 0), 0) / apps.length) : 0;

        const openOffers = offers.filter(o => o.status === 'PUBLISHED').length;
        const openPressure = Math.min(100, Math.round((openOffers / Math.max(departments.length, 1)) * 20));

        this.predictors.set([
          {
            icon: '⚡', title: 'Score IA Moyen',
            value: `${avgScore}/100`,
            desc: 'Qualité moyenne des correspondances entre candidats et offres',
            color: avgScore >= 60 ? '#10b981' : avgScore >= 40 ? '#f59e0b' : '#ef4444',
            barPct: avgScore
          },
          {
            icon: '✅', title: 'Taux d\'Acceptation',
            value: `${acceptanceRate}%`,
            desc: 'Part des candidatures ayant abouti à une embauche',
            color: acceptanceRate >= 20 ? '#10b981' : '#f59e0b',
            barPct: acceptanceRate
          },
          {
            icon: '⚠️', title: 'Risque Attrition',
            value: `${attritionRisk}%`,
            desc: `${seniorCount} employés avec +10 ans d'ancienneté — population à fidéliser`,
            color: attritionRisk >= 30 ? '#ef4444' : attritionRisk >= 15 ? '#f59e0b' : '#10b981',
            barPct: attritionRisk
          },
          {
            icon: '🔄', title: 'Pression Recrutement',
            value: `${openOffers} offres`,
            desc: `${openPressure}% de pression relative / nb de départements`,
            color: openPressure >= 50 ? '#ef4444' : openPressure >= 30 ? '#f59e0b' : '#10b981',
            barPct: openPressure
          },
          {
            icon: '🎓', title: 'Ancienneté Moy.',
            value: `${avgSen.toFixed(1)} ans`,
            desc: 'Stabilité et expérience accumulée dans l\'organisation',
            color: '#818CF8',
            barPct: Math.min(100, Math.round((avgSen / 12) * 100))
          },
          {
            icon: '📊', title: 'Couverture Compétences',
            value: `${this.skillGaps().filter(g => g.coverageRate >= 70).length}/${this.skillGaps().length}`,
            desc: 'Compétences requises bien couvertes en interne (≥70%)',
            color: '#38BDF8',
            barPct: this.skillGaps().length
              ? Math.round((this.skillGaps().filter(g => g.coverageRate >= 70).length / this.skillGaps().length) * 100)
              : 0
          }
        ]);

        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }
}