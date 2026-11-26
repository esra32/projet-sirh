import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Department, Employee } from '../../core/services/employee.models';
import { EmployeeService } from '../../core/services/employee.service';
import { RecruitmentService } from '../../core/services/recruitment.service';

interface DeptStat {
  name: string;
  count: number;
  pct: number;
  color: string;
}

interface SeniorityBand {
  label: string;
  count: number;
  pct: number;
  color: string;
}

interface SkillStat {
  name: string;
  count: number;
  pct: number;
}

@Component({
  selector: 'app-rh-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel">
      <div class="header-row">
        <div>
          <h2>Rapports RH</h2>
          <p class="muted">Analyse approfondie des effectifs, compétences et tendances organisationnelles.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline" (click)="reload()">Actualiser</button>
          <button class="btn btn-export" (click)="exportCSV()" [disabled]="loading()">⬇ Export CSV</button>
        </div>
      </div>

      <div *ngIf="loading()" class="loader">Chargement des données...</div>
      <div *ngIf="error()" class="error-alert">{{ error() }}</div>

      <ng-container *ngIf="!loading()">

        <!-- KPI Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <h4>Effectifs Globaux</h4>
            <div class="value text-primary">{{ totalEmployees() }}</div>
            <p class="trend">Employés actifs dans la base</p>
          </div>
          <div class="stat-card">
            <h4>Départements Actifs</h4>
            <div class="value text-success">{{ deptStats().length }}</div>
            <p class="trend">Structures organisationnelles</p>
          </div>
          <div class="stat-card">
            <h4>Nouvelles Recrues (12 mois)</h4>
            <div class="value text-warning">{{ newHiresCount() }}</div>
            <p class="trend">{{ growthRate() }}% de l'équipe totale</p>
          </div>
          <div class="stat-card">
            <h4>Ancienneté Moyenne</h4>
            <div class="value text-info">{{ avgSeniority() }} ans</div>
            <p class="trend">Fidélité moyenne collaborateur</p>
          </div>
          <div class="stat-card">
            <h4>Durée Moy. Offre (jours)</h4>
            <div class="value text-danger">{{ avgOfferDays() || '—' }}</div>
            <p class="trend">Entre publication et échéance</p>
          </div>
          <div class="stat-card">
            <h4>Taux CDI</h4>
            <div class="value text-success">{{ cdiRate() }}%</div>
            <p class="trend">Part des contrats permanents</p>
          </div>
        </div>

        <!-- Row 1 — Dept bars + Contract grid -->
        <div class="charts-container mt-4">
          <div class="chart-box">
            <h3>Répartition des Effectifs par Département</h3>
            <div *ngIf="deptStats().length === 0" class="muted text-center py-4">Aucune donnée disponible.</div>
            <div class="bars">
              <div class="bar-container" *ngFor="let ds of deptStats()">
                <div class="label" [title]="ds.name">{{ ds.name }}</div>
                <div class="bar-track">
                  <div class="bar" [style.width.%]="ds.pct" [style.background]="ds.color"></div>
                </div>
                <span class="count-pct">{{ ds.count }} <span class="dim">({{ ds.pct }}%)</span></span>
              </div>
            </div>
          </div>

          <div class="chart-box">
            <h3>Répartition par Type de Contrat</h3>
            <div class="contract-grid">
              <div class="contract-card" *ngFor="let ct of contractStats()">
                <div class="ct-value" [style.color]="ct.color">{{ ct.count }}</div>
                <div class="ct-label">{{ ct.type }}</div>
                <div class="ct-pct">{{ ct.pct }}%</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 2 — Seniority pyramid + Top skills -->
        <div class="charts-container mt-4">
          <div class="chart-box">
            <h3>Pyramide des Anciennetés</h3>
            <div class="bars">
              <div class="bar-container" *ngFor="let band of seniorityBands()">
                <div class="label label-sm">{{ band.label }}</div>
                <div class="bar-track">
                  <div class="bar" [style.width.%]="band.pct" [style.background]="band.color"></div>
                </div>
                <span class="count-pct">{{ band.count }} <span class="dim">({{ band.pct }}%)</span></span>
              </div>
            </div>
            <div class="seniority-legend mt-3">
              <div class="legend-item" *ngFor="let band of seniorityBands()">
                <span class="dot" [style.background]="band.color"></span>
                {{ band.label }} — {{ band.count }} pers.
              </div>
            </div>
          </div>

          <div class="chart-box">
            <h3>Top 15 Compétences de l'Entreprise</h3>
            <div *ngIf="topSkills().length === 0" class="muted text-center py-4">Aucune compétence enregistrée.</div>
            <div class="skill-bars">
              <div class="skill-row" *ngFor="let sk of topSkills(); let i = index">
                <span class="skill-rank">#{{ i + 1 }}</span>
                <span class="skill-name">{{ sk.name }}</span>
                <div class="skill-track">
                  <div class="skill-bar" [style.width.%]="sk.pct"
                       [style.background]="'hsl(' + (200 + i * 12) + ',75%,52%)'"></div>
                </div>
                <span class="skill-count">{{ sk.count }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Row 3 — Hire trend by year -->
        <div class="chart-box mt-4">
          <h3>Évolution des Embauches par Année</h3>
          <div class="hire-trend">
            <div class="ht-col" *ngFor="let y of hireTrend()">
              <div class="ht-bar-wrap">
                <span class="ht-count">{{ y.count }}</span>
                <div class="ht-bar" [style.height.%]="y.relPct"
                     [title]="y.year + ' : ' + y.count + ' embauches'"></div>
              </div>
              <div class="ht-year">{{ y.year }}</div>
            </div>
          </div>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    .panel { background:#fff; border:1px solid #E5E7EB; border-radius:16px; padding:1.5rem; box-shadow:0 2px 8px rgba(0,0,0,.06); }
    .header-row { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; }
    h2 { margin:0 0 .25rem; color:#1e293b; }
    .muted { color:#9CA3AF; margin:0; font-size:.875rem; }
    .mt-4 { margin-top:1.5rem; }
    .text-center { text-align:center; }
    .py-4 { padding:1.5rem 0; }
    .loader { margin:2rem 0; color:#9CA3AF; font-style:italic; }
    .error-alert { background:rgba(255,107,107,.08); border-left:4px solid #FF6B6B; padding:.75rem 1rem; color:#B91C1C; margin-bottom:1rem; border-radius:8px; font-weight:500; }

    .header-actions { display:flex; gap:.75rem; align-items:center; }
    .btn { padding:.5rem 1rem; border-radius:8px; cursor:pointer; font-weight:600; transition:all .2s; border:none; }
    .btn-outline { border:1.5px solid #4DA3FF; color:#4DA3FF; background:transparent; }
    .btn-outline:hover { background:rgba(77,163,255,.08); }
    .btn-export { background:linear-gradient(135deg,#22C55E,#16A34A); color:#fff; box-shadow:0 2px 8px rgba(34,197,94,.3); }
    .btn-export:hover:not(:disabled) { opacity:.9; transform:translateY(-1px); }
    .btn-export:disabled { background:#BBF7D0; color:#6B7280; cursor:not-allowed; box-shadow:none; }

    /* KPI grid */
    .stats-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:1rem; }
    .stat-card { background:#fff; border:1px solid #E5E7EB; border-radius:12px; padding:1.25rem; box-shadow:0 1px 4px rgba(0,0,0,.05); }
    .stat-card h4 { margin:0 0 .4rem; font-size:.75rem; color:#9CA3AF; text-transform:uppercase; letter-spacing:.06em; font-weight:600; }
    .value { font-size:1.8rem; font-weight:800; margin-bottom:.35rem; line-height:1; }
    .text-primary { color:#4DA3FF; }
    .text-success { color:#22C55E; }
    .text-warning { color:#FFD166; }
    .text-danger  { color:#FF6B6B; }
    .text-info    { color:#818CF8; }
    .trend { margin:0; font-size:.75rem; color:#9CA3AF; }

    /* Chart boxes */
    .charts-container { display:grid; grid-template-columns:repeat(auto-fit,minmax(350px,1fr)); gap:1.5rem; }
    .chart-box { background:#fff; border:1px solid #E5E7EB; border-radius:12px; padding:1.5rem; box-shadow:0 1px 4px rgba(0,0,0,.05); }
    .chart-box h3 { margin:0 0 1.25rem; font-size:.92rem; color:#1e293b; font-weight:700; border-bottom:1px solid #F1F5F9; padding-bottom:.75rem; }

    /* Dept bars */
    .bars { display:flex; flex-direction:column; gap:.75rem; }
    .bar-container { display:flex; align-items:center; gap:.65rem; }
    .label { width:130px; font-size:.8rem; color:#374151; text-align:right; flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .label-sm { width:110px; }
    .bar-track { flex:1; height:10px; background:#F1F5F9; border-radius:999px; overflow:hidden; }
    .bar { height:100%; border-radius:999px; transition:width .5s ease; }
    .count-pct { font-size:.78rem; font-weight:700; color:#374151; white-space:nowrap; }
    .dim { color:#94A3B8; font-weight:400; }

    /* Contract grid */
    .contract-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(90px,1fr)); gap:.85rem; }
    .contract-card { background:#F8FAFC; border:1px solid #E5E7EB; border-radius:10px; padding:.9rem; text-align:center; }
    .ct-value { font-size:1.5rem; font-weight:800; }
    .ct-label { font-size:.72rem; color:#9CA3AF; margin:.2rem 0; text-transform:uppercase; letter-spacing:.05em; }
    .ct-pct   { font-size:.78rem; color:#9CA3AF; }

    /* Seniority legend */
    .seniority-legend { display:flex; flex-wrap:wrap; gap:.5rem .85rem; }
    .legend-item { display:flex; align-items:center; gap:.35rem; font-size:.78rem; color:#64748B; }
    .dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }

    /* Top skills */
    .skill-bars { display:flex; flex-direction:column; gap:.6rem; }
    .skill-row { display:flex; align-items:center; gap:.55rem; }
    .skill-rank { font-size:.72rem; color:#94A3B8; width:22px; text-align:right; flex-shrink:0; }
    .skill-name { font-size:.8rem; color:#1e293b; width:130px; flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .skill-track { flex:1; height:8px; background:#F1F5F9; border-radius:999px; overflow:hidden; }
    .skill-bar { height:100%; border-radius:999px; transition:width .5s ease; }
    .skill-count { font-size:.78rem; font-weight:700; color:#1e293b; width:36px; text-align:right; flex-shrink:0; }

    /* Hire trend histogram */
    .hire-trend { display:flex; align-items:flex-end; gap:.5rem; height:180px; padding:1rem 0 0; overflow-x:auto; }
    .ht-col { display:flex; flex-direction:column; align-items:center; min-width:44px; flex:1; height:100%; }
    .ht-bar-wrap { flex:1; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; width:100%; }
    .ht-count { font-size:.68rem; font-weight:700; color:#64748B; margin-bottom:3px; }
    .ht-bar { width:70%; background:linear-gradient(180deg,#38BDF8,#0EA5E9); border-radius:4px 4px 0 0; transition:height .5s ease; min-height:2px; }
    .ht-year { font-size:.7rem; color:#94A3B8; margin-top:.35rem; font-weight:600; }

    @media (max-width:768px) { .charts-container { grid-template-columns:1fr; } }
  `]
})
export class RhReportsComponent implements OnInit {
  private employeeService    = inject(EmployeeService);
  private recruitmentService = inject(RecruitmentService);

  loading = signal(true);
  error = signal('');
  totalEmployees = signal(0);
  newHiresCount  = signal(0);
  growthRate     = signal('0.0');
  avgSeniority   = signal('0.0');
  cdiRate        = signal('0');
  avgOfferDays   = signal(0);
  deptStats      = signal<DeptStat[]>([]);
  contractStats  = signal<{ type: string; count: number; pct: number; color: string }[]>([]);
  seniorityBands = signal<SeniorityBand[]>([]);
  topSkills      = signal<SkillStat[]>([]);
  hireTrend      = signal<{ year: number; count: number; relPct: number }[]>([]);

  private allEmployees: Employee[] = [];

  private readonly colors = ['#3b82f6','#10b981','#f59e0b','#ec4899','#8b5cf6','#06b6d4','#f97316','#14b8a6','#a855f7','#ef4444'];
  private readonly contractColors: Record<string, string> = {
    CDI: '#10b981', CDD: '#3b82f6', STAGE: '#f59e0b', FREELANCE: '#ec4899', ALTERNANCE: '#8b5cf6'
  };
  private readonly SENIORITY_COLORS = ['#FDE68A','#FCD34D','#10B981','#3B82F6','#7C3AED'];

  ngOnInit(): void { this.reload(); }

  exportCSV(): void {
    const header = ['Nom','Prénom','Email','Département','Poste','Contrat','Date embauche'];
    const rows = this.allEmployees.map(e => [
      e.lastName ?? '', e.firstName ?? '', e.email ?? '',
      e.department?.name ?? '', e.position?.title ?? '',
      e.contractType ?? '',
      e.hireDate ? new Date(e.hireDate).toLocaleDateString('fr-FR') : ''
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `rapport-rh-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      employees:   this.employeeService.getEmployees().pipe(catchError(() => of([] as Employee[]))),
      departments: this.employeeService.getDepartments().pipe(catchError(() => of([] as Department[]))),
      offers:      this.recruitmentService.getJobOffers().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ employees, departments, offers }) => {
        this.allEmployees = employees;
        this.totalEmployees.set(employees.length);
        const total = employees.length || 1;
        const now   = Date.now();

        // ── New hires / growth rate ────────────────────────────────
        const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1);
        const newHires = employees.filter(e => new Date(e.hireDate) >= cutoff).length;
        this.newHiresCount.set(newHires);
        this.growthRate.set(((newHires / total) * 100).toFixed(1));

        // ── Avg seniority ──────────────────────────────────────────
        const senSum = employees.reduce((s, e) => s + (now - new Date(e.hireDate).getTime()), 0);
        this.avgSeniority.set((senSum / total / (365.25 * 86_400_000)).toFixed(1));

        // ── CDI rate ───────────────────────────────────────────────
        const cdiCount = employees.filter(e => e.contractType === 'CDI').length;
        this.cdiRate.set(Math.round((cdiCount / total) * 100).toString());

        // ── Avg offer duration ─────────────────────────────────────
        const timed = offers.filter(o => o.publishedDate && o.deadlineDate);
        if (timed.length > 0) {
          const totalDays = timed.reduce((sum, o) => {
            const diff = new Date(o.deadlineDate!).getTime() - new Date(o.publishedDate!).getTime();
            return sum + Math.max(0, Math.floor(diff / 86_400_000));
          }, 0);
          this.avgOfferDays.set(Math.round(totalDays / timed.length));
        }

        // ── Dept stats ─────────────────────────────────────────────
        const stats: DeptStat[] = departments.map((d, i) => {
          const count = employees.filter(e => e.department?.id === d.id).length;
          return { name: d.name, count, pct: Math.round((count / total) * 100), color: this.colors[i % this.colors.length] };
        }).filter(s => s.count > 0).sort((a, b) => b.count - a.count);
        this.deptStats.set(stats);

        // ── Contract stats ─────────────────────────────────────────
        const ctMap: Record<string, number> = {};
        employees.forEach(e => { const ct = e.contractType ?? 'N/A'; ctMap[ct] = (ctMap[ct] ?? 0) + 1; });
        this.contractStats.set(
          Object.entries(ctMap)
            .map(([type, count]) => ({ type, count, pct: Math.round((count / total) * 100), color: this.contractColors[type] ?? '#64748b' }))
            .sort((a, b) => b.count - a.count)
        );

        // ── Seniority pyramid ──────────────────────────────────────
        const bands = [
          { label: '< 1 an',    min: 0,  max: 1,   color: this.SENIORITY_COLORS[0] },
          { label: '1 – 3 ans', min: 1,  max: 3,   color: this.SENIORITY_COLORS[1] },
          { label: '3 – 5 ans', min: 3,  max: 5,   color: this.SENIORITY_COLORS[2] },
          { label: '5 – 10 ans',min: 5,  max: 10,  color: this.SENIORITY_COLORS[3] },
          { label: '> 10 ans',  min: 10, max: 9999, color: this.SENIORITY_COLORS[4] },
        ];
        const senBands: SeniorityBand[] = bands.map(b => {
          const count = employees.filter(e => {
            const yrs = (now - new Date(e.hireDate).getTime()) / (365.25 * 86_400_000);
            return yrs >= b.min && yrs < b.max;
          }).length;
          return { label: b.label, count, pct: Math.round((count / total) * 100), color: b.color };
        });
        this.seniorityBands.set(senBands);

        // ── Top skills ─────────────────────────────────────────────
        const skillMap: Record<string, number> = {};
        employees.forEach(e => {
          (e.skills ?? []).forEach(sk => {
            const n = sk.skillName?.toLowerCase().trim();
            if (n) skillMap[n] = (skillMap[n] ?? 0) + 1;
          });
        });
        const maxSkill = Math.max(...Object.values(skillMap), 1);
        const topSkills: SkillStat[] = Object.entries(skillMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([name, count]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            count,
            pct: Math.round((count / maxSkill) * 100)
          }));
        this.topSkills.set(topSkills);

        // ── Hire trend by year ─────────────────────────────────────
        const hireByYear: Record<number, number> = {};
        employees.forEach(e => {
          if (e.hireDate) {
            const yr = new Date(e.hireDate).getFullYear();
            hireByYear[yr] = (hireByYear[yr] ?? 0) + 1;
          }
        });
        const years = Object.keys(hireByYear).map(Number).sort();
        const maxH = Math.max(...Object.values(hireByYear), 1);
        this.hireTrend.set(years.map(y => ({
          year: y,
          count: hireByYear[y],
          relPct: Math.round((hireByYear[y] / maxH) * 100)
        })));

        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les données des rapports.');
        this.loading.set(false);
      }
    });
  }
}