import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EmployeeService } from '../../core/services/employee.service';
import { RecruitmentService } from '../../core/services/recruitment.service';
import { Employee } from '../../core/services/employee.models';
import { Application } from '../../core/services/recruitment.models';
import { filterActiveEmployees } from '../../core/services/employee-activity';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dash">

      <!-- Header -->
      <div class="dash-header">
        <div>
          <h2>Tableau de bord Manager</h2>
          <p class="muted">Vue d'ensemble de votre équipe et des recrutements en cours</p>
        </div>
        <div class="header-date">{{ today }}</div>
      </div>

      <!-- KPI skeletons -->
      <div class="kpi-grid" *ngIf="loading()">
        <div class="kpi-skel" *ngFor="let i of [1,2,3,4,5]"></div>
      </div>

      <!-- KPI -->
      <div class="kpi-grid" *ngIf="!loading()">
        <div class="kpi-card k-slate">
          <div class="k-icon">👥</div>
          <div class="k-val">{{ totalEmployees() }}</div>
          <div class="k-label">Effectif total</div>
        </div>
        <div class="kpi-card k-green">
          <div class="k-icon">📋</div>
          <div class="k-val">{{ openOffers() }}</div>
          <div class="k-label">Offres publiées</div>
        </div>
        <div class="kpi-card k-orange">
          <div class="k-icon">⏳</div>
          <div class="k-val">{{ activeApplications() }}</div>
          <div class="k-label">Candidatures actives</div>
        </div>
        <div class="kpi-card k-cyan">
          <div class="k-icon">🧠</div>
          <div class="k-val">{{ topProfiles() }}</div>
          <div class="k-label">Profils prioritaires</div>
        </div>
        <div class="kpi-card k-purple">
          <div class="k-icon">🏢</div>
          <div class="k-val">{{ totalDepts() }}</div>
          <div class="k-label">Départements</div>
        </div>
      </div>

      <div class="panels" *ngIf="!loading()">

        <!-- Dernières recrues -->
        <div class="card">
          <div class="card-head">
            <h3>Dernières recrues</h3>
            <a routerLink="/manager/talents" class="head-link">Voir tout →</a>
          </div>
          <div class="emp-list">
            <div class="emp-row" *ngFor="let emp of recentEmployees()">
              <div class="emp-av">{{ (emp.firstName || '?')[0] }}{{ (emp.lastName || '')[0] }}</div>
              <div class="emp-info">
                <strong>{{ emp.firstName }} {{ emp.lastName }}</strong>
                <span>{{ emp.position?.title }} · {{ emp.department?.name }}</span>
              </div>
              <span class="ct-badge ct-{{ emp.contractType?.toLowerCase() }}">{{ emp.contractType }}</span>
            </div>
            <div class="list-empty" *ngIf="recentEmployees().length === 0">Aucune donnée</div>
          </div>
        </div>

        <!-- Pipeline -->
        <div class="card">
          <div class="card-head">
            <h3>Pipeline recrutement</h3>
            <a routerLink="/manager/candidatures" class="head-link">Gérer →</a>
          </div>
          <div class="pipeline">
            <div class="pipe-row" *ngFor="let stat of pipeline()">
              <span class="pipe-label">{{ stat.label }}</span>
              <span class="pipe-count" [ngClass]="stat.cls">{{ stat.count }}</span>
            </div>
          </div>
          <div class="actions-grid">
            <a routerLink="/manager/postes"       class="action-btn a-blue">📝 Publier une offre</a>
            <a routerLink="/manager/candidatures" class="action-btn a-green">👤 Candidatures</a>
            <a routerLink="/manager/rapports"     class="action-btn a-orange">📊 Rapports</a>
            <a routerLink="/manager/talents"      class="action-btn a-purple">🌟 Talents</a>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .dash { animation:fadeUp .4s ease; display:flex; flex-direction:column; gap:1.5rem; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    h2 { margin:0 0 .3rem; font-size:1.75rem; font-weight:800; color:#0F172A; letter-spacing:-.02em; }
    .muted { color:#94A3B8; margin:0; font-size:.875rem; }

    .dash-header { display:flex; justify-content:space-between; align-items:flex-start; }
    .header-date { font-size:.82rem; color:#94A3B8; font-weight:500; }

    /* KPI */
    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:1rem; }
    .kpi-skel { height:105px; border-radius:14px; background:linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%); background-size:200%; animation:shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200%} 100%{background-position:-200%} }
    .kpi-card { border-radius:14px; padding:1.1rem 1.25rem; display:flex; flex-direction:column; gap:.2rem; border:1px solid transparent; transition:transform .2s; }
    .kpi-card:hover { transform:translateY(-2px); }
    .k-icon { font-size:1.5rem; margin-bottom:.2rem; }
    .k-val  { font-size:2rem; font-weight:900; line-height:1; color:#0F172A; }
    .k-label{ font-size:.7rem; font-weight:600; text-transform:uppercase; letter-spacing:.07em; color:#64748B; }
    .k-slate  { background:#F8FAFC; border-color:#E2E8F0; }
    .k-green  { background:#F0FDF4; border-color:#BBF7D0; }
    .k-orange { background:#FFFBEB; border-color:#FDE68A; }
    .k-cyan   { background:#ECFEFF; border-color:#A5F3FC; }
    .k-purple { background:#F5F3FF; border-color:#DDD6FE; }

    /* Panels */
    .panels { display:grid; grid-template-columns:1fr 1fr; gap:1.1rem; }
    @media(max-width:768px) { .panels { grid-template-columns:1fr; } }
    .card { background:#fff; border:1px solid #E5E7EB; border-radius:16px; padding:1.35rem; box-shadow:0 1px 6px rgba(0,0,0,.05); display:flex; flex-direction:column; gap:1rem; }
    .card-head { display:flex; justify-content:space-between; align-items:center; }
    .card-head h3 { margin:0; font-size:.95rem; font-weight:700; color:#1e293b; }
    .head-link { font-size:.82rem; color:#4DA3FF; text-decoration:none; font-weight:600; }
    .head-link:hover { text-decoration:underline; }

    /* Employees */
    .emp-list { display:flex; flex-direction:column; }
    .emp-row { display:flex; align-items:center; gap:.75rem; padding:.6rem 0; border-bottom:1px solid #F1F5F9; }
    .emp-row:last-child { border-bottom:none; }
    .emp-av { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#4DA3FF,#6EE7B7); display:flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:800; color:#fff; flex-shrink:0; }
    .emp-info { flex:1; display:flex; flex-direction:column; }
    .emp-info strong { font-size:.85rem; color:#1e293b; }
    .emp-info span { font-size:.75rem; color:#9CA3AF; }
    .ct-badge { font-size:.65rem; font-weight:700; padding:.15rem .5rem; border-radius:999px; }
    .ct-cdi   { background:rgba(34,197,94,.12);   color:#166534; }
    .ct-cdd   { background:rgba(245,158,11,.12);  color:#92400E; }
    .ct-stage { background:rgba(167,139,250,.12); color:#6D28D9; }
    .list-empty { text-align:center; padding:1rem; color:#9CA3AF; font-size:.82rem; }

    /* Pipeline */
    .pipeline { display:flex; flex-direction:column; }
    .pipe-row { display:flex; justify-content:space-between; align-items:center; padding:.5rem 0; border-bottom:1px solid #F1F5F9; }
    .pipe-row:last-child { border-bottom:none; }
    .pipe-label { font-size:.85rem; color:#374151; }
    .pipe-count { font-size:.8rem; font-weight:700; padding:.2rem .65rem; border-radius:999px; }
    .status-new          { background:rgba(77,163,255,.12);  color:#1D4ED8; }
    .status-reviewing    { background:rgba(245,158,11,.12);  color:#92400E; }
    .status-interviewing { background:rgba(34,197,94,.12);   color:#166534; }
    .status-offered      { background:rgba(167,139,250,.12); color:#6D28D9; }

    /* Actions */
    .actions-grid { display:grid; grid-template-columns:1fr 1fr; gap:.6rem; }
    .action-btn { display:flex; align-items:center; gap:.5rem; padding:.65rem .85rem; border-radius:10px; font-size:.8rem; font-weight:600; text-decoration:none; border:1.5px solid transparent; transition:all .2s; }
    .action-btn:hover { transform:translateY(-1px); }
    .a-blue   { background:#EFF6FF; color:#1D4ED8; border-color:#BFDBFE; }
    .a-green  { background:#F0FDF4; color:#166534; border-color:#BBF7D0; }
    .a-orange { background:#FFFBEB; color:#92400E; border-color:#FDE68A; }
    .a-purple { background:#F5F3FF; color:#6D28D9; border-color:#DDD6FE; }
  `]
})
export class ManagerDashboardComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private recruitmentService = inject(RecruitmentService);

  loading = signal(true);
  today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  totalEmployees = signal(0);
  openOffers = signal(0);
  activeApplications = signal(0);
  topProfiles = signal(0);
  totalDepts = signal(0);
  recentEmployees = signal<Employee[]>([]);
  pipeline = signal<{ label: string; count: number; cls: string }[]>([]);

  ngOnInit(): void {
    forkJoin({
      employees: this.employeeService.getEmployees().pipe(catchError(() => of([] as Employee[]))),
      departments: this.employeeService.getDepartments().pipe(catchError(() => of([]))),
      offers: this.recruitmentService.getJobOffers('PUBLISHED').pipe(catchError(() => of([]))),
      allOffers: this.recruitmentService.getJobOffers().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ employees: rawEmployees, departments, offers, allOffers }) => {
        try {
        const employees = filterActiveEmployees(rawEmployees);
        this.totalEmployees.set(employees.length);
        this.totalDepts.set(departments.length);
        this.openOffers.set(offers.length);
        this.recentEmployees.set(
          [...employees]
            .filter(e => e.hireDate)
            .sort((a, b) => b.hireDate.localeCompare(a.hireDate))
            .slice(0, 5)
        );

        // Aggregate applications across all offers - using a simulated pipeline count from offers
        const statuses = [
          { label: 'Nouvelles candidatures', key: 'PENDING',             cls: 'stat-badge status-new' },
          { label: 'En cours de révision',   key: 'REVIEWING',           cls: 'stat-badge status-reviewing' },
          { label: 'Entretiens',             key: 'INTERVIEW_SCHEDULED', cls: 'stat-badge status-interviewing' },
          { label: 'Offres faites',          key: 'ACCEPTED',            cls: 'stat-badge status-offered' },
        ];
        this.recruitmentService.getApplications().pipe(
          catchError(() => of([] as Application[]))
        ).subscribe({
          next: (apps) => {
            const active = apps.filter((a) => a.status !== 'ACCEPTED' && a.status !== 'REJECTED');
            this.activeApplications.set(active.length);
            this.topProfiles.set(apps.filter((a) => (a.matchScore ?? 0) >= 75).length);
            this.pipeline.set(
              statuses.map((s) => ({
                label: s.label,
                count: apps.filter((a) => a.status === s.key).length,
                cls: s.cls
              }))
            );
            this.loading.set(false);
            this.employeeService.getActiveEmployeeCount().subscribe(count => {
              if (count > 0) this.totalEmployees.set(count);
            });
          },
          error: () => {
            this.pipeline.set(statuses.map(s => ({ label: s.label, count: 0, cls: s.cls })));
            this.loading.set(false);
          }
        });
        } catch (e) {
          console.error('[ManagerDashboard] erreur chargement données', e);
          this.loading.set(false);
        }
      },
      error: () => this.loading.set(false)
    });
  }
}
