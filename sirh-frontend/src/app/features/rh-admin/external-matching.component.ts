import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { Application, ApplicationStatus, JobOffer } from '../../core/services/recruitment.models';
import { RecruitmentService } from '../../core/services/recruitment.service';
import {
  MarketIntelligenceService,
  MarketOffersPage,
  MarketStats,
} from '../../core/services/market-intelligence.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { normalize, resolveOfferProfile, SkillImportance } from './matching-data';
import { matchSkill } from './matching-engine';

type ExternalDecision = 'SHORTLIST' | 'POTENTIAL' | 'VERIFY' | 'LOW';

interface CandidateSkillMatch {
  name: string;
  importance: SkillImportance;
  matched: boolean;
  weight: number;
}

interface ExternalCandidateScore {
  app: Application;
  score: number;
  skillScore: number;
  experienceScore: number;
  profileScore: number;
  backendScore: number;
  marketBonus: number;
  marketAlignedSkills: string[];
  yearsExp: number;
  matchedSkills: CandidateSkillMatch[];
  missingSkills: CandidateSkillMatch[];
  extraSkills: string[];
  decision: ExternalDecision;
  decisionLabel: string;
  actionLabel: string;
  insight: string;
  risk: string;
}

interface CandidateStats {
  total: number;
  shortlist: number;
  potential: number;
  verify: number;
  low: number;
  average: number;
}

@Component({
  selector: 'app-external-matching',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="external-page">
      <header class="workspace-head">
        <div>
          <span class="eyebrow">Recrutement externe</span>
          <h1>Shortlist IA candidats</h1>
          <p>
            Classe les candidatures externes par compatibilite avec l'offre.
            Adzuna reste utilise comme contexte marche pour ajuster l'offre.
          </p>
        </div>
        <div class="head-metrics">
          <div class="metric-card primary">
            <strong>{{ statsSummary().shortlist }}</strong>
            <span>tres adaptes</span>
          </div>
          <div class="metric-card">
            <strong>{{ statsSummary().potential }}</strong>
            <span>bons potentiels</span>
          </div>
          <div class="metric-card">
            <strong>{{ statsSummary().average }}</strong>
            <span>score moyen</span>
          </div>
        </div>
      </header>

      <section class="control-panel">
        <label class="offer-field">
          <span>Offre a pourvoir ({{ offers().length }})</span>
          <select [ngModel]="selectedOfferId()" (ngModelChange)="selectOffer($event)">
            <option value="">Selectionner une offre</option>
            <option [value]="allOffersValue">Toutes les offres</option>
            <optgroup *ngFor="let grp of offerGroups()" [label]="grp.label + ' (' + grp.offers.length + ')'">
              <option *ngFor="let offer of grp.offers" [value]="offer.id">
                {{ offer.title }} - {{ offer.department || 'Sans departement' }}{{ offerCandidateCounts()[offer.id] ? ' · ' + offerCandidateCounts()[offer.id] + ' candidat(s)' : '' }}
              </option>
            </optgroup>
          </select>
        </label>

        <label>
          <span>Recherche candidat</span>
          <input
            type="search"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            placeholder="Nom, email, competence..."
          />
        </label>

        <label>
          <span>Decision IA</span>
          <select [ngModel]="decisionFilter()" (ngModelChange)="decisionFilter.set($event)">
            <option value="">Toutes les decisions</option>
            <option value="SHORTLIST">Tres adapte</option>
            <option value="POTENTIAL">Bon potentiel</option>
            <option value="VERIFY">A verifier</option>
            <option value="LOW">Non prioritaire</option>
          </select>
        </label>

        <label>
          <span>Statut candidature</span>
          <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
            <option value="">Tous les statuts</option>
            <option value="PENDING">A traiter</option>
            <option value="REVIEWING">En revue</option>
            <option value="INTERVIEW_SCHEDULED">Entretien</option>
            <option value="ACCEPTED">Accepte</option>
            <option value="REJECTED">Refuse</option>
          </select>
        </label>

        <label class="score-field">
          <span>Score minimum : {{ minScore() }}</span>
          <input type="range" min="0" max="100" step="5" [ngModel]="minScore()" (ngModelChange)="minScore.set(+($event || 0))" />
        </label>
      </section>

      <section class="diffuse" *ngIf="selectedOffer() as offer">
        <div class="diffuse-top">
          <div class="diffuse-head">
            <span class="diffuse-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </span>
            <div class="diffuse-text">
              <h3>Vous ne recrutez pas ici — vous diffusez l'offre</h3>
              <p>
                Vous ne remplissez aucun formulaire. Copiez le lien public et partagez-le
                (LinkedIn, email). <b>Ce sont les candidats qui postulent eux-memes</b> — l'IA les
                classe automatiquement, et vous decidez.
              </p>
            </div>
          </div>
          <div class="diffuse-pill">
            <strong>{{ selectedApplications().length }}</strong>
            <span>candidatures recues</span>
          </div>
        </div>

        <div class="diffuse-link">
          <span class="diffuse-link-label">Lien public de candidature</span>
          <div class="diffuse-link-row">
            <input class="link-field" type="text" [value]="applyLink()" readonly (click)="copyApplyLink()" title="Cliquer pour copier" />
            <button type="button" class="copy-link-btn" (click)="copyApplyLink()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copier
            </button>
            <button type="button" class="share-btn" (click)="previewApplyForm()" title="Voir ce que verra le candidat">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Apercu
            </button>
            <button type="button" class="share-btn" (click)="shareByEmail()" title="Partager par email">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>
              </svg>
              Email
            </button>
          </div>
        </div>

        <div class="diffuse-flow">
          <div class="flow-step done">
            <span class="flow-dot">1</span>
            <div><em>RH · vous</em><b>Diffuse le lien</b></div>
          </div>
          <span class="flow-line"></span>
          <div class="flow-step">
            <span class="flow-dot">2</span>
            <div><em>Candidat</em><b>Postule (formulaire public)</b></div>
          </div>
          <span class="flow-line"></span>
          <div class="flow-step">
            <span class="flow-dot">3</span>
            <div><em>IA</em><b>Classe automatiquement</b></div>
          </div>
          <span class="flow-line"></span>
          <div class="flow-step active">
            <span class="flow-dot">4</span>
            <div><em>RH · vous</em><b>Vous decidez</b></div>
          </div>
        </div>
      </section>

      <div class="main-grid">
        <section class="shortlist-panel">
          <div class="panel-head">
            <div>
              <h2>Classement des candidatures</h2>
              <p *ngIf="selectedOfferId(); else chooseOfferText">
                {{ filteredCandidates().length }} candidat(s) externe(s) affiche(s) sur {{ selectedApplications().length }} candidature(s) externe(s) recue(s).
              </p>
              <ng-template #chooseOfferText>
                <p>Selectionnez une offre pour calculer la compatibilite des candidats.</p>
              </ng-template>
            </div>
            <div class="decision-tabs" *ngIf="selectedOfferId()">
              <button type="button" [class.active]="decisionFilter() === ''" (click)="decisionFilter.set('')">Tous</button>
              <button type="button" [class.active]="decisionFilter() === 'SHORTLIST'" (click)="decisionFilter.set('SHORTLIST')">Tres adaptes</button>
              <button type="button" [class.active]="decisionFilter() === 'POTENTIAL'" (click)="decisionFilter.set('POTENTIAL')">Potentiels</button>
              <button type="button" [class.active]="decisionFilter() === 'VERIFY'" (click)="decisionFilter.set('VERIFY')">A verifier</button>
              <button type="button" class="ghost-button" [class.active]="hideTreated()" (click)="hideTreated.set(!hideTreated())">
                {{ hideTreated() ? '👁 Afficher traites' : 'Masquer traites' }}
              </button>
              <button type="button" class="ghost-button" (click)="resetFilters()">Reinitialiser</button>
            </div>
          </div>

          <div *ngIf="loadingRecruitment()" class="loader">
            Analyse des candidatures externes...
          </div>

          <div *ngIf="!loadingRecruitment() && selectedOfferId() && filteredCandidates().length === 0" class="empty-state">
            <strong>Aucune candidature compatible avec les filtres.</strong>
            <span>Diminuez le score minimum ou changez la decision IA.</span>
          </div>

          <article class="candidate-card"
                   [class.is-reviewing]="candidate.app.status === 'REVIEWING'"
                   [class.is-interview]="candidate.app.status === 'INTERVIEW_SCHEDULED'"
                   [class.is-accepted]="candidate.app.status === 'ACCEPTED'"
                   [class.is-rejected]="candidate.app.status === 'REJECTED'"
                   *ngFor="let candidate of filteredCandidates(); let i = index">
            <div class="rank">#{{ i + 1 }}</div>

            <div class="candidate-main">
              <div class="candidate-top">
                <div class="identity">
                  <span class="avatar">{{ avatarInitials(candidate.app.applicantName) }}</span>
                  <div>
                    <h3>{{ candidate.app.applicantName }}</h3>
                    <p>{{ candidate.app.applicantEmail }}</p>
                  </div>
                </div>
                <div class="score-box" [class.high]="candidate.score >= 85" [class.mid]="candidate.score >= 70 && candidate.score < 85" [class.low]="candidate.score < 70">
                  <strong>{{ candidate.score }}</strong>
                  <span>/100</span>
                </div>
              </div>

              <div class="candidate-tags">
                <span class="source-chip">Externe</span>
                <span class="decision-chip" [class.shortlist]="candidate.decision === 'SHORTLIST'" [class.potential]="candidate.decision === 'POTENTIAL'" [class.verify]="candidate.decision === 'VERIFY'" [class.low]="candidate.decision === 'LOW'">
                  {{ candidate.decisionLabel }}
                </span>
                <span class="status-chip status-badge" [attr.data-status]="candidate.app.status">{{ statusLabel(candidate.app.status) }}</span>
                <span class="status-chip">{{ candidate.yearsExp }} an(s) exp.</span>
                <span class="hot-chip" *ngIf="candidate.marketAlignedSkills.length >= 3">Talent recherche marche</span>
              </div>

              <div class="score-breakdown">
                <div>
                  <span>Competences</span>
                  <strong>{{ candidate.skillScore }}/60</strong>
                  <i [style.width.%]="(candidate.skillScore / 60) * 100"></i>
                </div>
                <div>
                  <span>Experience</span>
                  <strong>{{ candidate.experienceScore }}/25</strong>
                  <i [style.width.%]="(candidate.experienceScore / 25) * 100"></i>
                </div>
                <div>
                  <span>Profil CV</span>
                  <strong>{{ candidate.profileScore }}/15</strong>
                  <i [style.width.%]="(candidate.profileScore / 15) * 100"></i>
                </div>
                <div *ngIf="candidate.marketBonus > 0" class="market-bonus-cell">
                  <span>Bonus Marche</span>
                  <strong class="market-bonus-val">+{{ candidate.marketBonus }}</strong>
                  <i class="market-bar" [style.width.%]="(candidate.marketBonus / 8) * 100"></i>
                </div>
              </div>

              <div class="market-aligned-row" *ngIf="candidate.marketAlignedSkills.length > 0">
                <span class="section-label">Competences alignees Adzuna</span>
                <div class="chips">
                  <span class="skill-chip market-aligned" *ngFor="let s of candidate.marketAlignedSkills.slice(0, 6)">
                    Adzuna: {{ s }}
                  </span>
                </div>
              </div>

              <div class="skill-section">
                <div>
                  <span class="section-label">Competences compatibles</span>
                  <div class="chips">
                    <span class="skill-chip matched" *ngFor="let skill of candidate.matchedSkills.slice(0, 7)">
                      {{ skill.name }}
                    </span>
                    <span class="muted-chip" *ngIf="candidate.matchedSkills.length === 0">Aucune competence cle detectee</span>
                  </div>
                </div>
                <div>
                  <span class="section-label">Manques a verifier</span>
                  <div class="chips">
                    <span class="skill-chip missing" *ngFor="let skill of candidate.missingSkills.slice(0, 5)">
                      {{ skill.name }}
                    </span>
                    <span class="muted-chip" *ngIf="candidate.missingSkills.length === 0">Aucun manque majeur</span>
                  </div>
                </div>
              </div>

              <div class="insight">
                <strong>{{ candidate.actionLabel }}</strong>
                <span>{{ candidate.insight }}</span>
              </div>
              <p class="risk">{{ candidate.risk }}</p>
            </div>

            <div class="candidate-actions">
              <button type="button" class="icon-button" title="Telecharger le CV" (click)="viewCv(candidate.app)">CV</button>
              <button type="button" class="primary-button" (click)="markReview(candidate.app)"
                      [disabled]="candidate.app.status === 'REVIEWING'"
                      [title]="candidate.app.status === 'REVIEWING' ? 'Deja en revue' : 'Placer en revue'">
                {{ candidate.app.status === 'REVIEWING' ? '✓ En revue' : 'En revue' }}
              </button>
              <button type="button" class="accept-button" (click)="accept(candidate.app)"
                      [disabled]="candidate.app.status === 'ACCEPTED'"
                      [title]="candidate.app.status === 'ACCEPTED' ? 'Deja accepte' : 'Accepter la candidature'">
                {{ candidate.app.status === 'ACCEPTED' ? '✓ Accepte' : 'Accepter' }}
              </button>
              <button type="button" class="danger-button" (click)="reject(candidate.app)"
                      [disabled]="candidate.app.status === 'REJECTED'"
                      [title]="candidate.app.status === 'REJECTED' ? 'Deja refuse' : 'Refuser la candidature'">
                {{ candidate.app.status === 'REJECTED' ? '✓ Refuse' : 'Refuser' }}
              </button>
              <button type="button" class="delete-button" (click)="remove(candidate.app)"
                      title="Supprimer definitivement la candidature">
                Supprimer
              </button>
            </div>
          </article>
        </section>

        <aside class="market-panel">
          <div class="panel-head compact">
            <div>
              <h2>Intelligence Marche</h2>
              <p>Benchmark Adzuna pour ajuster le salaire et les competences de l'offre — pas une liste de candidats.</p>
            </div>
            <span class="live-badge">Live</span>
          </div>

          <div class="market-sync">
            <label>
              <span>Mot-cle marche</span>
              <input type="text" [ngModel]="keyword()" (ngModelChange)="keyword.set($event)" placeholder="Data Analyst, RH..." />
            </label>
            <button type="button" class="primary-button full" (click)="syncMarket()" [disabled]="syncingMarket()">
              {{ syncingMarket() ? 'Synchronisation...' : 'Synchroniser Adzuna' }}
            </button>
          </div>

          <div *ngIf="syncMessage()" class="market-message" [class.error]="syncError()">
            {{ syncMessage() }}
          </div>

          <!-- Alerte si pas de données pour ce mot-clé -->
          <div class="market-alert" *ngIf="selectedOffer() && !marketKeywordHasData()">
            Aucune donnee Adzuna pour "{{ keyword() }}". Synchronisez pour activer le Bonus Marche sur les candidats.
          </div>
          <div class="market-alert success" *ngIf="selectedOffer() && marketKeywordHasData()">
            {{ marketKeywordCount() }} offre(s) Adzuna pour "{{ keyword() }}" — Bonus Marche actif sur les candidats.
          </div>

          <div class="market-kpis">
            <div>
              <strong>{{ marketKeywordHasData() ? marketKeywordCount() : totalMarketOffers() }}</strong>
              <span>offres {{ marketKeywordHasData() ? 'pour ce poste' : 'marche total' }}</span>
            </div>
            <div>
              <strong>{{ marketKeywordHasData() ? marketKeywordSkills().length : marketSkillOverlap().length }}</strong>
              <span>{{ marketKeywordHasData() ? 'skills detectes' : 'competences en commun' }}</span>
            </div>
          </div>

          <div class="market-block" *ngIf="marketAverageSalary() as salary">
            <span class="section-label">Salaire marche detecte</span>
            <strong>{{ salary | number:'1.0-0' }} EUR / an</strong>
            <p>Utilisable pour verifier si l'offre attire vraiment les candidats externes.</p>
          </div>

          <div class="market-block">
            <span class="section-label">Competences frequentes marche</span>
            <div class="chips">
              <ng-container *ngIf="marketKeywordHasData(); else allSkills">
                <span class="market-chip"
                  *ngFor="let skill of marketKeywordSkills().slice(0, 8)"
                  [class.overlap]="isRequiredMarketSkill(skill)">
                  {{ skill }}
                </span>
              </ng-container>
              <ng-template #allSkills>
                <span class="market-chip"
                  *ngFor="let skill of topMarketSkills().slice(0, 8)"
                  [class.overlap]="isRequiredMarketSkill(skill)">
                  {{ skill }}
                </span>
                <span class="muted-chip" *ngIf="topMarketSkills().length === 0">Synchronisez Adzuna pour alimenter le benchmark</span>
              </ng-template>
            </div>
          </div>

          <div class="market-block" *ngIf="selectedOffer() as offer">
            <span class="section-label">Lecture RH</span>
            <p>{{ marketRecommendation(offer) }}</p>
          </div>

          <div class="market-offers" *ngIf="pagedMarketOffers().length > 0">
            <span class="section-label">Exemples offres marche</span>
            <div class="market-offer" *ngFor="let offer of pagedMarketOffers().slice(0, 4)">
              <strong>{{ offer.title }}</strong>
              <span>{{ offer.company || 'Entreprise non precisee' }} - {{ offer.city || 'Ville non precisee' }}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  `,
  styles: [`
    :host { display:block; }
    .external-page { display:flex; flex-direction:column; gap:18px; color:#111827; }
    h1,h2,h3,p { margin:0; }
    button,input,select { font:inherit; }

    .workspace-head {
      display:flex;
      justify-content:space-between;
      gap:24px;
      align-items:stretch;
      padding:26px 28px;
      background:#fff;
      border:1px solid #EEF1F6;
      border-radius:18px;
      box-shadow:0 1px 2px rgba(16,24,40,.04);
      position:relative; overflow:hidden;
    }
    .workspace-head:after { content:""; position:absolute; inset:auto 28px 0 28px; height:3px; border-radius:999px; background:linear-gradient(90deg,#6366F1,#38BDF8,#10B981); }
    .eyebrow { display:inline-flex; color:#6366F1; font-weight:900; font-size:.76rem; text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; }
    .workspace-head h1 { font-size:2rem; font-weight:850; letter-spacing:-.03em; line-height:1.05; background:linear-gradient(120deg,#0F172A,#475569); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
    .workspace-head p { color:#94A3B8; margin-top:10px; max-width:680px; line-height:1.55; font-size:.92rem; }
    .head-metrics { display:grid; grid-template-columns:repeat(3,minmax(120px,1fr)); gap:12px; min-width:440px; }
    .metric-card { background:#fff; border:1px solid #EEF1F6; border-radius:12px; padding:16px 18px; color:#0F172A; display:flex; flex-direction:column; justify-content:center; min-height:84px; box-shadow:0 1px 2px rgba(16,24,40,.04); }
    .metric-card.primary { border-color:#C7D2FE; box-shadow:inset 0 3px 0 #6366F1; }
    .metric-card strong { font-size:2rem; font-weight:880; line-height:1; color:#0F172A; }
    .metric-card span { color:#64748B; font-size:.78rem; font-weight:800; margin-top:7px; }

    .control-panel {
      display:grid;
      grid-template-columns:2fr 1.25fr 1fr 1fr 1fr;
      gap:14px;
      padding:18px;
      background:#fff;
      border:1px solid #D8E2EE;
      box-shadow:0 12px 30px rgba(15,23,42,.06);
    }
    label { display:flex; flex-direction:column; gap:7px; min-width:0; }
    label span, .section-label { color:#334155; font-size:.75rem; font-weight:900; text-transform:uppercase; letter-spacing:.04em; }
    input,select {
      width:100%;
      border:1.5px solid #E5E7EB;
      background:#fff;
      color:#0F172A;
      min-height:44px;
      padding:9px 13px;
      border-radius:10px;
      outline:none;
      box-shadow:0 1px 2px rgba(16,24,40,.04);
      transition:border-color .15s, box-shadow .15s;
    }
    select {
      appearance:none; -webkit-appearance:none; -moz-appearance:none; cursor:pointer; padding-right:38px;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236366F1' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat:no-repeat; background-position:right 13px center;
    }
    input:hover,select:hover { border-color:#CBD5E1; }
    input:focus,select:focus { border-color:#6366F1; box-shadow:0 0 0 3px rgba(99,102,241,.14); }
    input[type="range"] { padding:0; min-height:auto; border:0; box-shadow:none; accent-color:#6366F1; }

    /* ── Diffusion de l'offre (lien public) ────────────────── */
    .diffuse {
      position:relative; overflow:hidden;
      display:flex; flex-direction:column; gap:18px;
      padding:22px 24px 22px 26px; border-radius:18px;
      background:#fff; border:1px solid #E7E9F5;
      box-shadow:0 1px 2px rgba(16,24,40,.04), 0 18px 40px -26px rgba(99,102,241,.45);
    }
    .diffuse:before {
      content:""; position:absolute; left:0; top:0; bottom:0; width:4px;
      background:linear-gradient(180deg,#6366F1,#38BDF8);
    }

    .diffuse-top { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; }
    .diffuse-head { display:flex; gap:15px; align-items:flex-start; }
    .diffuse-badge {
      width:46px; height:46px; flex-shrink:0; border-radius:14px;
      display:grid; place-items:center; color:#fff;
      background:linear-gradient(135deg,#6366F1,#38BDF8);
      box-shadow:0 10px 20px -6px rgba(99,102,241,.6);
    }
    .diffuse-text h3 { font-size:1.05rem; font-weight:900; color:#1E1B4B; letter-spacing:-.015em; line-height:1.2; }
    .diffuse-text p { margin-top:6px; font-size:.86rem; color:#64748B; line-height:1.55; max-width:580px; }
    .diffuse-text b { color:#4338CA; font-weight:800; }

    .diffuse-pill {
      flex-shrink:0; text-align:center; padding:11px 18px; border-radius:15px;
      background:linear-gradient(135deg,#EEF2FF,#F5F3FF); border:1px solid #C7D2FE;
    }
    .diffuse-pill strong { display:block; font-size:1.75rem; font-weight:950; color:#4338CA; line-height:1; }
    .diffuse-pill span { font-size:.68rem; font-weight:800; color:#6366F1; text-transform:uppercase; letter-spacing:.04em; }

    .diffuse-link-label {
      display:block; font-size:.72rem; font-weight:900; text-transform:uppercase;
      letter-spacing:.05em; color:#94A3B8; margin-bottom:9px;
    }
    .diffuse-link-row { display:flex; gap:8px; flex-wrap:wrap; align-items:stretch; }
    .link-field {
      flex:1; min-width:220px; padding:11px 15px; border-radius:11px;
      border:1.5px solid #E2E8F0; background:#F8FAFF; color:#4338CA;
      font-size:.84rem; font-weight:600; cursor:pointer; font-family:inherit;
      transition:border-color .15s, background .15s;
    }
    .link-field:hover { border-color:#C7D2FE; background:#fff; }
    .link-field:focus { outline:none; border-color:#6366F1; box-shadow:0 0 0 3px rgba(99,102,241,.14); }
    .copy-link-btn, .share-btn {
      display:inline-flex; align-items:center; gap:7px; white-space:nowrap;
      padding:11px 17px; border-radius:11px; cursor:pointer;
      font-weight:800; font-size:.84rem; transition:transform .15s, box-shadow .2s, background .2s, border-color .2s;
    }
    .copy-link-btn {
      border:none; color:#fff;
      background:linear-gradient(135deg,#4F46E5,#6366F1);
      box-shadow:0 8px 18px -5px rgba(79,70,229,.5);
    }
    .copy-link-btn:hover { transform:translateY(-1px); box-shadow:0 12px 24px -6px rgba(79,70,229,.6); }
    .share-btn { border:1.5px solid #E2E8F0; background:#fff; color:#475569; }
    .share-btn:hover { background:#F8FAFF; border-color:#C7D2FE; color:#4338CA; transform:translateY(-1px); }

    /* Flow / acteurs (qui fait quoi) */
    .diffuse-flow {
      display:flex; align-items:center; gap:6px; flex-wrap:wrap;
      padding-top:18px; border-top:1px solid #EEF1F6;
    }
    .flow-step { display:flex; align-items:center; gap:11px; flex:1; min-width:158px; }
    .flow-dot {
      width:32px; height:32px; flex-shrink:0; border-radius:50%;
      display:grid; place-items:center; font-size:.84rem; font-weight:900;
      background:#F1F5F9; color:#94A3B8; border:1.5px solid #E2E8F0;
      transition:all .2s;
    }
    .flow-step div { display:flex; flex-direction:column; line-height:1.25; min-width:0; }
    .flow-step em {
      font-style:normal; font-size:.64rem; font-weight:900; text-transform:uppercase;
      letter-spacing:.05em; color:#94A3B8;
    }
    .flow-step b { font-size:.8rem; font-weight:700; color:#475569; margin-top:2px; }
    .flow-line { flex:0 0 22px; height:2px; border-radius:2px; background:#E2E8F0; }

    .flow-step.done .flow-dot { background:#E0E7FF; color:#4338CA; border-color:#C7D2FE; }
    .flow-step.done em { color:#6366F1; }
    .flow-step.done b { color:#334155; }

    .flow-step.active .flow-dot {
      background:linear-gradient(135deg,#6366F1,#38BDF8); color:#fff; border-color:transparent;
      box-shadow:0 7px 16px -4px rgba(99,102,241,.55);
    }
    .flow-step.active em { color:#4338CA; }
    .flow-step.active b { color:#1E1B4B; font-weight:900; }

    /* ── Badges candidat externe / talent marche ───────────── */
    .source-chip {
      background:#EEF2FF; color:#4338CA; border:1px solid #C7D2FE;
      font-weight:800; font-size:.72rem; border-radius:999px; padding:3px 10px;
    }
    .hot-chip {
      background:#FEF3C7; color:#B45309; border:1px solid #FDE68A;
      font-weight:800; font-size:.72rem; border-radius:999px; padding:3px 10px;
    }

    .main-grid { display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:18px; align-items:start; }
    .shortlist-panel,.market-panel {
      background:#fff;
      border:1px solid #D8E2EE;
      box-shadow:0 14px 36px rgba(15,23,42,.06);
    }
    .shortlist-panel { padding:18px; }
    .market-panel { padding:16px; position:sticky; top:12px; }
    .panel-head { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; margin-bottom:16px; }
    .panel-head h2 { font-size:1.08rem; font-weight:950; color:#0F172A; }
    .panel-head p { margin-top:5px; color:#64748B; font-size:.86rem; line-height:1.45; }
    .panel-head.compact { align-items:center; }
    .live-badge { background:#D1FAE5; color:#047857; border:1px solid #6EE7B7; font-weight:900; font-size:.72rem; border-radius:999px; padding:4px 9px; }

    .decision-tabs { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; }
    .decision-tabs button,.ghost-button {
      border:1px solid #CBD5E1;
      background:#fff;
      color:#334155;
      border-radius:999px;
      padding:8px 12px;
      font-weight:850;
      cursor:pointer;
      min-height:36px;
    }
    .decision-tabs button.active { background:#4F46E5; color:#fff; border-color:#4F46E5; }
    .ghost-button { border-radius:8px; }
    .ghost-button.active { background:#0F172A; color:#fff; border-color:#0F172A; }

    .candidate-card {
      display:grid;
      grid-template-columns:54px minmax(0,1fr) auto;
      gap:14px;
      padding:20px;
      border:1px solid #EEF1F6;
      border-radius:18px;
      background:#fff;
      margin-top:12px;
      box-shadow:0 1px 2px rgba(16,24,40,.04), 0 10px 26px -14px rgba(16,24,40,.14);
      transition:transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s;
    }
    .candidate-card:hover { transform:translateY(-4px); box-shadow:0 1px 2px rgba(16,24,40,.04), 0 24px 46px -18px rgba(99,102,241,.3); }

    /* États visuels après action RH (bordure gauche colorée) */
    .candidate-card.is-reviewing { border-left:4px solid #8B5CF6; background:#FBFAFF; }
    .candidate-card.is-interview { border-left:4px solid #F59E0B; background:#FFFCF5; }
    .candidate-card.is-accepted  { border-left:4px solid #10B981; background:#F6FEFB; }
    .candidate-card.is-rejected  { border-left:4px solid #EF4444; background:#FFFAFA; opacity:.78; }

    /* Badge statut coloré */
    .status-badge[data-status="REVIEWING"]          { background:#F3E8FF; color:#7C3AED; border-color:#D8B4FE; }
    .status-badge[data-status="INTERVIEW_SCHEDULED"]{ background:#FEF3C7; color:#B45309; border-color:#FDE68A; }
    .status-badge[data-status="ACCEPTED"]           { background:#D1FAE5; color:#047857; border-color:#6EE7B7; }
    .status-badge[data-status="REJECTED"]           { background:#FEE2E2; color:#B91C1C; border-color:#FCA5A5; }
    .rank { width:42px; height:42px; display:grid; place-items:center; background:linear-gradient(135deg,#EEF2FF,#E0E7FF); color:#4338CA; font-weight:850; border-radius:12px; border:1px solid #C7D2FE; box-shadow:0 5px 12px -3px rgba(99,102,241,.25); }
    .candidate-main { min-width:0; }
    .candidate-top { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; }
    .identity { display:flex; align-items:center; gap:11px; min-width:0; }
    .avatar { width:42px; height:42px; display:grid; place-items:center; flex:0 0 auto; background:linear-gradient(135deg,#6366F1,#38BDF8); color:#fff; border-radius:11px; font-weight:900; }
    .identity h3 { color:#0F172A; font-size:1rem; font-weight:950; }
    .identity p { color:#64748B; font-size:.82rem; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:360px; }
    .score-box { min-width:76px; padding:12px 10px; text-align:center; border:1px solid #EEF1F6; background:linear-gradient(180deg,#FBFCFF,#F4F6FF); border-radius:12px; }
    .score-box strong { font-size:1.7rem; font-weight:950; line-height:1; display:block; }
    .score-box span { color:#64748B; font-size:.72rem; font-weight:800; }
    .score-box.high { border-color:#2DD4BF; color:#0F766E; }
    .score-box.mid { border-color:#F59E0B; color:#B45309; }
    .score-box.low { border-color:#CBD5E1; color:#475569; }

    .candidate-tags,.chips { display:flex; flex-wrap:wrap; gap:7px; }
    .candidate-tags { margin-top:11px; }
    .decision-chip,.status-chip,.skill-chip,.muted-chip,.market-chip {
      display:inline-flex;
      align-items:center;
      min-height:26px;
      border-radius:999px;
      padding:4px 9px;
      font-size:.74rem;
      font-weight:850;
      border:1px solid transparent;
    }
    .decision-chip.shortlist { background:#CCFBF1; color:#0F766E; border-color:#5EEAD4; }
    .decision-chip.potential { background:#DCFCE7; color:#15803D; border-color:#86EFAC; }
    .decision-chip.verify { background:#FEF3C7; color:#B45309; border-color:#FCD34D; }
    .decision-chip.low { background:#F1F5F9; color:#475569; border-color:#CBD5E1; }
    .status-chip,.muted-chip { background:#F8FAFC; color:#64748B; border-color:#E2E8F0; }

    .score-breakdown {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:10px;
      margin-top:14px;
    }
    .score-breakdown div { position:relative; overflow:hidden; border:1px solid #E2E8F0; background:#fff; border-radius:8px; padding:10px; min-height:68px; }
    .score-breakdown span { display:block; color:#64748B; font-size:.72rem; font-weight:850; margin-bottom:5px; }
    .score-breakdown strong { position:relative; z-index:1; color:#0F172A; font-size:1rem; font-weight:950; }
    .score-breakdown i { position:absolute; left:0; bottom:0; height:4px; background:#6366F1; display:block; }

    .skill-section { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px; }
    .section-label { display:block; margin-bottom:7px; }
    .skill-chip.matched { background:#ECFDF5; color:#047857; border-color:#A7F3D0; }
    .skill-chip.missing { background:#FFF7ED; color:#C2410C; border-color:#FDBA74; }

    .insight { margin-top:14px; display:flex; flex-direction:column; gap:4px; padding:12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; }
    .insight strong { color:#0F172A; font-size:.86rem; }
    .insight span,.risk { color:#475569; font-size:.84rem; line-height:1.45; }
    .risk { margin-top:9px; }

    .candidate-actions { display:flex; flex-direction:column; gap:8px; min-width:112px; }
    .primary-button,.danger-button,.icon-button,.accept-button,.delete-button {
      border:none;
      min-height:38px;
      border-radius:8px;
      padding:8px 12px;
      font-weight:900;
      cursor:pointer;
      white-space:nowrap;
    }
    .primary-button { background:#4F46E5; color:#fff; box-shadow:0 10px 20px rgba(79,70,229,.18); }
    .accept-button { background:#ECFDF5; color:#047857; border:1px solid #6EE7B7; }
    .accept-button:hover:not(:disabled) { background:#D1FAE5; }
    .danger-button { background:#FFF1F2; color:#BE123C; border:1px solid #FDA4AF; }
    .delete-button { background:#fff; color:#94A3B8; border:1px solid #E2E8F0; font-weight:700; font-size:.82rem; }
    .delete-button:hover { background:#FEF2F2; color:#B91C1C; border-color:#FCA5A5; }
    .icon-button { background:#4F46E5; color:#fff; }
    .primary-button:disabled,.danger-button:disabled,.accept-button:disabled { opacity:.55; cursor:not-allowed; }
    .primary-button.full { width:100%; }

    .loader,.empty-state {
      padding:28px;
      border:1px dashed #CBD5E1;
      background:#F8FAFC;
      color:#64748B;
      text-align:center;
      border-radius:8px;
    }
    .empty-state { display:flex; flex-direction:column; gap:6px; }
    .empty-state strong { color:#0F172A; }

    .market-sync { display:flex; flex-direction:column; gap:10px; margin-bottom:12px; }
    .market-message { padding:10px 12px; background:#ECFDF5; color:#047857; border:1px solid #A7F3D0; border-radius:8px; font-size:.82rem; font-weight:700; margin-bottom:12px; }
    .market-message.error { background:#FFF1F2; color:#BE123C; border-color:#FDA4AF; }
    .market-kpis { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
    .market-kpis div { border:1px solid #E2E8F0; background:#F8FAFC; border-radius:8px; padding:12px; }
    .market-kpis strong { display:block; color:#0F172A; font-size:1.45rem; font-weight:950; }
    .market-kpis span { color:#64748B; font-size:.75rem; font-weight:800; }
    .market-block { border-top:1px solid #E2E8F0; padding-top:13px; margin-top:13px; }
    .market-block strong { color:#0F766E; font-size:1.15rem; display:block; margin-bottom:5px; }
    .market-block p { color:#64748B; font-size:.84rem; line-height:1.5; }
    .market-chip { background:#EFF6FF; color:#2563EB; border-color:#BFDBFE; }
    .market-chip.overlap { background:#CCFBF1; color:#0F766E; border-color:#5EEAD4; }
    .skill-chip.market-aligned { background:#FEF9C3; color:#854D0E; border-color:#FDE68A; }
    .market-bonus-cell { border-color:#FEF9C3 !important; background:#FFFBEB !important; }
    .market-bonus-val { color:#B45309 !important; }
    .score-breakdown .market-bar { background:linear-gradient(90deg,#F59E0B,#EAB308) !important; }
    .market-aligned-row { margin-top:10px; }
    .market-alert { padding:9px 12px; background:#FFF7ED; color:#92400E; border:1px solid #FDE68A; border-radius:8px; font-size:.82rem; font-weight:600; margin-bottom:10px; }
    .market-alert.success { background:#ECFDF5; color:#065F46; border-color:#6EE7B7; }
    .market-offers { border-top:1px solid #E2E8F0; padding-top:13px; margin-top:13px; display:flex; flex-direction:column; gap:8px; }
    .market-offer { border:1px solid #E2E8F0; background:#FBFDFF; border-radius:8px; padding:10px; }
    .market-offer strong { display:block; color:#0F172A; font-size:.84rem; line-height:1.35; }
    .market-offer span { display:block; color:#64748B; font-size:.75rem; margin-top:4px; }

    @media (max-width:1200px) {
      .workspace-head { flex-direction:column; }
      .head-metrics { min-width:0; width:100%; }
      .control-panel { grid-template-columns:repeat(2,minmax(0,1fr)); }
      .offer-field,.score-field { grid-column:span 2; }
      .main-grid { grid-template-columns:1fr; }
      .market-panel { position:static; }
    }

    @media (max-width:760px) {
      .workspace-head { padding:22px 18px; }
      .workspace-head h1 { font-size:1.55rem; }
      .head-metrics,.control-panel,.score-breakdown,.skill-section { grid-template-columns:1fr; }
      .offer-field,.score-field { grid-column:auto; }
      .panel-head,.candidate-top,.diffuse-top { flex-direction:column; align-items:stretch; }
      .diffuse-pill { text-align:left; }
      .diffuse-flow { flex-direction:column; align-items:stretch; gap:12px; }
      .flow-line { display:none; }
      .candidate-card { grid-template-columns:1fr; }
      .rank { width:100%; }
      .candidate-actions { flex-direction:row; flex-wrap:wrap; }
      .identity p { max-width:220px; }
    }
  `]
})
export class ExternalMatchingComponent implements OnInit {
  private recruitmentService = inject(RecruitmentService);
  private marketService = inject(MarketIntelligenceService);
  private toastService = inject(ToastService);

  offers = signal<JobOffer[]>([]);
  applications = signal<Application[]>([]);
  loadingRecruitment = signal(false);
  readonly allOffersValue = '__ALL_OFFERS__';

  marketStats = signal<MarketStats | null>(null);
  marketOffersPage = signal<MarketOffersPage>({ content: [], page: 0, size: 8, totalElements: 0, totalPages: 0 });
  syncingMarket = signal(false);
  syncMessage = signal('');
  syncError = signal(false);

  // Compétences Adzuna filtrées pour le mot-clé de l'offre sélectionnée
  marketKeywordSkills = signal<string[]>([]);
  marketKeywordCount = signal(0);
  marketKeywordHasData = signal(false);

  selectedOfferId = signal('');
  query = signal('');
  decisionFilter = signal<ExternalDecision | ''>('');
  statusFilter = signal<ApplicationStatus | ''>('');
  minScore = signal(0);
  keyword = signal('');
  hideTreated = signal(false);

  selectedOffer = computed(() =>
    this.offers().find(offer => offer.id === this.selectedOfferId()) ?? null
  );

  /** Nombre de candidatures externes par offre (pour l'afficher dans le selecteur). */
  offerCandidateCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const app of this.applications()) {
      counts[app.jobOfferId] = (counts[app.jobOfferId] || 0) + 1;
    }
    return counts;
  });

  /** Toutes les offres, groupees par statut. Les offres AVEC candidatures
   *  externes remontent en premier pour etre trouvees immediatement. */
  offerGroups = computed(() => {
    const all = this.offers();
    const appOfferIds = new Set(this.applications().map(a => a.jobOfferId));
    const sortByTitle = (a: JobOffer, b: JobOffer) => (a.title || '').localeCompare(b.title || '');

    const withCandidates = all.filter(o => appOfferIds.has(o.id)).sort(sortByTitle);
    // Pour les groupes de statut, on exclut celles deja listees en haut.
    const by = (s: string) =>
      all.filter(o => (o.status || '') === s && !appOfferIds.has(o.id)).sort(sortByTitle);

    return [
      { label: '⭐ Avec candidatures', offers: withCandidates },
      { label: 'Publiees', offers: by('PUBLISHED') },
      { label: 'En validation', offers: by('PENDING_VALIDATION') },
      { label: 'Brouillons', offers: by('DRAFT') },
      { label: 'Cloturees', offers: by('CLOSED') },
      { label: 'Annulees', offers: by('CANCELLED') },
    ].filter(grp => grp.offers.length > 0);
  });

  selectedApplications = computed(() => {
    const offerId = this.selectedOfferId();
    if (!offerId) return [];
    if (offerId === this.allOffersValue) return this.applications();
    return this.applications().filter(app => app.jobOfferId === offerId);
  });

  scoredCandidates = computed(() => {
    const offer = this.selectedOffer();
    const allOffersSelected = this.selectedOfferId() === this.allOffersValue;
    if (!offer && !allOffersSelected) return [];
    const offersById = new Map(this.offers().map(item => [item.id, item]));
    // Ordre : candidats ACTIFS d'abord (à traiter/en revue/entretien),
    // puis les candidats TRAITÉS (acceptés puis refusés) en bas. À statut
    // égal, on classe par score décroissant.
    const statusRank: Record<ApplicationStatus, number> = {
      PENDING: 0,
      REVIEWING: 0,
      INTERVIEW_SCHEDULED: 0,
      ACCEPTED: 1,
      REJECTED: 2,
    };
    return this.selectedApplications()
      .map(app => {
        const scoringOffer = allOffersSelected ? offersById.get(app.jobOfferId) : offer;
        return scoringOffer ? this.scoreCandidate(app, scoringOffer) : null;
      })
      .filter((item): item is ExternalCandidateScore => item !== null)
      .sort((a, b) =>
        statusRank[a.app.status] - statusRank[b.app.status] ||
        b.score - a.score || b.skillScore - a.skillScore || b.experienceScore - a.experienceScore);
  });

  filteredCandidates = computed(() => {
    const q = normalize(this.query());
    const decision = this.decisionFilter();
    const status = this.statusFilter();
    const min = Number(this.minScore() || 0);
    const hideTreated = this.hideTreated();
    return this.scoredCandidates()
      .filter(item => !hideTreated || (item.app.status !== 'ACCEPTED' && item.app.status !== 'REJECTED'))
      .filter(item => !decision || item.decision === decision)
      .filter(item => !status || item.app.status === status)
      .filter(item => item.score >= min)
      .filter(item => {
        if (!q) return true;
        const haystack = normalize([
          item.app.applicantName,
          item.app.applicantEmail,
          item.app.jobOfferTitle,
          ...this.candidateSkillNames(item.app),
        ].join(' '));
        return haystack.includes(q);
      });
  });

  statsSummary = computed<CandidateStats>(() => {
    const candidates = this.scoredCandidates();
    const total = candidates.length;
    const average = total ? Math.round(candidates.reduce((sum, item) => sum + item.score, 0) / total) : 0;
    return {
      total,
      shortlist: candidates.filter(item => item.decision === 'SHORTLIST').length,
      potential: candidates.filter(item => item.decision === 'POTENTIAL').length,
      verify: candidates.filter(item => item.decision === 'VERIFY').length,
      low: candidates.filter(item => item.decision === 'LOW').length,
      average,
    };
  });

  pagedMarketOffers = computed(() => this.marketOffersPage().content);
  totalMarketOffers = computed(() => this.marketOffersPage().totalElements || this.marketStats()?.totalOffers || 0);
  topMarketSkills = computed(() => this.marketStats()?.topSkills ?? []);

  marketSkillOverlap = computed(() => {
    const offer = this.selectedOffer();
    if (!offer) return [];
    const required = this.requiredSkillNames(offer);
    return this.topMarketSkills().filter(skill => required.some(req => matchSkill(req, skill)));
  });

  marketAverageSalary = computed(() => {
    const offer = this.selectedOffer();
    const salaries = this.marketStats()?.salaryByTitle ?? {};
    if (!offer || !Object.keys(salaries).length) return null;
    const title = normalize(offer.title);
    const exact = Object.entries(salaries).find(([key]) => {
      const k = normalize(key);
      return k.includes(title) || title.includes(k);
    });
    if (exact) return exact[1] as number;
    const values = Object.values(salaries).filter(value => typeof value === 'number') as number[];
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  });

  ngOnInit(): void {
    this.loadRecruitmentData();
    this.loadMarketData();
  }

  loadRecruitmentData(): void {
    this.loadingRecruitment.set(true);
    forkJoin({
      offers: this.recruitmentService.getJobOffers().pipe(catchError(() => of([] as JobOffer[]))),
      applications: this.recruitmentService.getExternalApplications().pipe(catchError(() => of([] as Application[]))),
    }).subscribe({
      next: ({ offers, applications }) => {
        this.offers.set(offers);
        this.applications.set(applications);
        const firstWithCandidates = this.offers().find(offer => applications.some(app => app.jobOfferId === offer.id));
        const first = firstWithCandidates ?? this.offers()[0];
        if (first && !this.selectedOfferId()) this.selectOffer(first.id);
        this.loadingRecruitment.set(false);
      },
      error: () => {
        this.loadingRecruitment.set(false);
        this.toastService.show('Erreur lors du chargement des candidatures externes.', 'error');
      },
    });
  }

  loadMarketData(): void {
    this.marketService.getMarketOffers(0, 8).pipe(catchError(() => of({ content: [], page: 0, size: 8, totalElements: 0, totalPages: 0 } as MarketOffersPage)))
      .subscribe(page => this.marketOffersPage.set(page));
    this.marketService.getMarketStats().pipe(catchError(() => of(null)))
      .subscribe(stats => this.marketStats.set(stats));
  }

  selectOffer(offerId: string): void {
    this.selectedOfferId.set(offerId);
    this.decisionFilter.set('');
    this.statusFilter.set('');
    this.minScore.set(0);
    const offer = this.offers().find(item => item.id === offerId);
    if (offer) {
      this.keyword.set(offer.title);
      this.loadMarketSkillsForKeyword(offer.title);
    }
  }

  loadMarketSkillsForKeyword(keyword: string): void {
    this.marketService.getSkillsByKeyword(keyword).pipe(
      catchError(() => of({ keyword, skills: [], marketOfferCount: 0, hasData: false }))
    ).subscribe(result => {
      this.marketKeywordSkills.set(result.skills);
      this.marketKeywordCount.set(result.marketOfferCount);
      this.marketKeywordHasData.set(result.hasData);
    });
  }

  marketAlignedSkillsForCandidate(app: Application): string[] {
    const marketSkills = this.marketKeywordSkills();
    if (!marketSkills.length) return [];
    const candidateSkills = this.candidateSkillNames(app).map(s => normalize(s));
    return marketSkills.filter(ms =>
      candidateSkills.some(cs => cs.includes(normalize(ms)) || normalize(ms).includes(cs))
    );
  }

  resetFilters(): void {
    this.query.set('');
    this.decisionFilter.set('');
    this.statusFilter.set('');
    this.minScore.set(0);
    this.hideTreated.set(false);
  }

  syncMarket(): void {
    const keyword = this.keyword().trim();
    if (!keyword) {
      this.syncMessage.set('Selectionnez une offre ou saisissez un mot-cle.');
      this.syncError.set(true);
      return;
    }
    this.syncingMarket.set(true);
    this.syncMessage.set('');
    this.marketService.syncMarketData(keyword).subscribe({
      next: result => {
        this.syncingMarket.set(false);
        this.syncMessage.set(result.message);
        this.syncError.set(false);
        this.loadMarketData();
        // Recharge aussi les compétences filtrées pour l'offre courante
        if (keyword) this.loadMarketSkillsForKeyword(keyword);
      },
      error: () => {
        this.syncingMarket.set(false);
        this.syncMessage.set('Synchronisation Adzuna impossible. Verifiez que le backend est demarre.');
        this.syncError.set(true);
      },
    });
  }

  markReview(app: Application): void {
    this.updateStatus(app, 'REVIEWING', 'Candidature placee en revue.');
  }

  reject(app: Application): void {
    this.updateStatus(app, 'REJECTED', 'Candidature refusee.');
  }

  accept(app: Application): void {
    this.updateStatus(app, 'ACCEPTED', 'Candidature acceptee.');
  }

  /** Supprime definitivement une candidature (apres confirmation). */
  remove(app: Application): void {
    const ok = window.confirm(`Supprimer definitivement la candidature de "${app.applicantName}" ? Cette action est irreversible.`);
    if (!ok) return;
    this.recruitmentService.deleteApplication(app.id).subscribe({
      next: () => {
        this.applications.update(apps => apps.filter(item => item.id !== app.id));
        this.toastService.show(`Candidature de ${app.applicantName} supprimee.`, 'success');
      },
      error: (err) => {
        console.error('deleteApplication a echoue:', err);
        if (err?.status === 401 || err?.status === 403) {
          this.toastService.show('Session expiree ou non autorisee — reconnectez-vous puis reessayez.', 'error');
        } else if (err?.status === 0) {
          this.toastService.show('Backend injoignable (recruitment-service / gateway arrete ?).', 'error');
        } else {
          this.toastService.show(`Echec suppression (HTTP ${err?.status ?? '?'}). Voir la console.`, 'error');
        }
      },
    });
  }

  viewCv(app: Application): void {
    this.recruitmentService.downloadCv(app.id, app.cvFileName, app);
  }

  /** Lien public de candidature pour l'offre selectionnee. */
  applyLink = computed(() => {
    const offer = this.selectedOffer();
    return offer ? `${window.location.origin}/postuler/${offer.id}` : '';
  });

  /** Copie le lien public de candidature externe pour l'offre selectionnee. */
  copyApplyLink(): void {
    const offer = this.selectedOffer();
    if (!offer) return;
    navigator.clipboard.writeText(this.applyLink()).then(() => {
      this.toastService.show(`Lien copie pour "${offer.title}" — partagez-le sur LinkedIn ou par email.`, 'success');
    }).catch(() => {
      this.toastService.show(`Lien : ${this.applyLink()}`, 'info');
    });
  }

  /** Ouvre le formulaire candidat dans un nouvel onglet (apercu de ce que voit le candidat). */
  previewApplyForm(): void {
    if (this.applyLink()) window.open(this.applyLink(), '_blank');
  }

  /** Prepare un email pre-rempli avec le lien de candidature. */
  shareByEmail(): void {
    const offer = this.selectedOffer();
    if (!offer) return;
    const subject = encodeURIComponent(`Offre d'emploi : ${offer.title}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nNous recrutons pour le poste "${offer.title}".\n` +
      `Pour postuler, remplissez le formulaire ici :\n${this.applyLink()}\n\nCordialement,\nL'equipe RH`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  statusLabel(status: ApplicationStatus): string {
    const labels: Record<ApplicationStatus, string> = {
      PENDING: 'A traiter',
      REVIEWING: 'En revue',
      INTERVIEW_SCHEDULED: 'Entretien',
      ACCEPTED: 'Accepte',
      REJECTED: 'Refuse',
    };
    return labels[status] ?? status;
  }

  avatarInitials(name: string): string {
    if (!name?.trim()) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  isRequiredMarketSkill(skill: string): boolean {
    const offer = this.selectedOffer();
    if (!offer) return false;
    return this.requiredSkillNames(offer).some(required => matchSkill(required, skill));
  }

  marketRecommendation(offer: JobOffer): string {
    const overlap = this.marketSkillOverlap().length;
    const required = this.requiredSkillNames(offer).length;
    if (!this.totalMarketOffers()) {
      return 'Synchronisez Adzuna pour comparer cette offre avec les competences et salaires observes sur le marche.';
    }
    if (required > 0 && overlap === 0) {
      return 'Les competences de votre offre ne ressortent pas dans les tendances Adzuna actuelles. Verifiez le titre ou les mots-cles de synchronisation.';
    }
    if (overlap >= Math.min(3, required)) {
      return 'L offre est alignee avec le marche. Utilisez la shortlist pour prioriser les candidats, puis le benchmark pour ajuster le salaire.';
    }
    return 'Certaines competences de l offre apparaissent sur le marche. Le benchmark peut aider a clarifier les exigences avant decision RH.';
  }

  private updateStatus(app: Application, status: ApplicationStatus, message: string): void {
    this.recruitmentService.updateApplicationStatus(app.id, { status }).subscribe({
      next: updated => {
        // Conserve source/champs locaux si le DTO renvoye ne les porte pas.
        this.applications.update(apps =>
          apps.map(item => item.id === updated.id ? { ...item, ...updated, status } : item));
        this.toastService.show(message, 'success');
      },
      error: (err) => {
        console.error('updateStatus a echoue:', err);
        if (err?.status === 401 || err?.status === 403) {
          this.toastService.show('Session expiree ou non autorisee — reconnectez-vous puis reessayez.', 'error');
        } else if (err?.status === 0) {
          this.toastService.show('Backend injoignable (recruitment-service / gateway arrete ?).', 'error');
        } else {
          this.toastService.show(`Echec mise a jour (HTTP ${err?.status ?? '?'}). Voir la console.`, 'error');
        }
      },
    });
  }

  private scoreCandidate(app: Application, offer: JobOffer): ExternalCandidateScore {
    const profile = resolveOfferProfile(offer);
    const candidateSkills = this.candidateSkillNames(app);
    const weightedSkills = profile.weightedSkills.length
      ? profile.weightedSkills
      : this.requiredSkillNames(offer).map((name, index) => ({
          name,
          importance: index < 2 ? 'CRITICAL' as SkillImportance : 'IMPORTANT' as SkillImportance,
          weightPct: index < 2 ? 22 : 12,
          requiredLevel: 2,
        }));

    const details = weightedSkills.map(skill => {
      const matched = candidateSkills.some(candidateSkill => matchSkill(skill.name, candidateSkill));
      return {
        name: skill.name,
        importance: skill.importance,
        matched,
        weight: skill.weightPct,
      };
    });

    const matchedSkills = details.filter(skill => skill.matched);
    const missingSkills = details.filter(skill => !skill.matched);
    const weightTotal = details.reduce((sum, skill) => sum + skill.weight, 0) || 1;
    const matchedWeight = matchedSkills.reduce((sum, skill) => sum + skill.weight, 0);
    const skillScore = Math.round((matchedWeight / weightTotal) * 60);

    const yearsExp = this.detectYearsExp(app);
    const experienceScore = this.scoreExperience(yearsExp, profile.minYears);
    const profileScore = this.scoreProfileQuality(app);
    const backendScore = Math.max(0, Math.min(100, Math.round(app.matchScore || 0)));

    // Bonus marché Adzuna : compétences du candidat demandées par le marché
    const marketSkills = this.marketKeywordSkills();
    const candidateSkillsLower = this.candidateSkillNames(app).map(s => normalize(s));
    const marketAligned = marketSkills.filter(ms =>
      candidateSkillsLower.some(cs => cs.includes(normalize(ms)) || normalize(ms).includes(cs))
    );
    const marketBonus = marketSkills.length > 0
      ? Math.min(8, Math.round((marketAligned.length / marketSkills.length) * 8))
      : 0;

    let score = Math.round(skillScore + experienceScore + profileScore + marketBonus);
    if (backendScore > 0) score = Math.round(score * 0.88 + backendScore * 0.12);

    const criticalMissing = missingSkills.some(skill => skill.importance === 'CRITICAL');
    const importantMissingCount = missingSkills.filter(skill => skill.importance === 'IMPORTANT').length;
    if (criticalMissing) score = Math.min(score, 79);
    if (matchedSkills.length === 0) score = Math.min(score, 54);
    if (importantMissingCount >= 3) score = Math.min(score, 84);
    score = Math.max(0, Math.min(100, score));

    const decision = this.decisionForScore(score);
    const extraSkills = candidateSkills
      .filter(skill => !details.some(detail => matchSkill(detail.name, skill)))
      .slice(0, 6);

    return {
      app,
      score,
      skillScore,
      experienceScore,
      profileScore,
      backendScore,
      marketBonus,
      marketAlignedSkills: marketAligned,
      yearsExp,
      matchedSkills,
      missingSkills,
      extraSkills,
      decision,
      decisionLabel: this.decisionLabel(decision),
      actionLabel: this.actionLabel(decision),
      insight: this.buildInsight(decision, matchedSkills.length, details.length, yearsExp, profile.minYears),
      risk: this.buildRisk(missingSkills, yearsExp, profile.minYears, app),
    };
  }

  private candidateSkillNames(app: Application): string[] {
    const skills = [
      ...(app.skills ?? []).map(skill => skill.name),
      ...(app.candidateProfile?.competences ?? []),
      ...(app.candidateProfile?.softSkills ?? []),
    ];
    return Array.from(new Set(skills.map(skill => skill.trim()).filter(Boolean)));
  }

  private requiredSkillNames(offer: JobOffer): string[] {
    const fromOffer = (offer.requiredSkills ?? []).map(skill => skill.name).filter(Boolean);
    if (fromOffer.length) return fromOffer;
    return resolveOfferProfile(offer).weightedSkills.map(skill => skill.name);
  }

  private detectYearsExp(app: Application): number {
    const explicit = app.candidateProfile?.anneesExperience ?? 0;
    if (explicit > 0) return explicit;
    const text = `${app.coverLetter ?? ''} ${app.candidateProfile?.resumeProfil ?? ''}`;
    const match = text.match(/(\d+)\s*(ans?|years?)/i);
    return match ? Number(match[1]) : 0;
  }

  private scoreExperience(years: number, minYears: number): number {
    if (years >= minYears + 2) return 25;
    if (years >= minYears) return 22;
    if (years >= Math.max(0, minYears - 1)) return 16;
    if (years >= Math.max(1, minYears - 2)) return 10;
    return years > 0 ? 6 : 3;
  }

  private scoreProfileQuality(app: Application): number {
    let score = 0;
    if ((app.skills?.length ?? 0) >= 4) score += 5;
    if (app.candidateProfile?.resumeProfil || app.candidateProfile?.formation) score += 3;
    if ((app.coverLetter ?? '').trim().length >= 80) score += 3;
    if ((app.candidateProfile?.langues?.length ?? 0) > 0) score += 2;
    if ((app.candidateProfile?.softSkills?.length ?? 0) > 0) score += 2;
    return Math.min(15, score);
  }

  private decisionForScore(score: number): ExternalDecision {
    if (score >= 85) return 'SHORTLIST';
    if (score >= 72) return 'POTENTIAL';
    if (score >= 60) return 'VERIFY';
    return 'LOW';
  }

  private decisionLabel(decision: ExternalDecision): string {
    const labels: Record<ExternalDecision, string> = {
      SHORTLIST: 'Tres adapte',
      POTENTIAL: 'Bon potentiel',
      VERIFY: 'A verifier',
      LOW: 'Non prioritaire',
    };
    return labels[decision];
  }

  private actionLabel(decision: ExternalDecision): string {
    const labels: Record<ExternalDecision, string> = {
      SHORTLIST: 'Priorite RH',
      POTENTIAL: 'A etudier',
      VERIFY: 'Verification necessaire',
      LOW: 'Ne pas prioriser',
    };
    return labels[decision];
  }

  private buildInsight(decision: ExternalDecision, matched: number, total: number, years: number, minYears: number): string {
    if (decision === 'SHORTLIST') return `Profil fortement compatible : ${matched}/${total} competences cles et experience suffisante.`;
    if (decision === 'POTENTIAL') return `Profil interessant : ${matched}/${total} competences cles, a comparer avec les autres candidats.`;
    if (decision === 'VERIFY') return `Profil exploitable mais incomplet : valider les manques avant de le faire avancer.`;
    if (years < minYears) return `Experience inferieure au niveau attendu (${minYears} ans).`;
    return 'Compatibilite faible avec les exigences principales de l offre.';
  }

  private buildRisk(missing: CandidateSkillMatch[], years: number, minYears: number, app: Application): string {
    const critical = missing.find(skill => skill.importance === 'CRITICAL');
    if (critical) return `Risque principal : competence critique manquante (${critical.name}).`;
    if (years < minYears) return `Risque principal : experience detectee inferieure au minimum attendu (${minYears} ans).`;
    if ((app.skills?.length ?? 0) < 4) return 'Point de vigilance : peu de competences extraites du CV, profil a verifier.';
    const important = missing.find(skill => skill.importance === 'IMPORTANT');
    if (important) return `Point de vigilance : competence importante a confirmer (${important.name}).`;
    return 'Risque faible : les informations CV sont coherentes avec l offre.';
  }
}
