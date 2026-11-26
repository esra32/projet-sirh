import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { EmployeeService } from '../../core/services/employee.service';
import { RecruitmentService } from '../../core/services/recruitment.service';
import { isActiveEmployee } from '../../core/services/employee-activity';

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dash">

      <!-- Greeting banner -->
      <div class="greeting-banner">
        <div class="greeting-left">
          <div class="avatar-lg" [style.background]="avatarColor()">{{ initials() }}</div>
          <div>
            <h2>Bonjour, {{ displayName() }} 👋</h2>
            <p class="muted">{{ today }} — Voici votre espace RH personnalisé.</p>
          </div>
        </div>
        <a routerLink="/employee/offres" class="banner-cta">Voir les offres →</a>
      </div>

      <!-- Skeletons -->
      <div class="kpi-row" *ngIf="loading()">
        <div class="kpi-skel" *ngFor="let i of [1,2,3,4]"></div>
      </div>

      <!-- KPI -->
      <div class="kpi-row" *ngIf="!loading()">
        <div class="kpi-card k-blue">
          <div class="k-icon">💼</div>
          <div class="k-val">{{ openOffersCount() }}</div>
          <div class="k-label">Offres disponibles</div>
        </div>
        <div class="kpi-card k-green">
          <div class="k-icon">📋</div>
          <div class="k-val">{{ myAppsCount() }}</div>
          <div class="k-label">Mes candidatures</div>
        </div>
        <div class="kpi-card k-orange">
          <div class="k-icon">⏳</div>
          <div class="k-val">{{ pendingCount() }}</div>
          <div class="k-label">En traitement</div>
        </div>
        <div class="kpi-card k-purple">
          <div class="k-icon">👥</div>
          <div class="k-val">{{ colUsersCount() }}</div>
          <div class="k-label">Collègues</div>
        </div>
      </div>

      <div class="content-grid" *ngIf="!loading()">

        <!-- Offres récentes -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon ci-blue">💼</div>
            <div>
              <h3>Opportunités internes</h3>
              <p class="muted">Offres publiées pour vous</p>
            </div>
          </div>
          <div class="list">
            <div class="list-row" *ngFor="let o of latestOffers()">
              <div class="row-main">
                <span class="row-title">{{ o.title }}</span>
                <span class="dept-chip">{{ o.department }}</span>
              </div>
            </div>
            <div class="list-empty" *ngIf="latestOffers().length === 0">Aucune offre disponible</div>
          </div>
          <a routerLink="/employee/offres" class="card-link">Toutes les offres →</a>
        </div>

        <!-- Mes candidatures -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon ci-green">📋</div>
            <div>
              <h3>Mes candidatures</h3>
              <p class="muted">Suivi en temps réel</p>
            </div>
          </div>
          <div class="list">
            <div class="list-row" *ngFor="let a of latestApps()">
              <div class="row-main">
                <span class="row-title">{{ a.jobOfferTitle }}</span>
                <span class="status-chip" [ngClass]="a.status">{{ statusLabel(a.status) }}</span>
              </div>
            </div>
            <div class="list-empty" *ngIf="latestApps().length === 0">Aucune candidature</div>
          </div>
          <a routerLink="/employee/candidatures" class="card-link">Voir tout →</a>
        </div>

        <!-- Actualités -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon ci-orange">📢</div>
            <div>
              <h3>Actualités RH</h3>
              <p class="muted">Annonces et mobilités</p>
            </div>
          </div>
          <div class="news">
            <div class="news-row" *ngFor="let n of newsItems">
              <span class="news-tag" [ngClass]="n.type">{{ n.tag }}</span>
              <span class="news-txt">{{ n.text }}</span>
            </div>
          </div>
        </div>

        <!-- Accès rapides -->
        <div class="card quick-card">
          <h3 style="margin:0 0 1rem;font-size:.95rem;color:#1e293b">Accès rapides</h3>
          <div class="quick-grid">
            <a routerLink="/employee/profil"      class="quick-btn qb-blue">👤 Mon profil</a>
            <a routerLink="/employee/offres"      class="quick-btn qb-green">💼 Offres</a>
            <a routerLink="/employee/candidatures" class="quick-btn qb-orange">📋 Candidatures</a>
            <a routerLink="/employee/annuaire"    class="quick-btn qb-purple">👥 Annuaire</a>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .dash { animation: fadeUp .4s ease; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    .muted { color:#94A3B8; margin:0; font-size:.875rem; }

    /* Greeting */
    .greeting-banner {
      display:flex; justify-content:space-between; align-items:center;
      background:linear-gradient(135deg,#0F172A,#1E3A8A);
      border-radius:18px; padding:1.5rem 2rem; margin-bottom:1.5rem;
      box-shadow:0 4px 24px rgba(30,58,138,.25);
    }
    .greeting-left { display:flex; align-items:center; gap:1rem; }
    .avatar-lg {
      width:52px; height:52px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-size:1.1rem; font-weight:800; color:white; flex-shrink:0;
      box-shadow:0 0 0 3px rgba(255,255,255,.2);
    }
    h2 { margin:0 0 .25rem; font-size:1.35rem; font-weight:800; color:white; }
    .greeting-banner .muted { color:#94A3B8; }
    .banner-cta {
      padding:.6rem 1.25rem; border-radius:10px;
      background:rgba(255,255,255,.12); color:white;
      text-decoration:none; font-weight:700; font-size:.85rem;
      border:1px solid rgba(255,255,255,.2); transition:all .2s;
      white-space:nowrap;
    }
    .banner-cta:hover { background:rgba(255,255,255,.2); }

    /* KPI */
    .kpi-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1rem; margin-bottom:1.5rem; }
    .kpi-skel { height:100px; border-radius:14px; background:linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%); background-size:200%; animation:shimmer 1.5s infinite; }
    @keyframes shimmer { 0%{background-position:200%} 100%{background-position:-200%} }
    .kpi-card {
      border-radius:14px; padding:1.1rem 1.25rem;
      display:flex; flex-direction:column; gap:.25rem;
      border:1px solid transparent; transition:transform .2s,box-shadow .2s;
    }
    .kpi-card:hover { transform:translateY(-2px); }
    .k-icon { font-size:1.4rem; margin-bottom:.15rem; }
    .k-val   { font-size:2rem; font-weight:900; line-height:1; color:#0F172A; }
    .k-label { font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.07em; color:#64748B; }
    .k-blue   { background:#EFF6FF; border-color:#BFDBFE; }
    .k-green  { background:#F0FDF4; border-color:#BBF7D0; }
    .k-orange { background:#FFFBEB; border-color:#FDE68A; }
    .k-purple { background:#F5F3FF; border-color:#DDD6FE; }

    /* Content grid */
    .content-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:1.1rem; }
    .card {
      background:#fff; border:1px solid #E5E7EB; border-radius:16px;
      padding:1.35rem; display:flex; flex-direction:column; gap:.85rem;
      box-shadow:0 1px 6px rgba(0,0,0,.05);
    }
    .card-header { display:flex; align-items:flex-start; gap:.75rem; }
    .card-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
    .ci-blue   { background:rgba(77,163,255,.12); }
    .ci-green  { background:rgba(34,197,94,.12);  }
    .ci-orange { background:rgba(251,146,60,.12); }
    .card-header h3 { margin:0 0 .15rem; font-size:.95rem; color:#1e293b; font-weight:700; }

    .list { display:flex; flex-direction:column; gap:.4rem; }
    .list-row { background:#F8FAFC; border:1px solid #F1F5F9; border-radius:8px; padding:.55rem .75rem; }
    .row-main { display:flex; justify-content:space-between; align-items:center; gap:.5rem; }
    .row-title { font-size:.84rem; color:#374151; font-weight:500; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .dept-chip { font-size:.68rem; color:#6B7280; background:#E5E7EB; padding:.12rem .45rem; border-radius:999px; white-space:nowrap; }
    .list-empty { text-align:center; padding:.75rem; color:#9CA3AF; font-size:.82rem; }

    .status-chip { font-size:.65rem; font-weight:700; padding:.12rem .5rem; border-radius:999px; white-space:nowrap; }
    .status-chip.PENDING   { background:rgba(156,163,175,.15); color:#6B7280; }
    .status-chip.REVIEWING { background:rgba(245,158,11,.12);  color:#92400E; }
    .status-chip.INTERVIEW_SCHEDULED { background:rgba(77,163,255,.12); color:#1D4ED8; }
    .status-chip.ACCEPTED  { background:rgba(34,197,94,.12);   color:#166534; }
    .status-chip.REJECTED  { background:rgba(255,107,107,.12); color:#B91C1C; }

    .news { display:flex; flex-direction:column; }
    .news-row { display:flex; align-items:flex-start; gap:.65rem; padding:.65rem 0; border-bottom:1px solid #F1F5F9; }
    .news-row:last-child { border-bottom:none; }
    .news-tag { flex-shrink:0; font-size:.65rem; font-weight:700; padding:.15rem .45rem; border-radius:4px; text-transform:uppercase; letter-spacing:.05em; margin-top:.05rem; }
    .news-tag.info    { background:rgba(77,163,255,.12);  color:#1D4ED8; }
    .news-tag.success { background:rgba(34,197,94,.12);   color:#166534; }
    .news-tag.warning { background:rgba(245,158,11,.12);  color:#92400E; }
    .news-txt { font-size:.84rem; color:#374151; line-height:1.45; }

    .card-link { font-size:.82rem; color:#4DA3FF; text-decoration:none; font-weight:600; margin-top:auto; }
    .card-link:hover { text-decoration:underline; }

    /* Quick */
    .quick-grid { display:grid; grid-template-columns:1fr 1fr; gap:.65rem; }
    .quick-btn {
      display:flex; align-items:center; gap:.5rem; padding:.7rem .9rem;
      border-radius:10px; font-size:.82rem; font-weight:600;
      text-decoration:none; transition:all .2s; border:1.5px solid transparent;
    }
    .quick-btn:hover { transform:translateY(-1px); }
    .qb-blue   { background:#EFF6FF; color:#1D4ED8; border-color:#BFDBFE; }
    .qb-green  { background:#F0FDF4; color:#166534; border-color:#BBF7D0; }
    .qb-orange { background:#FFFBEB; color:#92400E; border-color:#FDE68A; }
    .qb-purple { background:#F5F3FF; color:#6D28D9; border-color:#DDD6FE; }
  `]
})
export class EmployeeDashboardComponent implements OnInit {
  private authService       = inject(AuthService);
  private employeeService   = inject(EmployeeService);
  private recruitmentService = inject(RecruitmentService);

  loading         = signal(true);
  userEmail       = signal('');
  displayName     = signal('');
  initials        = signal('?');
  avatarColor     = signal('#4DA3FF');
  openOffersCount = signal(0);
  myAppsCount     = signal(0);
  pendingCount    = signal(0);
  colUsersCount   = signal(0);
  latestOffers    = signal<{ title: string; department: string }[]>([]);
  latestApps      = signal<{ jobOfferTitle: string; status: string }[]>([]);
  today           = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  private readonly colors = ['#4DA3FF','#22C55E','#F59E0B','#EC4899','#8B5CF6','#06B6D4'];

  statusLabel(s: string): string {
    const map: Record<string,string> = {
      PENDING:'En attente', REVIEWING:'En cours', ACCEPTED:'Accepté',
      REJECTED:'Refusé', INTERVIEW_SCHEDULED:'Entretien'
    };
    return map[s] ?? s;
  }

  private applyIdentity(name: string): void {
    const display = name.trim() || 'Employe';
    this.displayName.set(display);
    this.initials.set(this.initialsFor(display));
    this.avatarColor.set(this.colors[this.hashName(display) % this.colors.length]);
  }

  private employeeDisplayName(employee: { firstName?: string; lastName?: string }): string {
    return [employee.firstName, employee.lastName].filter(Boolean).join(' ').trim();
  }

  private initialsFor(name: string): string {
    const normalized = name.replace(/@.*/, '').replace(/[._-]+/g, ' ').trim();
    const parts = normalized.split(/\s+/).filter(Boolean);
    const initials = parts.length > 1
      ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`
      : normalized.slice(0, 2);
    return initials.toUpperCase() || '?';
  }

  private hashName(name: string): number {
    return Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  }

  readonly newsItems = [
    { tag: 'Mobilité',   type: 'success', text: 'Ouverture des candidatures internes — T1 2026.' },
    { tag: 'Arrivée',    type: 'info',    text: 'Bienvenue à nos 3 nouveaux collaborateurs ce mois-ci !' },
    { tag: 'Rappel',     type: 'warning', text: 'Entretiens annuels : complétez votre auto-évaluation avant le 15/03.' },
  ];

  ngOnInit(): void {
    const email = this.authService.getEmail() ?? '';
    const fallbackName = this.authService.getDisplayName();
    this.userEmail.set(email);
    this.applyIdentity(fallbackName);

    forkJoin({
      employees: this.employeeService.getEmployees(),
      offers:    this.recruitmentService.getJobOffers('PUBLISHED'),
    }).subscribe({
      next: ({ employees, offers }) => {
        this.openOffersCount.set(offers.length);
        // Collègues = employés actifs avec fiche RH (= 1359, cohérent avec le DWH/Superset)
        this.colUsersCount.set(employees.filter(isActiveEmployee).length);
        const normalizedEmail = email.toLowerCase();
        const me = employees.find(e => e.email?.toLowerCase() === normalizedEmail);
        this.applyIdentity(me ? this.employeeDisplayName(me) || fallbackName : fallbackName);
        this.latestOffers.set(
          offers.slice(0, 3).map(o => ({ title: o.title, department: o.department }))
        );

        if (email) {
          this.recruitmentService.getMyApplications(email).subscribe({
            next: apps => {
              this.myAppsCount.set(apps.length);
              this.pendingCount.set(apps.filter(a => a.status === 'PENDING' || a.status === 'REVIEWING').length);
              this.latestApps.set(apps.slice(0, 3).map(a => ({ jobOfferTitle: a.jobOfferTitle, status: a.status })));
              this.loading.set(false);
            },
            error: () => { this.loading.set(false); }
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => { this.loading.set(false); }
    });
  }
}
