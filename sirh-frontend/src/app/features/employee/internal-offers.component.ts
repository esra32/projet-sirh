import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { JobOffer, Skill } from '../../core/services/recruitment.models';
import { RecruitmentService } from '../../core/services/recruitment.service';
import { EmployeeService } from '../../core/services/employee.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

export function parseSearchDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const dashMatch = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, day, month, year] = dashMatch;
    const parsed = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateSearchValues(value: string | null | undefined): string[] {
  const parsed = parseSearchDate(value);
  if (!parsed) return [];

  const iso = parsed.toISOString().split('T')[0];
  const fr = `${parsed.getDate().toString().padStart(2, '0')}/${(parsed.getMonth() + 1).toString().padStart(2, '0')}/${parsed.getFullYear()}`;
  return [iso, fr, fr.replace(/\//g, '-')];
}

export function shouldDisplayOfferInEmployeeList(offer: Pick<JobOffer, 'status' | 'publishedDate'> | null | undefined): boolean {
  if (!offer) return false;

  const status = offer.status?.toUpperCase();
  if (status === 'PUBLISHED') return true;
  if (status === 'PENDING_VALIDATION') return Boolean(offer.publishedDate);
  return false;
}

export function offerMatchesQuery(offer: JobOffer, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  const haystacks = [
    offer.title,
    offer.department,
    offer.location,
    offer.description,
    offer.createdAt,
    offer.publishedDate,
    offer.deadlineDate,
    ...(offer.requiredSkills ?? []).map(skill => skill.name),
  ].filter((value): value is string => Boolean(value));

  const textMatch = haystacks.some(value => String(value).toLowerCase().includes(normalizedQuery));
  if (textMatch) return true;

  const dateMatches = [offer.createdAt, offer.publishedDate, offer.deadlineDate]
    .flatMap(value => toDateSearchValues(value))
    .map(value => value.toLowerCase());

  return dateMatches.some(value => value.includes(normalizedQuery));
}

@Component({
  selector: 'app-internal-offers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="panel">
      <div class="header-row">
        <div>
          <h2>Offres internes</h2>
          <p class="muted">Découvrez nos opportunités de carrière en interne · {{ filteredOffers().length }} offre(s)</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar" *ngIf="!loading()">
        <input
          type="text"
          class="search-input"
          placeholder="🔍  Titre, département, localisation, date..."
          [(ngModel)]="locationQuery"
          (ngModelChange)="applyFilter()"
        />
        <select class="skill-select" [(ngModel)]="selectedSkill" (ngModelChange)="applyFilter()">
          <option value="">Toutes les compétences</option>
          <option *ngFor="let s of allSkills()" [value]="s.name">{{ s.name }}</option>
        </select>
      </div>

      <div class="pager" *ngIf="!loading() && filteredOffers().length > 0">
        <span>{{ filteredOffers().length }} offre(s) interne(s)</span>
        <div>
          <button (click)="firstPage()" [disabled]="page() === 1">&laquo;</button>
          <button (click)="previousPage()" [disabled]="page() === 1">&lsaquo;</button>
          <b>{{ page() }} / {{ totalPages() }}</b>
          <button (click)="nextPage()" [disabled]="page() === totalPages()">&rsaquo;</button>
          <button (click)="lastPage()" [disabled]="page() === totalPages()">&raquo;</button>
        </div>
      </div>

      <div *ngIf="loading()" class="loader">Recherche des offres...</div>

      <div class="offers-grid" *ngIf="!loading()">
        
        <div class="offer-card" *ngFor="let offer of paginatedOffers(); trackBy: trackByOffer">
          <div class="offer-header">
            <h3>{{ offer.title }}</h3>
            <span class="badge">{{ offer.department }}</span>
          </div>
          <div class="offer-meta">
            <span><i class="icon-location"></i> {{ offer.location }}</span>
            <span><i class="icon-calendar"></i> Publié le {{ offer.publishedDate | date }}</span>
          </div>
          <p class="offer-desc">{{ offer.description }}</p>
          
          <div class="skills-list" *ngIf="offer.requiredSkills && offer.requiredSkills.length > 0">
            <span class="skill-tag" *ngFor="let skill of offer.requiredSkills">{{ skill.name }}</span>
          </div>
          
          <div class="offer-footer">
            <span class="deadline">Expire le {{ offer.deadlineDate | date }}</span>
            <button class="btn btn-primary" (click)="openApplicationForm(offer)">Postuler</button>
          </div>
        </div>

        <div class="empty-state" *ngIf="filteredOffers().length === 0">
          <p class="muted">Aucune offre ne correspond à vos critères de recherche.</p>
        </div>
      </div>

      <!-- Application Modal -->
      <div class="modal-backdrop" *ngIf="selectedOffer()" (click)="closeApplicationForm()">
        <div class="modal-content" (click)="$event.stopPropagation()">

          <!-- Modal header -->
          <div class="modal-header">
            <div class="modal-title-row">
              <div class="modal-offer-icon">💼</div>
              <div>
                <h3>{{ selectedOffer()?.title }}</h3>
                <div class="modal-offer-meta">
                  <span class="meta-chip">{{ selectedOffer()?.department }}</span>
                  <span class="meta-chip">📍 {{ selectedOffer()?.location }}</span>
                  <span class="meta-chip deadline-chip">⏰ Expire le {{ selectedOffer()?.deadlineDate | date:'dd/MM/yyyy' }}</span>
                </div>
              </div>
            </div>
            <button class="modal-close" (click)="closeApplicationForm()">✕</button>
          </div>

          <form [formGroup]="applicationForm" (ngSubmit)="submitApplication()">

            <!-- Section 1 : Candidat -->
            <div class="form-section">
              <div class="section-label">👤 Vos informations</div>
              <div class="info-grid">
                <div class="info-field">
                  <span class="info-lbl">Nom complet</span>
                  <span class="info-val">{{ currentUserFullName() }}</span>
                </div>
                <div class="info-field">
                  <span class="info-lbl">Email</span>
                  <span class="info-val">{{ currentUserEmail() }}</span>
                </div>
              </div>
            </div>

            <!-- Section 2 : Expérience & disponibilité -->
            <div class="form-section">
              <div class="section-label">📅 Expérience & disponibilité</div>
              <div class="two-col">
                <div class="form-group">
                  <label>Années d'expérience *</label>
                  <select formControlName="yearsExp" class="form-control">
                    <option value="">Sélectionner</option>
                    <option value="0">Moins de 1 an</option>
                    <option value="1">1 an</option>
                    <option value="2">2 ans</option>
                    <option value="3">3 ans</option>
                    <option value="5">5 ans</option>
                    <option value="8">8 ans et plus</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Disponibilité *</label>
                  <input type="date" formControlName="availability" class="form-control" />
                </div>
              </div>
            </div>

            <!-- Section 3 : Compétences requises -->
            <div class="form-section" *ngIf="selectedOffer()?.requiredSkills?.length">
              <div class="section-label">🎯 Compétences requises — cochez celles que vous maîtrisez</div>
              <div class="skills-check-grid">
                <label class="skill-check" *ngFor="let skill of selectedOffer()?.requiredSkills">
                  <input type="checkbox" [value]="skill.name" (change)="toggleSkill(skill.name)" [checked]="checkedSkills().includes(skill.name)" />
                  <span class="skill-check-label">{{ skill.name }}</span>
                </label>
              </div>
            </div>

            <!-- Section 4 : Lettre de motivation -->
            <div class="form-section">
              <div class="section-label">✍️ Lettre de motivation *</div>
              <textarea formControlName="coverLetter" class="form-control" rows="5"
                placeholder="Expliquez pourquoi vous êtes le candidat idéal pour ce poste, vos réalisations clés..."></textarea>
              <div class="char-count" [class.over]="(applicationForm.get('coverLetter')?.value?.length ?? 0) > 1000">
                {{ applicationForm.get('coverLetter')?.value?.length ?? 0 }} / 1000 caractères
              </div>
            </div>

            <!-- Section 5 : Documents -->
            <div class="form-section">
              <div class="section-label">📎 Documents</div>
              <div class="docs-grid">

                <!-- CV -->
                <div class="doc-upload-box" [class.has-file]="selectedFile()" (click)="cvInput.click()">
                  <input #cvInput type="file" hidden (change)="onFileSelected($event)" accept=".pdf,.doc,.docx" />
                  <div *ngIf="!selectedFile()" class="upload-placeholder">
                    <span class="upload-icon">📄</span>
                    <span class="upload-txt">CV</span>
                    <span class="upload-hint">PDF, DOC — max 2 Mo</span>
                  </div>
                  <div *ngIf="selectedFile()" class="upload-done">
                    <span class="doc-name">📄 {{ selectedFile()?.name }}</span>
                    <span class="file-size">{{ (selectedFile()?.size ?? 0) / 1024 | number:'1.0-1' }} Ko</span>
                    <button type="button" class="remove-file" (click)="$event.stopPropagation(); removeFile()">✕</button>
                  </div>
                </div>

                <!-- Certificat 1 -->
                <div class="doc-upload-box" [class.has-file]="certFiles()[0]" (click)="certInput1.click()">
                  <input #certInput1 type="file" hidden (change)="onCertSelected($event, 0)" accept=".pdf,.jpg,.png,.jpeg" />
                  <div *ngIf="!certFiles()[0]" class="upload-placeholder">
                    <span class="upload-icon">🏆</span>
                    <span class="upload-txt">Certificat 1</span>
                    <span class="upload-hint">PDF, JPG, PNG — max 2 Mo</span>
                  </div>
                  <div *ngIf="certFiles()[0]" class="upload-done">
                    <span class="doc-name">🏆 {{ certFiles()[0].name }}</span>
                    <span class="file-size">{{ certFiles()[0].size / 1024 | number:'1.0-1' }} Ko</span>
                    <button type="button" class="remove-file" (click)="$event.stopPropagation(); removeCert(0)">✕</button>
                  </div>
                </div>

                <!-- Certificat 2 -->
                <div class="doc-upload-box" [class.has-file]="certFiles()[1]" (click)="certInput2.click()">
                  <input #certInput2 type="file" hidden (change)="onCertSelected($event, 1)" accept=".pdf,.jpg,.png,.jpeg" />
                  <div *ngIf="!certFiles()[1]" class="upload-placeholder">
                    <span class="upload-icon">🎓</span>
                    <span class="upload-txt">Certificat 2</span>
                    <span class="upload-hint">PDF, JPG, PNG — max 2 Mo</span>
                  </div>
                  <div *ngIf="certFiles()[1]" class="upload-done">
                    <span class="doc-name">🎓 {{ certFiles()[1].name }}</span>
                    <span class="file-size">{{ certFiles()[1].size / 1024 | number:'1.0-1' }} Ko</span>
                    <button type="button" class="remove-file" (click)="$event.stopPropagation(); removeCert(1)">✕</button>
                  </div>
                </div>

                <!-- Certificat 3 -->
                <div class="doc-upload-box" [class.has-file]="certFiles()[2]" (click)="certInput3.click()">
                  <input #certInput3 type="file" hidden (change)="onCertSelected($event, 2)" accept=".pdf,.jpg,.png,.jpeg" />
                  <div *ngIf="!certFiles()[2]" class="upload-placeholder">
                    <span class="upload-icon">📜</span>
                    <span class="upload-txt">Certificat 3</span>
                    <span class="upload-hint">PDF, JPG, PNG — max 2 Mo</span>
                  </div>
                  <div *ngIf="certFiles()[2]" class="upload-done">
                    <span class="doc-name">📜 {{ certFiles()[2].name }}</span>
                    <span class="file-size">{{ certFiles()[2].size / 1024 | number:'1.0-1' }} Ko</span>
                    <button type="button" class="remove-file" (click)="$event.stopPropagation(); removeCert(2)">✕</button>
                  </div>
                </div>

              </div>
              <p class="docs-note">Les certificats seront mentionnés dans votre dossier de candidature.</p>
            </div>

            <div *ngIf="applyError()" class="error-alert">⚠️ {{ applyError() }}</div>

            <div class="modal-footer">
              <button type="button" class="btn btn-ghost" (click)="closeApplicationForm()">Annuler</button>
              <button type="submit" class="btn btn-submit" [disabled]="applying() || applicationForm.invalid">
                {{ applying() ? 'Envoi en cours...' : '🚀 Soumettre ma candidature' }}
              </button>
            </div>

          </form>
        </div>
      </div>

    </div>
  `,
  styles: [
    `
      .panel { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
      .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
      .muted { color: #9CA3AF; margin: 0.5rem 0 0; }
      .mb-4 { margin-bottom: 1.5rem; }
      .mr-2 { margin-right: 0.5rem; }
      
      /* Grid */
      .offers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
      .offer-card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1.25rem; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
      .offer-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(77,163,255,0.1); border-color: rgba(77,163,255,0.3); }
      .offer-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
      .offer-header h3 { margin: 0; font-size: 1.05rem; color: #1e293b; font-weight: 700; }
      .badge { background: rgba(77,163,255,0.12); color: #2E86FF; padding: 0.2rem 0.65rem; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; border: 1px solid rgba(77,163,255,0.2); }
      .offer-meta { display: flex; gap: 1rem; color: #9CA3AF; font-size: 0.85rem; margin-bottom: 1rem; }
      .offer-desc { color: #374151; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.25rem; flex-grow: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      .skills-list { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
      .skill-tag { background: rgba(77,163,255,0.08); border: 1px solid rgba(77,163,255,0.18); color: #2E86FF; font-size: 0.73rem; padding: 0.15rem 0.55rem; border-radius: 6px; font-weight: 500; }
      .offer-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid #F1F5F9; }
      .deadline { font-size: 0.8rem; color: #FF6B6B; font-weight: 600; }
      
      /* Buttons */
      .btn { padding: 0.5rem 1rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; transition: all 0.2s; }
      .btn-primary { background: #4DA3FF; color: white; }
      .btn-primary:hover { background: #2E86FF; box-shadow: 0 2px 8px rgba(77,163,255,0.3); }
      .btn-success { background: #22C55E; color: white; }
      .btn-success:hover { background: #16A34A; box-shadow: 0 2px 8px rgba(34,197,94,0.3); }
      .btn-success:disabled { opacity: 0.5; cursor: not-allowed; }
      .btn-secondary { background: #F1F5F9; color: #374151; border: 1px solid #E5E7EB; }
      .btn-secondary:hover { background: #E5E7EB; }
      
      /* Modal */
      .modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,0.5); backdrop-filter:blur(6px); display:flex; justify-content:center; align-items:center; z-index:1000; padding:1rem; }
      .modal-content { background:#fff; border-radius:20px; width:100%; max-width:640px; max-height:90vh; overflow-y:auto; box-shadow:0 24px 80px rgba(0,0,0,0.18); }

      .modal-header { display:flex; justify-content:space-between; align-items:flex-start; padding:1.5rem 1.75rem 1rem; border-bottom:1px solid #F1F5F9; position:sticky; top:0; background:#fff; z-index:1; border-radius:20px 20px 0 0; }
      .modal-title-row { display:flex; align-items:flex-start; gap:1rem; }
      .modal-offer-icon { width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg,#EFF6FF,#DBEAFE); display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0; }
      .modal-header h3 { margin:0 0 .4rem; font-size:1.05rem; font-weight:800; color:#0F172A; }
      .modal-offer-meta { display:flex; flex-wrap:wrap; gap:.4rem; }
      .meta-chip { font-size:.7rem; font-weight:600; padding:.15rem .55rem; border-radius:999px; background:#F1F5F9; color:#64748B; }
      .deadline-chip { background:rgba(255,107,107,.08); color:#B91C1C; }
      .modal-close { background:none; border:none; cursor:pointer; font-size:1rem; color:#9CA3AF; padding:.25rem; line-height:1; border-radius:6px; }
      .modal-close:hover { background:#F1F5F9; color:#374151; }

      .form-section { padding:1.25rem 1.75rem; border-bottom:1px solid #F8FAFC; }
      .section-label { font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#64748B; margin-bottom:.85rem; }

      .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
      .info-field { background:#F8FAFC; border:1px solid #F1F5F9; border-radius:8px; padding:.6rem .85rem; }
      .info-lbl { font-size:.7rem; color:#94A3B8; display:block; margin-bottom:.1rem; text-transform:uppercase; letter-spacing:.05em; }
      .info-val { font-size:.85rem; font-weight:600; color:#1e293b; }

      .two-col { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
      .form-group { display:flex; flex-direction:column; gap:.35rem; }
      .form-group label { font-size:.78rem; font-weight:700; color:#374151; }
      .form-control { padding:.7rem .9rem; border-radius:8px; border:1.5px solid #E5E7EB; background:#fff; color:#1e293b; font-family:inherit; outline:none; font-size:.88rem; width:100%; box-sizing:border-box; transition:border-color .15s,box-shadow .15s; }
      .form-control:focus { border-color:#4DA3FF; box-shadow:0 0 0 3px rgba(77,163,255,.12); }
      textarea.form-control { resize:vertical; }
      .char-count { font-size:.7rem; color:#94A3B8; text-align:right; margin-top:.2rem; }
      .char-count.over { color:#EF4444; }

      .skills-check-grid { display:flex; flex-wrap:wrap; gap:.5rem; }
      .skill-check { display:flex; align-items:center; gap:.4rem; cursor:pointer; padding:.35rem .7rem; border-radius:8px; border:1.5px solid #E5E7EB; background:#fff; transition:all .15s; }
      .skill-check:hover { border-color:#4DA3FF; background:rgba(77,163,255,.05); }
      .skill-check input[type=checkbox] { accent-color:#4DA3FF; width:14px; height:14px; }
      .skill-check-label { font-size:.78rem; font-weight:600; color:#374151; }

      .docs-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:.75rem; }
      .doc-upload-box { border:2px dashed #E5E7EB; border-radius:12px; padding:1rem .75rem; cursor:pointer; transition:all .2s; text-align:center; min-height:90px; display:flex; align-items:center; justify-content:center; }
      .doc-upload-box:hover,.doc-upload-box.has-file { border-color:#4DA3FF; background:rgba(77,163,255,.04); }
      .upload-placeholder { display:flex; flex-direction:column; gap:.2rem; align-items:center; }
      .upload-icon { font-size:1.4rem; }
      .upload-txt { font-size:.78rem; font-weight:700; color:#374151; }
      .upload-hint { font-size:.68rem; color:#9CA3AF; }
      .upload-done { display:flex; flex-direction:column; align-items:center; gap:.25rem; width:100%; }
      .doc-name { font-size:.72rem; color:#166534; font-weight:600; word-break:break-all; text-align:center; }
      .file-size { color:#9CA3AF; font-weight:400; font-size:.68rem; }
      .remove-file { background:none; border:none; cursor:pointer; color:#EF4444; font-size:.85rem; padding:.1rem .3rem; }
      .docs-note { font-size:.72rem; color:#94A3B8; margin:.5rem 0 0; text-align:center; }

      .error-alert { margin:0 1.75rem; background:rgba(255,107,107,.08); border-left:4px solid #FF6B6B; padding:.75rem 1rem; color:#B91C1C; font-size:.85rem; border-radius:8px; }

      .modal-footer { display:flex; justify-content:flex-end; gap:.75rem; padding:1.25rem 1.75rem; background:#F8FAFC; border-radius:0 0 20px 20px; border-top:1px solid #F1F5F9; }
      .btn-ghost { background:transparent; border:1.5px solid #E5E7EB; color:#374151; padding:.6rem 1.1rem; border-radius:8px; cursor:pointer; font-weight:600; font-size:.85rem; transition:all .15s; }
      .btn-ghost:hover { background:#F1F5F9; }
      .btn-submit { background:linear-gradient(135deg,#1E3A8A,#4DA3FF); color:#fff; border:none; padding:.7rem 1.4rem; border-radius:10px; cursor:pointer; font-weight:700; font-size:.9rem; transition:all .2s; box-shadow:0 4px 14px rgba(30,58,138,.25); }
      .btn-submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(30,58,138,.35); }
      .btn-submit:disabled { opacity:.5; cursor:not-allowed; transform:none; box-shadow:none; }
      
      .loader { margin: 2rem 0; color: #9CA3AF; font-style: italic; }
      .empty-state { text-align: center; padding: 3rem; background: #F8FAFC; border-radius: 12px; border: 1.5px dashed #D1D5DB; grid-column: 1 / -1; }
      .filter-bar { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
      .search-input { flex: 1; min-width: 200px; padding: 0.65rem 1rem; border-radius: 8px; border: 1.5px solid #E5E7EB; background: #FFFFFF; color: #1e293b; font-size: 0.9rem; outline: none; }
      .search-input:focus { border-color: #4DA3FF; box-shadow: 0 0 0 3px rgba(77,163,255,0.12); }
      .skill-select { padding: 0.65rem 1rem; border-radius: 8px; border: 1.5px solid #E5E7EB; background: #FFFFFF; color: #1e293b; font-size: 0.9rem; min-width: 200px; cursor: pointer; outline: none; }
      .skill-select:focus { border-color: #4DA3FF; }
      .pager { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: -0.25rem 0 1.25rem; padding: 0.75rem 1rem; border: 1px solid #E5E7EB; border-radius: 12px; background: #F8FAFC; color: #64748B; font-size: 0.85rem; font-weight: 600; }
      .pager div { display: flex; align-items: center; gap: 0.5rem; }
      .pager button { width: 34px; height: 32px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; color: #1e293b; cursor: pointer; font-weight: 800; }
      .pager button:disabled { opacity: 0.45; cursor: not-allowed; }
      .pager b { min-width: 58px; text-align: center; color: #0F172A; }
    `,
  ],
})
export class InternalOffersComponent implements OnInit, OnDestroy {
  private recruitmentService = inject(RecruitmentService);
  private employeeService = inject(EmployeeService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  allOffers    = signal<JobOffer[]>([]);
  filteredOffers = signal<JobOffer[]>([]);
  allSkills    = signal<Skill[]>([]);
  loading      = signal(true);
  currentUserFullName = signal('Interne');
  page = signal(1);
  readonly pageSize = 12;
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredOffers().length / this.pageSize)));
  paginatedOffers = computed(() => {
    const current = Math.min(this.page(), this.totalPages());
    const start = (current - 1) * this.pageSize;
    return this.filteredOffers().slice(start, start + this.pageSize);
  });

  locationQuery = '';
  selectedSkill = '';

  // Application form state
  selectedOffer   = signal<JobOffer | null>(null);
  applying        = signal(false);
  applyError      = signal('');
  selectedFile     = signal<File | null>(null);
  cvBase64         = signal<string | null>(null);
  checkedSkills    = signal<string[]>([]);
  currentUserEmail = signal('');
  certFiles        = signal<(File)[]>([]);

  applicationForm = this.fb.group({
    coverLetter:  ['', [Validators.required, Validators.minLength(10)]],
    yearsExp:     ['', [Validators.required]],
    availability: ['', [Validators.required]],
  });

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.loadOffers();
    }
  };

  ngOnInit(): void {
    const email = this.authService.getEmail();
    if (email) {
      this.currentUserEmail.set(email);
      this.employeeService.getEmployees().subscribe({
        next: (employees) => {
          const me = employees.find(e => e.email === email);
          if (me) this.currentUserFullName.set(`${me.firstName} ${me.lastName}`);
        },
        error: () => {}
      });
    }
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleVisibilityChange);
    this.loadOffers();
    this.recruitmentService.getAllSkills().subscribe({
      next: skills => this.allSkills.set(skills),
      error: () => {}
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('focus', this.handleVisibilityChange);
  }

  loadOffers(): void {
    this.loading.set(true);
    this.recruitmentService.getJobOffers().subscribe({
      next: (data) => {
        const visibleOffers = data.filter(offer => shouldDisplayOfferInEmployeeList(offer));
        const offers = this.withCurrentOfferDates(visibleOffers);
        this.allOffers.set(offers);
        this.filteredOffers.set(offers);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading offers', err);
        this.loading.set(false);
      }
    });
  }

  applyFilter(): void {
    const q = this.locationQuery.toLowerCase().trim();
    const skill = this.selectedSkill.toLowerCase();
    this.page.set(1);
    this.filteredOffers.set(
      this.allOffers().filter(offer => {
        const matchText = !q || offerMatchesQuery(offer, q);
        const matchSkill = !skill ||
          (offer.requiredSkills ?? []).some(s => s.name.toLowerCase() === skill);
        return matchText && matchSkill;
      })
    );
  }

  private withCurrentOfferDates(offers: JobOffer[]): JobOffer[] {
    const today = this.startOfDay(new Date());

    return offers.map((offer, index) => {
      const fallbackPublishedDate = this.parseDateValue(offer.publishedDate) ?? this.parseDateValue(offer.createdAt) ?? this.addDays(today, -(index % 10));
      const fallbackDeadlineDate = this.parseDateValue(offer.deadlineDate) ?? this.addDays(fallbackPublishedDate, 45 + (index % 30));

      return {
        ...offer,
        publishedDate: this.toIsoDate(fallbackPublishedDate),
        deadlineDate: this.toIsoDate(fallbackDeadlineDate),
      };
    });
  }

  private parseDateValue(value: string | null | undefined): Date | null {
    if (!value) return null;

    const asDate = new Date(value);
    if (!Number.isNaN(asDate.getTime())) return asDate;

    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const [, year, month, day] = match;
    const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  firstPage(): void { this.page.set(1); }
  previousPage(): void { this.page.set(Math.max(1, this.page() - 1)); }
  nextPage(): void { this.page.set(Math.min(this.totalPages(), this.page() + 1)); }
  lastPage(): void { this.page.set(this.totalPages()); }
  trackByOffer(_: number, offer: JobOffer): string { return offer.id; }

  openApplicationForm(offer: JobOffer): void {
    this.selectedOffer.set(offer);
    this.applicationForm.reset();
    this.applyError.set('');
    this.selectedFile.set(null);
    this.cvBase64.set(null);
    this.checkedSkills.set([]);
    this.certFiles.set([]);
  }

  closeApplicationForm(): void {
    this.selectedOffer.set(null);
  }

  toggleSkill(name: string): void {
    this.checkedSkills.update(skills =>
      skills.includes(name) ? skills.filter(s => s !== name) : [...skills, name]
    );
  }

  removeFile(): void {
    this.selectedFile.set(null);
    this.cvBase64.set(null);
  }

  onCertSelected(event: any, index: number): void {
    const file: File = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      this.applyError.set('Fichier trop lourd (max 2 Mo)');
      return;
    }
    this.certFiles.update(certs => {
      const updated = [...certs];
      updated[index] = file;
      return updated;
    });
  }

  removeCert(index: number): void {
    this.certFiles.update(certs => {
      const updated = [...certs];
      updated.splice(index, 1);
      return updated;
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        this.applyError.set('Le fichier est trop lourd (max 2Mo)');
        return;
      }
      this.selectedFile.set(file);
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        this.cvBase64.set(base64);
      };
      reader.readAsDataURL(file);
    }
  }

  submitApplication(): void {
    if (this.applicationForm.invalid || !this.selectedOffer()) return;

    this.applying.set(true);
    this.applyError.set('');

    const formValue = this.applicationForm.getRawValue();
    const userEmail = this.authService.getEmail() || '';

    const skillsLine = this.checkedSkills().length
      ? `\n\nCompétences maîtrisées : ${this.checkedSkills().join(', ')}`
      : '';
    const expLine = formValue.yearsExp ? `\nExpérience : ${formValue.yearsExp} an(s)` : '';
    const availLine = formValue.availability ? `\nDisponibilité : ${formValue.availability}` : '';
    const certsLine = this.certFiles().length
      ? `\nCertificats joints : ${this.certFiles().map(f => f.name).join(', ')}`
      : '';

    const payload = {
      jobOfferId:     this.selectedOffer()!.id,
      applicantEmail: userEmail,
      applicantName:  this.currentUserFullName(),
      coverLetter:    formValue.coverLetter! + skillsLine + expLine + availLine + certsLine,
      cvBase64:       this.cvBase64(),
      cvFileName:     this.selectedFile()?.name
    };

    this.recruitmentService.applyToJob(payload).subscribe({
      next: () => {
        this.applying.set(false);
        this.closeApplicationForm();
        this.toastService.show('Votre candidature a été soumise avec succès !');
      },
      error: (err: any) => {
        console.error('Application failed', err);
        const msg = err?.error?.message || 'Erreur lors de la soumission. Vérifiez si vous avez déjà postulé.';
        this.applyError.set(msg);
        this.toastService.show(msg, 'error');
        this.applying.set(false);
      }
    });
  }
}
