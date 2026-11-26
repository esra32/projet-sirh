import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { Employee } from '../../core/services/employee.models';
import { EmployeeService } from '../../core/services/employee.service';
import { JobOffer } from '../../core/services/recruitment.models';
import { RecruitmentService } from '../../core/services/recruitment.service';

@Component({
  selector: 'app-posting-board',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="page">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h2>Mes offres de poste</h2>
          <p class="muted">Créez des offres et suivez leur validation par le RH · {{ offers().length }} offre(s)</p>
        </div>
        <button class="btn-new" (click)="toggleForm()">
          {{ showForm() ? '✕ Fermer' : '+ Nouvelle offre' }}
        </button>
      </div>

      <!-- Info banner -->
      <div class="info-banner">
        <span class="info-icon">ℹ️</span>
        <span>Vos offres sont soumises au RH pour validation avant publication. Vous recevrez une notification une fois la décision prise.</span>
      </div>

      <!-- Formulaire création -->
      <div class="form-panel" *ngIf="showForm()">
        <div class="form-panel-header">
          <div class="form-panel-icon">📝</div>
          <div>
            <h3>{{ isEditing ? 'Modifier une offre' : 'Créer une offre' }}</h3>
            <p class="muted">L'offre sera soumise au RH pour validation avant d'être publiée.</p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-grid">
            <div class="field">
              <label>Titre du poste *</label>
              <input type="text" formControlName="title" class="fc" placeholder="ex: Développeur Senior Java" />
            </div>
            <div class="field">
              <label>Département *</label>
              <input type="text" formControlName="department" class="fc" placeholder="ex: Informatique" />
            </div>
            <div class="field">
              <label>Localisation *</label>
              <input type="text" formControlName="location" class="fc" placeholder="ex: Tunis, Hybride" />
            </div>
            <div class="field">
              <label>Type de contrat *</label>
              <select formControlName="contractType" class="fc">
                <option value="">Sélectionner</option>
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="STAGE">Stage</option>
                <option value="FREELANCE">Freelance</option>
                <option value="ALTERNANCE">Alternance</option>
              </select>
            </div>
            <div class="field">
              <label>Expérience requise</label>
              <select formControlName="experienceLevel" class="fc">
                <option value="">Non précisé</option>
                <option value="Junior (0-2 ans)">Junior (0–2 ans)</option>
                <option value="Confirmé (2-5 ans)">Confirmé (2–5 ans)</option>
                <option value="Senior (5+ ans)">Senior (5+ ans)</option>
                <option value="Expert (8+ ans)">Expert (8+ ans)</option>
              </select>
            </div>
            <div class="field">
              <label>Date limite *</label>
              <input type="date" formControlName="deadlineDate" class="fc" />
            </div>
          </div>

          <div class="field mt">
            <label>Description du poste *</label>
            <textarea formControlName="description" class="fc" rows="4"
              placeholder="Missions, responsabilités, profil recherché, avantages..."></textarea>
          </div>

          <div class="field mt">
            <label>Compétences requises <span class="opt">(séparées par des virgules)</span></label>
            <input type="text" formControlName="skillsInput" class="fc"
              placeholder="ex: Java, Spring Boot, Angular, Docker"
              (input)="skillsRaw.set($any($event.target).value)" />
            <div class="skills-preview" *ngIf="skillsPreview().length">
              <span class="skill-chip" *ngFor="let s of skillsPreview()">{{ s }}</span>
            </div>
          </div>

          <div *ngIf="error()" class="error-box">⚠️ {{ error() }}</div>

          <div class="form-footer">
            <button type="button" class="btn-cancel" (click)="toggleForm()">Annuler</button>
            <button type="submit" class="btn-submit" [disabled]="loading() || (!isEditing && form.invalid)">
              {{ saveLabel() }}
            </button>
          </div>
        </form>
      </div>

      <!-- Liste des offres -->
      <div *ngIf="loadingData()" class="loader">Chargement des offres...</div>

      <div *ngIf="!loadingData()">
        <div class="list-header">
          <h3>Vos offres</h3>
          <div class="status-legend">
            <span class="leg PUBLISHED">● Publiée</span>
            <span class="leg PENDING_VALIDATION">● En attente RH</span>
            <span class="leg CLOSED">● Clôturée</span>
            <span class="leg CANCELLED">● Refusée</span>
          </div>
        </div>

        <div class="offers-grid">
          <div class="offer-card" *ngFor="let offer of offers(); let i = index"
               [ngClass]="'card-' + offer.status">
            <div class="card-top">
              <div class="card-num">{{ i + 1 }}</div>
              <span class="status-badge" [ngClass]="offer.status">{{ statusLabel(offer.status) }}</span>
            </div>
            <div class="card-title">{{ offer.title }}</div>
            <div class="card-meta">
              <span>🏢 {{ offer.department }}</span>
              <span *ngIf="offer.location">📍 {{ offer.location }}</span>
            </div>
            <div class="card-deadline" *ngIf="offer.deadlineDate">
              <span [class.expiring]="isExpiringSoon(offer.deadlineDate)">
                ⏰ Expire le {{ offer.deadlineDate | date:'dd/MM/yyyy' }}
              </span>
            </div>
            <div class="card-info" *ngIf="offer.status === 'PENDING_VALIDATION'">
              <span class="pending-msg">⏳ En attente de validation par le RH</span>
            </div>
            <div class="card-info" *ngIf="offer.status === 'CANCELLED'">
              <span class="refused-msg">❌ Offre refusée par le RH</span>
            </div>
            <div class="card-actions">
              <button class="act-btn act-edit" (click)="openEdit(offer)">
                Modifier
              </button>
              <button class="act-btn act-delete" (click)="deleteOffer(offer.id)">
                Supprimer
              </button>
              <button class="act-btn act-close" *ngIf="offer.status === 'PUBLISHED'" (click)="closeOffer(offer.id)">
                Clôturer
              </button>
            </div>
          </div>

          <div class="empty-card" *ngIf="offers().length === 0">
            <div class="empty-icon">📋</div>
            <p>Aucune offre créée. Soumettez votre première offre au RH !</p>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .page { animation: fadeUp .4s ease; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; }
    h2 { margin:0 0 .3rem; font-size:1.6rem; font-weight:800; color:#0F172A; }
    .muted { color:#94A3B8; margin:0; font-size:.875rem; }
    .btn-new { background:linear-gradient(135deg,#1E3A8A,#4DA3FF); color:#fff; border:none; padding:.65rem 1.25rem; border-radius:10px; cursor:pointer; font-weight:700; font-size:.88rem; transition:all .2s; box-shadow:0 4px 14px rgba(30,58,138,.25); }
    .btn-new:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(30,58,138,.35); }

    .info-banner { display:flex; align-items:flex-start; gap:.75rem; background:rgba(77,163,255,.08); border:1px solid rgba(77,163,255,.25); border-radius:10px; padding:.85rem 1rem; margin-bottom:1.25rem; font-size:.83rem; color:#1D4ED8; line-height:1.5; }
    .info-icon { font-size:1rem; flex-shrink:0; }

    .form-panel { background:#fff; border:1px solid #E5E7EB; border-radius:18px; padding:1.75rem; margin-bottom:1.75rem; box-shadow:0 4px 20px rgba(77,163,255,.08); border-top:3px solid #4DA3FF; }
    .form-panel-header { display:flex; align-items:flex-start; gap:1rem; margin-bottom:1.5rem; padding-bottom:1.25rem; border-bottom:1px solid #F1F5F9; }
    .form-panel-icon { width:42px; height:42px; border-radius:10px; background:#EFF6FF; display:flex; align-items:center; justify-content:center; font-size:1.2rem; flex-shrink:0; }
    .form-panel-header h3 { margin:0 0 .2rem; font-size:1rem; font-weight:800; color:#1e293b; }

    .form-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:1rem; }
    .field { display:flex; flex-direction:column; gap:.35rem; }
    .field label { font-size:.78rem; font-weight:700; color:#374151; letter-spacing:.02em; }
    .opt { font-weight:400; color:#9CA3AF; }
    .fc { padding:.7rem .9rem; border-radius:8px; border:1.5px solid #E5E7EB; background:#fff; color:#1e293b; font-family:inherit; font-size:.88rem; outline:none; width:100%; box-sizing:border-box; transition:border-color .15s,box-shadow .15s; }
    .fc:focus { border-color:#4DA3FF; box-shadow:0 0 0 3px rgba(77,163,255,.12); }
    textarea.fc { resize:vertical; }
    .mt { margin-top:.75rem; }

    .skills-preview { display:flex; flex-wrap:wrap; gap:.4rem; margin-top:.5rem; }
    .skill-chip { background:rgba(77,163,255,.1); color:#1D4ED8; border:1px solid rgba(77,163,255,.2); padding:.15rem .55rem; border-radius:999px; font-size:.72rem; font-weight:600; }

    .error-box { background:rgba(255,107,107,.08); border-left:4px solid #FF6B6B; padding:.75rem 1rem; color:#B91C1C; margin-top:1rem; border-radius:8px; font-size:.85rem; }

    .form-footer { display:flex; justify-content:flex-end; gap:.75rem; margin-top:1.5rem; padding-top:1.25rem; border-top:1px solid #F1F5F9; }
    .btn-cancel { background:transparent; border:1.5px solid #E5E7EB; color:#374151; padding:.6rem 1.1rem; border-radius:8px; cursor:pointer; font-weight:600; font-size:.85rem; }
    .btn-cancel:hover { background:#F8FAFC; }
    .btn-submit { background:linear-gradient(135deg,#1E3A8A,#4DA3FF); color:#fff; border:none; padding:.7rem 1.5rem; border-radius:10px; cursor:pointer; font-weight:700; font-size:.9rem; transition:all .2s; box-shadow:0 4px 14px rgba(30,58,138,.25); }
    .btn-submit:hover:not(:disabled) { transform:translateY(-1px); }
    .btn-submit:disabled { opacity:.5; cursor:not-allowed; }

    .list-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; flex-wrap:wrap; gap:.5rem; }
    .list-header h3 { margin:0; font-size:1rem; font-weight:700; color:#1e293b; }
    .status-legend { display:flex; gap:.75rem; flex-wrap:wrap; }
    .leg { font-size:.72rem; font-weight:600; }
    .leg.PUBLISHED         { color:#166534; }
    .leg.PENDING_VALIDATION{ color:#B45309; }
    .leg.CLOSED            { color:#6B7280; }
    .leg.CANCELLED         { color:#B91C1C; }

    .offers-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1rem; }
    .offer-card { background:#fff; border:1.5px solid #E5E7EB; border-radius:14px; padding:1.25rem; display:flex; flex-direction:column; gap:.65rem; transition:all .2s; box-shadow:0 1px 4px rgba(0,0,0,.05); }
    .offer-card:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,.09); }
    .card-PUBLISHED          { border-left:4px solid #22C55E; }
    .card-PENDING_VALIDATION { border-left:4px solid #F59E0B; }
    .card-DRAFT              { border-left:4px solid #9CA3AF; }
    .card-CLOSED             { border-left:4px solid #9CA3AF; }
    .card-CANCELLED          { border-left:4px solid #FF6B6B; }

    .card-top { display:flex; justify-content:space-between; align-items:center; }
    .card-num { width:26px; height:26px; border-radius:50%; background:#F1F5F9; display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:800; color:#64748B; }
    .status-badge { font-size:.65rem; font-weight:700; padding:.2rem .6rem; border-radius:999px; text-transform:uppercase; letter-spacing:.04em; }
    .status-badge.PUBLISHED          { background:rgba(34,197,94,.12);   color:#166534; border:1px solid rgba(34,197,94,.25); }
    .status-badge.PENDING_VALIDATION { background:rgba(245,158,11,.12);  color:#92400E; border:1px solid rgba(245,158,11,.3); }
    .status-badge.DRAFT              { background:rgba(156,163,175,.15); color:#6B7280; border:1px solid rgba(156,163,175,.3); }
    .status-badge.CLOSED             { background:rgba(156,163,175,.15); color:#6B7280; border:1px solid rgba(156,163,175,.3); }
    .status-badge.CANCELLED          { background:rgba(255,107,107,.12); color:#B91C1C; border:1px solid rgba(255,107,107,.25); }

    .card-title { font-size:.95rem; font-weight:700; color:#1e293b; }
    .card-meta { display:flex; gap:.75rem; flex-wrap:wrap; font-size:.78rem; color:#64748B; }
    .card-deadline { font-size:.75rem; color:#64748B; }
    .expiring { color:#EF4444; font-weight:600; }
    .card-info { font-size:.75rem; }
    .pending-msg { color:#92400E; font-style:italic; }
    .refused-msg { color:#B91C1C; font-style:italic; }

    .card-actions { display:flex; gap:.5rem; padding-top:.65rem; border-top:1px solid #F8FAFC; margin-top:auto; }
    .act-btn { padding:.4rem .85rem; border-radius:7px; font-size:.78rem; font-weight:600; cursor:pointer; transition:all .15s; border:1.5px solid transparent; }
    .act-edit { background:rgba(59,130,246,.1); color:#1D4ED8; border-color:rgba(59,130,246,.3); }
    .act-edit:hover { background:rgba(59,130,246,.16); }
    .act-close { background:rgba(156,163,175,.1); color:#6B7280; border-color:rgba(156,163,175,.3); }
    .act-close:hover { background:rgba(156,163,175,.18); }
    .act-delete { background:rgba(244,63,94,.1); color:#B91C1C; border-color:rgba(244,63,94,.3); }
    .act-delete:hover { background:rgba(244,63,94,.16); }

    .empty-card { grid-column:1/-1; text-align:center; padding:3rem; background:#F8FAFC; border-radius:14px; border:2px dashed #E5E7EB; color:#9CA3AF; }
    .empty-icon { font-size:2rem; margin-bottom:.75rem; }
    .loader { padding:2rem; color:#9CA3AF; font-style:italic; }
  `],
})
export class PostingBoardComponent implements OnInit {
  private recruitmentService = inject(RecruitmentService);
  private auth = inject(AuthService);
  private employeeService = inject(EmployeeService);
  private fb = inject(FormBuilder);

  offers = signal<JobOffer[]>([]);
  loadingData = signal(true);
  showForm = signal(false);
  loading = signal(false);
  error = signal('');
  editingOffer = signal<JobOffer | null>(null);
  private currentEmployee = signal<Employee | null>(null);

  form = this.fb.group({
    title:           ['', [Validators.required]],
    department:      ['', [Validators.required]],
    location:        ['', [Validators.required]],
    description:     ['', [Validators.required]],
    deadlineDate:    ['', [Validators.required]],
    contractType:    [''],
    experienceLevel: [''],
    skillsInput:     [''],
  });

  skillsRaw = signal('');
  skillsPreview = computed(() =>
    this.skillsRaw().split(',').map(s => s.trim()).filter(s => s.length > 0)
  );

  get isEditing(): boolean {
    return !!this.editingOffer();
  }

  ngOnInit(): void {
    this.loadOffers();
    this.loadCurrentEmployee();
  }

  private loadCurrentEmployee(): void {
    const email = this.auth.getEmail();
    if (!email) return;
    this.employeeService.getEmployees().subscribe({
      next: (employees) => {
        const match = employees.find(e => e.email?.toLowerCase() === email.toLowerCase());
        if (match) this.currentEmployee.set(match);
      },
      error: () => {}
    });
  }

  loadOffers(): void {
    this.loadingData.set(true);
    const email = this.auth.getEmail();
    const obs = email
      ? this.recruitmentService.getJobOffersByCreator(email)
      : this.recruitmentService.getJobOffers();

    obs.subscribe({
      next: (data) => { this.offers.set(data); this.loadingData.set(false); },
      error: () => { this.loadingData.set(false); }
    });
  }

  toggleForm(): void {
    this.showForm.set(!this.showForm());
    if (!this.showForm()) {
      this.form.reset();
      this.error.set('');
      this.skillsRaw.set('');
      this.editingOffer.set(null);
    }
  }

  openEdit(offer: JobOffer): void {
    this.editingOffer.set(offer);
    this.showForm.set(true);
    this.error.set('');
    this.form.patchValue({
      title:        offer.title,
      department:   offer.department,
      location:     offer.location,
      description:  offer.description,
      deadlineDate: offer.deadlineDate ?? '',
      contractType: (offer as any).contractType ?? '',
      experienceLevel: (offer as any).experienceLevel ?? '',
      skillsInput:  (offer.requiredSkills ?? []).map(s => s.name).join(', '),
    });
    this.skillsRaw.set((offer.requiredSkills ?? []).map(s => s.name).join(', '));
  }

  onSubmit(): void {
    if (!this.isEditing && this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');

    const v = this.form.getRawValue();
    const expNote = v.experienceLevel ? `\n\nExpérience requise : ${v.experienceLevel}` : '';
    const ctNote  = v.contractType    ? `\nContrat : ${v.contractType}` : '';

    const email = this.auth.getEmail() ?? '';
    const emp = this.currentEmployee();
    const fullName = emp ? `${emp.firstName} ${emp.lastName}` : (email.split('@')[0] || 'Manager');
    const payload = {
      title:           v.title ?? '',
      department:      v.department ?? '',
      location:        v.location ?? '',
      description:     (v.description ?? '') + expNote + ctNote,
      deadlineDate:    v.deadlineDate ?? null,
      createdByEmail:  email,
      createdByName:   fullName,
      requiredSkillIds: [] as string[],
    };

    if (this.editingOffer()) {
      const offerId = this.editingOffer()!.id;
      this.recruitmentService.updateJobOffer(offerId, payload).subscribe({
        next: (updated) => {
          this.offers.update(items => items.map(o => o.id === updated.id ? updated : o));
          this.loading.set(false);
          this.toggleForm();
        },
        error: (err) => {
          this.error.set(err?.error?.message ?? "Erreur lors de la mise à jour de l'offre.");
          this.loading.set(false);
        }
      });
      return;
    }

    this.recruitmentService.createJobOffer(payload).subscribe({
      next: (created) => {
        this.offers.update(items => [created, ...items]);
        this.loading.set(false);
        this.toggleForm();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? "Erreur lors de la création de l'offre.");
        this.loading.set(false);
      }
    });
  }

  saveLabel(): string {
    if (this.loading()) {
      return 'Envoi...';
    }
    return this.isEditing ? '💾 Mettre à jour' : '📨 Soumettre pour validation';
  }

  closeOffer(id: string): void {
    if (!confirm('Clôturer cette offre ?')) return;
    this.recruitmentService.closeJobOffer(id).subscribe({
      next: (updated) => this.offers.update(items => items.map(o => o.id === id ? updated : o)),
      error: () => alert('Erreur lors de la clôture.')
    });
  }

  deleteOffer(id: string): void {
    if (!confirm('Supprimer définitivement cette offre ?')) return;
    this.recruitmentService.deleteJobOffer(id).subscribe({
      next: () => this.offers.update(items => items.filter(o => o.id !== id)),
      error: (err) => {
        const status = err?.status;
        const message = err?.error?.message || 'Erreur lors de la suppression de l\'offre.';
        if (status === 409 || message.toLowerCase().includes('foreign key')) {
          alert('Impossible de supprimer cette offre car des candidatures y sont liées. Veuillez d\'abord supprimer les candidatures ou clôturer l\'offre.');
          return;
        }
        if (status === 404 || status === 405) {
          this.recruitmentService.closeJobOffer(id).subscribe({
            next: () => this.offers.update(items => items.filter(o => o.id !== id)),
            error: () => alert('Erreur lors de la suppression de l\'offre (fallback).')
          });
          return;
        }
        alert(message);
      }
    });
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      PUBLISHED:          'Publiée',
      PENDING_VALIDATION: 'En attente RH',
      DRAFT:              'Brouillon',
      CLOSED:             'Clôturée',
      CANCELLED:          'Refusée',
    };
    return map[s] ?? s;
  }

  isExpiringSoon(date?: string | null): boolean {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 3600 * 1000;
  }
}