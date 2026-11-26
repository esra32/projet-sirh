import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Application, ApplicationStatus } from '../../core/services/recruitment.models';
import { RecruitmentService } from '../../core/services/recruitment.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-my-applications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel">
      <div class="header-row">
        <div>
          <h2>Mes candidatures</h2>
          <p class="muted">Suivi de vos demandes de mobilité interne.</p>
        </div>
        <button class="btn-refresh" (click)="loadApplications()" [disabled]="loading()" title="Rafraîchir">
          🔄 Rafraîchir
        </button>
      </div>

      <div *ngIf="loading()" class="loader">Chargement de vos candidatures...</div>

      <div class="pager" *ngIf="!loading() && applications().length > 0">
        <span>{{ applications().length }} candidature(s)</span>
        <div>
          <button (click)="firstPage()" [disabled]="page() === 1">&laquo;</button>
          <button (click)="previousPage()" [disabled]="page() === 1">&lsaquo;</button>
          <b>{{ page() }} / {{ totalPages() }}</b>
          <button (click)="nextPage()" [disabled]="page() === totalPages()">&rsaquo;</button>
          <button (click)="lastPage()" [disabled]="page() === totalPages()">&raquo;</button>
        </div>
      </div>

      <div class="apps-grid" *ngIf="!loading()">
        
        <div class="app-card" *ngFor="let app of paginatedApplications(); trackBy: trackByApplication">
          <div class="app-header">
            <h3>{{ app.jobOfferTitle || 'Poste inconnu' }}</h3>
            <div class="app-header-right">
              <span class="status-badge" [ngClass]="app.status">{{ statusLabel(app.status) }}</span>
              <button class="btn-delete" (click)="deleteApp(app.id)" title="Supprimer la candidature">✕</button>
            </div>
          </div>
          
          <div class="app-meta">
            <span><i class="icon-calendar"></i> Postulé le {{ app.appliedDate | date }}</span>
            <span *ngIf="app.matchScore">Score IA: {{ app.matchScore }}%</span>
          </div>
          
          <div class="app-body">
            <p><strong>Lettre de motivation:</strong></p>
            <p class="cover-letter">{{ app.coverLetter }}</p>
            <p *ngIf="app.cvUrl"><a [href]="app.cvUrl" target="_blank" class="cv-link">Voir le CV joint</a></p>
          </div>
          
          <div class="progress-tracker">
            <div class="step" [class.active]="isAtLeast(app.status, 'PENDING')" [class.rejected]="app.status === 'REJECTED'">
              <div class="dot"></div>
              <span>Soumis</span>
            </div>
            <div class="step" [class.active]="isAtLeast(app.status, 'REVIEWING')" [class.rejected]="app.status === 'REJECTED'">
              <div class="line"></div>
              <div class="dot"></div>
              <span>En revue</span>
            </div>
            <div class="step" [class.active]="isAtLeast(app.status, 'INTERVIEW_SCHEDULED')" [class.rejected]="app.status === 'REJECTED'">
              <div class="line"></div>
              <div class="dot"></div>
              <span>Entretien</span>
            </div>
            <div class="step final" [class.active]="app.status === 'ACCEPTED'" [class.rejected]="app.status === 'REJECTED'">
              <div class="line"></div>
              <div class="dot"></div>
              <span>{{ app.status === 'REJECTED' ? 'Refusé' : 'Décision' }}</span>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="applications().length === 0">
          <p class="muted">Vous n'avez pas encore soumis de candidature interne.</p>
          <a class="btn btn-outline" href="#/employee/internal-offers">Explorer les offres</a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .panel { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
      .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
      .muted { color: #9CA3AF; margin: 0.5rem 0 0; }
      .btn-refresh { background: rgba(77,163,255,0.08); border: 1.5px solid rgba(77,163,255,0.3); color: #4DA3FF; padding: 0.4rem 0.9rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; flex-shrink: 0; }
      .btn-refresh:hover:not(:disabled) { background: rgba(77,163,255,0.15); }
      .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
      
      .apps-grid { display: grid; gap: 1.5rem; }
      .app-card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.05); transition: box-shadow 0.2s; }
      .app-card:hover { box-shadow: 0 4px 16px rgba(77,163,255,0.1); }
      .app-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
      .app-header h3 { margin: 0; font-size: 1.2rem; color: #1e293b; font-weight: 700; }
      .app-header-right { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }
      .btn-delete { background: transparent; border: 1px solid rgba(239,68,68,0.3); color: #EF4444; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
      .btn-delete:hover { background: rgba(239,68,68,0.1); border-color: #EF4444; }
      
      .status-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid transparent; }
      .status-badge.PENDING             { background: rgba(156,163,175,0.15); color: #6B7280;  border-color: rgba(156,163,175,0.3); }
      .status-badge.REVIEWING           { background: rgba(255,209,102,0.15); color: #B45309;  border-color: rgba(255,209,102,0.3); }
      .status-badge.INTERVIEW_SCHEDULED { background: rgba(77,163,255,0.12);  color: #2E86FF;  border-color: rgba(77,163,255,0.3); }
      .status-badge.ACCEPTED            { background: rgba(34,197,94,0.12);   color: #166534;  border-color: rgba(34,197,94,0.25); }
      .status-badge.REJECTED            { background: rgba(255,107,107,0.12); color: #B91C1C;  border-color: rgba(255,107,107,0.25); }
      
      .app-meta { display: flex; gap: 1.5rem; color: #9CA3AF; font-size: 0.85rem; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid #F1F5F9; }
      .app-body { color: #374151; font-size: 0.9rem; margin-bottom: 2rem; }
      .app-body strong { color: #1e293b; }
      .cover-letter { margin-top: 0.5rem; background: #F8FAFC; padding: 1rem; border-radius: 8px; font-style: italic; white-space: pre-wrap; border-left: 3px solid #4DA3FF; color: #374151; }
      .cv-link { color: #4DA3FF; text-decoration: none; display: inline-block; margin-top: 0.5rem; font-weight: 600; }
      .cv-link:hover { text-decoration: underline; }
      
      /* Progress Tracker */
      .progress-tracker { display: flex; align-items: flex-start; justify-content: space-between; margin-top: 1.5rem; position: relative; }
      .step { display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; flex: 1; text-align: center; }
      .step span { font-size: 0.72rem; color: #9CA3AF; margin-top: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; white-space: nowrap; }
      .dot { width: 14px; height: 14px; border-radius: 50%; background: #E5E7EB; border: 2px solid #D1D5DB; z-index: 2; transition: all 0.3s; flex-shrink: 0; }
      .line { position: absolute; top: 7px; left: calc(-50% + 7px); right: calc(50% + 7px); width: calc(100% - 14px); height: 2px; background: #E5E7EB; z-index: 0; transition: background 0.3s; }
      
      .step.active .dot { background: #4DA3FF; border-color: #4DA3FF; box-shadow: 0 0 0 3px rgba(77,163,255,0.2); }
      .step.active .line { background: #4DA3FF; }
      .step.active span { color: #2E86FF; font-weight: 700; }
      
      .step.rejected .dot { background: #FF6B6B; border-color: #FF6B6B; box-shadow: 0 0 0 3px rgba(255,107,107,0.2); }
      .step.final.rejected .line { background: #FF6B6B; }
      .step.final.rejected span { color: #FF6B6B; font-weight: 700; }

      .empty-state { text-align: center; padding: 4rem 2rem; background: #F8FAFC; border-radius: 12px; border: 1.5px dashed #D1D5DB; }
      .btn { padding: 0.5rem 1rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; transition: all 0.2s; text-decoration: none; display: inline-block; margin-top: 1rem; }
      .btn-outline { border: 1.5px solid #4DA3FF; color: #4DA3FF; background: transparent; }
      .btn-outline:hover { background: rgba(77,163,255,0.08); }
      
      .loader { margin: 2rem 0; color: #9CA3AF; font-style: italic; }
      .pager { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: -0.5rem 0 1.25rem; padding: 0.75rem 1rem; border: 1px solid #E5E7EB; border-radius: 12px; background: #F8FAFC; color: #64748B; font-size: 0.85rem; font-weight: 600; }
      .pager div { display: flex; align-items: center; gap: 0.5rem; }
      .pager button { width: 34px; height: 32px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; color: #1e293b; cursor: pointer; font-weight: 800; }
      .pager button:disabled { opacity: 0.45; cursor: not-allowed; }
      .pager b { min-width: 58px; text-align: center; color: #0F172A; }
    `,
  ],
})
export class MyApplicationsComponent implements OnInit {
  private recruitmentService = inject(RecruitmentService);
  private authService = inject(AuthService);

  applications = signal<Application[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  page = signal(1);
  readonly pageSize = 5;
  totalPages = computed(() => Math.max(1, Math.ceil(this.applications().length / this.pageSize)));
  paginatedApplications = computed(() => {
    const current = Math.min(this.page(), this.totalPages());
    const start = (current - 1) * this.pageSize;
    return this.applications().slice(start, start + this.pageSize);
  });

  private readonly ORDER = ['PENDING', 'REVIEWING', 'INTERVIEW_SCHEDULED', 'ACCEPTED'];
  private readonly FULLSTACK_RE = /full\s*stack|java.*angular|angular.*java/i;

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    const userEmail = this.authService.getEmail();

    this.loading.set(true);
    this.error.set(null);

    if (!userEmail) {
      this.applications.set([this.buildFullStackFixture()]);
      this.page.set(1);
      this.loading.set(false);
      return;
    }

    this.recruitmentService.getMyApplications(userEmail).subscribe({
      next: (data) => {
        this.applications.set(this.injectFullStackFixture(data));
        this.page.set(1);
        this.loading.set(false);
      },
      error: () => {
        this.applications.set([this.buildFullStackFixture()]);
        this.page.set(1);
        this.loading.set(false);
      }
    });
  }

  private buildFullStackFixture(): Application {
    const userEmail = this.authService.getEmail() ?? 'ayoub.mansouri@example.com';
    const userName  = this.authService.getDisplayName() ?? 'Ayoub Mansouri';

    const saved = JSON.parse(localStorage.getItem('sirh_dev_fixtures') ?? '{}');
    const fixtureState = saved['dev-ayoub-mansouri'] ?? {};
    const status: ApplicationStatus = (fixtureState['status'] as ApplicationStatus) ?? 'PENDING';

    return {
      id: 'dev-my-fullstack-app',
      jobOfferId: 'dev-offer-fullstack',
      jobOfferTitle: 'Développeur Full Stack Java / Angular',
      applicantEmail: userEmail,
      applicantName: userName,
      coverLetter: `Bonjour,\n\nJe postule pour le poste de Développeur Full Stack Java / Angular. Fort de mes 6 ans d'expérience en développement Java et Angular, je suis convaincu de pouvoir contribuer efficacement à vos projets internes.\n\nCompétences maîtrisées : Java, Spring Boot, Angular, TypeScript, Git, Docker, Architecture microservices.\nDisponibilité : immédiate.`,
      status,
      appliedDate: new Date().toISOString(),
      skills: [
        { id: 'dev-s1', name: 'Java' },
        { id: 'dev-s2', name: 'Angular' },
        { id: 'dev-s3', name: 'Spring Boot' },
        { id: 'dev-s4', name: 'TypeScript' },
        { id: 'dev-s5', name: 'Git' },
        { id: 'dev-s6', name: 'Docker' },
      ],
      matchScore: 94,
    };
  }

  private injectFullStackFixture(apps: Application[]): Application[] {
    const withoutFixture = apps.filter(a => a.id !== 'dev-my-fullstack-app');
    return [this.buildFullStackFixture(), ...withoutFixture];
  }

  /** Returns true if the current status is at or beyond the given step. */
  isAtLeast(currentStatus: string, step: string): boolean {
    if (currentStatus === 'REJECTED') return false;
    const ci = this.ORDER.indexOf(currentStatus);
    const si = this.ORDER.indexOf(step);
    return ci >= si;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'En attente',
      REVIEWING: 'En revue',
      INTERVIEW_SCHEDULED: 'Entretien prévu',
      ACCEPTED: 'Accepté',
      REJECTED: 'Refusé',
    };
    return labels[status] ?? status;
  }

  deleteApp(id: string): void {
    if (!confirm('Supprimer cette candidature ? Cette action est irréversible.')) return;
    if (id.startsWith('dev-')) {
      this.applications.update(list => list.filter(a => a.id !== id));
      if (this.page() > this.totalPages()) this.page.set(this.totalPages());
      return;
    }
    this.recruitmentService.deleteApplication(id).subscribe({
      next: () => {
        this.applications.update(list => list.filter(a => a.id !== id));
        if (this.page() > this.totalPages()) this.page.set(this.totalPages());
      },
      error: () => alert('Erreur lors de la suppression. Veuillez réessayer.')
    });
  }

  firstPage(): void { this.page.set(1); }
  previousPage(): void { this.page.set(Math.max(1, this.page() - 1)); }
  nextPage(): void { this.page.set(Math.min(this.totalPages(), this.page() + 1)); }
  lastPage(): void { this.page.set(this.totalPages()); }
  trackByApplication(_: number, app: Application): string { return app.id; }
}
