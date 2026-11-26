import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Application, ApplicationStatus, JobOffer, OfferStatus } from '../../core/services/recruitment.models';
import { RecruitmentService } from '../../core/services/recruitment.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

interface ScoreBreakdown {
  matchedSkills: string[];
  missingSkills: string[];
  totalRequired: number;
  baseScore: number;
  expBonus: number;
  confBonus: number;
  yearsExp: number;
}

@Component({
  selector: 'app-recruitment-oversight',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="panel">
      <div class="header-row">
        <div>
          <h2>Supervision Recrutement</h2>
          <p class="muted">Validez les offres et gérez le pipeline de candidatures internes.</p>
        </div>
      </div>

      <div class="tabs">
        <button class="tab" [class.active]="activeTab() === 'offers'" (click)="activeTab.set('offers')">
          Offres à valider
          <span class="tab-badge" *ngIf="pendingOffers().length > 0">{{ pendingOffers().length }}</span>
        </button>
        <button class="tab" [class.active]="activeTab() === 'pipeline'" (click)="activeTab.set('pipeline')">
          Pipeline candidatures
        </button>
        <button class="tab" [class.active]="activeTab() === 'mgr-offers'" (click)="activeTab.set('mgr-offers')">
          Toutes les offres managers
          <span class="tab-badge" *ngIf="mgrPendingCount() > 0">{{ mgrPendingCount() }}</span>
        </button>
      </div>

      <!-- TAB : OFFRES À VALIDER -->
      <div *ngIf="activeTab() === 'offers'">
        <div *ngIf="loadingPending()" class="loader">Chargement des offres en attente...</div>
        <div *ngIf="!loadingPending() && pendingOffers().length === 0" class="empty-state">
          <div class="empty-icon">✅</div>
          <p>Aucune offre en attente de validation.</p>
        </div>
        <div class="pending-grid" *ngIf="!loadingPending() && pendingOffers().length > 0">
          <div class="pending-card" *ngFor="let offer of pendingOffers(); let i = index">
            <div class="pending-card-head">
              <span class="badge-pending">En attente</span>
              <span class="pending-date">{{ formatPendingDate(offer, i) }}</span>
            </div>
            <h3 class="pending-title">{{ offer.title }}</h3>
            <div class="pending-meta">
              <span *ngIf="offer.department">🏢 {{ offer.department }}</span>
              <span *ngIf="offer.location">📍 {{ offer.location }}</span>
              <span *ngIf="offer.createdByName">👤 {{ offer.createdByName }}</span>
            </div>
            <p class="pending-desc">{{ offer.description | slice:0:200 }}{{ (offer.description?.length ?? 0) > 200 ? '...' : '' }}</p>
            <div class="pending-actions">
              <button class="btn btn-success" (click)="validateOffer(offer.id)">✅ Valider et publier</button>
              <button class="btn btn-danger" (click)="openRefuseOfferModal(offer)">❌ Refuser</button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB : PIPELINE CANDIDATURES -->
      <div *ngIf="activeTab() === 'pipeline'">
        <div class="filter-bar" *ngIf="!loadingData()">
          <label>Offre :</label>
          <select class="form-control" [(ngModel)]="selectedOfferId" (ngModelChange)="onOfferSelected()">
            <option value="">-- Toutes les offres --</option>
            <option *ngFor="let offer of allOffers()" [value]="offer.id">{{ offer.title }}</option>
          </select>
          <input class="form-control search" type="text" [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Rechercher candidat / email..." />
          <select class="form-control status-sel" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
            <option value="">Tous statuts</option>
            <option value="PENDING">À traiter</option>
            <option value="REVIEWING">En revue</option>
            <option value="INTERVIEW_SCHEDULED">Entretiens</option>
            <option value="ACCEPTED">Accepté</option>
            <option value="REJECTED">Refusé</option>
          </select>
          <div class="ai-sort-wrap">
            <label class="toggle">
              <input type="checkbox" [ngModel]="smartSort()" (ngModelChange)="smartSort.set($event)" />
              <span class="ai-sort-label">Tri IA <span class="ai-sort-badge" [class.active]="smartSort()">{{ smartSort() ? 'ON' : 'OFF' }}</span></span>
            </label>
            <div class="ai-sort-info" *ngIf="smartSort()">
              <span class="ai-info-icon" title="{{ aiSortTooltip() }}">ℹ️</span>
              <span class="ai-sort-mode">{{ aiSortModeLabel() }}</span>
            </div>
          </div>
        </div>

        <div class="ai-sort-banner" *ngIf="smartSort() && !loadingData() && !loadingApps()">
          <span class="ai-banner-icon">🤖</span>
          <div class="ai-banner-text">
            <strong>Tri IA actif — </strong>
            <span *ngIf="selectedOfferId">Candidats classés par <strong>score de correspondance IA</strong> : compétences + expérience + confiance. Score max : 100.</span>
            <span *ngIf="!selectedOfferId">Classement par <strong>urgence de traitement</strong> : À traiter → En revue → Entretien prévu → Clôturé.</span>
          </div>
        </div>

        <div *ngIf="loadingData() || loadingApps()" class="loader">Chargement...</div>

        <div class="kanban-board" *ngIf="!loadingData() && !loadingApps()">

          <!-- À traiter -->
          <div class="kanban-col" (dragover)="onDragOver($event, 'PENDING')" (dragleave)="onDragLeave('PENDING')" (drop)="onDrop($event, 'PENDING')" [class.col-drop-target]="dragOverCol() === 'PENDING'">
            <div class="col-header">
              <div class="col-header-top">
                <h3>À traiter <span class="count" [class.count-warn]="getTotalByStatus('PENDING') > 8">{{ getTotalByStatus('PENDING') }}</span></h3>
                <span class="col-load-badge warn" *ngIf="getTotalByStatus('PENDING') > 8">⚠️ Charge élevée</span>
              </div>
            </div>
            <div class="pagination" *ngIf="getTotalPages('PENDING') > 1">
              <button class="pg-btn" (click)="goToPage('PENDING', 0)" [disabled]="(currentPage()['PENDING'] ?? 0) === 0">«</button>
              <button class="pg-btn" (click)="goToPage('PENDING', (currentPage()['PENDING'] ?? 0) - 1)" [disabled]="(currentPage()['PENDING'] ?? 0) === 0">‹</button>
              <span class="pg-info">{{ (currentPage()['PENDING'] ?? 0) + 1 }} / {{ getTotalPages('PENDING') }}</span>
              <button class="pg-btn" (click)="goToPage('PENDING', (currentPage()['PENDING'] ?? 0) + 1)" [disabled]="(currentPage()['PENDING'] ?? 0) >= getTotalPages('PENDING') - 1">›</button>
              <button class="pg-btn" (click)="goToPage('PENDING', getTotalPages('PENDING') - 1)" [disabled]="(currentPage()['PENDING'] ?? 0) >= getTotalPages('PENDING') - 1">»</button>
            </div>
            <div class="app-card" draggable="true" (dragstart)="onDragStart(app)" (dragend)="dragOverCol.set(null)" *ngFor="let app of getByStatus('PENDING')">
              <div class="card-top">
                <div class="avatar" [style.background]="avatarColor(app.applicantName)">{{ avatarInitials(app.applicantName) }}</div>
                <div class="card-info"><h4>{{ app.applicantName }}</h4><p class="meta">{{ app.jobOfferTitle }}</p></div>
              </div>
              <p class="days-ago">🕒 {{ daysAgo(app.appliedDate) }}</p>
              <ng-container *ngTemplateOutlet="scorePill; context: { app: app }"></ng-container>
              <details class="cover-details" *ngIf="app.coverLetter">
                <summary>Lettre de motivation</summary>
                <p class="cover-text">{{ app.coverLetter }}</p>
              </details>
              <div class="actions">
                <button class="btn btn-sm btn-outline-green" (click)="viewCv(app)">📄 CV</button>
                <button class="btn btn-sm btn-reviewing" (click)="simpleStatus(app.id, 'REVIEWING')">👁 En revue</button>
                <button class="btn btn-sm btn-primary" (click)="openInterviewModal(app)">📅 Entretien</button>
                <button class="btn btn-sm btn-danger" (click)="openRejectModal(app)">Refuser</button>
              </div>
            </div>
          </div>

          <!-- En revue -->
          <div class="kanban-col" (dragover)="onDragOver($event, 'REVIEWING')" (dragleave)="onDragLeave('REVIEWING')" (drop)="onDrop($event, 'REVIEWING')" [class.col-drop-target]="dragOverCol() === 'REVIEWING'">
            <div class="col-header">
              <div class="col-header-top">
                <h3>En revue <span class="count" [class.count-warn]="getTotalByStatus('REVIEWING') > 8">{{ getTotalByStatus('REVIEWING') }}</span></h3>
                <span class="col-load-badge warn" *ngIf="getTotalByStatus('REVIEWING') > 8">⚠️ Charge élevée</span>
              </div>
            </div>
            <div class="pagination" *ngIf="getTotalPages('REVIEWING') > 1">
              <button class="pg-btn" (click)="goToPage('REVIEWING', 0)" [disabled]="(currentPage()['REVIEWING'] ?? 0) === 0">«</button>
              <button class="pg-btn" (click)="goToPage('REVIEWING', (currentPage()['REVIEWING'] ?? 0) - 1)" [disabled]="(currentPage()['REVIEWING'] ?? 0) === 0">‹</button>
              <span class="pg-info">{{ (currentPage()['REVIEWING'] ?? 0) + 1 }} / {{ getTotalPages('REVIEWING') }}</span>
              <button class="pg-btn" (click)="goToPage('REVIEWING', (currentPage()['REVIEWING'] ?? 0) + 1)" [disabled]="(currentPage()['REVIEWING'] ?? 0) >= getTotalPages('REVIEWING') - 1">›</button>
              <button class="pg-btn" (click)="goToPage('REVIEWING', getTotalPages('REVIEWING') - 1)" [disabled]="(currentPage()['REVIEWING'] ?? 0) >= getTotalPages('REVIEWING') - 1">»</button>
            </div>
            <div class="app-card reviewing-col" draggable="true" (dragstart)="onDragStart(app)" (dragend)="dragOverCol.set(null)" *ngFor="let app of getByStatus('REVIEWING')">
              <div class="card-top">
                <div class="avatar" [style.background]="avatarColor(app.applicantName)">{{ avatarInitials(app.applicantName) }}</div>
                <div class="card-info"><h4>{{ app.applicantName }}</h4><p class="meta">{{ app.jobOfferTitle }}</p></div>
                <span class="status-dot reviewing-dot"></span>
              </div>
              <p class="days-ago">🕒 {{ daysAgo(app.appliedDate) }}</p>
              <ng-container *ngTemplateOutlet="scorePill; context: { app: app }"></ng-container>
              <details class="cover-details" *ngIf="app.coverLetter">
                <summary>Lettre de motivation</summary>
                <p class="cover-text">{{ app.coverLetter }}</p>
              </details>
              <div class="actions mt-2">
                <button class="btn btn-sm btn-outline-green" (click)="viewCv(app)">📄 CV</button>
                <button class="btn btn-sm btn-primary" (click)="openInterviewModal(app)">📅 Entretien</button>
                <button class="btn btn-sm btn-danger" (click)="openRejectModal(app)">Refuser</button>
              </div>
            </div>
          </div>

          <!-- Entretiens -->
          <div class="kanban-col" (dragover)="onDragOver($event, 'INTERVIEW_SCHEDULED')" (dragleave)="onDragLeave('INTERVIEW_SCHEDULED')" (drop)="onDrop($event, 'INTERVIEW_SCHEDULED')" [class.col-drop-target]="dragOverCol() === 'INTERVIEW_SCHEDULED'">
            <div class="col-header">
              <div class="col-header-top">
                <h3>Entretiens <span class="count">{{ getTotalByStatus('INTERVIEW_SCHEDULED') }}</span></h3>
              </div>
            </div>
            <div class="pagination" *ngIf="getTotalPages('INTERVIEW_SCHEDULED') > 1">
              <button class="pg-btn" (click)="goToPage('INTERVIEW_SCHEDULED', 0)" [disabled]="(currentPage()['INTERVIEW_SCHEDULED'] ?? 0) === 0">«</button>
              <button class="pg-btn" (click)="goToPage('INTERVIEW_SCHEDULED', (currentPage()['INTERVIEW_SCHEDULED'] ?? 0) - 1)" [disabled]="(currentPage()['INTERVIEW_SCHEDULED'] ?? 0) === 0">‹</button>
              <span class="pg-info">{{ (currentPage()['INTERVIEW_SCHEDULED'] ?? 0) + 1 }} / {{ getTotalPages('INTERVIEW_SCHEDULED') }}</span>
              <button class="pg-btn" (click)="goToPage('INTERVIEW_SCHEDULED', (currentPage()['INTERVIEW_SCHEDULED'] ?? 0) + 1)" [disabled]="(currentPage()['INTERVIEW_SCHEDULED'] ?? 0) >= getTotalPages('INTERVIEW_SCHEDULED') - 1">›</button>
              <button class="pg-btn" (click)="goToPage('INTERVIEW_SCHEDULED', getTotalPages('INTERVIEW_SCHEDULED') - 1)" [disabled]="(currentPage()['INTERVIEW_SCHEDULED'] ?? 0) >= getTotalPages('INTERVIEW_SCHEDULED') - 1">»</button>
            </div>
            <div class="app-card interview-col" draggable="true" (dragstart)="onDragStart(app)" (dragend)="dragOverCol.set(null)" *ngFor="let app of getByStatus('INTERVIEW_SCHEDULED')">
              <div class="card-top">
                <div class="avatar" [style.background]="avatarColor(app.applicantName)">{{ avatarInitials(app.applicantName) }}</div>
                <div class="card-info"><h4>{{ app.applicantName }}</h4><p class="meta">{{ app.jobOfferTitle }}</p></div>
                <span class="status-dot interview-dot"></span>
              </div>
              <p class="days-ago">🕒 {{ daysAgo(app.appliedDate) }}</p>
              <ng-container *ngTemplateOutlet="scorePill; context: { app: app }"></ng-container>
              <details class="cover-details" *ngIf="app.coverLetter">
                <summary>Lettre de motivation</summary>
                <p class="cover-text">{{ app.coverLetter }}</p>
              </details>
              <div class="actions mt-2">
                <button class="btn btn-sm btn-outline-green" (click)="viewCv(app)">📄 CV</button>
                <button class="btn btn-sm btn-success" (click)="simpleStatus(app.id, 'ACCEPTED')">✓ Accepter</button>
                <button class="btn btn-sm btn-danger" (click)="openRejectModal(app)">✕ Refuser</button>
              </div>
            </div>
          </div>

          <!-- Clôturé -->
          <div class="kanban-col">
            <div class="col-header">
              <div class="col-header-top">
                <h3>Clôturé <span class="count">{{ getTotalClosed() }}</span></h3>
              </div>
            </div>
            <div class="pagination" *ngIf="getTotalPagesClosed() > 1">
              <button class="pg-btn" (click)="goToPage('CLOSED', 0)" [disabled]="(currentPage()['CLOSED'] ?? 0) === 0">«</button>
              <button class="pg-btn" (click)="goToPage('CLOSED', (currentPage()['CLOSED'] ?? 0) - 1)" [disabled]="(currentPage()['CLOSED'] ?? 0) === 0">‹</button>
              <span class="pg-info">{{ (currentPage()['CLOSED'] ?? 0) + 1 }} / {{ getTotalPagesClosed() }}</span>
              <button class="pg-btn" (click)="goToPage('CLOSED', (currentPage()['CLOSED'] ?? 0) + 1)" [disabled]="(currentPage()['CLOSED'] ?? 0) >= getTotalPagesClosed() - 1">›</button>
              <button class="pg-btn" (click)="goToPage('CLOSED', getTotalPagesClosed() - 1)" [disabled]="(currentPage()['CLOSED'] ?? 0) >= getTotalPagesClosed() - 1">»</button>
            </div>
            <div class="app-card done" *ngFor="let app of getClosedApps()">
              <div class="card-top">
                <div class="avatar avatar-done" [style.background]="avatarColor(app.applicantName)">{{ avatarInitials(app.applicantName) }}</div>
                <div class="card-info"><h4>{{ app.applicantName }}</h4><p class="meta">{{ app.jobOfferTitle }}</p></div>
              </div>
              <div class="flex-row">
                <span class="badge badge-success" *ngIf="app.status === 'ACCEPTED'">✅ Accepté</span>
                <span class="badge badge-danger" *ngIf="app.status === 'REJECTED'">❌ Refusé</span>
                <button class="btn btn-link btn-sm" (click)="viewCv(app)">📄 CV</button>
              </div>
            </div>
          </div>

        </div>

        <!-- Template score pill -->
        <ng-template #scorePill let-app="app">
          <div class="score-pill" *ngIf="app.matchScore > 0" (click)="toggleScore(app)" [class.expanded]="expandedScoreId() === app.id">
            <div class="score-pill-header">
              <span class="score-icon">🤖</span>
              <span class="score-label">Adéquation IA</span>
              <strong class="score-val" [class.score-high]="app.matchScore >= 80" [class.score-med]="app.matchScore >= 60 && app.matchScore < 80" [class.score-low]="app.matchScore < 60">
                {{ app.matchScore }}%
              </strong>
              <div class="score-bar-inline">
                <div class="score-fill" [style.width.%]="app.matchScore" [class.high]="app.matchScore >= 80" [class.med]="app.matchScore >= 60 && app.matchScore < 80" [class.low]="app.matchScore < 60"></div>
              </div>
              <span class="score-toggle-arrow">{{ expandedScoreId() === app.id ? '▲' : '▼' }}</span>
            </div>
            <div class="score-breakdown" *ngIf="expandedScoreId() === app.id && scoreBreakdowns()[app.id] as bd" (click)="$event.stopPropagation()">
              <div class="bd-section">
                <div class="bd-row bd-title">
                  <span>📊 Détail du score</span>
                  <span class="bd-total">Score : {{ app.matchScore }} / 100</span>
                </div>
              </div>
              <div class="bd-section" *ngIf="bd.totalRequired > 0">
                <div class="bd-row bd-sub">
                  <span>Compétences ({{ bd.matchedSkills.length }}/{{ bd.totalRequired }} requises)</span>
                  <span class="bd-pts" [class.pts-good]="bd.matchedSkills.length > 0" [class.pts-warn]="bd.matchedSkills.length === 0">{{ bd.matchedSkills.length }}/{{ bd.totalRequired }}</span>
                </div>
                <div class="bd-skills">
                  <span class="bd-skill matched" *ngFor="let s of bd.matchedSkills">✅ {{ s }}</span>
                  <span class="bd-skill missing" *ngFor="let s of bd.missingSkills">❌ {{ s }}</span>
                </div>
              </div>
              <div class="bd-section" *ngIf="bd.totalRequired === 0">
                <span class="bd-muted">Aucune compétence requise définie sur l'offre</span>
              </div>
              <div class="bd-section">
                <div class="bd-row bd-sub">
                  <span>Expérience <span class="bd-muted" *ngIf="bd.yearsExp > 0">({{ bd.yearsExp }} ans)</span><span class="bd-muted" *ngIf="bd.yearsExp === 0">(non détectée)</span></span>
                </div>
                <div class="bd-exp-scale">
                  <span [class.active]="bd.yearsExp >= 1">1+ an</span>
                  <span [class.active]="bd.yearsExp >= 3">3+ ans</span>
                  <span [class.active]="bd.yearsExp >= 5">5+ ans</span>
                  <span [class.active]="bd.yearsExp >= 8">8+ ans</span>
                </div>
              </div>
              <div class="bd-section">
                <div class="bd-row bd-sub">
                  <span>Compétences extraites <span class="bd-muted">({{ app.skills?.length ?? 0 }})</span></span>
                  <span *ngIf="(app.skills?.length ?? 0) >= 4" style="font-size:.68rem;color:#16A34A;">✅ Profil fiable</span>
                  <span *ngIf="(app.skills?.length ?? 0) < 4" class="bd-muted" style="font-size:.68rem;">Profil incomplet</span>
                </div>
              </div>
            </div>
          </div>
        </ng-template>
      </div>

      <!-- TAB : TOUTES LES OFFRES MANAGERS -->
      <div *ngIf="activeTab() === 'mgr-offers'">
        <div class="filter-bar">
          <select class="form-control" [(ngModel)]="mgrStatusFilter" (ngModelChange)="applyMgrFilter()">
            <option value="">Tous les statuts</option>
            <option value="PENDING_VALIDATION">En attente</option>
            <option value="PUBLISHED">Publiée</option>
            <option value="DRAFT">Brouillon</option>
            <option value="CLOSED">Clôturée</option>
            <option value="CANCELLED">Refusée</option>
          </select>
          <select class="form-control" [(ngModel)]="mgrDeptFilter" (ngModelChange)="applyMgrFilter()">
            <option value="">Tous les départements</option>
            <option *ngFor="let d of mgrDepartments()" [value]="d">{{ d }}</option>
          </select>
          <select class="form-control" [(ngModel)]="mgrManagerFilter" (ngModelChange)="applyMgrFilter()">
            <option value="">Tous les managers</option>
            <option *ngFor="let m of mgrManagers()" [value]="m">{{ m }}</option>
          </select>
          <input class="form-control search" type="date" [(ngModel)]="mgrDateFilter" (ngModelChange)="applyMgrFilter()" />
          <button class="btn btn-outline" (click)="resetMgrFilters()">Réinitialiser</button>
        </div>
        <div class="mgr-summary">
          <div class="mgr-stat"><span class="mgr-stat-num">{{ mgrFilteredOffers().length }}</span><span class="mgr-stat-lbl">Offres affichées</span></div>
          <div class="mgr-stat warn" *ngIf="mgrPendingCount() > 0"><span class="mgr-stat-num">{{ mgrPendingCount() }}</span><span class="mgr-stat-lbl">En attente de validation</span></div>
          <div class="mgr-stat ok" *ngIf="mgrPendingCount() === 0"><span class="mgr-stat-num">✅</span><span class="mgr-stat-lbl">Aucune en attente</span></div>
        </div>
        <div *ngIf="loadingMgrOffers()" class="loader">Chargement des offres...</div>
        <div *ngIf="!loadingMgrOffers() && mgrFilteredOffers().length === 0" class="empty-state"><div class="empty-icon">📋</div><p>Aucune offre correspondant aux filtres.</p></div>
        <div class="mgr-table-wrap" *ngIf="!loadingMgrOffers() && mgrFilteredOffers().length > 0">
          <table class="mgr-table">
            <thead><tr><th>Titre du poste</th><th>Manager</th><th>Département</th><th>Date de création</th><th>Statut</th><th>Lien externe</th></tr></thead>
            <tbody>
              <tr *ngFor="let offer of mgrFilteredOffers()">
                <td class="offer-title-cell">{{ offer.title }}</td>
                <td class="manager-cell"><span class="manager-chip">{{ offer.createdByName || offer.createdByEmail || '—' }}</span></td>
                <td>{{ offer.department || '—' }}</td>
                <td class="date-cell">{{ formatShortDate(offer.publishedDate ?? offer.createdAt) }}</td>
                <td><span class="offer-badge" [class]="'offer-badge-' + offer.status">{{ statusLabel(offer.status) }}</span></td>
                <td>
                  <button *ngIf="offer.status === 'PUBLISHED'"
                          class="btn-copy-link"
                          (click)="copyApplyLink(offer.id, offer.title)"
                          title="Copier le lien de candidature externe">
                    🔗 Copier le lien
                  </button>
                  <span *ngIf="offer.status !== 'PUBLISHED'" class="muted-dash">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL : PLANIFIER ENTRETIEN -->
    <div class="modal-overlay" *ngIf="showInterviewModal()" (click)="closeInterviewModal()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header"><h3>📅 Planifier un entretien</h3><button class="modal-close" (click)="closeInterviewModal()">✕</button></div>
        <p class="modal-sub">Candidat : <strong>{{ modalAppName() }}</strong> — {{ modalAppOffer() }}</p>
        <div class="modal-body">
          <div class="mfield"><label>Date et heure *</label><input type="datetime-local" class="mfc" [(ngModel)]="interviewDate" /></div>
          <div class="mfield"><label>Lieu / Lien visio *</label><input type="text" class="mfc" [(ngModel)]="interviewLocation" placeholder="ex: Salle B2 ou https://meet.google.com/..." /></div>
          <div class="mfield"><label>Nom de l'intervieweur</label><input type="text" class="mfc" [(ngModel)]="interviewerName" placeholder="ex: Mme. Farhat RH" /></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel-modal" (click)="closeInterviewModal()">Annuler</button>
          <button class="btn btn-primary" (click)="confirmInterview()" [disabled]="!interviewDate || !interviewLocation">Confirmer et envoyer email</button>
        </div>
      </div>
    </div>

    <!-- MODAL : REFUSER CANDIDATURE -->
    <div class="modal-overlay" *ngIf="showRejectModal()" (click)="closeRejectModal()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header"><h3>❌ Refuser la candidature</h3><button class="modal-close" (click)="closeRejectModal()">✕</button></div>
        <p class="modal-sub">Candidat : <strong>{{ modalAppName() }}</strong> — {{ modalAppOffer() }}</p>
        <div class="modal-body">
          <div class="mfield">
            <label>Motif du refus * <span class="muted-sm">(obligatoire — envoyé par email)</span></label>
            <textarea class="mfc" rows="4" [(ngModel)]="rejectionReason" placeholder="ex: Profil ne correspond pas aux exigences..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel-modal" (click)="closeRejectModal()">Annuler</button>
          <button class="btn btn-danger-solid" (click)="confirmReject()" [disabled]="!rejectionReason?.trim()">Confirmer le refus</button>
        </div>
      </div>
    </div>

    <!-- MODAL : REFUSER OFFRE -->
    <div class="modal-overlay" *ngIf="showRefuseOfferModal()" (click)="closeRefuseOfferModal()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header"><h3>❌ Refuser l'offre</h3><button class="modal-close" (click)="closeRefuseOfferModal()">✕</button></div>
        <p class="modal-sub">Offre : <strong>{{ modalOfferTitle() }}</strong></p>
        <div class="modal-body">
          <div class="mfield">
            <label>Motif du refus * <span class="muted-sm">(envoyé au manager)</span></label>
            <textarea class="mfc" rows="3" [(ngModel)]="offerRefuseReason" placeholder="ex: Budget non approuvé..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-cancel-modal" (click)="closeRefuseOfferModal()">Annuler</button>
          <button class="btn btn-danger-solid" (click)="confirmRefuseOffer()" [disabled]="!offerRefuseReason?.trim()">Confirmer le refus</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .panel{background:#F8FAFC;border:1px solid #E5E7EB;border-radius:16px;padding:1.5rem;min-height:600px;display:flex;flex-direction:column}
    .header-row{margin-bottom:1rem}
    h2{margin:0 0 .25rem;font-size:1.5rem;font-weight:800;color:#0F172A}
    .muted{color:#9CA3AF;margin:0;font-size:.875rem}
    .muted-sm{font-size:.72rem;color:#9CA3AF;font-weight:400}
    .tabs{display:flex;gap:.25rem;margin-bottom:1.5rem;background:#F1F5F9;border-radius:10px;padding:.25rem}
    .tab{flex:1;background:transparent;border:none;border-radius:8px;padding:.55rem 1rem;font-size:.83rem;font-weight:600;cursor:pointer;color:#64748B;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:.4rem}
    .tab.active{background:#fff;color:#1D4ED8;box-shadow:0 1px 4px rgba(0,0,0,.1)}
    .tab-badge{background:#FF6B6B;color:#fff;border-radius:999px;padding:0 6px;font-size:.65rem;font-weight:700}
    .pending-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}
    .pending-card{background:#fff;border:1.5px solid #FDE68A;border-left:4px solid #F59E0B;border-radius:12px;padding:1.25rem;display:flex;flex-direction:column;gap:.6rem}
    .pending-card-head{display:flex;justify-content:space-between;align-items:center}
    .badge-pending{background:rgba(245,158,11,.15);color:#92400E;border:1px solid rgba(245,158,11,.3);border-radius:999px;font-size:.65rem;font-weight:700;padding:.2rem .65rem;text-transform:uppercase}
    .pending-date{font-size:.72rem;color:#9CA3AF}
    .pending-title{margin:0;font-size:1rem;font-weight:800;color:#0F172A}
    .pending-meta{display:flex;gap:.75rem;flex-wrap:wrap;font-size:.78rem;color:#64748B}
    .pending-desc{font-size:.82rem;color:#475569;line-height:1.5;margin:0}
    .pending-actions{display:flex;gap:.6rem;margin-top:.25rem}
    .filter-bar{display:flex;align-items:center;gap:.75rem;margin-bottom:1.5rem;background:#fff;padding:.85rem 1rem;border-radius:10px;border:1px solid #E5E7EB;flex-wrap:wrap}
    .form-control{padding:.45rem .75rem;border-radius:8px;border:1.5px solid #E5E7EB;background:#F8FAFC;color:#1e293b;font-size:.85rem;outline:none}
    .form-control:focus{border-color:#4DA3FF}
    .form-control.search{flex:1;min-width:200px;background:#fff}
    .form-control.status-sel{width:180px}
    .toggle{display:inline-flex;align-items:center;gap:.35rem;font-size:.82rem;color:#334155;font-weight:600;cursor:pointer}
    .ai-sort-wrap{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:.3rem}
    .ai-sort-label{display:flex;align-items:center;gap:.4rem}
    .ai-sort-badge{font-size:.65rem;font-weight:800;padding:.1rem .45rem;border-radius:99px;background:#E5E7EB;color:#64748B}
    .ai-sort-badge.active{background:linear-gradient(135deg,#4DA3FF,#A78BFA);color:white}
    .ai-sort-info{display:flex;align-items:center;gap:.3rem;font-size:.72rem;color:#6366F1;font-weight:600}
    .ai-info-icon{cursor:help;font-size:.85rem}
    .ai-sort-mode{font-style:italic}
    .ai-sort-banner{display:flex;align-items:flex-start;gap:.75rem;background:linear-gradient(135deg,rgba(99,102,241,.06),rgba(168,85,247,.06));border:1px solid rgba(99,102,241,.2);border-radius:10px;padding:.75rem 1rem;margin-bottom:1rem;font-size:.83rem;color:#334155}
    .ai-banner-icon{font-size:1.1rem;flex-shrink:0;margin-top:.05rem}
    .ai-banner-text{line-height:1.5}
    .ai-banner-text strong{color:#4338CA}
    .kanban-board{display:flex;gap:1rem;overflow-x:auto;flex-grow:1;padding-bottom:1rem}
    .kanban-col{flex:1;min-width:240px;background:#F1F5F9;border-radius:12px;display:flex;flex-direction:column;padding:.85rem;border:1.5px solid #E5E7EB;transition:border-color .2s,background .2s}
    .kanban-col.col-drop-target{border-color:#4DA3FF;background:rgba(77,163,255,.04)}
    .col-header{margin-bottom:.5rem;padding-bottom:.5rem;border-bottom:2px solid #E5E7EB}
    .col-header-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap}
    .col-header h3{margin:0;font-size:.82rem;color:#374151;display:flex;align-items:center;gap:.4rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em}
    .count{background:#fff;color:#374151;padding:.1rem .55rem;border-radius:9999px;font-size:.72rem;font-weight:700;border:1px solid #E5E7EB}
    .count-warn{background:#FEF3C7;color:#92400E;border-color:#FCD34D}
    .col-load-badge{font-size:.6rem;font-weight:700;padding:.15rem .5rem;border-radius:99px;background:rgba(245,158,11,.12);color:#92400E;border:1px solid rgba(245,158,11,.3);white-space:nowrap}
    .col-load-badge.warn{animation:pulse-warn 2s infinite}
    @keyframes pulse-warn{0%,100%{opacity:1}50%{opacity:.6}}
    .app-card{background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:.9rem;margin-bottom:.65rem;box-shadow:0 1px 4px rgba(0,0,0,.05);transition:transform .2s,box-shadow .2s;cursor:grab}
    .app-card:hover{transform:translateY(-2px);box-shadow:0 4px 14px rgba(77,163,255,.1);border-color:rgba(77,163,255,.3)}
    .app-card:active{cursor:grabbing}
    .app-card.done{opacity:.75;cursor:default}
    .app-card.reviewing-col{border-left:3px solid #A78BFA}
    .app-card.interview-col{border-left:3px solid #34D399}
    .app-card h4{margin:0 0 .2rem;font-size:.88rem;color:#1e293b;font-weight:700}
    .meta{color:#9CA3AF;font-size:.75rem;margin:0}
    .days-ago{font-size:.68rem;color:#94A3B8;margin:.2rem 0 .4rem}
    .card-top{display:flex;align-items:flex-start;gap:.6rem;margin-bottom:.35rem}
    .avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800;color:#fff;flex-shrink:0}
    .avatar-done{opacity:.65}
    .card-info{flex:1;min-width:0}
    .card-info h4{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px}
    .reviewing-dot{background:#A78BFA}
    .interview-dot{background:#34D399}
    .score-pill{font-size:.72rem;color:#475569;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;margin:.35rem 0;cursor:pointer;transition:border-color .2s;user-select:none}
    .score-pill:hover{border-color:#A5B4FC}
    .score-pill.expanded{border-color:#6366F1;background:#FAFAFE}
    .score-pill-header{display:flex;align-items:center;gap:.4rem;padding:.35rem .6rem}
    .score-icon{font-size:.8rem}
    .score-label{flex:1;font-weight:600}
    .score-toggle-arrow{font-size:.6rem;color:#94A3B8;margin-left:auto}
    .score-val{font-weight:800;font-size:.82rem}
    .score-high{color:#16A34A}
    .score-med{color:#D97706}
    .score-low{color:#DC2626}
    .score-bar-inline{flex:1;height:4px;background:#E5E7EB;border-radius:99px;overflow:hidden;min-width:40px}
    .score-fill{height:100%;border-radius:99px;transition:width .4s ease}
    .score-fill.high{background:#22C55E}
    .score-fill.med{background:#F59E0B}
    .score-fill.low{background:#EF4444}
    .score-breakdown{border-top:1px solid #E5E7EB;padding:.6rem .65rem .65rem;display:flex;flex-direction:column;gap:.5rem;background:white;border-radius:0 0 7px 7px}
    .bd-section{display:flex;flex-direction:column;gap:.25rem}
    .bd-row{display:flex;align-items:center;justify-content:space-between}
    .bd-title{font-weight:800;font-size:.72rem;color:#4338CA;padding-bottom:.25rem;border-bottom:1px solid #EEF2FF}
    .bd-sub{font-weight:700;font-size:.7rem;color:#334155}
    .bd-total{font-weight:800;font-size:.75rem;color:#4338CA}
    .bd-pts{font-weight:800;font-size:.72rem;padding:.1rem .4rem;border-radius:5px;background:#F1F5F9;color:#475569}
    .bd-pts.pts-good{background:#F0FDF4;color:#16A34A}
    .bd-pts.pts-warn{background:#FFF7ED;color:#B45309}
    .bd-skills{display:flex;flex-wrap:wrap;gap:.25rem;margin-top:.1rem}
    .bd-skill{font-size:.68rem;font-weight:600;padding:.1rem .45rem;border-radius:5px}
    .bd-skill.matched{background:#F0FDF4;color:#166534;border:1px solid #BBF7D0}
    .bd-skill.missing{background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA}
    .bd-muted{font-size:.65rem;color:#9CA3AF;font-weight:400}
    .bd-exp-scale{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.1rem}
    .bd-exp-scale span{font-size:.64rem;color:#9CA3AF;padding:.1rem .35rem;border-radius:4px;background:#F8FAFC;border:1px solid #E5E7EB}
    .bd-exp-scale span.active{color:#1D4ED8;background:#EFF6FF;border-color:#BFDBFE;font-weight:700}
    .cover-details{margin-top:.2rem}
    .cover-details summary{cursor:pointer;font-size:.75rem;font-weight:700;color:#2563EB;user-select:none}
    .cover-text{margin:.4rem 0 0;padding:.65rem;background:rgba(37,99,235,.05);border:1px solid rgba(37,99,235,.12);border-radius:7px;color:#334155;font-size:.82rem;line-height:1.4;white-space:pre-wrap;max-height:140px;overflow:auto}
    .actions{display:flex;gap:.4rem;margin-top:.65rem;flex-wrap:wrap}
    .mt-2{margin-top:.4rem}
    .pagination{display:flex;align-items:center;justify-content:center;gap:4px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #E5E7EB}
    .pg-btn{background:#fff;border:1px solid #E5E7EB;border-radius:6px;padding:3px 8px;font-size:.75rem;cursor:pointer;color:#374151;font-weight:600}
    .pg-btn:hover:not(:disabled){background:#F1F5F9;border-color:#4DA3FF;color:#4DA3FF}
    .pg-btn:disabled{opacity:.4;cursor:not-allowed}
    .pg-info{font-size:.75rem;color:#64748B;font-weight:600;padding:0 4px}
    .btn{padding:.35rem .7rem;border-radius:7px;border:none;cursor:pointer;font-weight:600;font-size:.78rem;transition:all .15s}
    .btn-sm{font-size:.72rem;padding:.25rem .55rem}
    .btn-outline{border:1.5px solid #4DA3FF;color:#4DA3FF;background:transparent}
    .btn-outline:hover{background:rgba(77,163,255,.08)}
    .btn-reviewing{border:1.5px solid #A78BFA;color:#7C3AED;background:rgba(167,139,250,.08)}
    .btn-reviewing:hover{background:rgba(167,139,250,.18)}
    .btn-outline-green{border:1.5px solid #22C55E;color:#22C55E;background:transparent}
    .btn-outline-green:hover{background:rgba(34,197,94,.08)}
    .btn-primary{background:#4DA3FF;color:#fff}
    .btn-primary:hover:not(:disabled){background:#2E86FF}
    .btn-primary:disabled{opacity:.5;cursor:not-allowed}
    .btn-success{background:#22C55E;color:#fff}
    .btn-success:hover{background:#16A34A}
    .btn-danger{background:rgba(255,107,107,.1);color:#FF6B6B;border:1px solid rgba(255,107,107,.25)}
    .btn-danger:hover{background:rgba(255,107,107,.18)}
    .btn-danger-solid{background:#FF6B6B;color:#fff;border:none}
    .btn-danger-solid:hover:not(:disabled){background:#EF4444}
    .btn-danger-solid:disabled{opacity:.5;cursor:not-allowed}
    .btn-link{background:transparent;color:#38BDF8;font-size:.7rem;text-decoration:underline;padding:0;cursor:pointer;border:none}
    .btn-cancel-modal{background:transparent;border:1.5px solid #E5E7EB;color:#374151;padding:.55rem 1.1rem;border-radius:8px;cursor:pointer;font-weight:600;font-size:.85rem}
    .btn-cancel-modal:hover{background:#F8FAFC}
    .badge{padding:.2rem .55rem;border-radius:6px;font-size:.7rem;font-weight:700;text-transform:uppercase;display:inline-block;margin-top:.4rem}
    .badge-success{background:rgba(34,197,94,.12);color:#166534}
    .badge-danger{background:rgba(255,107,107,.12);color:#B91C1C}
    .flex-row{display:flex;align-items:center;justify-content:space-between;margin-top:.4rem}
    .loader{margin:2rem 0;color:#9CA3AF;font-style:italic;text-align:center}
    .empty-state{text-align:center;padding:3rem;background:#F8FAFC;border-radius:14px;border:2px dashed #E5E7EB;color:#9CA3AF;margin-top:1rem}
    .empty-icon{font-size:2.5rem;margin-bottom:.75rem}
    .modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:1rem}
    .modal{background:#fff;border-radius:18px;width:100%;max-width:480px;box-shadow:0 20px 60px rgba(0,0,0,.2);overflow:hidden}
    .modal-header{display:flex;justify-content:space-between;align-items:center;padding:1.25rem 1.5rem;border-bottom:1px solid #F1F5F9}
    .modal-header h3{margin:0;font-size:1.05rem;font-weight:800;color:#0F172A}
    .modal-close{background:transparent;border:none;font-size:1.1rem;cursor:pointer;color:#94A3B8;padding:0}
    .modal-close:hover{color:#475569}
    .modal-sub{margin:.85rem 1.5rem 0;font-size:.83rem;color:#64748B}
    .modal-body{padding:1rem 1.5rem;display:flex;flex-direction:column;gap:.85rem}
    .mfield{display:flex;flex-direction:column;gap:.3rem}
    .mfield label{font-size:.75rem;font-weight:700;color:#374151}
    .mfc{padding:.65rem .85rem;border-radius:8px;border:1.5px solid #E5E7EB;font-family:inherit;font-size:.88rem;color:#1e293b;outline:none;width:100%;box-sizing:border-box;transition:border-color .15s}
    .mfc:focus{border-color:#4DA3FF;box-shadow:0 0 0 3px rgba(77,163,255,.12)}
    textarea.mfc{resize:vertical}
    .modal-footer{display:flex;justify-content:flex-end;gap:.75rem;padding:1rem 1.5rem;border-top:1px solid #F1F5F9}
    .mgr-summary{display:flex;gap:1rem;margin-bottom:1rem;flex-wrap:wrap}
    .mgr-stat{background:#fff;border:1px solid #E5E7EB;border-radius:10px;padding:.6rem 1.1rem;display:flex;flex-direction:column;align-items:center;min-width:120px}
    .mgr-stat.warn{border-color:#FDE68A;background:rgba(245,158,11,.05)}
    .mgr-stat.ok{border-color:#BBF7D0;background:rgba(34,197,94,.05)}
    .mgr-stat-num{font-size:1.4rem;font-weight:800;color:#0F172A;line-height:1}
    .mgr-stat.warn .mgr-stat-num{color:#92400E}
    .mgr-stat-lbl{font-size:.68rem;color:#9CA3AF;margin-top:.2rem;text-align:center}
    .mgr-table-wrap{overflow-x:auto;border-radius:12px;border:1px solid #E5E7EB}
    .mgr-table{width:100%;border-collapse:collapse;background:#fff;font-size:.83rem}
    .mgr-table thead tr{background:#F1F5F9}
    .mgr-table th{padding:.7rem 1rem;text-align:left;font-size:.72rem;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #E5E7EB}
    .mgr-table td{padding:.75rem 1rem;border-bottom:1px solid #F1F5F9;color:#334155;vertical-align:middle}
    .mgr-table tbody tr:hover{background:#F8FAFC}
    .mgr-table tbody tr:last-child td{border-bottom:none}
    .offer-title-cell{font-weight:600;color:#1e293b}
    .btn-copy-link{background:#eff6ff;color:#3b82f6;border:1px solid #bfdbfe;border-radius:6px;padding:.3rem .7rem;font-size:.78rem;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .15s}
    .btn-copy-link:hover{background:#dbeafe}
    .muted-dash{color:#cbd5e1;font-size:.9rem}
    .date-cell{color:#9CA3AF;font-size:.78rem}
    .manager-chip{display:inline-flex;align-items:center;gap:.3rem;background:rgba(99,102,241,.08);color:#4338CA;border:1px solid rgba(99,102,241,.2);border-radius:999px;padding:.15rem .6rem;font-size:.72rem;font-weight:600}
    .offer-badge{padding:.2rem .65rem;border-radius:999px;font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
    .offer-badge-PENDING_VALIDATION{background:rgba(245,158,11,.15);color:#92400E;border:1px solid rgba(245,158,11,.3)}
    .offer-badge-PUBLISHED{background:rgba(34,197,94,.12);color:#166534;border:1px solid rgba(34,197,94,.25)}
    .offer-badge-DRAFT{background:rgba(100,116,139,.1);color:#475569;border:1px solid rgba(100,116,139,.2)}
    .offer-badge-CLOSED{background:rgba(99,102,241,.1);color:#3730A3;border:1px solid rgba(99,102,241,.2)}
    .offer-badge-CANCELLED{background:rgba(255,107,107,.1);color:#B91C1C;border:1px solid rgba(255,107,107,.2)}
  `],
})
export class RecruitmentOversightComponent implements OnInit {
  private recruitmentService = inject(RecruitmentService);
  private toastService = inject(ToastService);

  activeTab = signal<'offers' | 'pipeline' | 'mgr-offers'>('offers');
  pendingOffers = signal<JobOffer[]>([]);
  loadingPending = signal(true);
  allOffers = signal<JobOffer[]>([]);
  allApplications = signal<Application[]>([]);
  loadingData = signal(true);
  loadingApps = signal(true);
  selectedOfferId = '';
  query = signal('');
  statusFilter = signal('');
  smartSort = signal(true);
  expandedScoreId = signal<string | null>(null);
  scoreBreakdowns = signal<Record<string, ScoreBreakdown>>({});
  private readonly DEV_FULLSTACK_OFFER_RE = /full\s*stack|java.*angular|angular.*java/i;
  private draggedApp: Application | null = null;
  dragOverCol = signal<string | null>(null);
  showInterviewModal = signal(false);
  modalAppId = signal('');
  modalAppName = signal('');
  modalAppOffer = signal('');
  interviewDate = '';
  interviewLocation = '';
  interviewerName = '';
  showRejectModal = signal(false);
  rejectionReason = '';
  allMgrOffers = signal<JobOffer[]>([]);
  mgrFilteredOffers = signal<JobOffer[]>([]);
  loadingMgrOffers = signal(false);
  mgrStatusFilter = '';
  mgrDeptFilter = '';
  mgrManagerFilter = '';
  mgrDateFilter = '';
  mgrDepartments = computed(() => [...new Set(this.allMgrOffers().map(o => o.department).filter(Boolean))].sort() as string[]);
  mgrManagers = computed(() => [...new Set(this.allMgrOffers().map(o => o.createdByName || o.createdByEmail).filter(Boolean))].sort() as string[]);
  mgrPendingCount = computed(() => this.allMgrOffers().filter(o => o.status === 'PENDING_VALIDATION').length);
  showRefuseOfferModal = signal(false);
  modalOfferId = signal('');
  modalOfferTitle = signal('');
  offerRefuseReason = '';
  currentPage = signal<Record<string, number>>({});
  private readonly PAGE_SIZE = 15;
  private readonly STATUS_URGENCY: Record<string, number> = { PENDING: 0, REVIEWING: 1, INTERVIEW_SCHEDULED: 2, ACCEPTED: 3, REJECTED: 4 };

  filteredApps = computed(() => {
    const q = this.query().trim().toLowerCase();
    const status = this.statusFilter();
    let list = this.allApplications();
    if (status) list = list.filter(a => a.status === status);
    if (q) list = list.filter(a => (a.applicantName ?? '').toLowerCase().includes(q) || (a.applicantEmail ?? '').toLowerCase().includes(q) || (a.jobOfferTitle ?? '').toLowerCase().includes(q));
    if (this.smartSort()) {
      const hasScores = list.some(a => (a.matchScore ?? 0) > 0);
      list = [...list].sort((a, b) => {
        if (hasScores) { const diff = (b.matchScore ?? 0) - (a.matchScore ?? 0); if (diff !== 0) return diff; }
        const urgency = (this.STATUS_URGENCY[a.status] ?? 99) - (this.STATUS_URGENCY[b.status] ?? 99);
        if (urgency !== 0) return urgency;
        return (a.applicantName ?? '').localeCompare(b.applicantName ?? '');
      });
    }
    return list;
  });

  aiSortModeLabel = computed(() => this.selectedOfferId ? 'Score IA : compétences + expérience' : 'Urgence : À traiter en premier');
  aiSortTooltip = computed(() => this.selectedOfferId ? 'Score IA : compétences vs offre + expérience + confiance.' : 'Mode urgence : À traiter en premier.');

  ngOnInit(): void { this.loadPendingOffers(); this.loadPipeline(); this.loadMgrOffers(); }

  loadPendingOffers(): void {
    this.loadingPending.set(true);
    this.recruitmentService.getPendingValidationOffers().subscribe({ next: offers => { const sorted = offers.sort((a, b) => RecruitmentOversightComponent.offerSortDate(b) - RecruitmentOversightComponent.offerSortDate(a)); this.pendingOffers.set(sorted); this.loadingPending.set(false); }, error: () => this.loadingPending.set(false) });
  }

  loadPipeline(): void {
    this.recruitmentService.getJobOffers().subscribe({
      next: data => {
        const sorted = data.sort((a, b) => RecruitmentOversightComponent.offerSortDate(b) - RecruitmentOversightComponent.offerSortDate(a));
        this.allOffers.set(sorted); this.loadingData.set(false);
        const first = sorted[0]?.id ?? ''; this.selectedOfferId = first;
        if (first) this.onOfferSelected(); else { this.allApplications.set([]); this.loadingApps.set(false); }
      },
      error: () => { this.loadingData.set(false); this.loadingApps.set(false); }
    });
  }

  onOfferSelected(): void {
    const id = this.selectedOfferId; this.currentPage.set({});
    if (!id) { this.loadAllApplications(); return; }
    const selectedOffer = this.allOffers().find(o => o.id === id) ?? null;
    this.loadingApps.set(true);
    this.recruitmentService.getMatchedApplicationsByOffer(id).subscribe({
      next: apps => { this.allApplications.set(this.addDevFixturesForOffer(apps, selectedOffer)); this.loadingApps.set(false); },
      error: () => this.recruitmentService.getApplicationsByOffer(id).subscribe({ next: apps => { this.allApplications.set(this.addDevFixturesForOffer(apps, selectedOffer)); this.loadingApps.set(false); }, error: () => this.loadingApps.set(false) })
    });
  }

  loadAllApplications(): void {
    this.loadingApps.set(true);
    const requests = this.allOffers().map(o => this.recruitmentService.getApplicationsByOffer(o.id));
    if (!requests.length) { this.allApplications.set([]); this.loadingApps.set(false); return; }
    let agg: Application[] = [], done = 0;
    requests.forEach(req => req.subscribe({ next: apps => { agg = [...agg, ...apps]; if (++done === requests.length) { this.allApplications.set(agg); this.loadingApps.set(false); } }, error: () => { if (++done === requests.length) { this.allApplications.set(agg); this.loadingApps.set(false); } } }));
  }

  getTotalByStatus(status: string): number { return this.filteredApps().filter(a => a.status === status).length; }
  getTotalPages(status: string): number { return Math.ceil(this.getTotalByStatus(status) / this.PAGE_SIZE); }

  private addDevFixturesForOffer(apps: Application[], offer: JobOffer | null): Application[] {
    if (!this.shouldUseDevFixtures(offer)) {
      return apps;
    }
    const fixtures = this.devCandidateApplicationsForOffer(offer!);
    const normalizeKey = (value?: string) => value?.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? '';
    const fixtureKeys = new Set<string>();
    for (const fixture of fixtures) {
      const emailKey = normalizeKey(fixture.applicantEmail);
      const nameKey = normalizeKey(fixture.applicantName);
      if (emailKey) fixtureKeys.add(`email:${emailKey}`);
      if (nameKey) fixtureKeys.add(`name:${nameKey}`);
    }

    const filteredApps = apps.filter(a => {
      const emailKey = normalizeKey(a.applicantEmail);
      const nameKey = normalizeKey(a.applicantName);
      return !(emailKey && fixtureKeys.has(`email:${emailKey}`)) && !(nameKey && fixtureKeys.has(`name:${nameKey}`));
    });

    return [...filteredApps, ...fixtures];
  }

  private shouldUseDevFixtures(offer: JobOffer | null): boolean {
    return !!offer && this.matchesFullStackOffer(offer.title);
  }

  private matchesFullStackOffer(title: string): boolean {
    const normalized = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return this.DEV_FULLSTACK_OFFER_RE.test(normalized);
  }

  private devCandidateApplicationsForOffer(offer: JobOffer): Application[] {
    const baseDate = new Date().toISOString();
    const createCandidate = (name: string, email: string, status: Application['status'], score: number, skills: string[], profile: { anneesExperience: number; niveau: string; formation: string; langues: string[]; softSkills: string[]; resumeProfil: string; }): Application => ({
      id: `dev-${name.toLowerCase().replace(/\s+/g, '-')}`,
      jobOfferId: offer.id,
      jobOfferTitle: offer.title,
      applicantEmail: email,
      applicantName: name,
      coverLetter: `Bonjour, je postule pour le poste ${offer.title} avec une expérience solide et un profil adapté.`,
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
      createCandidate('Ayoub Mansouri', 'ayoub.mansouri@example.com', 'PENDING', 94, ['Java', 'Spring Boot', 'Angular', 'TypeScript', 'Git', 'Docker', 'SQL', 'Architecture microservices'], {
        anneesExperience: 6,
        niveau: 'Senior',
        formation: 'Master Informatique',
        langues: ['Français', 'Anglais'],
        softSkills: ['Esprit d’équipe', 'Communication', 'Autonomie'],
        resumeProfil: 'Développeur Full Stack Java / Angular avec 6 ans d’expérience sur des projets microservices et front-end modernes.',
      }),
      createCandidate('Leïla Bensaid', 'leila.bensaid@example.com', 'PENDING', 82, ['Java', 'Angular', 'TypeScript', 'SQL', 'Git', 'REST'], {
        anneesExperience: 5,
        niveau: 'Confirmé',
        formation: 'Master Informatique',
        langues: ['Français', 'Anglais'],
        softSkills: ['Travail en équipe', 'Communication'],
        resumeProfil: 'Développeuse Full Stack Java / Angular expérimentée sur des projets internes et matches techniques élevés.',
      }),
      createCandidate('Mehdi Khellaf', 'mehdi.khellaf@example.com', 'PENDING', 73, ['Java', 'Spring', 'Angular', 'TypeScript', 'SQL'], {
        anneesExperience: 4,
        niveau: 'Confirmé',
        formation: 'DUT Informatique',
        langues: ['Français'],
        softSkills: ['Rigueur', 'Autonomie'],
        resumeProfil: 'Développeur Java / Angular avec une bonne expérience du back-end et une appétence pour le front-end.',
      }),
      createCandidate('Inès Cherif', 'ines.cherif@example.com', 'PENDING', 61, ['Java', 'Angular', 'HTML', 'CSS', 'Git'], {
        anneesExperience: 3,
        niveau: 'Intermédiaire',
        formation: 'Licence Informatique',
        langues: ['Français', 'Anglais'],
        softSkills: ['Adaptabilité', 'Organisation'],
        resumeProfil: 'Développeuse orientée full stack, avec une appétence front-end et des connaissances Java solides.',
      }),
      createCandidate('Romain Duvivier', 'romain.duvivier@example.com', 'PENDING', 48, ['Java', 'Angular', 'Git', 'SQL'], {
        anneesExperience: 2,
        niveau: 'Junior',
        formation: 'Licence Web',
        langues: ['Français'],
        softSkills: ['Curiosité', 'Volonté d’apprendre'],
        resumeProfil: 'Junior full stack Java/Angular motivé, prêt à progresser sur un poste en équipe.',
      }),
      createCandidate('Karim Benaissa', 'karim.benaissa@example.com', 'REVIEWING', 78, ['Java', 'Angular', 'TypeScript', 'Git', 'SQL', 'Spring Boot'], {
        anneesExperience: 4,
        niveau: 'Confirmé',
        formation: 'Licence Informatique',
        langues: ['Français', 'Anglais'],
        softSkills: ['Rigueur', 'Travail collaboratif'],
        resumeProfil: 'Développeur Full Stack Java/Angular avec un bon profil technique et une expérience de delivery agile.',
      }),
      createCandidate('Samir El Amrani', 'samir.elamrani@example.com', 'INTERVIEW_SCHEDULED', 55, ['Java', 'Angular', 'SQL', 'Git'], {
        anneesExperience: 3,
        niveau: 'Intermédiaire',
        formation: 'DUT Informatique',
        langues: ['Français'],
        softSkills: ['Organisation', 'Adaptabilité'],
        resumeProfil: 'Développeur Java/Angular motivé, avec une expérience sur des applications métier et des tests automatisés.',
      }),
      createCandidate('Yasmine Belkacem', 'yasmine.belkacem@example.com', 'ACCEPTED', 65, ['Java', 'Angular', 'TypeScript', 'HTML', 'CSS'], {
        anneesExperience: 5,
        niveau: 'Confirmé',
        formation: 'Master Développement Web',
        langues: ['Français', 'Espagnol'],
        softSkills: ['Esprit analytique', 'Communication'],
        resumeProfil: 'Developpeuse Full Stack avec une forte expérience front-end et une bonne connaissance du back-end Java.',
      }),
      createCandidate('Nora Haddad', 'nora.haddad@example.com', 'REJECTED', 18, ['JavaScript', 'HTML', 'CSS', 'React'], {
        anneesExperience: 2,
        niveau: 'Junior',
        formation: 'Licence Web',
        langues: ['Français'],
        softSkills: ['Curiosité', 'Esprit d’initiative'],
        resumeProfil: 'Profil orienté front-end et React, avec des gaps sur le stack Java/Angular attendu.',
      }),
    ];
  }
  getByStatus(status: string): Application[] {
    let all = this.filteredApps().filter(a => a.status === status);
    if (status === 'PENDING' && !this.smartSort()) {
      const nonAyoub = all.filter(a => a.applicantEmail?.toLowerCase() !== 'ayoub.mansouri@example.com' && a.applicantName?.toLowerCase() !== 'ayoub mansouri');
      const ayoub = all.filter(a => a.applicantEmail?.toLowerCase() === 'ayoub.mansouri@example.com' || a.applicantName?.toLowerCase() === 'ayoub mansouri');
      all = [...nonAyoub, ...ayoub];
    }
    const page = this.currentPage()[status] ?? 0;
    return all.slice(page * this.PAGE_SIZE, page * this.PAGE_SIZE + this.PAGE_SIZE);
  }
  getClosedApps(): Application[] {
    const all = this.filteredApps().filter(a => a.status === 'ACCEPTED' || a.status === 'REJECTED');
    const page = this.currentPage()['CLOSED'] ?? 0;
    return all.slice(page * this.PAGE_SIZE, page * this.PAGE_SIZE + this.PAGE_SIZE);
  }
  getTotalClosed(): number { return this.filteredApps().filter(a => a.status === 'ACCEPTED' || a.status === 'REJECTED').length; }
  getTotalPagesClosed(): number { return Math.ceil(this.getTotalClosed() / this.PAGE_SIZE); }
  goToPage(status: string, page: number): void { this.currentPage.update(p => ({ ...p, [status]: page })); }

  validateOffer(id: string): void {
    this.recruitmentService.validateJobOffer(id).subscribe({ next: () => { this.pendingOffers.update(list => list.filter(o => o.id !== id)); this.loadPipeline(); this.toastService.show('Offre validée et publiée avec succès.'); }, error: () => this.toastService.show('Erreur lors de la validation.', 'error') });
  }

  openRefuseOfferModal(offer: JobOffer): void { this.modalOfferId.set(offer.id); this.modalOfferTitle.set(offer.title); this.offerRefuseReason = ''; this.showRefuseOfferModal.set(true); }
  closeRefuseOfferModal(): void { this.showRefuseOfferModal.set(false); }
  confirmRefuseOffer(): void {
    const reason = this.offerRefuseReason?.trim(); if (!reason) return;
    this.recruitmentService.refuseJobOffer(this.modalOfferId(), reason).subscribe({ next: () => { this.pendingOffers.update(list => list.filter(o => o.id !== this.modalOfferId())); this.closeRefuseOfferModal(); this.toastService.show('Offre refusée. Le manager a été notifié.'); }, error: () => this.toastService.show('Erreur lors du refus.', 'error') });
  }

  private isDevFixtureId(id?: string): boolean {
    return !!id && id.trim().toLowerCase().startsWith('dev-');
  }

  private updateLocalDevApplicationStatus(appId: string, update: Record<string, unknown>): void {
    const normalizedId = appId.trim();
    this.allApplications.update(apps => apps.map(a => a.id === normalizedId ? { ...a, ...update } as Application : a));
    const all = JSON.parse(localStorage.getItem('sirh_dev_fixtures') ?? '{}');
    all[normalizedId] = { ...(all[normalizedId] ?? {}), ...update };
    localStorage.setItem('sirh_dev_fixtures', JSON.stringify(all));
  }

  simpleStatus(appId: string, status: ApplicationStatus): void {
    const normalizedId = appId?.trim();
    if (this.isDevFixtureId(normalizedId)) {
      this.updateLocalDevApplicationStatus(normalizedId, { status });
      this.toastService.show('Statut mis à jour (dev fixture).');
      return;
    }

    this.recruitmentService.updateApplicationStatus(normalizedId, { status }).subscribe({
      next: updated => { this.allApplications.update(apps => apps.map(a => a.id === updated.id ? updated : a)); this.toastService.show('Statut mis à jour.'); },
      error: err => {
        this.toastService.show(err?.error?.message || 'Erreur.', 'error');
      }
    });
  }

  openInterviewModal(app: Application): void { this.modalAppId.set(app.id); this.modalAppName.set(app.applicantName); this.modalAppOffer.set(app.jobOfferTitle); this.interviewDate = ''; this.interviewLocation = ''; this.interviewerName = ''; this.showInterviewModal.set(true); }
  closeInterviewModal(): void { this.showInterviewModal.set(false); }
  confirmInterview(): void {
    if (!this.interviewDate || !this.interviewLocation) return;
    const dateStr = this.interviewDate.replace('T', ' à ').substring(0, 16);
    const modalId = this.modalAppId().trim();
    if (this.isDevFixtureId(modalId)) {
      this.updateLocalDevApplicationStatus(modalId, {
        status: 'INTERVIEW_SCHEDULED',
        interviewDate: dateStr,
        interviewLocation: this.interviewLocation,
        interviewerName: this.interviewerName || undefined,
      });
      this.closeInterviewModal();
      this.toastService.show('Entretien planifié (dev fixture).');
      return;
    }

    this.recruitmentService.updateApplicationStatus(modalId, { status: 'INTERVIEW_SCHEDULED', interviewDate: dateStr, interviewLocation: this.interviewLocation, interviewerName: this.interviewerName || undefined }).subscribe({
      next: updated => { this.allApplications.update(apps => apps.map(a => a.id === updated.id ? updated : a)); this.closeInterviewModal(); this.toastService.show('Entretien planifié. Email envoyé au candidat.'); },
      error: err => {
        if (this.isDevFixtureId(modalId)) {
          this.updateLocalDevApplicationStatus(modalId, {
            status: 'INTERVIEW_SCHEDULED',
            interviewDate: dateStr,
            interviewLocation: this.interviewLocation,
            interviewerName: this.interviewerName || undefined,
          });
          this.closeInterviewModal();
          this.toastService.show('Entretien planifié localement (dev fixture).');
          return;
        }
        this.toastService.show(err?.error?.message || 'Erreur.', 'error');
      }
    });
  }

  openRejectModal(app: Application): void { this.modalAppId.set(app.id); this.modalAppName.set(app.applicantName); this.modalAppOffer.set(app.jobOfferTitle); this.rejectionReason = ''; this.showRejectModal.set(true); }
  closeRejectModal(): void { this.showRejectModal.set(false); }
  confirmReject(): void {
    const reason = this.rejectionReason?.trim(); if (!reason) return;
    const modalId = this.modalAppId().trim();
    if (this.isDevFixtureId(modalId)) {
      this.updateLocalDevApplicationStatus(modalId, { status: 'REJECTED', rejectionReason: reason });
      this.closeRejectModal();
      this.toastService.show('Candidature refusée (dev fixture).');
      return;
    }
    this.recruitmentService.updateApplicationStatus(modalId, { status: 'REJECTED', rejectionReason: reason }).subscribe({
      next: updated => { this.allApplications.update(apps => apps.map(a => a.id === updated.id ? updated : a)); this.closeRejectModal(); this.toastService.show('Candidature refusée. Email envoyé au candidat.'); },
      error: err => {
        if (this.isDevFixtureId(modalId)) {
          this.updateLocalDevApplicationStatus(modalId, { status: 'REJECTED', rejectionReason: reason });
          this.closeRejectModal();
          this.toastService.show('Candidature refusée localement (dev fixture).');
          return;
        }
        this.toastService.show(err?.error?.message || 'Erreur.', 'error');
      }
    });
  }

  toggleScore(app: Application): void {
    const currentId = this.expandedScoreId();
    if (currentId === app.id) { this.expandedScoreId.set(null); return; }
    this.expandedScoreId.set(app.id);
    if (this.scoreBreakdowns()[app.id]) return;
    const offer = this.allOffers().find(o => o.id === app.jobOfferId);
    const required = offer?.requiredSkills ?? [];
    const candidateNames = new Set((app.skills ?? []).map(s => s.name.toLowerCase()));
    const requiredNames = required.map(s => s.name);
    const matchedSkills = requiredNames.filter(n => candidateNames.has(n.toLowerCase()));
    const missingSkills = requiredNames.filter(n => !candidateNames.has(n.toLowerCase()));
    const totalRequired = requiredNames.length;
    const baseScore = totalRequired > 0 ? Math.min(100, Math.round((matchedSkills.length / totalRequired) * 100)) : 0;
    let yearsExp = app.candidateProfile?.anneesExperience ?? 0;
    if (!yearsExp && app.coverLetter) { const m = app.coverLetter.match(/(\d+)\s*(ans?|years?)/i); yearsExp = m ? parseInt(m[1], 10) : 0; }
    const expBonus = yearsExp >= 8 ? 12 : yearsExp >= 5 ? 8 : yearsExp >= 3 ? 5 : yearsExp >= 1 ? 2 : 0;
    const confBonus = (app.skills?.length ?? 0) >= 4 ? 5 : 0;
    this.scoreBreakdowns.update(map => ({ ...map, [app.id]: { matchedSkills, missingSkills, totalRequired, baseScore, expBonus, confBonus, yearsExp } }));
  }

  loadMgrOffers(): void {
    this.loadingMgrOffers.set(true);
    this.recruitmentService.getJobOffers().subscribe({ next: offers => { const sorted = offers.sort((a, b) => RecruitmentOversightComponent.offerSortDate(b) - RecruitmentOversightComponent.offerSortDate(a)); this.allMgrOffers.set(sorted); this.mgrFilteredOffers.set(sorted); this.loadingMgrOffers.set(false); }, error: () => this.loadingMgrOffers.set(false) });
  }

  applyMgrFilter(): void {
    let list = this.allMgrOffers();
    if (this.mgrStatusFilter) list = list.filter(o => o.status === this.mgrStatusFilter);
    if (this.mgrDeptFilter) list = list.filter(o => o.department === this.mgrDeptFilter);
    if (this.mgrManagerFilter) list = list.filter(o => (o.createdByName || o.createdByEmail) === this.mgrManagerFilter);
    if (this.mgrDateFilter) {
      const fromDate = RecruitmentOversightComponent.parseIsoDate(this.mgrDateFilter);
      if (fromDate) {
        const fromMs = fromDate.getTime();
        list = list.filter(o => {
          const createdDate = RecruitmentOversightComponent.parseIsoDate(o.createdAt);
          return createdDate ? createdDate.getTime() >= fromMs : false;
        });
      }
    }
    // Sort by publish date descending (newest first)
    list = list.sort((a, b) => RecruitmentOversightComponent.offerSortDate(b) - RecruitmentOversightComponent.offerSortDate(a));
    this.mgrFilteredOffers.set(list);
  }

  resetMgrFilters(): void { this.mgrStatusFilter = ''; this.mgrDeptFilter = ''; this.mgrManagerFilter = ''; this.mgrDateFilter = ''; this.mgrFilteredOffers.set(this.allMgrOffers()); }

  copyApplyLink(offerId: string, offerTitle: string): void {
    const link = `${window.location.origin}/postuler/${offerId}`;
    navigator.clipboard.writeText(link).then(() => {
      this.toastService.show(`🔗 Lien copié pour "${offerTitle}" — partagez-le sur LinkedIn ou par email.`, 'success');
    }).catch(() => {
      this.toastService.show(`Lien : ${link}`, 'info');
    });
  }

  statusLabel(status: OfferStatus): string {
    const labels: Record<OfferStatus, string> = { PENDING_VALIDATION: 'En attente', PUBLISHED: 'Publiée', DRAFT: 'Brouillon', CLOSED: 'Clôturée', CANCELLED: 'Refusée' };
    return labels[status] ?? status;
  }

  viewCv(app: Application): void {
    if (this.isDevFixtureId(app.id)) {
      this.recruitmentService.generateCv(app);
      return;
    }
    this.recruitmentService.downloadCv(app.id, app.cvFileName, app);
  }

  avatarInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  avatarColor(name: string): string {
    const colors = ['#6366F1','#8B5CF6','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444','#14B8A6','#F97316','#84CC16'];
    if (!name) return colors[0];
    let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  daysAgo(dateStr: string): string {
    if (!dateStr) return '';
    const date = RecruitmentOversightComponent.parseIsoDate(dateStr);
    if (!date) return '';
    const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Il y a 1 jour';
    return `Il y a ${diff} jours`;
  }

  private static parseIsoDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private static clampToToday(date: Date): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() > today.getTime() ? today : date;
  }

  private static parseDisplayDate(value: string | null | undefined): Date | null {
    const date = RecruitmentOversightComponent.parseIsoDate(value);
    return date ? RecruitmentOversightComponent.clampToToday(date) : null;
  }

  private static offerSortDate(offer: { publishedDate: string | null; createdAt: string }): number {
    const date = RecruitmentOversightComponent.parseDisplayDate(offer.publishedDate ?? offer.createdAt);
    return date ? date.getTime() : 0;
  }

  formatShortDate(value: string | null | undefined): string {
    const date = RecruitmentOversightComponent.parseDisplayDate(value);
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
  }

  formatOfferDate(offer: { publishedDate: string | null; createdAt: string; status?: OfferStatus }): string {
    const rawDate = offer.publishedDate ?? offer.createdAt;
    const parsed = RecruitmentOversightComponent.parseIsoDate(rawDate) ?? new Date();
    const displayDate = RecruitmentOversightComponent.clampToToday(parsed);
    const day = String(displayDate.getDate()).padStart(2, '0');
    const month = String(displayDate.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${displayDate.getFullYear()}`;
  }

  formatPendingDate(offer: { publishedDate: string | null; createdAt: string; status?: OfferStatus }, index: number): string {
    const rawDate = offer.publishedDate ?? offer.createdAt;
    const parsed = RecruitmentOversightComponent.parseIsoDate(rawDate) ?? new Date();
    const displayDate = RecruitmentOversightComponent.clampToToday(parsed);
    const day = String(displayDate.getDate()).padStart(2, '0');
    const month = String(displayDate.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${displayDate.getFullYear()}`;
  }

  onDragStart(app: Application): void { this.draggedApp = app; }
  onDragOver(event: DragEvent, colStatus?: string): void { event.preventDefault(); if (colStatus) this.dragOverCol.set(colStatus); }
  onDragLeave(colStatus: string): void { if (this.dragOverCol() === colStatus) this.dragOverCol.set(null); }
  onDrop(event: DragEvent, newStatus: string): void {
    event.preventDefault(); this.dragOverCol.set(null);
    const app = this.draggedApp; this.draggedApp = null;
    if (!app || app.status === newStatus) return;
    this.simpleStatus(app.id, newStatus as ApplicationStatus);
  }
}