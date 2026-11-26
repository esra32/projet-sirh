import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Application, JobOffer } from '../../core/services/recruitment.models';
import { RecruitmentService } from '../../core/services/recruitment.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AiService } from '../../core/services/ai.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-candidate-review',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="panel">
      <div class="header-row">
        <div>
          <h2>Candidatures sur mes offres</h2>
          <p class="muted">Uniquement les candidatures des offres que vous avez créées · {{ applications().length }} candidature(s)</p>
        </div>
        <button class="btn-refresh" (click)="refresh()" [disabled]="loadingData() || loadingApps()" title="Rafraîchir">
          🔄 Rafraîchir
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loadingData()" class="loader">Chargement des offres...</div>

      <!-- Error loading offers -->
      <div class="alert-error" *ngIf="!loadingData() && offersError()">
        <strong>Erreur :</strong> {{ offersError() }}
        <button class="btn-retry" (click)="loadOffers()">Réessayer</button>
      </div>

      <!-- Offer selector -->
      <div class="filter-bar" *ngIf="!loadingData() && !offersError()">
        <label>Filtrer par offre :</label>
        <select class="form-control" (change)="onOfferSelected($event)">
          <option value="">— Toutes les offres —</option>
          <option *ngFor="let offer of offers()" [value]="offer.id">{{ offer.title }}</option>
        </select>
        <label class="smart-toggle">
          <input type="checkbox" [checked]="smartRanking()" (change)="toggleSmartRanking($event)" />
          Tri intelligent
          <span class="sort-hint">{{ selectedOfferId() ? '(par score)' : '(par statut)' }}</span>
        </label>
        <span class="offers-count">{{ applications().length }} candidature(s)</span>
      </div>

      <!-- No offers available -->
      <div class="empty-state" *ngIf="!loadingData() && !offersError() && offers().length === 0">
        <div class="empty-icon">📋</div>
        <p class="muted">Aucune offre disponible. Publiez d'abord une offre via <strong>Publier un poste</strong>.</p>
      </div>

      <!-- Loading applications spinner -->
      <div *ngIf="loadingApps()" class="loader">Chargement des candidatures...</div>

      <!-- Error loading applications -->
      <div class="alert-error" *ngIf="!loadingApps() && appsError()">
        <strong>Erreur :</strong> {{ appsError() }}
      </div>

      <!-- Applications list -->
      <div class="candidates-list" *ngIf="!loadingApps() && !appsError() && offers().length > 0">
        <div class="candidate-card" *ngFor="let app of applications()">
          <div class="cand-header">
            <h3>{{ app.applicantName }}</h3>
            <span class="badge" [ngClass]="app.status">{{ statusLabel(app.status) }}</span>
          </div>
          <p class="email">✉ {{ app.applicantEmail }}</p>
          
          <div class="score-box" *ngIf="app.matchScore > 0">
            <strong>Adéquation au poste :</strong>
            <div class="progress-bar">
              <div class="fill" [style.width.%]="app.matchScore"
                   [ngClass]="{'high': app.matchScore > 80, 'med': app.matchScore > 50 && app.matchScore <= 80, 'low': app.matchScore <= 50}">
              </div>
            </div>
            <span>{{ app.matchScore }}%</span>
          </div>

          <div class="skills-row" *ngIf="app.skills && app.skills.length > 0">
            <span class="skill-tag" *ngFor="let skill of app.skills">{{ skill.name }}</span>
          </div>

          <div class="cover-letter-box">
            <h4>Lettre de motivation</h4>
            <p>{{ app.coverLetter || '—' }}</p>
            <button *ngIf="app.cvFileName" class="cv-link-btn" (click)="downloadCv(app.id, app.cvFileName)">📎 Ouvrir le CV</button>
          </div>

          <!-- Profil enrichi Gemini (Option 1) -->
          <div class="profile-section" *ngIf="app.candidateProfile">
            <div class="profile-header">🤖 Profil IA — Gemini</div>
            <div class="profile-grid">
              <div class="profile-item">
                <span class="profile-label">Niveau</span>
                <span class="profile-val niveau-{{ app.candidateProfile.niveau?.toLowerCase() }}">
                  {{ app.candidateProfile.niveau || '—' }}
                </span>
              </div>
              <div class="profile-item">
                <span class="profile-label">Expérience</span>
                <span class="profile-val">{{ app.candidateProfile.anneesExperience }} ans</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">Formation</span>
                <span class="profile-val">{{ app.candidateProfile.formation || '—' }}</span>
              </div>
              <div class="profile-item" *ngIf="app.candidateProfile.langues?.length">
                <span class="profile-label">Langues</span>
                <span class="profile-val">{{ app.candidateProfile.langues.join(', ') }}</span>
              </div>
            </div>
            <div class="soft-skills-row" *ngIf="app.candidateProfile.softSkills?.length">
              <span class="profile-label">Soft skills :</span>
              <span class="soft-chip" *ngFor="let s of app.candidateProfile.softSkills">{{ s }}</span>
            </div>
            <p class="resume-profil" *ngIf="app.candidateProfile.resumeProfil">
              💬 {{ app.candidateProfile.resumeProfil }}
            </p>
          </div>

          <!-- AI Analysis + Questions d'entretien (Option 2) -->
          <div class="ai-analysis-section">
            <div class="ai-buttons-row">
              <button class="btn-analyze" (click)="analyzeCandidate(app)" [disabled]="analyzingId() === app.id">
                <ng-container *ngIf="analyzingId() !== app.id">✨ Analyser avec l'IA</ng-container>
                <ng-container *ngIf="analyzingId() === app.id">⏳ Analyse...</ng-container>
              </button>
              <button class="btn-questions" (click)="loadInterviewQuestions(app.id)" [disabled]="questionsLoadingId() === app.id">
                <ng-container *ngIf="questionsLoadingId() !== app.id">🎤 Générer questions entretien</ng-container>
                <ng-container *ngIf="questionsLoadingId() === app.id">⏳ Génération...</ng-container>
              </button>
            </div>

            <div class="ai-result" *ngIf="aiAnalyses()[app.id]">
              <div class="ai-result-header">
                <span>🤖 Analyse Gemini</span>
                <button class="ai-close" (click)="clearAnalysis(app.id)">✕</button>
              </div>
              <pre class="ai-result-text">{{ aiAnalyses()[app.id] }}</pre>
            </div>

            <!-- Questions d'entretien -->
            <div class="questions-panel" *ngIf="interviewQuestions()[app.id]?.length">
              <div class="questions-header">
                <span>🎤 Questions d'entretien — Gemini</span>
                <button class="ai-close" (click)="clearQuestions(app.id)">✕</button>
              </div>
              <ol class="questions-list">
                <li *ngFor="let q of interviewQuestions()[app.id]">{{ q }}</li>
              </ol>
            </div>
          </div>

          <div class="cand-actions">
            <button class="btn btn-sm btn-outline" *ngIf="app.status === 'PENDING'" (click)="markReviewing(app.id)">
              👁 Marquer en revue
            </button>
            <span class="readonly-note" *ngIf="app.status !== 'PENDING'">
              La décision finale (entretien / acceptation / refus) est gérée par le RH.
            </span>
          </div>
        </div>

        <div class="empty-state" *ngIf="applications().length === 0">
          <div class="empty-icon">🗂️</div>
          <p class="muted">Aucune candidature pour cette offre pour le moment.</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .panel { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; padding: 1.5rem; min-height: 500px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
      .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
      .muted { color: #9CA3AF; margin: 0.5rem 0 0; }
      .btn-refresh { background: rgba(77,163,255,0.08); border: 1.5px solid rgba(77,163,255,0.3); color: #4DA3FF; padding: 0.4rem 0.9rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; }
      .btn-refresh:hover:not(:disabled) { background: rgba(77,163,255,0.15); }
      .btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

      .alert-error { background: rgba(255,107,107,0.08); border: 1px solid rgba(255,107,107,0.25); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; color: #B91C1C; display: flex; align-items: center; gap: 1rem; font-weight: 500; }
      .btn-retry { margin-left: auto; background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.3); color: #FF6B6B; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
      .btn-retry:hover { background: rgba(255,107,107,0.18); }

      .filter-bar { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; background: #F8FAFC; padding: 1rem; border-radius: 10px; border: 1px solid #E5E7EB; flex-wrap: wrap; }
      .form-control { width: 300px; padding: 0.5rem 0.75rem; border-radius: 8px; border: 1.5px solid #E5E7EB; background: #FFFFFF; color: #1e293b; outline: none; }
      .form-control:focus { border-color: #4DA3FF; box-shadow: 0 0 0 3px rgba(77,163,255,0.12); }
      .offers-count { font-size: 0.8rem; color: #9CA3AF; font-weight: 500; }
      .smart-toggle { margin-left: auto; display: flex; align-items: center; gap: 0.4rem; font-size: 0.83rem; color: #334155; font-weight: 600; cursor: pointer; }
      .sort-hint { font-size: 0.72rem; color: #9CA3AF; font-weight: 400; }

      .candidates-list { display: grid; gap: 1.5rem; }
      .candidate-card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 1.5rem; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
      .candidate-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(77,163,255,0.1); border-color: rgba(77,163,255,0.3); }

      .cand-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
      .cand-header h3 { margin: 0; font-size: 1.15rem; color: #1e293b; font-weight: 700; }
      .email { color: #9CA3AF; font-size: 0.85rem; margin: 0 0 1rem 0; }

      .score-box { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; background: #F8FAFC; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid #F1F5F9; }
      .progress-bar { flex-grow: 1; height: 8px; background: #E5E7EB; border-radius: 999px; overflow: hidden; }
      .fill { height: 100%; transition: width 0.5s ease; }
      .fill.high { background: linear-gradient(90deg,#22C55E,#6EE7B7); }
      .fill.med  { background: linear-gradient(90deg,#FFD166,#FB923C); }
      .fill.low  { background: #FF6B6B; }
      .score-box span { font-weight: 700; width: 40px; text-align: right; color: #374151; }

      .skills-row { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem; }
      .skill-tag { background: rgba(77,163,255,0.1); border: 1px solid rgba(77,163,255,0.2); color: #2E86FF; font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 9999px; font-weight: 500; }

      .cover-letter-box { background: #F8FAFC; padding: 1rem; border-radius: 8px; border-left: 3px solid #4DA3FF; margin-bottom: 1.5rem; }
      .cover-letter-box h4 { margin: 0 0 0.5rem 0; font-size: 0.8rem; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
      .cover-letter-box p { margin: 0; font-style: italic; font-size: 0.9rem; line-height: 1.6; color: #374151; white-space: pre-wrap; }
      .cv-link { display: inline-block; margin-top: 1rem; color: #4DA3FF; text-decoration: none; font-size: 0.9rem; font-weight: 600; }
      .cv-link:hover { text-decoration: underline; }
      .cv-link-btn { margin-top: 1rem; background: transparent; border: none; color: #2563EB; cursor: pointer; font-size: 0.9rem; font-weight: 700; padding: 0; }
      .cv-link-btn:hover { text-decoration: underline; }

      /* Profil enrichi Gemini */
      .profile-section { background: linear-gradient(135deg, rgba(16,185,129,0.04), rgba(6,182,212,0.04)); border: 1px solid rgba(16,185,129,0.2); border-radius: 10px; padding: 1rem; margin-bottom: 1rem; }
      .profile-header { font-size: 0.78rem; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 0.75rem; }
      .profile-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.5rem; margin-bottom: 0.75rem; }
      .profile-item { display: flex; flex-direction: column; gap: 0.15rem; }
      .profile-label { font-size: 0.7rem; color: #9CA3AF; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
      .profile-val { font-size: 0.85rem; color: #1e293b; font-weight: 600; }
      .niveau-junior   { color: #6366f1; }
      .niveau-confirmé { color: #0ea5e9; }
      .niveau-senior   { color: #059669; }
      .soft-skills-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-bottom: 0.75rem; }
      .soft-chip { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); color: #059669; font-size: 0.72rem; padding: 0.15rem 0.55rem; border-radius: 9999px; font-weight: 500; }
      .resume-profil { margin: 0; font-size: 0.82rem; color: #475569; font-style: italic; line-height: 1.6; }

      /* Boutons IA */
      .ai-analysis-section { margin-bottom: 1rem; }
      .ai-buttons-row { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
      .btn-analyze { background: linear-gradient(135deg, #a855f7, #6366f1); color: white; border: none; border-radius: 8px; padding: 0.45rem 0.9rem; font-size: 0.82rem; font-weight: 600; cursor: pointer; letter-spacing: 0.01em; box-shadow: 0 2px 8px rgba(168,85,247,0.3); transition: all 0.2s; }
      .btn-analyze:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
      .btn-analyze:disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }
      .btn-questions { background: linear-gradient(135deg, #0ea5e9, #6366f1); color: white; border: none; border-radius: 8px; padding: 0.45rem 0.9rem; font-size: 0.82rem; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(14,165,233,0.3); transition: all 0.2s; }
      .btn-questions:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
      .btn-questions:disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }
      .ai-result { margin-top: 0.75rem; background: linear-gradient(135deg, rgba(99,102,241,0.04), rgba(168,85,247,0.04)); border: 1px solid rgba(99,102,241,0.2); border-radius: 10px; padding: 1rem; }
      .ai-result-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; font-weight: 700; color: #6366f1; margin-bottom: 0.75rem; }
      .ai-close { background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 0.85rem; padding: 0; }
      .ai-close:hover { color: #475569; }
      .ai-result-text { margin: 0; font-size: 0.85rem; line-height: 1.7; color: #334155; white-space: pre-wrap; font-family: inherit; }

      /* Questions d'entretien */
      .questions-panel { margin-top: 0.75rem; background: linear-gradient(135deg, rgba(14,165,233,0.04), rgba(99,102,241,0.04)); border: 1px solid rgba(14,165,233,0.25); border-radius: 10px; padding: 1rem; }
      .questions-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; font-weight: 700; color: #0ea5e9; margin-bottom: 0.75rem; }
      .questions-list { margin: 0; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.5rem; }
      .questions-list li { font-size: 0.87rem; color: #1e293b; line-height: 1.6; padding: 0.4rem 0.6rem; background: rgba(255,255,255,0.7); border-radius: 6px; border-left: 3px solid #0ea5e9; }

      .cand-actions { display: flex; justify-content: flex-end; align-items: center; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid #F1F5F9; flex-wrap: wrap; }
      .readonly-note { font-size: 0.75rem; color: #94A3B8; font-style: italic; }

      .btn { padding: 0.45rem 0.9rem; border-radius: 7px; border: none; cursor: pointer; font-weight: 600; transition: all 0.15s; font-size: 0.85rem; }
      .btn-outline { border: 1.5px solid #E5E7EB; color: #374151; background: transparent; }
      .btn-outline:hover { background: #F8FAFC; }
      .btn-primary { background: #4DA3FF; color: white; border: none; }
      .btn-primary:hover { background: #2E86FF; box-shadow: 0 2px 8px rgba(77,163,255,0.3); }
      .btn-success { background: #22C55E; color: white; border: none; }
      .btn-success:hover { background: #16A34A; box-shadow: 0 2px 8px rgba(34,197,94,0.3); }
      .btn-danger { background: rgba(255,107,107,0.1); color: #FF6B6B; border: 1px solid rgba(255,107,107,0.25); }
      .btn-danger:hover { background: rgba(255,107,107,0.18); }
      .btn-sm { padding: 0.3rem 0.65rem; font-size: 0.78rem; }

      .badge { padding: 0.22rem 0.65rem; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; border: 1px solid transparent; letter-spacing: 0.04em; }
      .badge.PENDING             { background: rgba(156,163,175,0.15); color: #6B7280;  border-color: rgba(156,163,175,0.3); }
      .badge.REVIEWING           { background: rgba(255,209,102,0.15); color: #B45309;  border-color: rgba(255,209,102,0.3); }
      .badge.INTERVIEW_SCHEDULED { background: rgba(77,163,255,0.12);  color: #2E86FF;  border-color: rgba(77,163,255,0.3); }
      .badge.ACCEPTED            { background: rgba(34,197,94,0.12);   color: #166534;  border-color: rgba(34,197,94,0.25); }
      .badge.REJECTED            { background: rgba(255,107,107,0.12); color: #B91C1C;  border-color: rgba(255,107,107,0.25); }

      .empty-state { text-align: center; padding: 3rem 4rem; background: #F8FAFC; border-radius: 12px; border: 1.5px dashed #D1D5DB; margin-top: 1rem; }
      .empty-icon  { font-size: 2.5rem; margin-bottom: 0.75rem; }
      .loader { margin: 2rem 0; color: #9CA3AF; font-style: italic; }
    `,
  ],
})
export class CandidateReviewComponent implements OnInit {
  private recruitmentService = inject(RecruitmentService);
  private toastService = inject(ToastService);
  private aiService = inject(AiService);
  private auth = inject(AuthService);
  private readonly DEV_FULLSTACK_OFFER_RE = /fullstack|java.*angular|angular.*java|full stack java/i;

  analyzingId = signal<string | null>(null);
  aiAnalyses = signal<Record<string, string>>({});
  questionsLoadingId = signal<string | null>(null);
  interviewQuestions = signal<Record<string, string[]>>({});

  offers = signal<JobOffer[]>([]);
  applications = signal<Application[]>([]);
  allApplications: Application[] = [];   // full unfiltered cache

  loadingData = signal(true);
  loadingApps = signal(false);
  selectedOfferId = signal<string | null>(null);
  smartRanking = signal(true);
  offersError = signal<string | null>(null);
  appsError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadOffers();
  }

  refresh(): void {
    this.loadOffers();
  }

  loadOffers(): void {
    this.loadingData.set(true);
    this.offersError.set(null);
    const email = this.auth.getEmail() ?? '';
    const obs = email
      ? this.recruitmentService.getJobOffersByCreator(email)
      : this.recruitmentService.getJobOffers();
    obs.subscribe({
      next: (data) => {
        this.offers.set(data);
        this.loadingData.set(false);
        // Automatically load ALL applications once offers are known
        this.loadAllApplications();
      },
      error: (err) => {
        const msg = err?.status === 401
          ? 'Session expirée. Veuillez vous reconnecter.'
          : err?.status === 0
            ? 'Impossible de joindre le serveur. Vérifiez que le backend est démarré.'
            : `Erreur ${err?.status ?? ''}: ${err?.error?.message ?? err?.message ?? 'Erreur inconnue'}`;
        this.offersError.set(msg);
        this.loadingData.set(false);
      }
    });
  }

  loadAllApplications(): void {
    const offers = this.offers();
    if (offers.length === 0) {
      this.allApplications = [];
      this.applications.set([]);
      return;
    }
    this.loadingApps.set(true);
    this.appsError.set(null);

    const requests = offers.map(o =>
      this.recruitmentService.getApplicationsByOffer(o.id).pipe(catchError(() => of([] as Application[])))
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        this.allApplications = ([] as Application[]).concat(...results);
        this.applications.set(this.sortApplications(this.allApplications));
        this.loadingApps.set(false);
      },
      error: () => {
        this.appsError.set('Impossible de charger les candidatures.');
        this.loadingApps.set(false);
      }
    });
  }

  onOfferSelected(event: any): void {
    const offerId = event.target.value;
    this.selectedOfferId.set(offerId || null);
    const selectedOffer = this.offers().find(o => o.id === offerId);

    if (!offerId) {
      // "Toutes les offres" selected → show cached full list
      this.applications.set(this.sortApplications(this.allApplications));
      return;
    }

    // Filter locally first for instant feedback
    const initialApps = this.allApplications.filter(a => a.jobOfferId === offerId);
    this.applications.set(this.sortApplications(this.addDevFixturesForOffer(initialApps, selectedOffer)));

    // Then refresh from backend with match scores
    this.loadingApps.set(true);
    this.recruitmentService.getMatchedApplicationsByOffer(offerId).subscribe({
      next: (apps) => {
        this.applications.set(this.sortApplications(this.addDevFixturesForOffer(apps, selectedOffer)));
        this.loadingApps.set(false);
      },
      error: () => {
        this.recruitmentService.getApplicationsByOffer(offerId).subscribe({
          next: (apps) => {
            this.applications.set(this.sortApplications(this.addDevFixturesForOffer(apps, selectedOffer)));
            this.loadingApps.set(false);
          },
          error: () => { this.loadingApps.set(false); }
        });
      }
    });
  }

  private addDevFixturesForOffer(apps: Application[], offer?: JobOffer | null): Application[] {
    if (!this.shouldUseDevFixtures(offer)) {
      return apps;
    }
    const existingIds = new Set(apps.map(a => a.id));
    const fixtures = this.devCandidateApplicationsForOffer(offer!);
    return [...apps, ...fixtures.filter(app => !existingIds.has(app.id))];
  }

  private shouldUseDevFixtures(offer?: JobOffer | null): boolean {
    return !environment.production && !!offer && this.DEV_FULLSTACK_OFFER_RE.test(offer.title);
  }

  private devCandidateApplicationsForOffer(offer: JobOffer): Application[] {
    const baseDate = new Date().toISOString();
    const common = (name: string, email: string, status: Application['status'], score: number, skills: string[], profile: { anneesExperience: number; niveau: string; formation: string; langues: string[]; softSkills: string[]; resumeProfil: string; }): Application => ({
      id: `dev-${name.toLowerCase().replace(/\s+/g, '-')}`,
      jobOfferId: offer.id,
      jobOfferTitle: offer.title,
      applicantEmail: email,
      applicantName: name,
      coverLetter: `Bonjour, je postule pour le poste ${offer.title} avec une experience solide et un profil adapte.`,
      status,
      appliedDate: baseDate,
      skills: skills.map((skill, index) => ({ id: `${name.toLowerCase().replace(/\s+/g, '-')}-skill-${index}`, name: skill })),
      matchScore: score,
      candidateProfile: {
        competences: skills,
        anneesExperience: profile.anneesExperience,
        niveau: profile.niveau,
        formation: profile.formation,
        langues: profile.langues,
        softSkills: profile.softSkills,
        resumeProfil: profile.resumeProfil,
      },
    });

    return [
      common('Ayoub Mansouri', 'ayoub.mansouri@example.com', 'PENDING', 94, ['Java', 'Spring Boot', 'Angular', 'TypeScript', 'Git', 'Docker', 'Architecture microservices', 'SQL'], {
        anneesExperience: 6,
        niveau: 'Senior',
        formation: 'Master Informatique',
        langues: ['Français', 'Anglais'],
        softSkills: ['Esprit d’équipe', 'Communication', 'Autonomie'],
        resumeProfil: 'Developpeur Full Stack Java / Angular avec 6 ans d’experience sur des projets microservices et front-end modernes.',
      }),
      common('Karim Benaissa', 'karim.benaissa@example.com', 'REVIEWING', 76, ['Java', 'Angular', 'TypeScript', 'Git', 'SQL', 'Spring Boot'], {
        anneesExperience: 4,
        niveau: 'Confirmé',
        formation: 'Licence Informatique',
        langues: ['Français', 'Anglais'],
        softSkills: ['Rigueur', 'Travail collaboratif'],
        resumeProfil: 'Developpeur Full Stack avec un bon profil Java et Angular, pret a monter en charge rapidement.',
      }),
      common('Samir El Amrani', 'samir.elamrani@example.com', 'INTERVIEW_SCHEDULED', 54, ['Java', 'Angular', 'SQL', 'Git'], {
        anneesExperience: 3,
        niveau: 'Intermédiaire',
        formation: 'DUT Informatique',
        langues: ['Français'],
        softSkills: ['Organisation', 'Capacité d’adaptation'],
        resumeProfil: 'Profil dynamique sur le stack Java/Angular, avec experience en integration et delivery continu.',
      }),
      common('Yasmine Belkacem', 'yasmine.belkacem@example.com', 'ACCEPTED', 65, ['Java', 'Angular', 'TypeScript', 'HTML', 'CSS'], {
        anneesExperience: 5,
        niveau: 'Confirmé',
        formation: 'Master Développement Web',
        langues: ['Français', 'Espagnol'],
        softSkills: ['Esprit analytique', 'Communication'],
        resumeProfil: 'Developpeuse Full Stack en Java/Angular ayant contribue a plusieurs applications métier.',
      }),
      common('Nora Haddad', 'nora.haddad@example.com', 'REJECTED', 18, ['JavaScript', 'HTML', 'CSS', 'React'], {
        anneesExperience: 2,
        niveau: 'Junior',
        formation: 'Licence Web',
        langues: ['Français'],
        softSkills: ['Curiosité', 'Esprit d’initiative'],
        resumeProfil: 'Profil web orienté front-end, mais avec des gaps sur le stack Java/Angular attendu.',
      }),
    ];
  }

  markReviewing(appId: string): void {
    this.recruitmentService.updateApplicationStatus(appId, { status: 'REVIEWING' }).subscribe({
      next: (updated) => {
        this.applications.update(apps => apps.map(a => a.id === appId ? updated : a));
        this.allApplications = this.allApplications.map(a => a.id === appId ? updated : a);
        this.toastService.show('Candidature marquée en revue.');
      },
      error: (err) => {
        this.toastService.show(err?.error?.message || 'Erreur lors de la mise à jour.', 'error');
      }
    });
  }

  downloadCv(appId: string, fileName?: string): void {
    this.recruitmentService.downloadCv(appId, fileName);
    this.toastService.show('Telechargement du CV en cours...');
  }

  async analyzeCandidate(app: Application): Promise<void> {
    const offer = this.offers().find(o => o.id === app.jobOfferId);
    const jobTitle = offer?.title ?? 'Poste non spécifié';
    const jobRequirements = offer?.description ?? '';
    const skills = app.skills?.map(s => s.name).join(', ') ?? '';
    const cvText = skills ? `Compétences extraites du CV : ${skills}` : 'CV non disponible';
    const coverLetter = app.coverLetter ?? '';

    this.analyzingId.set(app.id);
    try {
      const result = await this.aiService.analyzeCandidateFit(jobTitle, jobRequirements, cvText, coverLetter);
      this.aiAnalyses.update(analyses => ({ ...analyses, [app.id]: result }));
    } catch (err) {
      this.toastService.show('Erreur lors de l\'analyse IA.', 'error');
    } finally {
      this.analyzingId.set(null);
    }
  }

  clearAnalysis(appId: string): void {
    this.aiAnalyses.update(analyses => {
      const updated = { ...analyses };
      delete updated[appId];
      return updated;
    });
  }

  loadInterviewQuestions(appId: string): void {
    this.questionsLoadingId.set(appId);
    this.recruitmentService.getInterviewQuestions(appId).subscribe({
      next: (res) => {
        this.interviewQuestions.update(q => ({ ...q, [appId]: res.questions }));
        this.questionsLoadingId.set(null);
      },
      error: () => {
        this.toastService.show("Erreur lors de la génération des questions.", 'error');
        this.questionsLoadingId.set(null);
      }
    });
  }

  clearQuestions(appId: string): void {
    this.interviewQuestions.update(q => {
      const updated = { ...q };
      delete updated[appId];
      return updated;
    });
  }

  toggleSmartRanking(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.smartRanking.set(checked);
    const base = this.selectedOfferId()
      ? this.allApplications.filter(a => a.jobOfferId === this.selectedOfferId())
      : this.allApplications;
    this.applications.set(this.sortApplications(base));
  }

  private readonly statusPriority: Record<string, number> = {
    INTERVIEW_SCHEDULED: 0,
    REVIEWING: 1,
    PENDING: 2,
    ACCEPTED: 3,
    REJECTED: 4,
  };

  private sortApplications(apps: Application[]): Application[] {
    if (!this.smartRanking()) {
      return [...apps].sort((a, b) =>
        (a.applicantName ?? '').localeCompare(b.applicantName ?? '')
      );
    }
    return [...apps].sort((a, b) => {
      // Si des scores existent (offre spécifique sélectionnée), trier par score
      const hasScores = apps.some(x => (x.matchScore ?? 0) > 0);
      if (hasScores) {
        const scoreDiff = (b.matchScore ?? 0) - (a.matchScore ?? 0);
        if (scoreDiff !== 0) return scoreDiff;
      }
      // Sinon trier par priorité de statut
      const sPriority = (this.statusPriority[a.status] ?? 99) - (this.statusPriority[b.status] ?? 99);
      if (sPriority !== 0) return sPriority;
      return (a.applicantName ?? '').localeCompare(b.applicantName ?? '');
    });
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
}
