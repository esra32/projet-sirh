import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { EmployeeService } from '../../core/services/employee.service';
import { RecruitmentService } from '../../core/services/recruitment.service';
import { Employee, Department } from '../../core/services/employee.models';
import { JobOffer } from '../../core/services/recruitment.models';
import { filterActiveEmployees } from '../../core/services/employee-activity';

interface DeptStat { name: string; count: number; pct: number; }
interface ContractStat { type: string; count: number; color: string; }

@Component({
  selector: 'app-team-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Rapports d'équipe</h2>
          <p class="muted">Effectifs, répartition départementale et pipeline de recrutement.</p>
        </div>
      </div>

      <div *ngIf="loading()" class="loader">Chargement des rapports...</div>

      <div *ngIf="!loading()" class="reports-grid">

        <!-- KPI Summary Row -->
        <div class="summary-row">
          <div class="summary-card">
            <p class="summary-label">Effectif total</p>
            <h2 class="summary-value">{{ totalEmployees() }}</h2>
          </div>
          <div class="summary-card green">
            <p class="summary-label">Départements actifs</p>
            <h2 class="summary-value">{{ deptStats().length }}</h2>
          </div>
          <div class="summary-card yellow">
            <p class="summary-label">Postes ouverts</p>
            <h2 class="summary-value">{{ openOffers() }}</h2>
          </div>
          <div class="summary-card purple">
            <p class="summary-label">Postes fermés</p>
            <h2 class="summary-value">{{ closedOffers() }}</h2>
          </div>
        </div>

        <!-- Dept Breakdown -->
        <div class="chart-panel">
          <h3>Répartition par département</h3>
          <div class="dept-chart">
            <div class="bar-row" *ngFor="let d of deptStats()">
              <span class="bar-label">{{ d.name }}</span>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="d.pct"></div>
              </div>
              <span class="bar-count">{{ d.count }}</span>
            </div>
          </div>
          <p class="muted center" *ngIf="deptStats().length === 0">Aucune donnée.</p>
        </div>

        <!-- Contract Type Pie-style -->
        <div class="chart-panel">
          <h3>Types de contrats</h3>
          <div class="contract-list">
            <div class="contract-row" *ngFor="let c of contractStats()">
              <div class="color-dot" [style.background]="c.color"></div>
              <span class="contract-type">{{ c.type }}</span>
              <div class="contract-bar-track">
                <div class="contract-bar-fill" [style.width.%]="(c.count / totalEmployees()) * 100" [style.background]="c.color"></div>
              </div>
              <span class="contract-count">{{ c.count }}</span>
            </div>
          </div>
        </div>

        <!-- Recruitment Offers Table -->
        <div class="chart-panel full-width">
          <div class="table-header-row">
            <h3>Offres de recrutement en cours</h3>
            <div class="table-pager" *ngIf="offersTotalPages() > 1">
              <button class="tpager-btn" (click)="offersFirstPage()" [disabled]="offersPage() === 1">&laquo;</button>
              <button class="tpager-btn" (click)="offersPrevPage()" [disabled]="offersPage() === 1">&lsaquo;</button>
              <span class="tpager-info">{{ offersPage() }} / {{ offersTotalPages() }}</span>
              <button class="tpager-btn" (click)="offersNextPage()" [disabled]="offersPage() === offersTotalPages()">&rsaquo;</button>
              <button class="tpager-btn" (click)="offersLastPage()" [disabled]="offersPage() === offersTotalPages()">&raquo;</button>
            </div>
          </div>
          <table class="report-table">
            <thead>
              <tr>
                <th>Titre</th>
                <th>Département</th>
                <th>Localisation</th>
                <th>Statut</th>
                <th>Expiration</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let offer of paginatedOffers()">
                <td class="font-medium">{{ offer.title }}</td>
                <td>{{ offer.department }}</td>
                <td>{{ offer.location }}</td>
                <td><span class="status-pill" [ngClass]="offer.status.toLowerCase()">{{ offer.status }}</span></td>
                <td class="muted">{{ offer.deadlineDate ? (offer.deadlineDate | date:'dd/MM/yyyy') : '—' }}</td>
              </tr>
            </tbody>
          </table>
          <p class="muted center" *ngIf="allOffers().length === 0">Aucune offre.</p>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header h2 { margin: 0 0 0.25rem; color: #1e293b; font-weight: 800; }
    .muted { color: #9CA3AF; margin: 0; }
    .center { text-align: center; padding: 1rem 0; }
    .loader { color: #9CA3AF; font-style: italic; }
    .reports-grid { display: grid; gap: 1.25rem; }
    .summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; }
    .summary-card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1.25rem; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .summary-label { margin: 0 0 0.5rem; font-size: 0.78rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
    .summary-value { margin: 0; font-size: 2.25rem; font-weight: 800; color: #1e293b; }
    .summary-card.green  { border-left: 4px solid #22C55E; } .summary-card.green  .summary-value { color: #22C55E; }
    .summary-card.yellow { border-left: 4px solid #FFD166; } .summary-card.yellow .summary-value { color: #B45309; }
    .summary-card.purple { border-left: 4px solid #A78BFA; } .summary-card.purple .summary-value { color: #7C3AED; }
    .chart-panel { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .chart-panel h3 { margin: 0 0 1.25rem; color: #1e293b; font-weight: 700; border-bottom: 1px solid #F1F5F9; padding-bottom: 0.75rem; }
    .full-width { grid-column: 1 / -1; }
    .bar-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .bar-label { width: 140px; font-size: 0.85rem; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #374151; }
    .bar-track { flex: 1; height: 10px; background: #F1F5F9; border-radius: 5px; overflow: hidden; }
    .bar-fill { height: 100%; background: linear-gradient(90deg,#4DA3FF,#6EE7B7); border-radius: 5px; transition: width 0.4s; }
    .bar-count { width: 30px; text-align: right; font-size: 0.85rem; color: #9CA3AF; font-weight: 600; }
    .contract-list { display: flex; flex-direction: column; gap: 0.85rem; }
    .contract-row { display: flex; align-items: center; gap: 0.75rem; }
    .color-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .contract-type { width: 100px; font-size: 0.85rem; color: #374151; font-weight: 500; }
    .contract-bar-track { flex: 1; height: 8px; background: #F1F5F9; border-radius: 4px; overflow: hidden; }
    .contract-bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s; }
    .contract-count { width: 30px; text-align: right; font-size: 0.85rem; color: #9CA3AF; font-weight: 600; }
    .report-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .report-table th { text-align: left; padding: 0.5rem 0.75rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; font-weight: 600; border-bottom: 2px solid #F1F5F9; }
    .report-table td { padding: 0.75rem; border-bottom: 1px solid #F1F5F9; color: #374151; }
    .report-table tr:hover td { background: #F8FAFC; }
    .font-medium { font-weight: 600; color: #1e293b; }
    .status-pill { padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
    .status-pill.published { background: rgba(34,197,94,0.12);   color: #166534; }
    .status-pill.draft     { background: rgba(156,163,175,0.15); color: #6B7280; }
    .status-pill.closed    { background: rgba(255,107,107,0.12); color: #B91C1C; }
    .table-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0; }
    .table-header-row h3 { margin: 0 0 1.25rem; color: #1e293b; font-weight: 700; border-bottom: none; padding-bottom: 0; }
    .table-pager { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 1.25rem; }
    .tpager-btn { width: 30px; height: 28px; border-radius: 6px; border: 1px solid #CBD5E1; background: #fff; color: #374151; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .tpager-btn:hover:not(:disabled) { background: #4DA3FF; color: #fff; border-color: #4DA3FF; }
    .tpager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .tpager-info { font-size: 0.8rem; font-weight: 600; color: #64748B; padding: 0 0.4rem; }
  `]
})
export class TeamReportsComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private recruitmentService = inject(RecruitmentService);

  loading = signal(true);
  totalEmployees = signal(0);
  openOffers = signal(0);
  closedOffers = signal(0);
  deptStats = signal<DeptStat[]>([]);
  contractStats = signal<ContractStat[]>([]);
  allOffers = signal<JobOffer[]>([]);

  offersPage = signal(1);
  readonly offersPageSize = 5;
  offersTotalPages = computed(() => Math.max(1, Math.ceil(this.allOffers().length / this.offersPageSize)));
  paginatedOffers = computed(() => {
    const page = Math.min(this.offersPage(), this.offersTotalPages());
    const start = (page - 1) * this.offersPageSize;
    return this.allOffers().slice(start, start + this.offersPageSize);
  });
  offersFirstPage(): void { this.offersPage.set(1); }
  offersPrevPage(): void  { this.offersPage.update(p => Math.max(1, p - 1)); }
  offersNextPage(): void  { this.offersPage.update(p => Math.min(this.offersTotalPages(), p + 1)); }
  offersLastPage(): void  { this.offersPage.set(this.offersTotalPages()); }

  readonly CONTRACT_COLORS: Record<string, string> = {
    CDI: '#22c55e', CDD: '#eab308', STAGE: '#a855f7', FREELANCE: '#f97316', ALTERNANCE: '#ec4899'
  };

  ngOnInit(): void {
    forkJoin({
      employees: this.employeeService.getEmployees(),
      offers: this.recruitmentService.getJobOffers(),
    }).subscribe({
      next: ({ employees: rawEmployees, offers }) => {
        const employees = filterActiveEmployees(rawEmployees);
        this.totalEmployees.set(employees.length);
        this.allOffers.set(offers);
        this.openOffers.set(offers.filter(o => o.status === 'PUBLISHED').length);
        this.closedOffers.set(offers.filter(o => o.status === 'CLOSED').length);

        // Dept breakdown
        const deptMap = new Map<string, number>();
        employees.forEach(e => {
          const name = e.department?.name ?? 'N/A';
          deptMap.set(name, (deptMap.get(name) ?? 0) + 1);
        });
        const total = employees.length || 1;
        this.deptStats.set(
          [...deptMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
        );

        // Contract breakdown
        const contractMap = new Map<string, number>();
        employees.forEach(e => {
          const t = e.contractType ?? 'N/A';
          contractMap.set(t, (contractMap.get(t) ?? 0) + 1);
        });
        this.contractStats.set(
          [...contractMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => ({ type, count, color: this.CONTRACT_COLORS[type] ?? '#64748b' }))
        );

        this.loading.set(false);
        // Mise à jour du count actif depuis le DWH (non-bloquant)
        this.employeeService.getActiveEmployeeCount().subscribe(count => {
          if (count > 0) this.totalEmployees.set(count);
        });
      },
      error: () => this.loading.set(false)
    });
  }
}
