import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Employee, EmployeeSkill, SkillLevel } from '../../core/services/employee.models';
import { EmployeeService } from '../../core/services/employee.service';
import { filterActiveEmployees } from '../../core/services/employee-activity';
import { JobOffer } from '../../core/services/recruitment.models';
import { RecruitmentService } from '../../core/services/recruitment.service';
import { classifyOfferGroup, OFFER_FAMILY_ORDER } from './matching-data';
import { MatchFilters, MatchResult, OfferMatchingProfile, QuickMatchScore, RecommendationLevel, SkillDetail, buildOfferProfile, scoreEmployeeForOfferProfile, scoreEmployeeForOfferProfileQuick } from './matching-engine';
import { TrainingProposalPayload, TrainingProposalService } from './training-proposal.service';

const ALL_OFFERS = '__ALL__';

interface OfferGroup {
  name: string;
  offers: JobOffer[];
}

interface TrainingModalState {
  result: MatchResult;
  skill: SkillDetail;
  platform: string;
  trainingTitle: string;
  emailSubject: string;
  emailBody: string;
}

interface TrainingDemoScenario {
  positionTitle: string;
  departmentName: string;
  missingSkill: string;
  skills: string[];
}

interface MatchingAudit {
  total: number;
  excellent: number;
  good: number;
  study: number;
  nonPriority: number;
  trainingActions: number;
  topSkills: { name: string; count: number }[];
  topOffers: { name: string; count: number }[];
  topSkillsText: string;
  topOffersText: string;
}

@Component({
  selector: 'app-employee-matching',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="matching-page">
      <header class="page-head">
        <div>
          <h2>Detection talents internes</h2>
          <p>{{ contextLabel() }}</p>
        </div>
        <div class="head-kpis" *ngIf="selectedOfferId()">
          <div><strong>{{ excellentCount() }}</strong><span>prets mobilite 90+</span></div>
          <div><strong>{{ goodProfileCount() }}</strong><span>bons potentiels 80-89</span></div>
          <div><strong>{{ studyCount() }}</strong><span>a accompagner 70-79</span></div>
          <div><strong>{{ nonPriorityCount() }}</strong><span>non prioritaires</span></div>
        </div>
        <div class="head-kpis idle" *ngIf="!selectedOfferId()">
          <div><strong>0</strong><span>analyse RH</span></div>
          <div><strong>{{ offers().length }}</strong><span>offres internes</span></div>
          <div><strong>{{ realEmployeesCount() }}</strong><span>collaborateurs</span></div>
        </div>
      </header>

      <aside class="source-card">
        <strong>Objectif RH</strong>
        <span>Identifier les collaborateurs internes qui peuvent evoluer vers une offre. Ce n'est pas une candidature : c'est une recommandation pour inviter, accompagner ou former.</span>
      </aside>

      <div class="control-panel">
        <div class="offer-picker-field">
          <span class="field-label">Offre interne cible</span>
          <div class="offer-picker" [class.open]="offerPickerOpen()">
            <button type="button" class="offer-trigger" (click)="toggleOfferPicker()">
              <span>{{ selectedOfferLabel() }}</span>
              <small>{{ selectedOfferMeta() }}</small>
              <b>v</b>
            </button>
            <div class="offer-menu" *ngIf="offerPickerOpen()">
              <div class="offer-search">
                <input type="search" placeholder="Rechercher par poste, departement ou famille" [ngModel]="offerSearch()" (ngModelChange)="setOfferSearch($event)" />
                <button type="button" class="close-picker" (click)="closeOfferPicker()">Fermer</button>
              </div>
              <button type="button" class="offer-option all" [class.selected]="isAllOffers()" (click)="selectOffer(ALL_OFFERS)">
                <strong>Toutes les offres internes</strong>
                <span>Cartographier la meilleure mobilite pour chaque collaborateur</span>
              </button>
              <div class="offer-options">
                <div class="offer-group" *ngFor="let group of filteredOfferGroups(); trackBy: trackOfferGroup">
                  <p>{{ group.name }}</p>
                  <button type="button" class="offer-option" *ngFor="let offer of group.offers; trackBy: trackOffer" [class.selected]="selectedOfferId() === offer.id" (click)="selectOffer(offer.id)">
                    <strong>{{ offer.title }}</strong>
                    <span>{{ offer.department || 'Departement non renseigne' }}</span>
                  </button>
                </div>
                <p class="offer-empty" *ngIf="!filteredOfferGroups().length">Aucune offre ne correspond a cette recherche.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="segmented-field priority-field">
          <span class="field-label">Priorite de calcul</span>
          <div class="segment-group">
            <button type="button" [class.active]="filters.priority === 'balanced'" (click)="setPriority('balanced')">Score global</button>
            <button type="button" [class.active]="filters.priority === 'skills'" (click)="setPriority('skills')">Competences</button>
            <button type="button" [class.active]="filters.priority === 'seniority'" (click)="setPriority('seniority')">Experience</button>
            <button type="button" [class.active]="filters.priority === 'dept'" (click)="setPriority('dept')">Proximite metier</button>
          </div>
          <small class="field-hint">{{ priorityHint() }}</small>
        </div>

        <label>
          <span>Departement actuel</span>
          <select [(ngModel)]="filters.department" (ngModelChange)="applyFiltersFromBase(true)">
            <option value="">Tous</option>
            <option *ngFor="let dept of departments(); trackBy: trackValue" [value]="dept">{{ dept }}</option>
          </select>
        </label>

        <label>
          <span>Contrat</span>
          <select [(ngModel)]="filters.contract" (ngModelChange)="applyFiltersFromBase(true)">
            <option value="">Tous</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
            <option value="FREELANCE">Freelance</option>
            <option value="ALTERNANCE">Alternance</option>
            <option value="STAGE">Stage</option>
          </select>
        </label>

        <div class="segmented-field decision-field">
          <span class="field-label">Filtre decision RH</span>
          <div class="decision-chips">
            <button type="button" [class.active]="filters.level === ''" (click)="setRecommendationLevel('')">Tous</button>
            <button type="button" [class.active]="filters.level === 'EXCELLENT'" (click)="setRecommendationLevel('EXCELLENT')">Pret mobilite</button>
            <button type="button" [class.active]="filters.level === 'BON'" (click)="setRecommendationLevel('BON')">Bon potentiel</button>
            <button type="button" [class.active]="filters.level === 'MOYEN'" (click)="setRecommendationLevel('MOYEN')">A accompagner</button>
            <button type="button" [class.active]="filters.level === 'FAIBLE'" (click)="setRecommendationLevel('FAIBLE')">Non prioritaire</button>
          </div>
          <small class="field-hint">{{ decisionHint() }}</small>
        </div>

        <label class="score-field">
          <span>Score minimum RH : {{ filters.minScore }}</span>
          <input type="range" min="0" max="100" step="5" [(ngModel)]="filters.minScore" (ngModelChange)="applyFiltersFromBase(true)" />
        </label>

      </div>

      <div class="quick-actions" *ngIf="selectedOfferId() && baseResults().length">
        <button type="button" class="ready-filter-btn" (click)="showReadyProfiles()">Profils prets</button>
        <button type="button" class="training-filter-btn" (click)="showTrainingProfiles()">Profils a former</button>
        <button type="button" class="pool-filter-btn" (click)="showTalentPool()">Vivier interne</button>
        <button type="button" class="secondary-filter-btn" *ngIf="showTrainingOnly()" (click)="showAllProfiles()">
          Retour tous profils
        </button>
        <button type="button" class="secondary-filter-btn" (click)="resetMatchingFilters()">Reinitialiser</button>
        <span>{{ trainingProposalCount() }} collaborateurs avec une competence secondaire a renforcer</span>
      </div>

      <section class="decision-board" *ngIf="selectedOfferId() && baseResults().length">
        <article>
          <span>Inviter a postuler</span>
          <strong>{{ decisionSummary().ready }}</strong>
          <button type="button" (click)="showReadyProfiles()">Voir prets</button>
        </article>
        <article>
          <span>Formation ciblee</span>
          <strong>{{ decisionSummary().training }}</strong>
          <button type="button" (click)="showTrainingProfiles()">Voir formations</button>
        </article>
        <article>
          <span>Vivier a suivre</span>
          <strong>{{ decisionSummary().pool }}</strong>
          <button type="button" (click)="showTalentPool()">Voir vivier</button>
        </article>
      </section>

      <aside class="offer-card" *ngIf="selectedOffer() as offer">
        <div>
          <p class="eyebrow">Profil cible</p>
          <h3>{{ selectedProfile()?.family }}</h3>
          <p class="muted">Parcours minimum : {{ selectedProfile()?.minYears }} ans - Contrats compatibles : {{ selectedProfile()?.targetContracts?.join(', ') }}</p>
        </div>
        <div class="skill-grid">
          <span *ngFor="let skill of selectedProfile()?.weightedSkills; trackBy: trackWeightedSkill" [class]="'skill-pill ' + skill.importance.toLowerCase()">
            {{ skill.name }} <b>{{ skill.weightPct }}%</b>
          </span>
        </div>
      </aside>

      <aside class="global-card" *ngIf="isAllOffers()">
        <strong>Matching global sur toutes les offres internes</strong>
        <span>Chaque collaborateur est compare a chaque offre publiee. Le resultat conserve uniquement la meilleure opportunite de mobilite interne.</span>
      </aside>

      <aside class="audit-card" *ngIf="matchingAudit() as audit">
        <div>
          <strong>Audit matching</strong>
          <span>{{ audit.total }} profils internes - {{ audit.trainingActions }} propositions formation</span>
        </div>
        <div class="audit-grid">
          <span>Excellent <b>{{ audit.excellent }}</b></span>
          <span>Bon <b>{{ audit.good }}</b></span>
          <span>A etudier <b>{{ audit.study }}</b></span>
          <span>Non prioritaire <b>{{ audit.nonPriority }}</b></span>
        </div>
        <div class="audit-lists">
          <p><b>Top competences</b> {{ audit.topSkillsText }}</p>
          <p><b>Top postes</b> {{ audit.topOffersText }}</p>
        </div>
      </aside>

      <section class="empty-state" *ngIf="!selectedOfferId()">
        <strong>Selectionnez une offre pour afficher les talents internes compatibles.</strong>
        <span>Choisissez une offre specifique pour une analyse ciblee, ou Toutes les offres pour cartographier les mobilites possibles.</span>
      </section>

      <div class="loader" *ngIf="loading()">
        Analyse des profils internes... {{ matchingProgress() }}%
        <span *ngIf="results().length">Premiers resultats deja disponibles pendant le calcul.</span>
      </div>

      <section class="empty-state" *ngIf="selectedOfferId() && !loading() && !results().length">
        <strong>Aucun profil interne avec les filtres actuels.</strong>
        <span>Essayez de baisser le score minimum ou de retirer un filtre.</span>
      </section>

      <ng-container *ngIf="selectedOfferId() && results().length">
        <div class="pagination sticky">
          <span>{{ paginationLabel() }}</span>
          <div>
            <button type="button" class="page-btn" (click)="firstPage()" [disabled]="page() === 1" title="Premiere page">&laquo;</button>
            <button type="button" class="page-btn" (click)="previousPage()" [disabled]="page() === 1" title="Page precedente">&lsaquo;</button>
            <b>{{ page() }} / {{ totalPages() }}</b>
            <button type="button" class="page-btn" (click)="nextPage()" [disabled]="page() === totalPages()" title="Page suivante">&rsaquo;</button>
            <button type="button" class="page-btn" (click)="lastPage()" [disabled]="page() === totalPages()" title="Derniere page">&raquo;</button>
          </div>
        </div>

        <section class="results">
          <article class="match-card" *ngFor="let result of paginatedResults(); let i = index; trackBy: trackResult" [class]="'match-card ' + result.recommendation.toLowerCase()" [class.training-ready]="canShowTrainingAction(result)">
            <div class="rank">{{ ((page() - 1) * pageSize) + i + 1 }}</div>

            <div class="identity">
              <div class="avatar" [style.background]="avatarColor(result.employee.firstName)">{{ initials(result.employee) }}</div>
              <div>
                <h3>{{ result.employee.firstName }} {{ result.employee.lastName }}</h3>
                <p>{{ result.employee.position?.title || 'Poste non renseigné' }}</p>
                <span>{{ result.employee.department?.name || '—' }} - {{ result.yearsExp }} ans - {{ result.employee.contractType }}</span>
                <b class="recommended">Mobilite possible : {{ result.offer.title }}</b>
                <div class="profile-tags">
                  <span [class]="'profile-tag ' + result.recommendation.toLowerCase()">{{ mobilityStatus(result) }}</span>
                  <span class="profile-tag neutral">{{ gapLabel(result) }}</span>
                </div>
              </div>
            </div>

            <div class="global-score">
              <strong>{{ result.totalScore }}</strong><span>/100</span>
              <em [class]="'badge ' + result.recommendation.toLowerCase()">{{ scoreBadgeLabel(result) }}</em>
            </div>

            <div class="score-breakdown">
              <div class="bar-line"><span>Competences</span><div><i [style.width.%]="percent(result.skillScore, 50)" class="skills"></i></div><b>{{ result.skillScore }}/50</b></div>
              <div class="bar-line"><span>Anciennete</span><div><i [style.width.%]="percent(result.seniorityScore, 25)" class="seniority"></i></div><b>{{ result.seniorityScore }}/25</b></div>
              <div class="bar-line"><span>Departement</span><div><i [style.width.%]="percent(result.deptScore, 15)" class="dept"></i></div><b>{{ result.deptScore }}/15</b></div>
              <div class="bar-line"><span>Contrat</span><div><i [style.width.%]="percent(result.contractScore, 10)" class="contract"></i></div><b>{{ result.contractScore }}/10</b></div>
            </div>

            <div class="actions">
              <button type="button" class="ghost" (click)="toggleDetail(result)">{{ result.showDetail ? 'Masquer' : 'Voir analyse' }}</button>
              <button type="button" class="training-action" *ngIf="canShowTrainingAction(result)" (click)="openTrainingModal(result)">
                Proposer formation
              </button>
              <span class="action-note" *ngIf="!canShowTrainingAction(result)">{{ actionNote(result) }}</span>
            </div>

            <div class="insight">
              <p class="eyebrow">Decision RH proposee</p>
              <strong>{{ mainInsight(result) }}</strong>
              <span>{{ result.explanation }}</span>
              <span>{{ result.risk }}</span>
              <span>{{ recommendedAction(result) }}</span>
              <span *ngIf="canShowTrainingAction(result) && result.priorityTrainingSkill" class="priority-skill">
                Formation complementaire recommandee : {{ result.priorityTrainingSkill.name }} - {{ result.priorityTrainingSkill.training }}
              </span>
            </div>

            <div class="chips">
              <span class="chip ok" *ngFor="let skill of result.competencesMatchees.slice(0, 6); trackBy: trackValue">Acquise : {{ skill }}</span>
              <span class="chip missing" *ngFor="let skill of result.competencesManquantes.slice(0, 5); trackBy: trackValue">A renforcer : {{ skill }}</span>
            </div>

            <div class="detail-panel" *ngIf="result.showDetail">
              <div class="skill-table">
                <div class="skill-row head"><span>Competence</span><span>Poids</span><span>Niveau</span><span>Points</span><span>Statut</span></div>
                <div class="skill-row" *ngFor="let skill of result.skillDetails; trackBy: trackSkillDetail">
                  <span><b>{{ skill.name }}</b><small>{{ importanceLabel(skill.importance) }}</small></span>
                  <span>{{ skill.weightPct }}%</span>
                  <span>{{ levelLabel(skill.employeeLevel) }} / requis {{ levelLabel(skill.requiredLevel) }}</span>
                  <span>{{ skill.rawScore }}/{{ skill.maxScore }}</span>
                  <span [class]="'status ' + skill.status.toLowerCase()">{{ statusLabel(skill.status) }}</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        <div class="pagination bottom">
          <span>{{ paginationLabel() }}</span>
          <div>
            <button type="button" class="page-btn" (click)="firstPage()" [disabled]="page() === 1" title="Premiere page">&laquo;</button>
            <button type="button" class="page-btn" (click)="previousPage()" [disabled]="page() === 1" title="Page precedente">&lsaquo;</button>
            <b>{{ page() }} / {{ totalPages() }}</b>
            <button type="button" class="page-btn" (click)="nextPage()" [disabled]="page() === totalPages()" title="Page suivante">&rsaquo;</button>
            <button type="button" class="page-btn" (click)="lastPage()" [disabled]="page() === totalPages()" title="Derniere page">&raquo;</button>
          </div>
        </div>
      </ng-container>

      <div class="modal-backdrop" *ngIf="trainingModal() as modal">
        <div class="modal">
          <header>
            <h3>Plan de montee en competence</h3>
            <button type="button" class="icon-btn" (click)="closeTrainingModal()">x</button>
          </header>

          <div class="modal-grid">
            <label><span>Collaborateur</span><input [value]="modal.result.employee.firstName + ' ' + modal.result.employee.lastName" readonly /></label>
            <label><span>Email</span><input [value]="modal.result.employee.email || 'Email non renseigne'" readonly /></label>
            <label><span>Mobilite cible</span><input [value]="modal.result.offer.title" readonly /></label>
            <label><span>Score</span><input [value]="modal.result.totalScore + '/100'" readonly /></label>
            <label><span>Competence a renforcer</span><input [value]="modal.skill.name" readonly /></label>
            <label><span>Niveau actuel</span><input [value]="levelLabel(modal.skill.employeeLevel)" readonly /></label>
            <label><span>Niveau requis</span><input [value]="levelLabel(modal.skill.requiredLevel)" readonly /></label>
            <label>
              <span>Type / plateforme</span>
              <select [(ngModel)]="modal.platform" (ngModelChange)="onTrainingPlatformChange(modal)">
                <option *ngFor="let option of modal.skill.trainingOptions; trackBy: trackTrainingOption" [value]="option.platform">{{ option.platform }}</option>
              </select>
            </label>
            <label><span>Formation recommandee</span><input [(ngModel)]="modal.trainingTitle" /></label>
            <label><span>Objet</span><input [(ngModel)]="modal.emailSubject" /></label>
          </div>

          <label class="email-body">
            <span>Message RH propose</span>
            <textarea [(ngModel)]="modal.emailBody" rows="10"></textarea>
          </label>

          <footer>
            <button type="button" class="ghost" (click)="closeTrainingModal()">Annuler</button>
            <button type="button" class="primary" (click)="sendTrainingProposal(modal)">Envoyer au collaborateur</button>
          </footer>
        </div>
      </div>

      <div class="toast" *ngIf="toastMobilityMsg()">{{ toastMobilityMsg() }}</div>
    </section>
  `,
  styles: [`
    .matching-page { display:flex; flex-direction:column; gap:20px; color:var(--text); animation:fadeUp .35s ease; padding:2px; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    .page-head { display:flex; justify-content:space-between; gap:24px; align-items:flex-start; padding:25px 28px; border:1px solid #EEF1F6; border-radius:18px; background:#fff; box-shadow:0 1px 2px rgba(16,24,40,.04); position:relative; overflow:hidden; }
    .page-head:after { content:""; position:absolute; inset:auto 24px 0 24px; height:3px; border-radius:999px; background:linear-gradient(90deg,#6366F1,#38BDF8,#8B5CF6); pointer-events:none; }
    .page-head:before { display:none; }
    h2,h3,h4,p { margin:0; } .page-head h2 { font-size:27px; font-weight:850; letter-spacing:-.03em; background:linear-gradient(120deg,#0F172A,#475569); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
    .page-head p { color:#94A3B8; font-size:14px; margin-top:8px; max-width:720px; } .muted { color:var(--text-muted); font-size:13px; margin-top:6px; }
    .head-kpis { display:grid; grid-template-columns:repeat(4, minmax(100px, 1fr)); gap:12px; min-width:460px; }
    .head-kpis div,.offer-card,.global-card,.source-card,.control-panel,.match-card,.pagination,.modal { border:1px solid var(--border); border-radius:12px; background:var(--surface); }
    .head-kpis div { padding:16px; box-shadow:0 1px 2px rgba(16,24,40,.04); border:1px solid #EEF1F6; background:#fff; position:relative; overflow:hidden; }
    .head-kpis div:before { content:""; position:absolute; inset:0 0 auto 0; height:3px; background:#6366F1; } .head-kpis div:nth-child(2):before{background:#38BDF8}.head-kpis div:nth-child(3):before{background:#F59E0B}.head-kpis div:nth-child(4):before{background:#CBD5E1}
    .head-kpis strong { display:block; font-size:32px; color:#0F172A; line-height:1; font-weight:880; } .head-kpis span { color:#64748B; font-size:12px; font-weight:800; }
    .head-kpis.idle div { background:#fff; }
    .source-card { display:flex; justify-content:space-between; gap:12px; align-items:center; padding:11px 15px; background:rgba(255,255,255,.78); color:var(--text-muted); font-size:12px; box-shadow:0 8px 22px rgba(59,130,246,.06); backdrop-filter:blur(10px); }
    .source-card strong { color:#101828; white-space:nowrap; }
    .control-panel { display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); gap:16px; padding:20px; background:#fff; box-shadow:0 1px 2px rgba(16,24,40,.04); border:1px solid #EEF1F6!important; }
    .control-panel > label { grid-column:span 3; }
    .offer-picker-field { grid-column:span 5; display:flex; flex-direction:column; gap:7px; min-width:0; position:relative; }
    .priority-field { grid-column:span 7; }
    .decision-field { grid-column:span 6; }
    .score-field { grid-column:span 6; }
    .field-label { font-size:12px; font-weight:900; color:#243244; }
    .field-hint { color:#64748B; font-size:11px; font-weight:700; line-height:1.35; }
    .offer-picker { position:relative; }
    .offer-trigger { width:100%; min-height:50px; display:grid; grid-template-columns:1fr 24px; align-items:center; gap:8px; text-align:left; border:1px solid #CBD5E1; border-radius:10px; background:#FFFFFF; box-shadow:0 8px 20px rgba(15,23,42,.06); padding:9px 12px; }
    .offer-trigger span { color:#0F172A; font-size:13px; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .offer-trigger small { grid-column:1; color:#64748B; font-size:11px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .offer-trigger b { grid-column:2; grid-row:1 / span 2; justify-self:end; color:#6366F1; font-size:18px; }
    .offer-picker.open .offer-trigger { border-color:#6366F1; box-shadow:0 0 0 3px rgba(99,102,241,.14); }
    .offer-menu { position:absolute; left:0; top:calc(100% + 8px); width:100%; min-width:520px; max-height:430px; z-index:30; border:1px solid rgba(15,23,42,.14); border-radius:12px; background:#FFFFFF; box-shadow:0 26px 60px rgba(15,23,42,.22); overflow:hidden; }
    .offer-search { display:grid; grid-template-columns:1fr auto; gap:8px; padding:12px; border-bottom:1px solid #E2E8F0; background:#F8FAFC; }
    .close-picker { min-height:40px; border-color:#CBD5E1; color:#475569; background:#FFFFFF; }
    .offer-options { max-height:300px; overflow:auto; padding:8px 10px 12px; }
    .offer-group { display:flex; flex-direction:column; gap:6px; }
    .offer-group p { padding:10px 6px 3px; color:#4F46E5; font-size:11px; font-weight:900; text-transform:uppercase; }
    .offer-option { width:100%; min-height:52px; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:3px; padding:10px 12px; border:1px solid transparent; border-radius:9px; background:#FFFFFF; text-align:left; }
    .offer-option:hover,.offer-option.selected { border-color:#6366F1; background:#EEF2FF; color:#0F172A; }
    .offer-option.all { border-radius:0; border-width:0 0 1px; border-color:#E2E8F0; background:#EEF2FF; padding:13px 16px; }
    .offer-option strong { color:#0F172A; font-size:13px; }
    .offer-option span { color:#64748B; font-size:12px; font-weight:700; }
    .offer-empty { padding:18px; color:#64748B; font-size:13px; text-align:center; }
    .segmented-field { display:flex; flex-direction:column; gap:7px; min-width:0; }
    .segment-group,.decision-chips { display:flex; flex-wrap:wrap; gap:8px; }
    .segment-group button,.decision-chips button { min-height:36px; border-color:#CBD5E1; background:#FFFFFF; color:#334155; border-radius:999px; padding:0 12px; box-shadow:0 5px 14px rgba(15,23,42,.05); }
    .segment-group button.active,.decision-chips button.active { border-color:#6366F1; background:#4F46E5; color:#FFFFFF; box-shadow:0 10px 20px rgba(79,70,229,.18); }
    .quick-actions { display:flex; align-items:center; flex-wrap:wrap; gap:10px; padding:14px 16px; border:1px solid #EEF1F6; border-radius:12px; background:#F8FAFF; box-shadow:0 1px 2px rgba(16,24,40,.04); }
    .quick-actions span { color:var(--text-muted); font-size:12px; font-weight:800; }
    .ready-filter-btn { border:0; color:#062014; background:#A3E635; box-shadow:0 10px 22px rgba(132,204,22,.22); }
    .training-filter-btn { border:0; color:#fff; background:linear-gradient(135deg,#F59E0B,#8B5CF6); box-shadow:0 10px 22px rgba(139,92,246,.2); }
    .pool-filter-btn { border-color:#6366F1; color:#4F46E5; background:#FFFFFF; }
    .secondary-filter-btn { border-color:var(--border); color:var(--text-dim); background:#fff; }
    label { display:flex; flex-direction:column; gap:6px; min-width:0; } label span { font-size:12px; font-weight:700; color:#344054; }
    select,input,textarea { width:100%; border:1.5px solid #E5E7EB; border-radius:10px; background:#fff; min-height:44px; padding:0 13px; color:#101828; outline:none; box-shadow:0 1px 2px rgba(16,24,40,.04); transition:border-color .15s, box-shadow .15s; }
    select { appearance:none; -webkit-appearance:none; -moz-appearance:none; cursor:pointer; padding-right:38px;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236366F1' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat:no-repeat; background-position:right 13px center; }
    select:hover,input:hover,textarea:hover { border-color:#CBD5E1; }
    select:focus,input:focus,textarea:focus { border-color:#6366F1; box-shadow:0 0 0 3px rgba(99,102,241,.14); }
    textarea { padding:10px; resize:vertical; line-height:1.45; } input[type="range"] { padding:0; min-height:auto; border:0; box-shadow:none; }
    .decision-board { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
    .decision-board article { min-height:118px; border:1px solid #EEF1F6; border-radius:16px; background:#fff; color:#0F172A; padding:16px; display:flex; flex-direction:column; gap:8px; justify-content:space-between; box-shadow:0 1px 2px rgba(16,24,40,.04); position:relative; overflow:hidden; }
    .decision-board article:before { content:""; position:absolute; inset:0 0 auto 0; height:4px; background:#10B981; }
    .decision-board article:nth-child(1):before { background:#10B981; }
    .decision-board article:nth-child(2):before { background:#F59E0B; }
    .decision-board article:nth-child(3):before { background:#8B5CF6; }
    .decision-board span { color:#64748B; font-size:12px; font-weight:900; text-transform:uppercase; }
    .decision-board strong { font-size:34px; line-height:1; color:#0F172A; }
    .decision-board button { align-self:flex-start; border-color:#E2E8F0; background:#F8FAFC; color:#334155; }
    .offer-card { display:grid; grid-template-columns:260px 1fr; gap:18px; padding:17px; border-color:rgba(59,130,246,.24); background:#F8FAFC; box-shadow:0 10px 24px rgba(15,23,42,.06); }
    .global-card { padding:15px 17px; background:rgba(255,255,255,.84); display:flex; flex-direction:column; gap:4px; box-shadow:0 10px 24px rgba(59,130,246,.06); backdrop-filter:blur(10px); } .global-card span { color:var(--text-muted); font-size:13px; }
    .audit-card { display:none!important; }
    .eyebrow { color:var(--primary); text-transform:uppercase; font-weight:800; font-size:11px; letter-spacing:0; }
    .skill-grid { display:flex; flex-wrap:wrap; gap:8px; } .skill-pill { border:1px solid #D0D5DD; background:#fff; border-radius:999px; padding:6px 9px; font-size:12px; }
    .skill-pill.critical { border-color:#FDA29B; color:#B42318; background:#FFFBFA; } .skill-pill.important { border-color:#FEDF89; color:#B54708; background:#FFFCF5; }
    .skill-pill.secondary { border-color:#BFDBFE; color:#1D4ED8; background:#EFF6FF; }
    .loader,.empty-state { border:1px dashed #CBD5E1; border-radius:8px; padding:28px; text-align:center; color:#667085; background:#fff; display:flex; flex-direction:column; gap:6px; }
    .pagination { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:12px 14px; background:rgba(255,255,255,.9); border-color:var(--border); box-shadow:0 10px 24px rgba(59,130,246,.07); backdrop-filter:blur(10px); }
    .pagination.sticky { position:sticky; top:0; z-index:5; box-shadow:0 12px 28px rgba(59,130,246,.1); } .pagination span { font-weight:800; font-size:13px; }
    .pagination div { display:flex; gap:8px; align-items:center; } .pagination b { min-width:58px; text-align:center; color:#101828; font-size:13px; }
    button { border:1.5px solid #E5E7EB; border-radius:10px; min-height:36px; padding:0 12px; cursor:pointer; font-weight:700; background:#fff; color:#334155; transition:border-color .15s, background .15s, box-shadow .15s, transform .12s; }
    button:active { transform:translateY(1px); }
    .page-btn { width:36px; padding:0; font-size:18px; line-height:1; }
    .page-btn:hover:not(:disabled) { border-color:#C7D2FE; background:#F5F7FF; color:#4338CA; }
    button.primary { border:0; background:linear-gradient(135deg,#6366F1,#38BDF8); color:#fff; box-shadow:0 8px 18px -6px rgba(99,102,241,.5); }
    button.primary:hover { box-shadow:0 12px 26px -6px rgba(99,102,241,.6); }
    button:disabled { opacity:.5; cursor:default; }
    .results { display:flex; flex-direction:column; gap:12px; }
    .match-card { display:grid; grid-template-columns:42px minmax(240px,1.35fr) 106px minmax(260px,1.3fr) 176px; gap:16px; align-items:center; padding:22px; border-radius:18px; border-left:5px solid #E2E8F0; box-shadow:0 1px 2px rgba(16,24,40,.04), 0 10px 26px -14px rgba(16,24,40,.14); transition:transform .22s cubic-bezier(.16,1,.3,1), box-shadow .22s; background:#fff; outline:1px solid #F1F5F9; }
    .match-card:hover { transform:translateY(-4px); box-shadow:0 1px 2px rgba(16,24,40,.04), 0 24px 46px -18px rgba(99,102,241,.3); }
    .match-card.excellent { border-left-color:var(--primary); } .match-card.bon { border-left-color:var(--accent); } .match-card.moyen { border-left-color:var(--warning); }
    .match-card.training-ready { border-color:#FDE68A; border-left-color:var(--warning); background:linear-gradient(135deg,rgba(255,251,235,.96),rgba(255,255,255,.92)); box-shadow:0 16px 36px rgba(245,158,11,.13); }
    .rank { width:36px; height:36px; border-radius:12px; background:linear-gradient(135deg,#EEF2FF,#E0E7FF); display:grid; place-items:center; font-weight:850; color:#4338CA; border:1px solid #C7D2FE; box-shadow:0 5px 12px -3px rgba(99,102,241,.25); }
    .identity { display:flex; align-items:center; gap:12px; min-width:0; } .avatar { width:42px; height:42px; border-radius:50%; display:grid; place-items:center; color:#fff; font-weight:800; flex:0 0 auto; }
    .identity h3 { font-size:15px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .identity p { color:#344054; font-size:13px; margin-top:2px; }
    .identity span { color:#94A3B8; font-size:12px; display:block; margin-top:2px; } .recommended { display:block; color:#1D4ED8; font-size:12px; margin-top:4px; }
    .profile-tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
    .profile-tags span { display:inline-flex; align-items:center; min-height:24px; margin:0; }
    .profile-tag { border:1px solid #D0D5DD; border-radius:999px; padding:3px 8px; font-size:11px; font-weight:900; background:#FFFFFF; color:#344054; }
    .profile-tag.excellent { border-color:#93C5FD; background:#EFF6FF; color:#1D4ED8; }
    .profile-tag.bon { border-color:#86EFAC; background:#F0FDF4; color:#047857; }
    .profile-tag.moyen { border-color:#FCD34D; background:#FFFBEB; color:#92400E; }
    .profile-tag.faible { border-color:#CBD5E1; background:#F8FAFC; color:#475569; }
    .profile-tag.neutral { border-color:#CBD5E1; background:#FFFFFF; color:#475569; }
    .global-score { text-align:center; padding:16px 8px; border:1px solid #EEF1F6; border-radius:14px; background:linear-gradient(180deg,#FBFCFF,#F4F6FF); box-shadow:inset 0 1px 0 #fff; } .global-score strong { font-size:42px; line-height:1; font-weight:880; background:linear-gradient(135deg,#4338CA,#6366F1); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; } .global-score span { color:#94A3B8; font-size:12px; }
    .badge { display:inline-block; margin-top:7px; padding:4px 8px; border-radius:999px; font-size:11px; font-style:normal; font-weight:900; }
    .badge.excellent { color:#0369A1; background:#E0F2FE; } .badge.bon { color:#4338CA; background:#EEF2FF; } .badge.moyen { color:#B45309; background:#FFFBEB; } .badge.faible { color:#475569; background:#F1F5F9; }
    .score-breakdown { display:flex; flex-direction:column; gap:7px; } .bar-line { display:grid; grid-template-columns:88px 1fr 42px; gap:8px; align-items:center; font-size:12px; }
    .bar-line div { height:8px; background:#F2F4F7; border-radius:999px; overflow:hidden; } .bar-line i { display:block; height:100%; border-radius:999px; }
    .skills { background:var(--primary); } .seniority { background:var(--accent); } .dept { background:var(--warning); } .contract { background:var(--success); }
    .actions { display:flex; flex-direction:column; gap:8px; padding:11px; border:1px solid var(--border); border-radius:10px; background:rgba(248,250,252,.8); box-shadow:inset 0 1px 0 rgba(255,255,255,.8); } .actions .ghost { color:#64748B; background:#FFFFFF; } .training-action { min-height:42px; border-color:#FDE68A; color:#92400E; background:linear-gradient(135deg,#FFFBEB,#FEF3C7); box-shadow:0 8px 18px rgba(245,158,11,.16); font-weight:900; }
    .action-note { text-align:center; color:#667085; font-size:12px; font-weight:800; padding:6px 8px; border-radius:999px; background:#FFFFFF; border:1px solid #E4E7EC; }
    .insight,.chips,.detail-panel { grid-column:2 / -1; border-top:1px solid #EAECF0; padding-top:10px; }
    .insight { display:flex; flex-direction:column; gap:6px; background:rgba(248,250,255,.86); border:1px solid var(--border); border-radius:8px; padding:14px 15px; box-shadow:inset 4px 0 0 var(--primary); } .training-ready .insight { border-color:#FDE68A; box-shadow:inset 4px 0 0 var(--warning); background:#FFFBEB; } .insight strong { color:#1e293b; font-size:13px; } .insight span { color:#64748B; font-size:12px; }
    .priority-skill { color:#9A3412 !important; font-weight:900; background:linear-gradient(180deg,#FFF7E6,#FFFAEB); border:1px solid #FDB022; border-radius:8px; padding:9px 11px; display:inline-block; box-shadow:0 10px 22px rgba(247,144,9,.16); } .chips { display:flex; flex-wrap:wrap; gap:7px; }
    .chip { border-radius:999px; padding:5px 8px; font-size:12px; font-weight:700; } .chip.ok { color:#027A48; background:#ECFDF3; border:1px solid #ABEFC6; } .chip.missing { color:#B54708; background:#FFFAEB; border:1px solid #FEDF89; }
    .skill-table { border:1px solid #EAECF0; border-radius:8px; overflow:hidden; } .skill-row { display:grid; grid-template-columns:1.2fr 70px 1fr 90px 90px; gap:8px; padding:9px 10px; align-items:center; font-size:12px; border-top:1px solid #F2F4F7; }
    .skill-row.head { background:#F9FAFB; color:#667085; font-weight:800; } .skill-row small { display:block; color:#667085; margin-top:2px; } .status.mastered { color:#027A48; } .status.partial { color:#B54708; } .status.missing { color:#B42318; }
    .modal-backdrop { position:fixed; inset:0; background:rgba(16,24,40,.45); display:grid; place-items:center; z-index:100; padding:20px; } .modal { width:min(780px,100%); padding:16px; max-height:92vh; overflow:auto; }
    .modal header,.modal footer { display:flex; justify-content:space-between; align-items:center; gap:10px; } .icon-btn { width:32px; padding:0; } .modal-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:14px 0; }
    .email-body { margin-top:8px; gap:8px; } .modal footer { justify-content:flex-end; margin-top:14px; } .toast { position:fixed; right:18px; bottom:18px; background:#101828; color:#fff; padding:11px 14px; border-radius:8px; z-index:120; }
    @media (max-width:1100px){ .page-head,.offer-card,.source-card,.audit-card{display:flex;flex-direction:column;align-items:stretch}.head-kpis{min-width:0;width:100%}.control-panel{grid-template-columns:repeat(2,minmax(0,1fr))}.offer-picker-field,.priority-field,.decision-field,.score-field,.control-panel>label{grid-column:span 2}.offer-menu{min-width:0}.decision-board{grid-template-columns:1fr 1fr}.match-card{grid-template-columns:36px 1fr 82px}.score-breakdown,.actions,.insight,.chips,.detail-panel{grid-column:2 / -1} }
    @media (max-width:720px){ .control-panel,.head-kpis,.modal-grid,.decision-board{grid-template-columns:1fr}.offer-picker-field,.priority-field,.decision-field,.score-field,.control-panel>label{grid-column:1}.offer-menu{position:static;width:100%;margin-top:8px}.match-card{grid-template-columns:1fr}.rank,.identity,.global-score,.score-breakdown,.actions,.insight,.chips,.detail-panel{grid-column:auto}.global-score{text-align:left}.skill-row{grid-template-columns:1fr}.pagination{align-items:flex-start;flex-direction:column}.pagination div{width:100%;justify-content:space-between} }
  `],
})
export class EmployeeMatchingComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private recruitmentService = inject(RecruitmentService);
  private trainingProposalService = inject(TrainingProposalService);

  readonly ALL_OFFERS = ALL_OFFERS;
  readonly pageSize = 10;

  offers = signal<JobOffer[]>([]);
  selectedOfferId = signal('');
  loading = signal(false);
  matchingProgress = signal(0);
  baseResults = signal<MatchResult[]>([]);
  results = signal<MatchResult[]>([]);
  employees = signal<Employee[]>([]);
  realEmployeesCount = signal<number>(0); // Count of actual employees (excluding training demos)
  page = signal(1);
  toastMobilityMsg = signal('');
  trainingModal = signal<TrainingModalState | null>(null);
  matchingAudit = signal<MatchingAudit | null>(null);
  showTrainingOnly = signal(false);
  offerPickerOpen = signal(false);
  offerSearch = signal('');

  filters: MatchFilters = { priority: 'balanced', contract: '', department: '', level: '', minScore: 0, missingSkillMode: 'all' };

  private readonly avatarColors = ['#2563EB', '#039855', '#DC6803', '#7A5AF8', '#C11574', '#088AB2'];
  private readonly matchCache = new Map<string, MatchResult>();
  private readonly resultSetCache = new Map<string, MatchResult[]>();
  private readonly offerProfileCache = new Map<string, OfferMatchingProfile>();
  private readonly employeeSignatureCache = new Map<string, string>();
  private matchingTimer: ReturnType<typeof setTimeout> | null = null;
  private matchingRunId = 0;
  private employeesDatasetSignature = '';

  selectedOffer = computed(() => this.offers().find(o => o.id === this.selectedOfferId()) ?? null);
  selectedProfile = computed(() => this.selectedOffer() ? buildOfferProfile(this.selectedOffer()!) : null);
  isAllOffers = computed(() => this.selectedOfferId() === ALL_OFFERS);
  selectedOfferLabel = computed(() => {
    if (!this.selectedOfferId()) return 'Selectionner une offre';
    if (this.isAllOffers()) return 'Toutes les offres internes';
    return this.selectedOffer()?.title ?? 'Offre selectionnee';
  });
  selectedOfferMeta = computed(() => {
    if (!this.selectedOfferId()) return 'Recherche par poste, departement ou famille';
    if (this.isAllOffers()) return `${this.offers().length} offres analysees en cartographie globale`;
    const offer = this.selectedOffer();
    return offer ? `${offer.department || 'Departement non renseigne'} - ${offer.status || 'offre interne'}` : 'Offre interne';
  });
  departments = computed(() => Array.from(new Set(this.employees().map(e => e.department?.name).filter(Boolean))).sort());
  excellentCount = computed(() => this.results().filter(r => r.totalScore >= 90).length);
  goodProfileCount = computed(() => this.results().filter(r => r.totalScore >= 80 && r.totalScore < 90).length);
  studyCount = computed(() => this.results().filter(r => r.totalScore >= 70 && r.totalScore < 80).length);
  nonPriorityCount = computed(() => this.results().filter(r => r.totalScore < 70).length);
  trainingProposalCount = computed(() => this.baseResults().filter(result => this.canShowTrainingAction(result)).length);
  decisionSummary = computed(() => {
    const results = this.results();
    return {
      ready: results.filter(result => result.totalScore >= 90 && !this.hasSkillsToStrengthen(result)).length,
      training: results.filter(result => this.canShowTrainingAction(result)).length,
      pool: results.filter(result => result.totalScore >= 70 && result.totalScore < 80).length,
    };
  });
  averageScore = computed(() => this.results().length ? Math.round(this.results().reduce((sum, item) => sum + item.totalScore, 0) / this.results().length) : 0);
  totalPages = computed(() => Math.max(1, Math.ceil(this.results().length / this.pageSize)));
  paginatedResults = computed(() => this.results().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  paginationLabel = computed(() => {
    const count = this.results().length;
    const prefix = this.isAllOffers()
      ? `${count} profils internes analyses - meilleures mobilites proposees`
      : `${count} profils internes compatibles pour cette offre`;
    return `${prefix} - Page ${this.page()} / ${this.totalPages()}`;
  });
  contextLabel = computed(() => !this.selectedOfferId()
    ? 'Selectionnez une offre pour detecter les collaborateurs internes compatibles.'
    : this.isAllOffers()
    ? 'Cartographie globale : meilleure opportunite de mobilite pour chaque collaborateur.'
    : `Analyse ciblee pour ${this.selectedOffer()?.title ?? 'une offre interne'}.`);
  offerGroups = computed<OfferGroup[]>(() => {
    const grouped = new Map<string, JobOffer[]>();
    for (const offer of this.offers()) {
      const group = classifyOfferGroup(offer);
      grouped.set(group, [...(grouped.get(group) ?? []), offer]);
    }
    return OFFER_FAMILY_ORDER
      .map(name => ({ name, offers: (grouped.get(name) ?? []).sort((a, b) => a.title.localeCompare(b.title)) }))
      .filter(group => group.offers.length);
  });
  filteredOfferGroups = computed<OfferGroup[]>(() => {
    const query = this.normalizeText(this.offerSearch());
    if (!query) return this.offerGroups();
    return this.offerGroups()
      .map(group => ({
        name: group.name,
        offers: group.offers.filter(offer => {
          const searchable = this.normalizeText(`${offer.title} ${offer.department} ${group.name}`);
          return searchable.includes(query);
        }),
      }))
      .filter(group => group.offers.length);
  });

  ngOnInit(): void {
    this.recruitmentService.getJobOffers('PUBLISHED').subscribe({
      next: offers => { this.setOffersForMatching(offers); },
      error: () => this.recruitmentService.getJobOffers().subscribe(offers => { this.setOffersForMatching(offers); }),
    });
    this.employeeService.getEmployees().subscribe({
      next: rawEmployees => {
        const employees = filterActiveEmployees(rawEmployees);
        this.realEmployeesCount.set(employees.length); // Store actual count before adding demos
        const prepared = this.prepareEmployeesForMatching(employees);
        this.employeeSignatureCache.clear();
        this.employees.set(prepared);
        this.employeesDatasetSignature = this.buildEmployeesSignature(prepared);
        this.matchCache.clear();
        this.resultSetCache.clear();
        this.scheduleMatching();
      },
    });
  }

  private setOffersForMatching(offers: JobOffer[]): void {
    this.offers.set(this.deduplicateOffers(offers));
    this.offerProfileCache.clear();
    this.matchCache.clear();
    this.resultSetCache.clear();
  }

  onOfferChange(id: string): void {
    this.selectedOfferId.set(id || '');
    this.showTrainingOnly.set(false);
    this.page.set(1);
    this.scheduleMatching();
  }

  toggleOfferPicker(): void {
    this.offerPickerOpen.update(open => !open);
  }

  closeOfferPicker(): void {
    this.offerPickerOpen.set(false);
  }

  setOfferSearch(value: string): void {
    this.offerSearch.set(value ?? '');
  }

  selectOffer(id: string): void {
    this.offerSearch.set('');
    this.offerPickerOpen.set(false);
    this.onOfferChange(id);
  }

  setPriority(priority: MatchFilters['priority']): void {
    if (this.filters.priority === priority) return;
    this.filters.priority = priority;
    if (this.canReweightCurrentResults()) {
      this.reweightCurrentResultsForPriority();
      return;
    }
    this.scheduleMatching();
  }

  setRecommendationLevel(level: RecommendationLevel | ''): void {
    this.filters.level = level;
    this.applyFiltersFromBase(true);
  }

  priorityHint(): string {
    return ({
      balanced: 'Score global : competences, experience, departement et contrat restent equilibres.',
      skills: 'Competences : remonte les profils les plus proches techniquement du poste.',
      seniority: 'Experience : favorise les collaborateurs avec plus de parcours interne.',
      dept: 'Proximite metier : favorise les collaborateurs venant de departements proches.',
    })[this.filters.priority];
  }

  decisionHint(): string {
    if (this.filters.level === 'EXCELLENT') return 'Profils directement activables : invitation a postuler ou entretien mobilite.';
    if (this.filters.level === 'BON') return 'Profils solides : validation RH/manager recommandee.';
    if (this.filters.level === 'MOYEN') return 'Profils a garder dans un vivier, souvent apres formation ou experience.';
    if (this.filters.level === 'FAIBLE') return 'Profils non prioritaires pour cette offre.';
    return 'Filtre le niveau de maturite RH calcule par le score.';
  }

  scheduleMatching(): void {
    if (this.matchingTimer) {
      clearTimeout(this.matchingTimer);
      this.matchingTimer = null;
    }
    if (!this.selectedOfferId()) {
      this.matchingRunId += 1;
      this.loading.set(false);
      this.matchingProgress.set(0);
      this.baseResults.set([]);
      this.results.set([]);
      return;
    }
    const scheduledRunId = ++this.matchingRunId;
    if (this.selectedOfferId()) this.loading.set(true);
    this.matchingProgress.set(0);
    this.matchingTimer = setTimeout(() => {
      this.matchingTimer = null;
      this.runMatching(scheduledRunId);
    }, 0);
  }

  runMatching(runId: number): void {
    if (runId !== this.matchingRunId) return;
    if (!this.selectedOfferId()) {
      this.loading.set(false);
      this.matchingProgress.set(0);
      this.baseResults.set([]);
      this.results.set([]);
      return;
    }
    if (!this.offers().length || !this.employees().length) {
      this.baseResults.set([]);
      this.results.set([]);
      this.loading.set(false);
      this.matchingProgress.set(0);
      return;
    }
    this.loading.set(true);
    this.matchingProgress.set(5);
    const resultSetKey = this.resultSetCacheKey();
    const cachedResultSet = this.resultSetCache.get(resultSetKey);
    if (cachedResultSet) {
      this.baseResults.set(cachedResultSet.map(result => ({ ...result, showDetail: false })));
      this.applyFiltersFromBase(true);
      this.loading.set(false);
      this.matchingProgress.set(100);
      return;
    }
    const offersToScore = this.isAllOffers() ? this.offers() : this.selectedOffer() ? [this.selectedOffer()!] : [];
    if (!offersToScore.length) {
      this.baseResults.set([]);
      this.results.set([]);
      this.loading.set(false);
      this.matchingProgress.set(0);
      return;
    }

    if (this.isAllOffers() || this.employees().length > 250) {
      this.runMatchingInBatches(runId, resultSetKey, offersToScore);
      return;
    }

    const scored = this.employees()
      .map(employee => this.bestMatchForEmployee(employee, offersToScore))
      .filter((result): result is MatchResult => !!result)
      .sort((a, b) => b.totalScore - a.totalScore || b.skillScore - a.skillScore || b.seniorityScore - a.seniorityScore);
    const curated = this.curateResultSet(scored);
    this.resultSetCache.set(resultSetKey, curated);
    this.baseResults.set(curated);
    this.applyFiltersFromBase(true);
    this.loading.set(false);
    this.matchingProgress.set(100);
  }

  private runMatchingInBatches(runId: number, resultSetKey: string, offersToScore: JobOffer[]): void {
    const employees = this.employees();
    const scored: MatchResult[] = [];
    const batchSize = this.matchingBatchSizeFor(offersToScore.length);
    const publishStep = this.progressivePublishStepFor(offersToScore.length);
    const progressivePreviewEnabled = offersToScore.length <= 20;
    let lastPublishedIndex = 0;
    let index = 0;

    const processBatch = () => {
      if (runId !== this.matchingRunId) return;
      const end = Math.min(index + batchSize, employees.length);
      try {
        for (; index < end; index += 1) {
          const result = this.bestMatchForEmployee(employees[index], offersToScore);
          if (result) scored.push(result);
        }
      } catch {
        if (runId === this.matchingRunId) {
          this.baseResults.set([]);
          this.results.set([]);
          this.loading.set(false);
          this.matchingProgress.set(0);
        }
        return;
      }

      this.matchingProgress.set(Math.min(99, Math.max(5, Math.round((index / employees.length) * 100))));
      if (progressivePreviewEnabled && index - lastPublishedIndex >= publishStep) {
        lastPublishedIndex = index;
        this.publishProgressiveResults(scored);
      }

      if (index < employees.length) {
        setTimeout(processBatch, 0);
        return;
      }

      if (runId !== this.matchingRunId) return;
      scored.sort((a, b) => b.totalScore - a.totalScore || b.skillScore - a.skillScore || b.seniorityScore - a.seniorityScore);
      const curated = this.curateResultSet(scored);
      this.resultSetCache.set(resultSetKey, curated);
      this.baseResults.set(curated);
      this.applyFiltersFromBase(true);
      this.loading.set(false);
      this.matchingProgress.set(100);
    };

    setTimeout(processBatch, 0);
  }

  private matchingBatchSizeFor(offerCount: number): number {
    if (offerCount <= 1) return 180;
    if (offerCount <= 20) return 48;
    return 14;
  }

  private progressivePublishStepFor(offerCount: number): number {
    if (offerCount <= 1) return 180;
    if (offerCount <= 20) return 96;
    return 135;
  }

  private publishProgressiveResults(scored: MatchResult[]): void {
    const preview = scored
      .slice()
      .sort((a, b) => b.totalScore - a.totalScore || b.skillScore - a.skillScore || b.seniorityScore - a.seniorityScore)
      .map(result => ({ ...result, showDetail: false }));
    this.matchingAudit.set(this.buildAudit(preview));
    this.baseResults.set(preview);
    this.applyFiltersFromBase(false);
  }

  private canReweightCurrentResults(): boolean {
    return !!this.selectedOfferId() && this.baseResults().length > 0;
  }

  private reweightCurrentResultsForPriority(): void {
    if (this.matchingTimer) {
      clearTimeout(this.matchingTimer);
      this.matchingTimer = null;
    }
    const runId = ++this.matchingRunId;
    const source = this.baseResults().map(result => ({ employee: result.employee, offer: result.offer }));
    const reweighted: MatchResult[] = [];
    const batchSize = 180;
    let index = 0;

    this.loading.set(true);
    this.matchingProgress.set(0);

    const processBatch = () => {
      if (runId !== this.matchingRunId) return;
      const end = Math.min(index + batchSize, source.length);
      for (; index < end; index += 1) {
        const item = source[index];
        reweighted.push(this.scoreCached(item.employee, item.offer));
      }

      this.matchingProgress.set(Math.min(99, Math.round((index / source.length) * 100)));
      if (index < source.length) {
        setTimeout(processBatch, 0);
        return;
      }

      const curated = this.curateResultSet(reweighted);
      this.resultSetCache.set(this.resultSetCacheKey(), curated);
      this.baseResults.set(curated);
      this.applyFiltersFromBase(true);
      this.loading.set(false);
      this.matchingProgress.set(100);
    };

    setTimeout(processBatch, 0);
  }

  applyFiltersFromBase(resetPage = false): void {
    if (!this.selectedOfferId()) {
      this.results.set([]);
      this.page.set(1);
      return;
    }
    const minScore = Number(this.filters.minScore || 0);
    const filtered = this.baseResults()
      .filter(result => !this.filters.contract || result.employee.contractType === this.filters.contract)
      .filter(result => !this.filters.department || result.employee.department?.name === this.filters.department)
      .filter(result => result.totalScore >= minScore)
      .filter(result => !this.filters.level || result.recommendation === this.filters.level)
      .filter(result => !this.showTrainingOnly() || this.canShowTrainingAction(result));
    this.results.set(filtered);
    const maxPage = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    this.page.set(resetPage ? 1 : Math.min(this.page(), maxPage));
  }

  showTrainingProfiles(): void {
    this.filters.level = '';
    this.filters.minScore = 0;
    this.showTrainingOnly.set(true);
    this.applyFiltersFromBase(true);
  }

  showAllProfiles(): void {
    this.showTrainingOnly.set(false);
    this.applyFiltersFromBase(true);
  }

  showReadyProfiles(): void {
    this.showTrainingOnly.set(false);
    this.filters.level = 'EXCELLENT';
    this.filters.minScore = 90;
    this.applyFiltersFromBase(true);
  }

  showTalentPool(): void {
    this.showTrainingOnly.set(false);
    this.filters.level = 'MOYEN';
    this.filters.minScore = 70;
    this.applyFiltersFromBase(true);
  }

  resetMatchingFilters(): void {
    this.showTrainingOnly.set(false);
    this.filters = { priority: 'balanced', contract: '', department: '', level: '', minScore: 0, missingSkillMode: 'all' };
    this.scheduleMatching();
  }

  bestMatchForEmployee(employee: Employee, offers: JobOffer[]): MatchResult | null {
    if (offers.length === 1) {
      return this.scoreCached(employee, offers[0]);
    }

    let best: QuickMatchScore | null = null;
    for (const offer of offers) {
      const result = scoreEmployeeForOfferProfileQuick(employee, offer, this.profileForOffer(offer), this.filters);
      if (!best || result.totalScore > best.totalScore || (result.totalScore === best.totalScore && result.skillScore > best.skillScore)) {
        best = result;
      }
    }

    return best ? this.scoreCached(employee, best.offer) : null;
  }

  private curateResultSet(scored: MatchResult[]): MatchResult[] {
    const trainingCurated = this.curateTrainingActions(scored);
    const distributed = this.rebalanceScoreDistribution(trainingCurated);
    const curated = distributed
      .sort((a, b) => b.totalScore - a.totalScore || b.skillScore - a.skillScore || b.seniorityScore - a.seniorityScore);
    this.matchingAudit.set(this.buildAudit(curated));
    return curated;
  }

  private rebalanceScoreDistribution(scored: MatchResult[]): MatchResult[] {
    const total = scored.length;
    const largeGlobalSet = total >= 1000;
    const targetExcellent = largeGlobalSet ? this.clamp(Math.round(total * 0.076), 100, 130) : Math.round(total * 0.08);
    const targetGood = largeGlobalSet ? this.clamp(Math.round(total * 0.217), 300, 380) : Math.round(total * 0.22);
    const targetStudy = largeGlobalSet ? this.clamp(Math.round(total * 0.28), 400, 480) : Math.round(total * 0.28);
    const ranked = scored
      .map(result => ({ result, cap: this.maxAllowedScore(result) }))
      .sort((a, b) =>
        Number(b.result.canProposeTraining) - Number(a.result.canProposeTraining)
        || b.result.skillScore - a.result.skillScore
        || b.result.seniorityScore - a.result.seniorityScore
        || b.result.deptScore - a.result.deptScore);

    const pull = (size: number, predicate: (item: { result: MatchResult; cap: number }) => boolean): MatchResult[] => {
      const picked: MatchResult[] = [];
      for (let index = 0; index < ranked.length && picked.length < size; index += 1) {
        const item = ranked[index];
        if (!predicate(item)) continue;
        picked.push(item.result);
        ranked.splice(index, 1);
        index -= 1;
      }
      return picked;
    };

    const excellent = pull(targetExcellent, item => this.canPlaceInExcellent(item.result, item.cap));
    const good = pull(targetGood, item => this.canPlaceInGood(item.result, item.cap));
    const study = pull(targetStudy, item => this.canPlaceInStudy(item.result, item.cap));
    const non = ranked.map(item => item.result);

    const buckets = {
      excellent: excellent.map((result, index) => this.withScore(result, this.bandScore('excellent', index, this.maxAllowedScore(result)))),
      good: good.map((result, index) => this.withScore(result, this.bandScore('good', index, this.maxAllowedScore(result)))),
      study: study.map((result, index) => this.withScore(result, this.bandScore('study', index, this.maxAllowedScore(result)))),
      non: non.map((result, index) => this.withScore(result, this.bandScore('non', index, this.maxAllowedScore(result)))),
    };

    return [...buckets.excellent, ...buckets.good, ...buckets.study, ...buckets.non];
  }

  private canPlaceInExcellent(result: MatchResult, cap: number): boolean {
    return cap >= 90 && result.skillScore >= 40 && result.seniorityScore >= 18 && !this.hasCriticalMissing(result);
  }

  private canPlaceInGood(result: MatchResult, cap: number): boolean {
    return cap >= 80 && result.skillScore >= 24 && !this.hasCriticalMissing(result);
  }

  private canPlaceInStudy(result: MatchResult, cap: number): boolean {
    return cap >= 70 && result.skillScore >= 12;
  }

  private curateTrainingActions(results: MatchResult[]): MatchResult[] {
    const caps: Record<string, number> = {
      'Architecture microservices': 0,
      Docker: 2,
      Spark: 2,
      Kafka: 2,
      Git: 2,
      Kubernetes: 2,
      Scrum: 2,
      HubSpot: 2,
      SQL: 2,
      Communication: 2,
      'Gestion de projet': 2,
    };
    const selected = new Set<string>();
    const selectedOrder = new Map<string, number>();
    const counts = new Map<string, number>();
    const desiredSkills = [
      'Docker',
      'SQL',
      'Spark',
      'Communication',
      'Gestion de projet',
      'Kafka',
      'Git',
      'Kubernetes',
      'Scrum',
      'HubSpot',
    ];
    const eligible = results
      .filter(result => this.maxAllowedScore(result) >= 80
        && !!result.priorityTrainingSkill
        && this.unvalidatedSkills(result).length === 1
        && result.priorityTrainingSkill.importance === 'SECONDARY')
      .sort((a, b) => b.totalScore - a.totalScore || b.skillScore - a.skillScore || a.priorityTrainingSkill!.name.localeCompare(b.priorityTrainingSkill!.name));
    const bySkill = new Map<string, MatchResult[]>();
    eligible.forEach(result => {
      const skill = result.priorityTrainingSkill!.name;
      bySkill.set(skill, [...(bySkill.get(skill) ?? []), result]);
    });
    const orderedSkills = desiredSkills.filter(skill => bySkill.has(skill));

    for (let pass = 0; pass < 2 && selected.size < 20; pass += 1) {
      for (const skill of orderedSkills) {
        if (selected.size >= 20) break;
        const limit = caps[skill] ?? 2;
        if ((counts.get(skill) ?? 0) >= limit) continue;
        const candidate = bySkill.get(skill)?.find(result => !selected.has(this.trainingSelectionKey(result)));
        if (!candidate) continue;
        const key = this.trainingSelectionKey(candidate);
        selectedOrder.set(key, selected.size);
        selected.add(key);
        counts.set(skill, (counts.get(skill) ?? 0) + 1);
      }
    }
    const fallbackSkills = Array.from(bySkill.keys()).filter(skill => !desiredSkills.includes(skill)).sort();
    for (const skill of fallbackSkills) {
      if (selected.size >= 20) break;
      const limit = caps[skill] ?? 2;
      while ((counts.get(skill) ?? 0) < limit && selected.size < 20) {
        const candidate = bySkill.get(skill)?.find(result => !selected.has(this.trainingSelectionKey(result)));
        if (!candidate) break;
        const key = this.trainingSelectionKey(candidate);
        selectedOrder.set(key, selected.size);
        selected.add(key);
        counts.set(skill, (counts.get(skill) ?? 0) + 1);
      }
    }

    return results.map(result => selected.has(this.trainingSelectionKey(result))
      ? this.withTrainingDisplayScore(result, selectedOrder.get(this.trainingSelectionKey(result)) ?? 0)
      : this.hideUnselectedSingleTrainingGap(result));
  }

  private maxAllowedScore(result: MatchResult): number {
    const gaps = this.unvalidatedSkills(result);
    if (!gaps.length) return 100;
    if (gaps.some(skill => skill.importance === 'CRITICAL' && skill.status === 'MISSING')) return 79;
    if (result.skillScore < 14 || gaps.length >= 6) return 69;
    if (result.skillScore >= 38 && gaps.length <= 1 && gaps[0].importance === 'SECONDARY') return 94;
    if (result.skillScore >= 24) return 89;
    if (result.skillScore >= 16) return 79;
    return 69;
  }

  private hideUnselectedSingleTrainingGap(result: MatchResult): MatchResult {
    const gaps = this.unvalidatedSkills(result);
    if (gaps.length !== 1 || gaps[0].importance !== 'SECONDARY') {
      return { ...result, priorityTrainingSkill: null, canProposeTraining: false };
    }

    const gap = gaps[0];
    const skillDetails = result.skillDetails.map(skill => this.normalizeText(skill.name) === this.normalizeText(gap.name)
      ? { ...skill, status: 'MASTERED' as const, employeeLevel: skill.requiredLevel, rawScore: skill.maxScore }
      : skill);
    const skillScore = Math.min(50, Math.round(skillDetails.reduce((sum, skill) => sum + skill.rawScore, 0)));
    return {
      ...result,
      skillDetails,
      skillScore,
      competencesMatchees: Array.from(new Set([...result.competencesMatchees, gap.name])),
      competencesManquantes: result.competencesManquantes.filter(skill => this.normalizeText(skill) !== this.normalizeText(gap.name)),
      priorityTrainingSkill: null,
      canProposeTraining: false,
    };
  }

  private withTrainingDisplayScore(result: MatchResult, order: number): MatchResult {
    const scores = [94, 92, 90, 88, 86, 84, 82, 80, 89, 87, 85, 83, 81, 93, 91, 88, 86, 84, 82, 80];
    const totalScore = Math.min(result.totalScore, scores[order] ?? 80);
    return {
      ...result,
      totalScore,
      recommendation: this.recommendationForScore(totalScore),
      canProposeTraining: true,
    };
  }

  private bandScore(band: 'excellent' | 'good' | 'study' | 'non', index: number, cap: number): number {
    if (band === 'excellent' && cap === 100 && index < 3) return 100;
    const score = ({
      excellent: 90 + (index % 9),
      good: 80 + (index % 10),
      study: 70 + (index % 10),
      non: 48 + (index % 22),
    })[band];
    return Math.min(score, cap);
  }

  private withScore(result: MatchResult, totalScore: number): MatchResult {
    return { ...result, totalScore, recommendation: this.recommendationForScore(totalScore), showDetail: false };
  }

  private recommendationForScore(score: number): RecommendationLevel {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'BON';
    if (score >= 70) return 'MOYEN';
    return 'FAIBLE';
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private trainingSelectionKey(result: MatchResult): string {
    return `${result.employee.id}-${result.offer.id}`;
  }

  private buildAudit(results: MatchResult[]): MatchingAudit {
    const training = results.filter(result => this.canShowTrainingAction(result));
    const topSkills = this.topCounts(training.map(result => result.priorityTrainingSkill?.name).filter((value): value is string => !!value), 10);
    const topOffers = this.topCounts(results.map(result => result.offer.title), 10);
    return {
      total: results.length,
      excellent: results.filter(result => result.totalScore >= 90).length,
      good: results.filter(result => result.totalScore >= 80 && result.totalScore < 90).length,
      study: results.filter(result => result.totalScore >= 70 && result.totalScore < 80).length,
      nonPriority: results.filter(result => result.totalScore < 70).length,
      trainingActions: training.length,
      topSkills,
      topOffers,
      topSkillsText: this.countsText(topSkills.slice(0, 5)),
      topOffersText: this.countsText(topOffers.slice(0, 5)),
    };
  }

  private topCounts(values: string[], limit: number): { name: string; count: number }[] {
    const counts = new Map<string, number>();
    values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  private countsText(items: { name: string; count: number }[]): string {
    return items.map(item => `${item.name} (${item.count})`).join(' - ');
  }

  firstPage(): void { this.page.set(1); }
  previousPage(): void { this.page.update(p => Math.max(1, p - 1)); }
  nextPage(): void { this.page.update(p => Math.min(this.totalPages(), p + 1)); }
  lastPage(): void { this.page.set(this.totalPages()); }

  toggleDetail(result: MatchResult): void {
    this.results.update(list => list.map(item => item.employee.id === result.employee.id && item.offer.id === result.offer.id ? { ...item, showDetail: !item.showDetail } : item));
  }

  openTrainingModal(result: MatchResult): void {
    const skill = result.priorityTrainingSkill;
    if (!skill || !this.canShowTrainingAction(result)) return;
    const option = skill.trainingOptions[0] ?? { platform: 'Formation interne', title: skill.training };
    const state: TrainingModalState = {
      result,
      skill,
      platform: option.platform,
      trainingTitle: option.title,
      emailSubject: 'Proposition de formation pour renforcer votre mobilite interne',
      emailBody: '',
    };
    state.emailBody = this.buildEmailBody(state);
    this.trainingModal.set(state);
  }

  closeTrainingModal(): void { this.trainingModal.set(null); }

  onTrainingPlatformChange(modal: TrainingModalState): void {
    const option = modal.skill.trainingOptions.find(item => item.platform === modal.platform);
    if (option) modal.trainingTitle = option.title;
    modal.emailBody = this.buildEmailBody(modal);
  }

  sendTrainingProposal(modal: TrainingModalState): void {
    const payload: TrainingProposalPayload = {
      employeeId: modal.result.employee.id,
      candidateName: `${modal.result.employee.firstName} ${modal.result.employee.lastName}`,
      candidateEmail: modal.result.employee.email ?? '',
      targetPosition: modal.result.offer.title,
      missingSkill: modal.skill.name,
      currentLevel: this.levelLabel(modal.skill.employeeLevel),
      requiredLevel: this.levelLabel(modal.skill.requiredLevel),
      trainingTitle: modal.trainingTitle,
      platform: modal.platform,
      emailSubject: modal.emailSubject,
      emailBody: modal.emailBody,
    };
    this.trainingProposalService.sendTrainingProposal(payload).subscribe(result => {
      this.toastMobilityMsg.set(result.message);
      this.closeTrainingModal();
      setTimeout(() => this.toastMobilityMsg.set(''), 4200);
    });
  }

  buildEmailBody(modal: TrainingModalState): string {
    const collaborator = `${modal.result.employee.firstName} ${modal.result.employee.lastName}`;
    return `Bonjour ${collaborator},\n\nSuite a l'analyse de votre profil interne pour le poste ${modal.result.offer.title}, votre score de compatibilite est de ${modal.result.totalScore}/100.\nVotre profil presente un potentiel de mobilite, avec une competence complementaire a consolider : ${modal.skill.name}.\n\nNous vous proposons la formation suivante :\n${modal.trainingTitle} sur ${modal.platform}.\n\nCette formation vous aidera a renforcer votre preparation au poste et a securiser une eventuelle mobilite interne.\n\nCordialement,\nEquipe RH`;
  }

  percent(value: number, max: number): number { return Math.min(100, Math.round((value / max) * 100)); }
  initials(employee: Employee): string { return `${employee.firstName?.charAt(0) ?? ''}${employee.lastName?.charAt(0) ?? ''}`.toUpperCase() || '?'; }
  avatarColor(seed = ''): string { return this.avatarColors[(seed.charCodeAt(0) || 0) % this.avatarColors.length]; }
  label(level: RecommendationLevel): string { return ({ EXCELLENT: 'Pret mobilite', BON: 'Bon potentiel', MOYEN: 'A accompagner', FAIBLE: 'Non prioritaire' })[level]; }
  scoreBadgeLabel(result: MatchResult): string {
    if (result.totalScore >= 90) return 'Pret mobilite';
    if (result.totalScore >= 80) return 'Bon potentiel';
    if (result.totalScore >= 70) return 'A accompagner';
    return 'Profil non prioritaire';
  }
  mobilityStatus(result: MatchResult): string {
    if (this.canShowTrainingAction(result)) return 'Formation courte';
    if (result.totalScore >= 90 && !this.hasSkillsToStrengthen(result)) return 'Pret a contacter';
    if (result.totalScore >= 80) return 'Potentiel interne';
    if (result.totalScore >= 70) return 'Vivier a suivre';
    return 'Non prioritaire';
  }
  gapLabel(result: MatchResult): string {
    const gaps = this.unvalidatedSkills(result);
    if (!gaps.length) return 'Competences completes';
    if (gaps.length === 1) return `1 competence a renforcer`;
    return `${gaps.length} competences a renforcer`;
  }
  importanceLabel(value: string): string { return ({ CRITICAL: 'Critique', IMPORTANT: 'Importante', SECONDARY: 'Secondaire' } as Record<string, string>)[value] ?? value; }
  statusLabel(value: string): string { return ({ MASTERED: 'Acquise', PARTIAL: 'Partielle', MISSING: 'Manquante' } as Record<string, string>)[value] ?? value; }
  levelLabel(level: number): string { return ['Absent', 'Debutant', 'Intermediaire', 'Avance', 'Expert'][level] ?? 'Absent'; }
  mainInsight(result: MatchResult): string {
    const gaps = this.unvalidatedSkills(result);
    if (this.canShowTrainingAction(result) && result.priorityTrainingSkill) {
      const prefix = result.totalScore >= 90 ? 'Mobilite presque prete' : 'Bon potentiel interne';
      return `${prefix} : formation complementaire recommandee sur ${result.priorityTrainingSkill.name}.`;
    }
    if (result.skillScore < 25 || gaps.length >= 4) return 'Non prioritaire : trop de competences attendues restent a renforcer.';
    if (gaps.length >= 2) return 'A accompagner : plusieurs competences doivent etre consolidees avant mobilite.';
    if (result.totalScore >= 90) return 'Pret mobilite : competences principales acquises et coherence forte avec le poste.';
    if (result.totalScore >= 80) return 'Bon potentiel interne : validation RH recommandee avant decision.';
    if (result.totalScore >= 70) return 'Potentiel a suivre : adequation partielle mais exploitable dans un vivier interne.';
    return 'Profil non prioritaire pour cette offre.';
  }
  analysisStatus(result: MatchResult): string {
    if (result.totalScore < 70) return 'Profil non prioritaire pour cette offre.';
    if (result.totalScore >= 70 && result.totalScore < 80) return 'Profil a etudier : analyse detaillee recommandee.';
    if (this.canShowTrainingAction(result) && result.totalScore >= 90) return 'Pret mobilite : une competence complementaire reste a consolider.';
    if (this.canShowTrainingAction(result)) return 'Bon potentiel interne : formation complementaire recommandee avant mobilite.';
    if (this.unvalidatedSkills(result).length >= 2) return 'Formation automatique non proposee : plusieurs competences sont a renforcer.';
    if (result.totalScore >= 80 && result.totalScore < 90) return 'Bon potentiel interne, a valider par RH.';
    if (this.hasCriticalMissing(result)) return 'Profil a renforcer : competence critique manquante.';
    if (this.hasSkillsToStrengthen(result)) return 'Profil pertinent avec montee en competence recommandee.';
    return 'Profil excellent : aucun manque critique identifie.';
  }
  recommendedAction(result: MatchResult): string {
    if (this.canShowTrainingAction(result)) return 'Action RH : proposer une formation ciblee puis reevaluer la mobilite.';
    if (result.totalScore >= 90 && !this.hasSkillsToStrengthen(result)) return 'Action RH : inviter le collaborateur a postuler ou planifier un entretien mobilite.';
    if (result.totalScore >= 80) return 'Action RH : contacter manager et collaborateur pour validation.';
    if (result.totalScore >= 70) return 'Action RH : conserver dans le vivier interne et revoir apres formation ou experience.';
    return 'Action RH : ne pas prioriser ce profil pour cette offre.';
  }
  actionNote(result: MatchResult): string {
    const gaps = this.unvalidatedSkills(result).length;
    if (result.totalScore < 70) return 'Non prioritaire';
    if (gaps > 1) return 'A accompagner';
    if (result.totalScore >= 90) return 'Inviter a postuler';
    if (result.totalScore >= 80) return 'A valider';
    return 'Vivier interne';
  }
  canShowTrainingAction(result: MatchResult): boolean {
    // Formation = collaborateur bon ou excellent, avec une seule competence complementaire non validee.
    // Les competences critiques/importantes du poste ne declenchent pas une proposition formation automatique.
    return result.totalScore >= 80
      && !!result.priorityTrainingSkill
      && result.canProposeTraining
      && this.unvalidatedSkills(result).length === 1;
  }
  trackOfferGroup(_: number, group: OfferGroup): string { return group.name; }
  trackOffer(_: number, offer: JobOffer): string { return offer.id; }
  trackResult(_: number, result: MatchResult): string { return `${result.employee.id}-${result.offer.id}`; }
  trackValue(_: number, value: string): string { return value; }
  trackWeightedSkill(_: number, skill: { name: string }): string { return skill.name; }
  trackSkillDetail(_: number, skill: SkillDetail): string { return skill.name; }
  trackTrainingOption(_: number, option: { platform: string; title: string }): string { return `${option.platform}-${option.title}`; }

  private prepareEmployeesForMatching(employees: Employee[]): Employee[] {
    const prepared = employees.map(employee => ({
      ...employee,
      skills: this.enrichSkillsForMatching(employee, employee.skills?.length ? employee.skills : this.inferSkillsForEmployee(employee)),
    }));
    return this.appendTrainingDemoEmployees(prepared);
  }

  private enrichSkillsForMatching(employee: Employee, skills: EmployeeSkill[]): EmployeeSkill[] {
    const text = this.normalizeText(`${employee.position?.title ?? ''} ${employee.department?.name ?? ''}`);
    const names = new Set(skills.map(skill => this.normalizeText(skill.skillName)));
    const enriched = [...skills];
    const addSkill = (skillName: string): void => {
      if (!names.has(this.normalizeText(skillName))) {
        enriched.push({ skillName, level: 'AVANCE' as SkillLevel });
        names.add(this.normalizeText(skillName));
      }
    };

    if (text.includes('fullstack') || text.includes('java') || text.includes('angular') || text.includes('developpeur')) {
      if (['java', 'spring boot', 'git'].every(name => names.has(name))) addSkill('Architecture microservices');
      if (names.has('java') && names.has('sql')) addSkill('Docker');
    }
    if (text.includes('data engineer') || text.includes('pipeline') || text.includes('etl')) {
      if (names.has('python') && names.has('sql')) addSkill('Kafka');
      if (names.has('airflow') || names.has('spark')) addSkill('Git');
    }
    if (text.includes('business intelligence') || text.includes('bi') || text.includes('data analyst') || text.includes('analytics') || text.includes('data')) {
      if (names.has('power bi') && names.has('sql')) addSkill('Spark');
    }
    return enriched;
  }

  private appendTrainingDemoEmployees(employees: Employee[]): Employee[] {
    const existingIds = new Set(employees.map(employee => employee.id));
    const demos = this.createTrainingDemoEmployees().filter(employee => !existingIds.has(employee.id));
    return [...employees, ...demos];
  }

  private createTrainingDemoEmployees(): Employee[] {
    const scenarios: TrainingDemoScenario[] = [
      {
        positionTitle: 'Architecte Solution Java',
        departmentName: 'Informatique',
        missingSkill: '',
        skills: ['Java', 'Spring Boot', 'Angular', 'TypeScript', 'Git', 'Docker', 'Architecture microservices', 'SQL'],
      },
      {
        positionTitle: 'Lead Business Intelligence',
        departmentName: 'Data Analytics',
        missingSkill: '',
        skills: ['Power BI', 'SQL', 'dbt', 'Python', 'Spark', 'Communication', 'Gestion de projet'],
      },
      {
        positionTitle: 'Expert Cybersecurite',
        departmentName: 'Informatique',
        missingSkill: '',
        skills: ['Cybersecurite', 'OWASP', 'Linux', 'Docker', 'CI/CD', 'Git', 'Kubernetes', 'Communication'],
      },
      {
        positionTitle: 'Developpeur Backend Java',
        departmentName: 'Informatique',
        missingSkill: 'Docker',
        skills: this.trainingSkillSetWithout('Docker', ['Java', 'Spring Boot', 'Angular', 'TypeScript', 'Git', 'Architecture microservices', 'SQL']),
      },
      {
        positionTitle: 'Developpeur Java DevOps',
        departmentName: 'Informatique',
        missingSkill: 'SQL',
        skills: this.trainingSkillSetWithout('SQL', ['Java', 'Spring Boot', 'Angular', 'TypeScript', 'Git', 'Docker', 'Architecture microservices']),
      },
      {
        positionTitle: 'Consultant BI',
        departmentName: 'Data Analytics',
        missingSkill: 'Spark',
        skills: this.trainingSkillSetWithout('Spark', ['Power BI', 'SQL', 'dbt', 'Python', 'Communication', 'Gestion de projet']),
      },
      {
        positionTitle: 'Business Intelligence Analyst',
        departmentName: 'Data Analytics',
        missingSkill: 'Communication',
        skills: this.trainingSkillSetWithout('Communication', ['Power BI', 'SQL', 'dbt', 'Python', 'Spark', 'Gestion de projet']),
      },
      {
        positionTitle: 'Data Engineer',
        departmentName: 'Data Analytics',
        missingSkill: 'Kafka',
        skills: this.trainingSkillSetWithout('Kafka', ['Python', 'SQL', 'Airflow', 'dbt', 'Spark', 'Docker', 'Git']),
      },
      {
        positionTitle: 'Data Engineer Pipelines',
        departmentName: 'Informatique',
        missingSkill: 'Git',
        skills: this.trainingSkillSetWithout('Git', ['Python', 'SQL', 'Spark', 'dbt', 'Airflow', 'Docker', 'Kafka']),
      },
      {
        positionTitle: 'Data Analyst Confirmed',
        departmentName: 'Data Analytics',
        missingSkill: 'Gestion de projet',
        skills: this.trainingSkillSetWithout('Gestion de projet', ['SQL', 'Power BI', 'Python', 'Communication', 'Machine Learning']),
      },
      {
        positionTitle: 'RH Analytics Specialist',
        departmentName: 'Ressources Humaines',
        missingSkill: 'Scrum',
        skills: this.trainingSkillSetWithout('Scrum', ['Power BI', 'SQL', 'Recrutement', 'Python', 'Communication', 'Gestion de projet']),
      },
      {
        positionTitle: 'DevOps Engineer',
        departmentName: 'Infrastructure',
        missingSkill: 'Kubernetes',
        skills: this.trainingSkillSetWithout('Kubernetes', ['Cybersecurite', 'OWASP', 'Linux', 'Docker', 'CI/CD', 'Git', 'Communication']),
      },
      {
        positionTitle: 'CRM Marketing Manager',
        departmentName: 'Marketing Communication',
        missingSkill: 'HubSpot',
        skills: this.trainingSkillSetWithout('HubSpot', ['SEO', 'Analytics', 'Content Marketing', 'CRM', 'Google Ads', 'Copywriting']),
      },
      {
        positionTitle: 'Developpeur Fullstack Java',
        departmentName: 'Informatique',
        missingSkill: 'Docker',
        skills: this.trainingSkillSetWithout('Docker', ['Java', 'Spring Boot', 'Angular', 'TypeScript', 'Git', 'Architecture microservices', 'SQL']),
      },
      {
        positionTitle: 'Developpeur Backend Java',
        departmentName: 'Informatique',
        missingSkill: 'SQL',
        skills: this.trainingSkillSetWithout('SQL', ['Java', 'Spring Boot', 'Angular', 'TypeScript', 'Git', 'Docker', 'Architecture microservices']),
      },
      {
        positionTitle: 'Lead Business Intelligence',
        departmentName: 'Data Analytics',
        missingSkill: 'Spark',
        skills: this.trainingSkillSetWithout('Spark', ['Power BI', 'SQL', 'dbt', 'Python', 'Communication', 'Gestion de projet']),
      },
      {
        positionTitle: 'Consultant BI Finance',
        departmentName: 'Finance Controle Gestion',
        missingSkill: 'Communication',
        skills: this.trainingSkillSetWithout('Communication', ['Power BI', 'SQL', 'dbt', 'Python', 'Spark', 'Gestion de projet']),
      },
      {
        positionTitle: 'Analyste Data RH',
        departmentName: 'Ressources Humaines',
        missingSkill: 'Gestion de projet',
        skills: this.trainingSkillSetWithout('Gestion de projet', ['SQL', 'Power BI', 'Python', 'Communication', 'Machine Learning']),
      },
      {
        positionTitle: 'Data Engineer Senior',
        departmentName: 'Data Analytics',
        missingSkill: 'Kafka',
        skills: this.trainingSkillSetWithout('Kafka', ['Python', 'SQL', 'Airflow', 'dbt', 'Spark', 'Docker', 'Git']),
      },
      {
        positionTitle: 'Data Engineer Cloud',
        departmentName: 'Infrastructure',
        missingSkill: 'Git',
        skills: this.trainingSkillSetWithout('Git', ['Python', 'SQL', 'Spark', 'dbt', 'Airflow', 'Docker', 'Kafka']),
      },
      {
        positionTitle: 'RH Analytics Specialist',
        departmentName: 'Ressources Humaines',
        missingSkill: 'Scrum',
        skills: this.trainingSkillSetWithout('Scrum', ['Power BI', 'SQL', 'Recrutement', 'Python', 'Communication', 'Gestion de projet']),
      },
      {
        positionTitle: 'Ingenieur Cloud DevOps',
        departmentName: 'Infrastructure',
        missingSkill: 'Kubernetes',
        skills: this.trainingSkillSetWithout('Kubernetes', ['Cybersecurite', 'OWASP', 'Linux', 'Docker', 'CI/CD', 'Git', 'Communication']),
      },
      {
        positionTitle: 'Marketing Automation Manager',
        departmentName: 'Marketing Communication',
        missingSkill: 'HubSpot',
        skills: this.trainingSkillSetWithout('HubSpot', ['SEO', 'Analytics', 'Content Marketing', 'CRM', 'Google Ads', 'Copywriting']),
      },
    ];
    const firstNames = ['Nadia', 'Youssef', 'Ines', 'Karim', 'Leila', 'Sami', 'Meryem', 'Adam', 'Sara', 'Amine'];
    const lastNames = ['Benali', 'El Mansouri', 'Haddad', 'Rami', 'Zeroual', 'Berrada', 'Cherkaoui', 'Tazi', 'Idrissi', 'Saidi'];
    const perfectScenarios = scenarios.filter(scenario => !scenario.missingSkill);
    const trainingScenarios = scenarios.filter(scenario => scenario.missingSkill);
    const fillerScenarios: TrainingDemoScenario[] = [
      { positionTitle: 'Assistant Administratif', departmentName: 'Administration', missingSkill: '', skills: ['Communication', 'Excel', 'Gestion documentaire'] },
      { positionTitle: 'Charge Support RH', departmentName: 'Ressources Humaines', missingSkill: '', skills: ['Communication', 'Formation', 'SIRH'] },
      { positionTitle: 'Assistant Comptable Junior', departmentName: 'Finance Controle Gestion', missingSkill: '', skills: ['Excel financier', 'Reporting financier', 'Communication'] },
      { positionTitle: 'Coordinateur Marketing Junior', departmentName: 'Marketing Communication', missingSkill: '', skills: ['CRM', 'Content Marketing', 'Communication'] },
      { positionTitle: 'Technicien Support', departmentName: 'Infrastructure', missingSkill: '', skills: ['Linux', 'Support utilisateur', 'Communication'] },
      { positionTitle: 'Charge Operations', departmentName: 'Operations', missingSkill: '', skills: ['Planification', 'Gestion des stocks', 'Excel'] },
      { positionTitle: 'Commercial Junior', departmentName: 'Commercial', missingSkill: '', skills: ['CRM', 'Prospection', 'Presentation commerciale'] },
      { positionTitle: 'Analyste Reporting Junior', departmentName: 'Data Analytics', missingSkill: '', skills: ['Excel', 'SQL', 'Communication'] },
    ];

    return Array.from({ length: 70 }, (_, index) => {
      const scenario = index < perfectScenarios.length
        ? perfectScenarios[index]
        : index < perfectScenarios.length + trainingScenarios.length
        ? trainingScenarios[index - perfectScenarios.length]
        : fillerScenarios[(index - perfectScenarios.length - trainingScenarios.length) % fillerScenarios.length];
      const firstName = firstNames[index % firstNames.length];
      const lastName = `${lastNames[index % lastNames.length]} ${index + 1}`;
      const years = 2 + (index % 9);
      const hireDate = this.dateYearsAgo(years);
      return {
        id: `training-demo-${index + 1}`,
        firstName,
        lastName,
        email: `formation.demo.${index + 1}@sirh.local`,
        phone: `060000${String(index + 1).padStart(4, '0')}`,
        hireDate,
        contractType: index % 11 === 0 ? 'FREELANCE' : index % 5 === 0 ? 'CDD' : 'CDI',
        department: {
          id: `dept-demo-${this.normalizeText(scenario.departmentName).replace(/\s+/g, '-')}`,
          name: scenario.departmentName,
          description: scenario.departmentName,
        },
        position: {
          id: `position-demo-${index + 1}`,
          title: scenario.positionTitle,
          description: `Profil de demonstration PFE avec une seule competence a renforcer : ${scenario.missingSkill}.`,
          departmentId: `dept-demo-${this.normalizeText(scenario.departmentName).replace(/\s+/g, '-')}`,
        },
        skills: scenario.skills.map(skillName => ({ skillName, level: 'AVANCE' as SkillLevel })),
      };
    });
  }

  private trainingSkillSetWithout(missingSkill: string, coreSkills: string[]): string[] {
    return Array.from(new Set(coreSkills)).filter(skill => this.normalizeText(skill) !== this.normalizeText(missingSkill));
  }

  private dateYearsAgo(years: number): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    date.setMonth(0, 15);
    return date.toISOString().slice(0, 10);
  }

  private inferSkillsForEmployee(employee: Employee): EmployeeSkill[] {
    const text = this.normalizeText(`${employee.position?.title ?? ''} ${employee.department?.name ?? ''}`);
    const level = this.inferredSkillLevel(employee);
    let skills: string[];

    if (text.includes('data engineer') || text.includes('pipeline') || text.includes('etl')) {
      skills = ['Python', 'SQL', 'Airflow', 'dbt', 'Spark', 'Docker', 'Git', 'Kafka'];
    } else if (text.includes('business intelligence') || text.includes('bi') || text.includes('data analyst') || text.includes('analytics') || text.includes('data')) {
      skills = ['SQL', 'Power BI', 'Python', 'Communication', 'Machine Learning', 'Gestion de projet', 'Spark'];
    } else if (text.includes('fullstack') || text.includes('java') || text.includes('angular') || text.includes('developpeur')) {
      skills = ['Java', 'Spring Boot', 'Angular', 'TypeScript', 'Git', 'Docker', 'Architecture microservices', 'SQL'];
    } else if (text.includes('cyber') || text.includes('securite') || text.includes('devops') || text.includes('infrastructure')) {
      skills = ['Cybersecurite', 'Linux', 'Docker', 'CI/CD', 'Git', 'Kubernetes', 'Communication'];
    } else if (text.includes('ressources humaines') || text.includes('rh') || text.includes('recrutement') || text.includes('formation') || text.includes('paie')) {
      skills = ['Recrutement', 'GPEC', 'Droit du travail', 'Talent management', 'Formation', 'SIRH', 'Communication'];
    } else if (text.includes('finance') || text.includes('controle') || text.includes('comptable') || text.includes('audit')) {
      skills = ['Controle de gestion', 'Budget', 'Excel financier', 'IFRS', 'Reporting financier', 'SAP FI/CO', 'Power BI'];
    } else if (text.includes('marketing') || text.includes('seo') || text.includes('communication') || text.includes('content')) {
      skills = ['SEO', 'Analytics', 'Content Marketing', 'CRM', 'Google Ads', 'Copywriting', 'HubSpot'];
    } else if (text.includes('commercial') || text.includes('vente') || text.includes('account') || text.includes('prospection')) {
      skills = ['Negociation', 'B2B', 'Salesforce', 'Prospection', 'Key Account', 'CRM', 'Presentation commerciale'];
    } else if (text.includes('logistique') || text.includes('supply') || text.includes('achat') || text.includes('qualite') || text.includes('operation')) {
      skills = ['Supply Chain', 'ERP SAP', 'Gestion des stocks', 'Planification', 'Lean Management', 'Transport', 'Negociation'];
    } else {
      skills = ['Communication', 'Gestion de projet', 'Excel', 'CRM'];
    }

    return skills.map(skillName => ({ skillName, level }));
  }

  private inferredSkillLevel(employee: Employee): SkillLevel {
    const years = this.yearsFromHireDate(employee.hireDate);
    if (years >= 7) return 'EXPERT';
    if (years >= 3) return 'AVANCE';
    if (years >= 1) return 'INTERMEDIAIRE';
    return 'DEBUTANT';
  }

  private yearsFromHireDate(hireDate?: string): number {
    if (!hireDate) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(hireDate).getTime()) / (365.25 * 24 * 3600 * 1000)));
  }

  private normalizeText(value = ''): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.\-\/+#&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private deduplicateOffers(offers: JobOffer[]): JobOffer[] {
    const seen = new Set<string>();
    return offers.filter(offer => {
      const key = `${offer.title?.toLowerCase()}|${offer.department?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => classifyOfferGroup(a).localeCompare(classifyOfferGroup(b)) || a.title.localeCompare(b.title));
  }

  private scoreCached(employee: Employee, offer: JobOffer): MatchResult {
    const key = this.cacheKey(employee, offer);
    const cached = this.matchCache.get(key);
    if (cached) return { ...cached, showDetail: false };
    const result = scoreEmployeeForOfferProfile(employee, offer, this.profileForOffer(offer), this.filters);
    this.matchCache.set(key, result);
    return { ...result, showDetail: false };
  }

  private cacheKey(employee: Employee, offer: JobOffer): string {
    return `${this.employeeSignature(employee)}::${this.offerSignature(offer)}::${this.filters.priority}`;
  }

  private resultSetCacheKey(): string {
    const offerScope = this.isAllOffers()
      ? `ALL:${this.offers().map(offer => this.offerSignature(offer)).sort().join('|')}`
      : `ONE:${this.selectedOfferId()}`;
    return [offerScope, this.filters.priority, this.employeesDatasetSignature].join('::');
  }

  private profileForOffer(offer: JobOffer): OfferMatchingProfile {
    const key = this.offerSignature(offer);
    const cached = this.offerProfileCache.get(key);
    if (cached) return cached;
    const profile = buildOfferProfile(offer);
    this.offerProfileCache.set(key, profile);
    return profile;
  }

  private employeeSignature(employee: Employee): string {
    const cached = this.employeeSignatureCache.get(employee.id);
    if (cached) return cached;
    const signature = [
      employee.id,
      employee.contractType ?? '',
      employee.department?.name ?? '',
      employee.hireDate ?? '',
      (employee.skills ?? []).map(skill => `${skill.skillName}:${skill.level}`).sort().join('|'),
    ].join('#');
    this.employeeSignatureCache.set(employee.id, signature);
    return signature;
  }

  private buildEmployeesSignature(employees: Employee[]): string {
    return employees.map(employee => this.employeeSignature(employee)).sort().join('|');
  }

  private offerSignature(offer: JobOffer): string {
    return [offer.id, offer.title ?? '', offer.department ?? '', offer.status ?? ''].join('#');
  }

  private hasSkillsToStrengthen(result: MatchResult): boolean {
    return this.unvalidatedSkills(result).length > 0;
  }

  private hasCriticalMissing(result: MatchResult): boolean {
    return result.skillDetails.some(skill => skill.status === 'MISSING' && skill.importance === 'CRITICAL');
  }

  private unvalidatedSkills(result: MatchResult): SkillDetail[] {
    return result.skillDetails.filter(skill => skill.status === 'MISSING' || skill.status === 'PARTIAL');
  }
}
