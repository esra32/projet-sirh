import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { forkJoin, of, catchError } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { EmployeeService } from '../../core/services/employee.service';
import { RecruitmentService } from '../../core/services/recruitment.service';
import { filterActiveEmployees } from '../../core/services/employee-activity';
import { environment } from '../../../environments/environment';

interface KPI {
  label: string;
  value: string | number;
  sub: string;
  icon: string;
  accent: string;   // couleur d'accent (hex)
  trend?: string;   // ex "+8"
}

@Component({
  selector: 'app-rh-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, BaseChartDirective],
  template: `
    <div class="dash">

      <!-- Header -->
      <header class="dash-header">
        <div class="head-left">
          <div class="head-eyebrow">
            <span class="live-dot"></span> Espace RH · Vue temps réel
          </div>
          <h1>Tableau de bord</h1>
          <p class="muted">Pilotage stratégique du capital humain</p>
        </div>
        <div class="head-date">{{ today }}</div>
      </header>

      <!-- KPI Skeletons -->
      <div class="kpi-grid" *ngIf="loading()">
        <div class="kpi-skeleton" *ngFor="let i of [1,2,3,4,5,6]"></div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid" *ngIf="!loading()">
        <div class="kpi-card" *ngFor="let kpi of kpis()">
          <div class="kpi-top">
            <span class="kpi-chip" [style.background]="kpi.accent + '18'" [style.color]="kpi.accent"
                  [innerHTML]="iconHtml(kpi.icon)"></span>
            <span class="kpi-trend" *ngIf="kpi.trend" [style.color]="kpi.accent">{{ kpi.trend }}</span>
          </div>
          <div class="kpi-val">{{ kpi.value }}</div>
          <div class="kpi-label">{{ kpi.label }}</div>
          <div class="kpi-sub">{{ kpi.sub }}</div>
          <div class="kpi-glow" [style.background]="kpi.accent"></div>
        </div>
      </div>

      <!-- Row 1 — Dept + Hire Trend -->
      <div class="chart-row" *ngIf="!loading()">
        <section class="panel">
          <div class="panel-head">
            <h3>Répartition par département</h3>
            <span class="pill">{{ totalDepts }} départements</span>
          </div>
          <div class="chart-container"><canvas baseChart [data]="deptChartData" [options]="pieOptions" [type]="'doughnut'"></canvas></div>
        </section>
      </div>

      <!-- Row 2 — Applications + Contract Mix -->
      <div class="chart-row chart-row-2" *ngIf="!loading()">
        <section class="panel">
          <div class="panel-head">
            <h3>Attractivité des offres</h3>
            <span class="pill">candidatures reçues</span>
          </div>
          <div class="chart-container"><canvas baseChart [data]="appChartData" [options]="barOptions" [type]="'bar'"></canvas></div>
        </section>
        <section class="panel">
          <div class="panel-head"><h3>Mix contractuel</h3></div>
          <div class="mini-bars">
            <div class="mb-row" *ngFor="let ct of contractMix()">
              <span class="mb-name">{{ ct.label }}</span>
              <div class="mb-track"><div class="mb-fill" [style.width.%]="ct.pct" [style.background]="ct.color"></div></div>
              <span class="mb-pct">{{ ct.pct }}%</span>
              <span class="mb-count">{{ ct.count }}</span>
            </div>
          </div>
        </section>
      </div>

      <!-- Row 3 — Pipeline recrutement externe -->
      <div class="chart-row chart-row-full" *ngIf="!loading()">
        <section class="panel">
          <div class="panel-head">
            <h3>Pipeline recrutement externe</h3>
            <span class="pill">candidats via lien public · {{ externalConversion() }}% acceptées</span>
          </div>
          <div class="funnel" *ngIf="(externalFunnel()[0]?.count ?? 0) > 0; else noExternal">
            <div class="funnel-stage" *ngFor="let st of externalFunnel()">
              <div class="fs-head">
                <span class="fs-dot" [style.background]="st.color"></span>
                <span class="fs-label">{{ st.label }}</span>
                <span class="fs-count">{{ st.count }}</span>
              </div>
              <div class="mb-track"><div class="mb-fill" [style.width.%]="st.pct" [style.background]="st.color"></div></div>
            </div>
          </div>
          <ng-template #noExternal>
            <div class="empty-mini">Aucune candidature externe pour l'instant — partagez le lien public d'une offre depuis <b>Matching IA → Recrutement Externe</b> pour alimenter ce pipeline.</div>
          </ng-template>
        </section>
      </div>

      <!-- Row 4 — Top compétences demandées -->
      <div class="chart-row chart-row-full" *ngIf="!loading()">
        <section class="panel">
          <div class="panel-head">
            <h3>Top compétences demandées</h3>
            <span class="pill">tendance recrutement</span>
          </div>
          <div class="skills-grid" *ngIf="topSkills().length > 0; else noSkills">
            <div class="skill-cell" *ngFor="let sk of topSkills(); let i = index">
              <span class="skill-rank" [class.top3]="i < 3">{{ i + 1 }}</span>
              <div class="skill-body">
                <div class="skill-head">
                  <span class="skill-name">{{ sk.label }}</span>
                  <span class="skill-count">{{ sk.count }} {{ sk.count > 1 ? 'offres' : 'offre' }}</span>
                </div>
                <div class="mb-track"><div class="mb-fill skill-fill" [style.width.%]="sk.pct"></div></div>
              </div>
            </div>
          </div>
          <ng-template #noSkills>
            <div class="empty-mini">Aucune compétence demandée — créez des offres avec compétences requises pour alimenter cette analyse.</div>
          </ng-template>
        </section>
      </div>

      <!-- Accès rapides -->
      <div class="quick-row" *ngIf="!loading()">
        <a routerLink="/rh-admin/departements" class="quick-card">
          <span class="qc-ic" [innerHTML]="iconHtml('building')"></span><span class="qc-label">Départements</span>
        </a>
        <a routerLink="/rh-admin/postes" class="quick-card">
          <span class="qc-ic" [innerHTML]="iconHtml('briefcase')"></span><span class="qc-label">Postes</span>
        </a>
        <a routerLink="/rh-admin/contrats" class="quick-card">
          <span class="qc-ic" [innerHTML]="iconHtml('file')"></span><span class="qc-label">Contrats</span>
        </a>
        <a routerLink="/rh-admin/recrutement" class="quick-card">
          <span class="qc-ic" [innerHTML]="iconHtml('target')"></span><span class="qc-label">Recrutement</span>
        </a>
        <a routerLink="/rh-admin/matching" class="quick-card">
          <span class="qc-ic" [innerHTML]="iconHtml('cpu')"></span><span class="qc-label">Matching IA</span>
        </a>
        <a [href]="supersetDashboardUrl" target="_blank" rel="noopener noreferrer" class="quick-card">
          <span class="qc-ic" [innerHTML]="iconHtml('chart')"></span><span class="qc-label">BI Analytics</span>
        </a>
        <a routerLink="/rh-admin/organigramme" class="quick-card">
          <span class="qc-ic" [innerHTML]="iconHtml('sitemap')"></span><span class="qc-label">Organigramme</span>
        </a>
        <a routerLink="/rh-admin/utilisateurs" class="quick-card">
          <span class="qc-ic" [innerHTML]="iconHtml('shield')"></span><span class="qc-label">Utilisateurs</span>
        </a>
      </div>

    </div>
  `,
  styles: [`
    :host { --bg:#0B1120; }
    .dash { animation: fadeUp .45s ease; color:#0F172A; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

    /* ── Header ── */
    .dash-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.9rem; }
    .head-eyebrow { display:inline-flex; align-items:center; gap:.45rem; font-size:.72rem; font-weight:700;
      text-transform:uppercase; letter-spacing:.1em; color:#6366F1; margin-bottom:.55rem; }
    .live-dot { width:7px; height:7px; border-radius:50%; background:#22C55E; box-shadow:0 0 0 3px rgba(34,197,94,.18); animation:pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    h1 { margin:0 0 .25rem; font-size:2rem; font-weight:850; letter-spacing:-.03em;
      background:linear-gradient(120deg,#0F172A,#475569); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
    .muted { color:#94A3B8; margin:0; font-size:.9rem; }
    .head-date { font-size:.8rem; color:#64748B; font-weight:600; background:#F1F5F9; padding:.5rem .9rem; border-radius:10px; text-transform:capitalize; }

    /* ── KPI ── */
    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(186px,1fr)); gap:1rem; margin-bottom:1.5rem; }
    .kpi-skeleton { height:140px; border-radius:18px; background:linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%); background-size:200%; animation:shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200%} 100%{background-position:-200%} }
    .kpi-card { position:relative; overflow:hidden; padding:1.3rem 1.35rem; border-radius:18px;
      background:#fff; border:1px solid #EEF1F6; box-shadow:0 1px 2px rgba(16,24,40,.04);
      transition:transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s; }
    .kpi-card:hover { transform:translateY(-4px); box-shadow:0 18px 40px -12px rgba(16,24,40,.22); }
    .kpi-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    .kpi-chip { width:42px; height:42px; border-radius:13px; display:flex; align-items:center; justify-content:center; }
    .kpi-chip ::ng-deep svg { width:21px; height:21px; }
    .kpi-trend { font-size:.78rem; font-weight:800; }
    .kpi-val { font-size:2rem; font-weight:880; color:#0F172A; line-height:1; letter-spacing:-.02em; }
    .kpi-label { font-size:.7rem; font-weight:750; text-transform:uppercase; letter-spacing:.07em; color:#64748B; margin:.45rem 0 .2rem; }
    .kpi-sub { font-size:.76rem; color:#94A3B8; }
    .kpi-glow { position:absolute; right:-30px; bottom:-30px; width:90px; height:90px; border-radius:50%; opacity:.07; filter:blur(8px); }

    /* ── Panels ── */
    .chart-row { display:grid; grid-template-columns:1fr 1.5fr; gap:1.25rem; margin-bottom:1.25rem; }
    .chart-row-2 { grid-template-columns:1.5fr 1fr; }
    .chart-row-full { grid-template-columns:1fr; }
    .panel { background:#fff; border:1px solid #EEF1F6; border-radius:18px; padding:1.5rem;
      box-shadow:0 1px 2px rgba(16,24,40,.04); }
    .panel-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.4rem; }
    .panel-head h3 { font-weight:780; font-size:.98rem; color:#0F172A; margin:0; letter-spacing:-.01em; }
    .pill { font-size:.72rem; background:#F1F5F9; color:#64748B; padding:.28rem .7rem; border-radius:30px; font-weight:650; }
    .chart-container { position:relative; height:248px; }

    /* ── Mini bars ── */
    .mini-bars { display:flex; flex-direction:column; gap:1rem; padding:.4rem 0; }
    .mb-row { display:flex; align-items:center; gap:.7rem; }
    .mb-name { width:90px; font-size:.82rem; font-weight:650; color:#334155; flex-shrink:0; }
    .mb-track { flex:1; height:9px; background:#F1F5F9; border-radius:30px; overflow:hidden; }
    .mb-fill { height:100%; border-radius:30px; transition:width .7s cubic-bezier(.16,1,.3,1); }
    .mb-pct { font-size:.78rem; color:#64748B; width:38px; text-align:right; flex-shrink:0; }
    .mb-count { font-size:.78rem; font-weight:750; color:#0F172A; width:38px; text-align:right; flex-shrink:0; }

    /* ── Funnel recrutement externe ── */
    .funnel { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:1.1rem 1.6rem; padding:.3rem 0; }
    .funnel-stage { display:flex; flex-direction:column; gap:.55rem; }
    .fs-head { display:flex; align-items:center; gap:.5rem; }
    .fs-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; }
    .fs-label { font-size:.82rem; font-weight:680; color:#334155; flex:1; }
    .fs-count { font-size:1.05rem; font-weight:850; color:#0F172A; }

    /* ── Skills (liste classée) ── */
    .skills-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(290px,1fr)); gap:1rem 1.8rem; }
    .skill-cell { display:flex; align-items:center; gap:.85rem; }
    .skill-rank { flex-shrink:0; width:26px; height:26px; border-radius:9px; display:flex; align-items:center; justify-content:center;
      font-size:.78rem; font-weight:800; color:#94A3B8; background:#F1F5F9; }
    .skill-rank.top3 { color:#fff; background:linear-gradient(135deg,#6366F1,#38BDF8); box-shadow:0 4px 12px -3px rgba(99,102,241,.5); }
    .skill-body { flex:1; display:flex; flex-direction:column; gap:.45rem; min-width:0; }
    .skill-head { display:flex; justify-content:space-between; align-items:baseline; gap:.5rem; }
    .skill-name { font-size:.88rem; font-weight:700; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .skill-count { font-size:.72rem; font-weight:700; color:#64748B; flex-shrink:0; }
    .skill-fill { background:linear-gradient(90deg,#6366F1,#38BDF8); }
    .empty-mini { color:#94A3B8; font-size:.85rem; text-align:center; padding:2.5rem 1rem; line-height:1.6; }

    /* ── Quick access ── */
    .quick-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:.85rem; margin-top:1.25rem; }
    .quick-card { display:flex; align-items:center; gap:.7rem; padding:.95rem 1.1rem; border-radius:14px;
      background:#fff; border:1px solid #EEF1F6; text-decoration:none; font-weight:680; font-size:.86rem; color:#334155;
      box-shadow:0 1px 2px rgba(16,24,40,.04); transition:transform .2s, box-shadow .2s, border-color .2s; }
    .quick-card:hover { transform:translateY(-3px); box-shadow:0 14px 30px -14px rgba(99,102,241,.4); border-color:#C7D2FE; color:#4338CA; }
    .qc-ic { display:flex; color:#6366F1; flex-shrink:0; }
    .qc-ic ::ng-deep svg { width:19px; height:19px; }
    .qc-label { flex:1; }

    @media (max-width:1024px) { .chart-row, .chart-row-2 { grid-template-columns:1fr; } }
    @media (max-width:640px)  { .kpi-grid { grid-template-columns:1fr 1fr; } h1{font-size:1.6rem;} }
  `]
})
export class RhDashboardComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private recruitmentService = inject(RecruitmentService);
  private sanitizer = inject(DomSanitizer);
  supersetDashboardUrl = environment.supersetDashboardUrl;

  loading = signal(true);
  kpis = signal<KPI[]>([]);
  contractMix = signal<{ label: string; count: number; pct: number; color: string }[]>([]);
  topSkills = signal<{ label: string; count: number; pct: number }[]>([]);
  externalFunnel = signal<{ label: string; count: number; pct: number; color: string }[]>([]);
  externalConversion = signal(0);
  totalDepts = 0;
  today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  private readonly DEPT_COLORS = [
    '#6366F1','#38BDF8','#10B981','#F59E0B','#EF4444',
    '#A78BFA','#F472B6','#34D399','#FB923C','#60A5FA','#FBBF24','#4ADE80'
  ];
  private readonly CT_COLORS: Record<string, string> = {
    CDI:'#10b981', CDD:'#3b82f6', STAGE:'#f59e0b', FREELANCE:'#ec4899', ALTERNANCE:'#8b5cf6'
  };

  /** Icônes SVG ligne (style Lucide) — strokeWidth 2, currentColor */
  private readonly ICONS: Record<string, string> = {
    users:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    building:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></svg>`,
    target:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    briefcase: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    clock:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    trending:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
    file:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    cpu:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
    chart:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    sitemap:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-2a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2"/></svg>`,
    shield:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    globe:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  };

  iconHtml(key: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.ICONS[key] ?? '');
  }

  deptChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  appChartData:  ChartData<'bar'> = { labels: [], datasets: [] };

  pieOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true, maintainAspectRatio: false, cutout: '72%',
    plugins: { legend: { position: 'right', labels: { color: '#334155', font: { size: 12 }, boxWidth: 10, usePointStyle: true, pointStyle: 'circle', padding: 12 } } }
  };

  barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148,163,184,0.15)' }, beginAtZero: true },
      x: { ticks: { color: '#94A3B8', maxRotation: 35, font: { size: 11 } }, grid: { display: false } }
    }
  };

  ngOnInit(): void {
    forkJoin({
      employees:    this.employeeService.getEmployees(),
      departments:  this.employeeService.getDepartments(),
      positions:    this.employeeService.getPositions(),
      offers:       this.recruitmentService.getJobOffers(),
      externalApps: this.recruitmentService.getExternalApplications().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ employees: rawEmployees, departments, positions, offers, externalApps }) => {
        const employees = filterActiveEmployees(rawEmployees);
        const openOffers = offers.filter(o => o.status === 'PUBLISHED');
        this.totalDepts = departments.length;

        // ── Dept doughnut ──
        const deptStats = departments
          .map(d => ({ name: d.name, count: employees.filter(e => e.department?.id === d.id).length }))
          .filter(s => s.count > 0)
          .sort((a, b) => b.count - a.count);
        this.deptChartData = {
          labels: deptStats.map(s => s.name),
          datasets: [{
            data: deptStats.map(s => s.count),
            backgroundColor: deptStats.map((_, i) => this.DEPT_COLORS[i % this.DEPT_COLORS.length]),
            borderWidth: 0, hoverOffset: 12
          }]
        };

        // ── Contract mix ──
        const ctMap: Record<string, number> = {};
        employees.forEach(e => { const ct = e.contractType ?? 'N/A'; ctMap[ct] = (ctMap[ct] ?? 0) + 1; });
        const total = employees.length || 1;
        this.contractMix.set(
          Object.entries(ctMap).sort((a, b) => b[1] - a[1])
            .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 100), color: this.CT_COLORS[label] ?? '#64748b' }))
        );

        // ── Ancienneté moy + recrutés 12 mois ──
        const now = Date.now();
        const avgSeniority = employees.length
          ? (employees.reduce((s, e) => s + (now - new Date(e.hireDate).getTime()), 0) / employees.length / (365.25 * 86_400_000)).toFixed(1)
          : '0';
        const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1);
        const newHires = employees.filter(e => new Date(e.hireDate) >= cutoff).length;

        // ── Pipeline recrutement externe ──
        const extTotal = externalApps.length;
        const countBy = (status: string) => externalApps.filter(a => a.status === status).length;
        const extAccepted = countBy('ACCEPTED');
        this.externalConversion.set(extTotal ? Math.round((extAccepted / extTotal) * 100) : 0);
        const funnelDef = [
          { label: 'Reçues',    count: extTotal,                         color: '#6366F1' },
          { label: 'À traiter', count: countBy('PENDING'),              color: '#38BDF8' },
          { label: 'En revue',  count: countBy('REVIEWING'),            color: '#A78BFA' },
          { label: 'Entretien', count: countBy('INTERVIEW_SCHEDULED'),  color: '#F59E0B' },
          { label: 'Acceptées', count: extAccepted,                      color: '#10B981' },
        ];
        const funnelMax = Math.max(1, extTotal);
        this.externalFunnel.set(
          funnelDef.map(f => ({ ...f, pct: Math.round((f.count / funnelMax) * 100) }))
        );

        this.kpis.set([
          { label: 'Effectifs total', value: employees.length, sub: 'Collaborateurs actifs', icon: 'users', accent: '#6366F1' },
          { label: 'Recrutés (12 mois)', value: newHires, sub: 'Nouvelles arrivées', icon: 'trending', accent: '#10B981', trend: newHires ? `+${newHires}` : undefined },
          { label: 'Offres ouvertes', value: openOffers.length, sub: 'Recrutements en cours', icon: 'target', accent: '#F59E0B' },
          { label: 'Candidatures externes', value: extTotal, sub: 'Reçues via lien public', icon: 'globe', accent: '#EC4899', trend: extTotal ? `${this.externalConversion()}% acceptées` : undefined },
          { label: 'Postes définis', value: positions.length, sub: 'Grille métier', icon: 'briefcase', accent: '#A78BFA' },
          { label: 'Départements', value: departments.length, sub: 'Structures actives', icon: 'building', accent: '#38BDF8' },
          { label: 'Ancienneté moy.', value: `${avgSeniority} ans`, sub: 'Fidélité collaborateurs', icon: 'clock', accent: '#14B8A6' },
        ]);

        // ── Top compétences DEMANDÉES (depuis les offres) ──
        const skillMap: Record<string, number> = {};
        offers.forEach(o => (o.requiredSkills ?? []).forEach(s => {
          const name = s.name?.trim();
          if (name) skillMap[name] = (skillMap[name] ?? 0) + 1;
        }));
        const maxSkill = Math.max(1, ...Object.values(skillMap));
        this.topSkills.set(
          Object.entries(skillMap).sort((a, b) => b[1] - a[1]).slice(0, 10)
            .map(([label, count]) => ({ label, count, pct: Math.round((count / maxSkill) * 100) }))
        );

        this.loading.set(false);

        // ── Mise à jour du count actif depuis le DWH (non-bloquant) ──
        this.employeeService.getActiveEmployeeCount().subscribe(count => {
          if (count > 0) {
            this.kpis.update(list => list.map(k =>
              k.label === 'Effectifs total' ? { ...k, value: count } : k
            ));
          }
        });

        // ── Applications bar ──
        if (openOffers.length > 0) {
          forkJoin(openOffers.slice(0, 12).map(o => this.recruitmentService.getApplicationsByOffer(o.id)))
            .subscribe({
              next: (appGroups) => {
                const appStats = openOffers.slice(0, 12).map((o, i) => ({ title: o.title, count: appGroups[i].length }));
                this.appChartData = {
                  labels: appStats.map(s => s.title.length > 24 ? s.title.slice(0, 22) + '…' : s.title),
                  datasets: [{ label: 'Candidatures', data: appStats.map(s => s.count), backgroundColor: '#38BDF8', borderRadius: 6, barThickness: 22 }]
                };
              },
              error: () => {}
            });
        }
      },
      error: () => { this.loading.set(false); }
    });
  }
}
