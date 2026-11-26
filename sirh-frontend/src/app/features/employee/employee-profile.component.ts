import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { Employee, EmployeeRequest, EmployeeSkill, SkillLevel } from '../../core/services/employee.models';
import { EmployeeService } from '../../core/services/employee.service';
import { RecruitmentService } from '../../core/services/recruitment.service';
import { JobOffer } from '../../core/services/recruitment.models';

const LEVEL_LABELS: Record<SkillLevel, string> = {
  DEBUTANT: 'Débutant',
  INTERMEDIAIRE: 'Intermédiaire',
  AVANCE: 'Avancé',
  EXPERT: 'Expert'
};
const LEVEL_COLORS: Record<SkillLevel, string> = {
  DEBUTANT: '#F59E0B',
  INTERMEDIAIRE: '#3B82F6',
  AVANCE: '#8B5CF6',
  EXPERT: '#10B981'
};
const ALL_LEVELS: SkillLevel[] = ['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'EXPERT'];

@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wrap animate-fade-in">

      <!-- Loading skeleton -->
      <div *ngIf="loading()" class="skeleton-card">
        <div class="skeleton-header">
          <div class="skeleton sk-avatar"></div>
          <div class="sk-lines"><div class="skeleton sk-title"></div><div class="skeleton sk-sub"></div></div>
        </div>
        <div class="skeleton sk-body"></div>
      </div>

      <div *ngIf="error()" class="error-alert">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ error() }}
      </div>

      <ng-container *ngIf="!loading() && profile()">

        <!-- ══════ BANNIÈRE PROFIL INCOMPLET ══════ -->
        <div *ngIf="!profile()!.department || !profile()!.position || !profile()!.contractType" class="incomplete-banner">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>Votre profil est incomplet. Cliquez sur <strong>Modifier</strong> pour renseigner vos informations personnelles. Un administrateur RH devra compléter votre département et poste.</span>
        </div>

        <!-- ══════ SECTION 1 — Hero Header ══════ -->
        <div class="hero-card">
          <div class="hero-accent"></div>
          <div class="hero-body">
            <div class="avatar-wrap">
              <div class="avatar">{{ initials() }}</div>
            </div>
            <div class="hero-info">
              <h2 *ngIf="!editMode()">{{ profile()!.firstName }} {{ profile()!.lastName }}</h2>
              <div *ngIf="editMode()" class="edit-names-row">
                <input class="inp" [(ngModel)]="editData.firstName" placeholder="Prénom" />
                <input class="inp" [(ngModel)]="editData.lastName" placeholder="Nom" />
              </div>
              <div class="badge-row">
                <span class="pos-badge">{{ profile()!.position?.title || '—' }}</span>
                <span class="sep">·</span>
                <span class="dept-lbl">{{ profile()!.department?.name || '—' }}</span>
                <span class="role-chip" [ngClass]="userRole()">{{ roleLabel() }}</span>
              </div>
              <div class="contact-row">
                <span class="contact-item">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {{ profile()!.email }}
                </span>
                <span class="contact-item" *ngIf="profile()!.phone || editMode()">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span *ngIf="!editMode()">{{ profile()!.phone }}</span>
                  <input *ngIf="editMode()" class="inp inp-sm" [(ngModel)]="editData.phone" placeholder="Téléphone" />
                </span>
              </div>

              <!-- Champs étendus en mode édition -->
              <div *ngIf="editMode()" class="edit-extra-fields">
                <div class="edit-field-row">
                  <label class="edit-lbl">Adresse</label>
                  <input class="inp inp-full" [(ngModel)]="editData.address" placeholder="Adresse" />
                </div>
                <div class="edit-field-row">
                  <label class="edit-lbl">Ville</label>
                  <input class="inp inp-full" [(ngModel)]="editData.city" placeholder="Ville" />
                </div>
                <div class="edit-field-row">
                  <label class="edit-lbl">Date d'embauche</label>
                  <input class="inp inp-full" type="date" [(ngModel)]="editData.hireDate" />
                </div>
                <div class="edit-field-row">
                  <label class="edit-lbl">Type de contrat</label>
                  <select class="sel inp-full" [(ngModel)]="editData.contractType">
                    <option value="">— Sélectionner —</option>
                    <option *ngFor="let ct of contractTypes" [value]="ct">{{ ct }}</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="hero-actions">
              <button *ngIf="!editMode()" class="btn-outline" (click)="enableEditMode()">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                Modifier
              </button>
              <div *ngIf="editMode()" class="edit-btns">
                <button class="btn-cancel" (click)="cancelEdit()">Annuler</button>
                <button class="btn-confirm" [disabled]="savingProfile()" (click)="saveProfile()">
                  {{ savingProfile() ? '...' : 'Confirmer' }}
                </button>
              </div>
            </div>
          </div>
          <div *ngIf="profileFeedback()" class="toast-ok">{{ profileFeedback() }}</div>
        </div>

        <!-- ══════ SECTION 2 — Stats rapides ══════ -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon s-blue">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div class="stat-info">
              <span class="stat-val">{{ seniority() }}</span>
              <span class="stat-lbl">Ancienneté</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon s-green">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div class="stat-info">
              <span class="stat-val">{{ employeeSkills().length }}</span>
              <span class="stat-lbl">Compétences</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon s-purple">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            </div>
            <div class="stat-info">
              <span class="stat-val">{{ profile()!.contractType }}</span>
              <span class="stat-lbl">Contrat</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon s-orange">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div class="stat-info">
              <span class="stat-val">{{ recommendedOffers().length }}</span>
              <span class="stat-lbl">Offres suggérées</span>
            </div>
          </div>
        </div>

        <!-- ══════ SECTION 3 — Informations professionnelles ══════ -->
        <div class="glass-card">
          <div class="section-header">
            <div class="section-icon s-blue">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            </div>
            <h3>Informations professionnelles</h3>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="lbl">Poste</span>
              <span class="val">{{ profile()!.position?.title || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Département</span>
              <span class="val">{{ profile()!.department?.name || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Service</span>
              <span class="val">{{ profile()!.serviceName || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Manager direct</span>
              <span class="val">{{ profile()!.managerName || 'Aucun (sommet hiérarchique)' }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Date d'embauche</span>
              <span class="val">{{ formatProfileDate(profile()!.hireDate) }}</span>
            </div>
            <div class="info-item">
              <span class="lbl">Type de contrat</span>
              <span class="contract-chip" [ngClass]="profile()!.contractType">{{ profile()!.contractType }}</span>
            </div>
          </div>
        </div>

        <!-- ══════ SECTION 4 — Compétences avec niveaux ══════ -->
        <div class="glass-card">
          <div class="section-header">
            <div class="section-icon s-green">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <h3>Compétences & Niveaux</h3>
            <span class="section-badge">{{ employeeSkills().length }} compétence(s) active(s)</span>
          </div>

          <!-- Add skill input -->
          <div class="add-skill-row">
            <input class="inp inp-flex" [(ngModel)]="newSkillName" placeholder="Nouvelle compétence..." (keyup.enter)="addSkill()" />
            <select class="sel" [(ngModel)]="newSkillLevel">
              <option *ngFor="let lv of allLevels" [value]="lv">{{ levelLabel(lv) }}</option>
            </select>
            <button class="btn-add" [disabled]="!newSkillName.trim()" (click)="addSkill()">+ Ajouter</button>
          </div>

          <!-- Skills list -->
          <div class="skills-list" *ngIf="employeeSkills().length > 0">
            <div class="skill-row" *ngFor="let sk of employeeSkills(); let i = index">
              <div class="skill-name-col">
                <span class="skill-name">{{ sk.skillName }}</span>
              </div>
              <div class="skill-level-col">
                <div class="level-dots">
                  <span *ngFor="let lv of allLevels" class="level-dot"
                        [style.background]="levelValue(sk.level) >= levelValue(lv) ? getLevelColor(sk.level) : '#E2E8F0'"
                        [title]="levelLabel(lv)">
                  </span>
                </div>
                <span class="level-tag" [style.color]="getLevelColor(sk.level)" [style.background]="getLevelColor(sk.level) + '18'">
                  {{ levelLabel(sk.level) }}
                </span>
              </div>
              <div class="skill-actions-col">
                <select class="sel sel-sm" [ngModel]="sk.level" (ngModelChange)="changeLevel(i, $event)">
                  <option *ngFor="let lv of allLevels" [value]="lv">{{ levelLabel(lv) }}</option>
                </select>
                <button class="btn-remove" (click)="removeSkill(i)" title="Supprimer">×</button>
              </div>
            </div>
          </div>
          <div *ngIf="employeeSkills().length === 0" class="empty-skills">
            <p>Aucune compétence enregistrée. Ajoutez vos talents ci-dessus.</p>
          </div>

          <div class="skills-footer">
            <button class="btn-save-skills" [disabled]="savingSkills()" (click)="saveSkills()">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {{ savingSkills() ? 'Enregistrement...' : 'Enregistrer les compétences' }}
            </button>
            <span class="save-ok" *ngIf="skillsFeedback()">{{ skillsFeedback() }}</span>
          </div>
        </div>

        <!-- ══════ SECTION 5 — Section spécifique Manager ══════ -->
        <div class="glass-card" *ngIf="isManager()">
          <div class="section-header">
            <div class="section-icon s-purple">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3>Mon équipe</h3>
          </div>
          <div class="team-stats">
            <div class="team-stat">
              <span class="team-stat-val">{{ teamMembers().length }}</span>
              <span class="team-stat-lbl">Membres d'équipe</span>
            </div>
          </div>
          <div class="team-list" *ngIf="teamMembers().length > 0">
            <div class="team-member" *ngFor="let m of paginatedTeamMembers()">
              <div class="mini-avatar">{{ m.firstName.charAt(0) }}{{ m.lastName.charAt(0) }}</div>
              <div class="member-info">
                <strong>{{ m.firstName }} {{ m.lastName }}</strong>
                <span>{{ m.position?.title || '—' }}</span>
              </div>
              <span class="contract-chip" [ngClass]="m.contractType">{{ m.contractType }}</span>
            </div>
            <div class="team-pager" *ngIf="teamTotalPages() > 1">
              <button class="pager-btn" (click)="teamPrevPage()" [disabled]="teamPage() === 1">‹</button>
              <span class="pager-info">{{ teamPage() }} / {{ teamTotalPages() }}</span>
              <button class="pager-btn" (click)="teamNextPage()" [disabled]="teamPage() === teamTotalPages()">›</button>
            </div>
          </div>
          <div *ngIf="teamMembers().length === 0" class="empty-skills">
            <p>Aucun membre d'équipe assigné pour l'instant.</p>
          </div>
        </div>

        <!-- ══════ SECTION 6 — Recommandations IA ══════ -->
        <div class="glass-card reco-card">
          <div class="section-header">
            <div class="section-icon s-green">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            </div>
            <h3>Recommandations de carrière</h3>
            <span class="ai-tag">IA</span>
          </div>
          <p class="reco-desc">Offres internes alignées avec vos compétences enregistrées.</p>

          <div *ngIf="recommendedOffers().length > 0; else noReco">
            <div class="reco-row" *ngFor="let offer of recommendedOffers()">
              <div>
                <strong>{{ offer.title }}</strong>
                <p class="reco-meta">{{ offer.department }} · {{ offer.location }}</p>
              </div>
              <div class="reco-score">
                <span class="match-pct" *ngIf="offer.requiredSkills">
                  {{ matchPercent(offer) }}% match
                </span>
                <button class="btn-explore">Explorer</button>
              </div>
            </div>
          </div>
          <ng-template #noReco>
            <div class="empty-skills">
              <p>Ajoutez des compétences pour débloquer des suggestions personnalisées.</p>
            </div>
          </ng-template>
        </div>

      </ng-container>

      <!-- Fallback when no profile matched the logged-in user -->
      <div *ngIf="!loading() && !profile()" class="glass-card">
        <div class="section-header">
          <div class="section-icon s-blue">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <h3>Profil introuvable</h3>
        </div>
        <p>Nous n'avons pas trouvé de fiche employé associée à votre compte. Si vous venez d'être créé(e), contactez un administrateur RH pour associer votre compte à votre fiche employé.</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .wrap { padding: 1.5rem 0; display: flex; flex-direction: column; gap: 1.75rem; }

    /* Animations */
    .animate-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* ── Skeleton ── */
    .skeleton-card { background: white; border-radius: 20px; padding: 2rem; border: 1px solid #F1F5F9; }
    .skeleton-header { display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem; }
    .sk-lines { flex: 1; display: flex; flex-direction: column; gap: 0.75rem; }
    .skeleton { border-radius: 8px; background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    .sk-avatar { width: 80px; height: 80px; border-radius: 20px; flex-shrink: 0; }
    .sk-title { height: 24px; width: 60%; }
    .sk-sub { height: 16px; width: 40%; }
    .sk-body { height: 120px; margin-top: 1rem; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* ── Incomplete banner ── */
    .incomplete-banner { background: #FFFBEB; border: 1.5px solid #FCD34D; color: #92400E; border-radius: 14px; padding: 1rem 1.25rem; display: flex; align-items: flex-start; gap: 0.75rem; font-size: 0.88rem; line-height: 1.5; }
    .incomplete-banner svg { flex-shrink: 0; margin-top: 2px; color: #D97706; }

    /* ── Error ── */
    .error-alert { background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C; border-radius: 14px; padding: 1rem 1.25rem; display: flex; align-items: center; gap: 0.75rem; font-weight: 600; font-size: 0.9rem; }

    /* ── Hero card ── */
    .hero-card { background: white; border-radius: 24px; border: 1px solid #E8EDF3; box-shadow: 0 4px 24px rgba(0,0,0,0.04); position: relative; overflow: hidden; }
    .hero-accent { position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, #4DA3FF, #6EE7B7, #A78BFA); }
    .hero-body { padding: 2rem 2rem 1.75rem; display: flex; align-items: flex-start; gap: 1.75rem; flex-wrap: wrap; }
    .avatar-wrap { flex-shrink: 0; }
    .avatar { width: 80px; height: 80px; border-radius: 22px; background: linear-gradient(135deg, #4DA3FF, #6EE7B7); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 800; color: white; }
    .hero-info { flex: 1; min-width: 200px; }
    h2 { margin: 0 0 0.5rem; font-size: 1.65rem; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; }
    .badge-row { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .pos-badge { color: #3B82F6; font-weight: 700; font-size: 0.9rem; }
    .sep { color: #CBD5E1; font-size: 0.9rem; }
    .dept-lbl { color: #64748B; font-size: 0.9rem; }
    .role-chip { padding: 0.2rem 0.7rem; border-radius: 99px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
    .role-chip.HR_ADMIN { background: #EDE9FE; color: #6D28D9; }
    .role-chip.MANAGER  { background: #DBEAFE; color: #1D4ED8; }
    .role-chip.EMPLOYEE { background: #D1FAE5; color: #065F46; }
    .contact-row { display: flex; gap: 1.25rem; flex-wrap: wrap; }
    .contact-item { display: flex; align-items: center; gap: 0.4rem; color: #64748B; font-size: 0.85rem; }
    .hero-actions { margin-left: auto; }
    .btn-outline { background: #F8FAFC; border: 1.5px solid #E2E8F0; color: #475569; padding: 0.5rem 1.1rem; border-radius: 12px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; }
    .btn-outline:hover { border-color: #3B82F6; color: #3B82F6; background: white; }
    .edit-btns { display: flex; gap: 0.6rem; }
    .btn-cancel { background: transparent; border: 1.5px solid #E2E8F0; color: #64748B; padding: 0.5rem 1rem; border-radius: 12px; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
    .btn-confirm { background: #0F172A; color: white; border: none; padding: 0.5rem 1.1rem; border-radius: 12px; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
    .btn-confirm:disabled { opacity: 0.5; }
    .toast-ok { background: #0F172A; color: white; font-size: 0.85rem; font-weight: 600; padding: 0.65rem 1.25rem; text-align: center; }

    /* ── Stats row ── */
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
    .stat-card { background: white; border: 1px solid #E8EDF3; border-radius: 18px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
    .stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .s-blue   { background: #EFF6FF; color: #3B82F6; }
    .s-green  { background: #F0FDF4; color: #10B981; }
    .s-purple { background: #F5F3FF; color: #8B5CF6; }
    .s-orange { background: #FFF7ED; color: #F59E0B; }
    .stat-val { font-size: 1.3rem; font-weight: 800; color: #0F172A; display: block; }
    .stat-lbl { font-size: 0.75rem; color: #94A3B8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

    /* ── Glass card ── */
    .glass-card { background: white; border: 1px solid #E8EDF3; border-radius: 20px; padding: 1.75rem; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }

    /* ── Section header ── */
    .section-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
    .section-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: #0F172A; }
    .section-badge { margin-left: auto; background: #F0FDF4; color: #10B981; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.65rem; border-radius: 99px; }
    .ai-tag { margin-left: auto; background: linear-gradient(135deg, #4DA3FF, #A78BFA); color: white; font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem; border-radius: 99px; }

    /* ── Info grid ── */
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; }
    .info-item { display: flex; flex-direction: column; gap: 0.4rem; }
    .lbl { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94A3B8; font-weight: 800; }
    .val { font-size: 0.95rem; color: #1E293B; font-weight: 600; }
    .contract-chip { padding: 0.25rem 0.7rem; border-radius: 99px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; width: fit-content; }
    .contract-chip.CDI { background: #DCFCE7; color: #166534; }
    .contract-chip.CDD { background: #DBEAFE; color: #1E40AF; }
    .contract-chip.STAGE { background: #FEF9C3; color: #854D0E; }
    .contract-chip.FREELANCE { background: #F3E8FF; color: #7E22CE; }
    .contract-chip.ALTERNANCE { background: #FEE2E2; color: #991B1B; }

    /* ── Skills section ── */
    .add-skill-row { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .inp { background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 0.55rem 0.85rem; font-size: 0.9rem; transition: border-color 0.2s; outline: none; }
    .inp:focus { border-color: #3B82F6; background: white; }
    .inp-flex { flex: 1; min-width: 160px; }
    .inp-sm { width: 130px; }
    .inp-names { width: 160px; }
    .edit-names-row { display: flex; gap: 0.75rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
    .edit-extra-fields { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.75rem; }
    .edit-field-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .edit-lbl { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: #94A3B8; font-weight: 800; min-width: 110px; }
    .inp-full { flex: 1; min-width: 180px; }
    .sel { background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 0.55rem 0.75rem; font-size: 0.88rem; cursor: pointer; outline: none; }
    .sel-sm { padding: 0.3rem 0.5rem; font-size: 0.82rem; border-radius: 8px; }
    .btn-add { background: #3B82F6; color: white; border: none; padding: 0.55rem 1rem; border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer; white-space: nowrap; }
    .btn-add:disabled { opacity: 0.5; cursor: not-allowed; }

    .skills-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
    .skill-row { display: flex; align-items: center; gap: 1rem; background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 0.75rem 1rem; }
    .skill-name-col { flex: 1; min-width: 120px; }
    .skill-name { font-weight: 700; color: #1E293B; font-size: 0.92rem; }
    .skill-level-col { display: flex; align-items: center; gap: 0.75rem; }
    .level-dots { display: flex; gap: 5px; }
    .level-dot { width: 10px; height: 10px; border-radius: 50%; transition: background 0.2s; }
    .level-tag { font-size: 0.72rem; font-weight: 800; padding: 0.2rem 0.65rem; border-radius: 99px; }
    .skill-actions-col { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; }
    .btn-remove { background: transparent; border: 1px solid #E2E8F0; color: #94A3B8; width: 26px; height: 26px; border-radius: 7px; cursor: pointer; font-size: 1rem; line-height: 1; transition: all 0.2s; }
    .btn-remove:hover { background: #FEF2F2; border-color: #FECACA; color: #EF4444; }

    .empty-skills { text-align: center; padding: 2rem; color: #94A3B8; font-size: 0.9rem; }

    .skills-footer { display: flex; align-items: center; gap: 1rem; padding-top: 0.5rem; border-top: 1px solid #F1F5F9; }
    .btn-save-skills { background: #0F172A; color: white; border: none; padding: 0.6rem 1.25rem; border-radius: 12px; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: opacity 0.2s; }
    .btn-save-skills:disabled { opacity: 0.5; }
    .save-ok { color: #10B981; font-weight: 700; font-size: 0.85rem; }

    /* ── Manager section ── */
    .team-stats { display: flex; gap: 1.5rem; margin-bottom: 1.25rem; }
    .team-stat { display: flex; flex-direction: column; gap: 0.2rem; }
    .team-stat-val { font-size: 2rem; font-weight: 800; color: #0F172A; }
    .team-stat-lbl { font-size: 0.75rem; color: #94A3B8; font-weight: 600; text-transform: uppercase; }
    .team-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .team-member { display: flex; align-items: center; gap: 1rem; background: #F8FAFC; border-radius: 12px; padding: 0.75rem 1rem; border: 1px solid #F1F5F9; }
    .team-pager { display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-top: 0.5rem; padding-top: 0.75rem; border-top: 1px solid #F1F5F9; }
    .pager-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #E5E7EB; background: #fff; color: #374151; font-size: 1rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .pager-btn:hover:not(:disabled) { background: #4DA3FF; color: #fff; border-color: #4DA3FF; }
    .pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .pager-info { font-size: 0.82rem; font-weight: 600; color: #64748B; min-width: 50px; text-align: center; }
    .mini-avatar { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #4DA3FF, #A78BFA); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 800; color: white; flex-shrink: 0; }
    .member-info { flex: 1; }
    .member-info strong { display: block; font-size: 0.9rem; color: #0F172A; font-weight: 700; }
    .member-info span { font-size: 0.8rem; color: #64748B; }

    /* ── Reco card ── */
    .reco-desc { color: #64748B; font-size: 0.88rem; margin-bottom: 1.25rem; }
    .reco-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 14px; padding: 1rem 1.25rem; margin-bottom: 0.75rem; transition: border-color 0.2s; }
    .reco-row:hover { border-color: #BFDBFE; }
    .reco-row strong { font-size: 0.92rem; color: #0F172A; font-weight: 700; }
    .reco-meta { font-size: 0.82rem; color: #64748B; margin: 0.15rem 0 0; }
    .reco-score { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
    .match-pct { font-size: 0.8rem; font-weight: 800; color: #10B981; background: #F0FDF4; padding: 0.2rem 0.65rem; border-radius: 99px; }
    .btn-explore { background: #EFF6FF; color: #3B82F6; border: none; padding: 0.4rem 0.9rem; border-radius: 9px; font-weight: 700; font-size: 0.82rem; cursor: pointer; }
  `]
})
export class EmployeeProfileComponent implements OnInit {
  private authService        = inject(AuthService);
  private employeeService    = inject(EmployeeService);
  private recruitmentService = inject(RecruitmentService);

  // Core state
  loading        = signal(true);
  error          = signal('');
  profile        = signal<Employee | null>(null);
  initials       = signal('');
  allEmployees   = signal<Employee[]>([]);

  // Edit profile
  editMode       = signal(false);
  savingProfile  = signal(false);
  profileFeedback = signal('');
  editData       = { firstName: '', lastName: '', phone: '', address: '', city: '', hireDate: '', contractType: '' };
  readonly contractTypes = ['CDI', 'CDD', 'STAGE', 'FREELANCE', 'ALTERNANCE'];

  // Skills (backend-driven)
  employeeSkills = signal<EmployeeSkill[]>([]);
  savingSkills   = signal(false);
  skillsFeedback = signal('');
  newSkillName   = '';
  newSkillLevel: SkillLevel = 'INTERMEDIAIRE';
  readonly allLevels = ALL_LEVELS;

  // Offers & recommendations
  allOffers         = signal<JobOffer[]>([]);
  recommendedOffers = signal<JobOffer[]>([]);

  // Computed
  userRole  = computed(() => {
    const roles = this.authService.userRoles();
    if (roles.includes('HR_ADMIN')) return 'HR_ADMIN';
    if (roles.includes('MANAGER'))  return 'MANAGER';
    return 'EMPLOYEE';
  });
  roleLabel = computed(() => {
    const r = this.userRole();
    if (r === 'HR_ADMIN') return 'RH Admin';
    if (r === 'MANAGER')  return 'Manager';
    return 'Employé';
  });
  isManager  = computed(() => this.userRole() === 'MANAGER');
  isHrAdmin  = computed(() => this.userRole() === 'HR_ADMIN');

  teamMembers = computed(() => {
    const p = this.profile();
    if (!p || !this.isManager()) return [];
    return this.allEmployees().filter(e => e.managerId === p.id);
  });

  teamPage = signal(1);
  readonly teamPageSize = 5;
  teamTotalPages = computed(() => Math.max(1, Math.ceil(this.teamMembers().length / this.teamPageSize)));
  paginatedTeamMembers = computed(() => {
    const page = Math.min(this.teamPage(), this.teamTotalPages());
    const start = (page - 1) * this.teamPageSize;
    return this.teamMembers().slice(start, start + this.teamPageSize);
  });
  teamPrevPage(): void { this.teamPage.update(p => Math.max(1, p - 1)); }
  teamNextPage(): void { this.teamPage.update(p => Math.min(this.teamTotalPages(), p + 1)); }

  seniority = computed(() => {
    const p = this.profile();
    if (!p?.hireDate) return '—';
    const hireDate = this.parseProfileDate(p.hireDate);
    if (!hireDate) return '—';
    const today = new Date();
    let months = (today.getFullYear() - hireDate.getFullYear()) * 12 + today.getMonth() - hireDate.getMonth();
    if (today.getDate() < hireDate.getDate()) months--;
    months = Math.max(0, months);
    if (months < 12) return `${months} mois`;
    const yrs = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${yrs} an${yrs > 1 ? 's' : ''} ${rem} mois` : `${yrs} an${yrs > 1 ? 's' : ''}`;
  });

  ngOnInit(): void {
    const email = this.authService.getEmail();
    if (!email) {
      // No email in token — don't bail out entirely, keep loading shared data
      console.warn('AuthService.getEmail() returned null — cannot auto-match employee profile.');
      this.loading.set(false);
    } else {
      // The backend auto-provisions a minimal employee record if none exists,
      // so a freshly registered account no longer lands on an empty profile.
      this.employeeService.getMyProfile().subscribe({
        next: (emp) => {
          this.profile.set(emp);
          if (emp) {
            this.initials.set(`${(emp.firstName || '?').charAt(0)}${(emp.lastName || '').charAt(0)}`.toUpperCase());
            // Load skills from backend
            if (emp.skills && emp.skills.length > 0) {
              this.employeeSkills.set(emp.skills);
            } else {
              this.employeeService.getEmployeeSkills(emp.id).subscribe({
                next: (skills) => this.employeeSkills.set(skills),
                error: () => {}
              });
            }
          }
          this.loading.set(false);
          this.refreshRecommendations();
        },
        error: () => { this.loading.set(false); }
      });
    }


    // Load all employees for manager team view and RH KPIs
    this.employeeService.getEmployees().subscribe({
      next: (list) => this.allEmployees.set(list),
      error: () => {}
    });

    // Load published offers for recommendations
    this.recruitmentService.getJobOffers('PUBLISHED').subscribe({
      next: (offers) => {
        this.allOffers.set(offers);
        this.refreshRecommendations();
      },
      error: () => {}
    });
  }

  // ── Profile edit ─────────────────────────────────────────────────
  enableEditMode(): void {
    const p = this.profile();
    if (!p) return;
    this.editData = {
      firstName:    p.firstName    || '',
      lastName:     p.lastName     || '',
      phone:        p.phone        || '',
      address:      p.address      || '',
      city:         p.city         || '',
      hireDate:     p.hireDate     || '',
      contractType: p.contractType || ''
    };
    this.editMode.set(true);
  }

  cancelEdit(): void { this.editMode.set(false); }

  saveProfile(): void {
    const p = this.profile();
    if (!p || p.id === '0') return;
    this.savingProfile.set(true);
    const req: EmployeeRequest = {
      firstName:    this.editData.firstName,
      lastName:     this.editData.lastName,
      email:        p.email,
      phone:        this.editData.phone    || undefined,
      address:      this.editData.address  || undefined,
      city:         this.editData.city     || undefined,
      hireDate:     this.editData.hireDate || p.hireDate,
      contractType: (this.editData.contractType || p.contractType) as any,
      departmentId: p.department?.id,
      positionId:   p.position?.id,
      serviceId:    p.serviceId,
      managerId:    p.managerId
    };
    this.employeeService.updateEmployee(p.id, req).subscribe({
      next: (updated) => {
        this.profile.update(c => ({ ...c!, ...updated }));
        this.initials.set(`${updated.firstName.charAt(0)}${updated.lastName.charAt(0)}`.toUpperCase());
        this.editMode.set(false);
        this.savingProfile.set(false);
        this.profileFeedback.set('Profil mis à jour avec succès.');
        setTimeout(() => this.profileFeedback.set(''), 3500);
      },
      error: () => {
        this.savingProfile.set(false);
        alert('Erreur lors de la sauvegarde du profil.');
      }
    });
  }

  // ── Skills ───────────────────────────────────────────────────────
  addSkill(): void {
    const name = this.newSkillName.trim();
    if (!name) return;
    if (this.employeeSkills().some(s => s.skillName.toLowerCase() === name.toLowerCase())) {
      this.newSkillName = '';
      return;
    }
    this.employeeSkills.update(list => [...list, { skillName: name, level: this.newSkillLevel }]);
    this.newSkillName = '';
    this.refreshRecommendations();
  }

  removeSkill(index: number): void {
    this.employeeSkills.update(list => list.filter((_, i) => i !== index));
    this.refreshRecommendations();
  }

  changeLevel(index: number, level: SkillLevel): void {
    this.employeeSkills.update(list =>
      list.map((s, i) => i === index ? { ...s, level } : s)
    );
  }

  saveSkills(): void {
    const p = this.profile();
    if (!p || p.id === '0') return;
    this.savingSkills.set(true);
    this.employeeService.updateEmployeeSkills(p.id, this.employeeSkills()).subscribe({
      next: (saved) => {
        this.employeeSkills.set(saved);
        this.savingSkills.set(false);
        this.skillsFeedback.set('Compétences enregistrées !');
        setTimeout(() => this.skillsFeedback.set(''), 3000);
        this.refreshRecommendations();
      },
      error: () => {
        this.savingSkills.set(false);
        alert('Erreur lors de la sauvegarde des compétences.');
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────
  levelLabel(level: SkillLevel): string { return LEVEL_LABELS[level]; }
  getLevelColor(level: SkillLevel): string { return LEVEL_COLORS[level]; }
  levelValue(level: SkillLevel): number {
    return { DEBUTANT: 1, INTERMEDIAIRE: 2, AVANCE: 3, EXPERT: 4 }[level] ?? 0;
  }

  formatProfileDate(value: string | null | undefined): string {
    const date = this.parseProfileDate(value);
    if (!date) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  private parseProfileDate(value: string | null | undefined): Date | null {
    if (!value) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  matchPercent(offer: JobOffer): number {
    if (!offer.requiredSkills?.length) return 0;
    const myNames = new Set(this.employeeSkills().map(s => s.skillName.toLowerCase()));
    const matched = offer.requiredSkills.filter(s => myNames.has(s.name.toLowerCase())).length;
    return Math.round((matched / offer.requiredSkills.length) * 100);
  }

  private refreshRecommendations(): void {
    const myNames = new Set(this.employeeSkills().map(s => s.skillName.toLowerCase()));
    if (myNames.size === 0) { this.recommendedOffers.set([]); return; }
    const ranked = this.allOffers()
      .map(o => ({ o, score: (o.requiredSkills ?? []).filter(s => myNames.has(s.name.toLowerCase())).length }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(x => x.o);
    this.recommendedOffers.set(ranked);
  }
}
