import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RecruitmentService } from '../../core/services/recruitment.service';
import { JobOffer } from '../../core/services/recruitment.models';

@Component({
  selector: 'app-public-apply',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="public-apply-page">
      <header class="apply-header">
        <div class="logo-area">
          <span class="logo-icon">🏢</span>
          <span class="logo-text">SIRH — Recrutement Externe</span>
        </div>
      </header>

      <main class="apply-main">

        <!-- Succès -->
        <div *ngIf="submitted()" class="success-card">
          <div class="success-icon">✅</div>
          <h2>Candidature envoyée !</h2>
          <p>Votre candidature pour <strong>{{ selectedOffer()?.title }}</strong> a bien été reçue.</p>
          <p class="sub">Notre équipe RH vous contactera à l'adresse <strong>{{ form.applicantEmail }}</strong>.</p>
          <button class="btn-secondary" (click)="resetForm()">Postuler à un autre poste</button>
        </div>

        <!-- Formulaire -->
        <div *ngIf="!submitted()" class="apply-card">
          <h1>Postuler à une offre</h1>
          <p class="subtitle">Rejoignez notre équipe — remplissez le formulaire ci-dessous</p>

          <!-- Chargement des offres -->
          <div *ngIf="loadingOffers()" class="loading">Chargement des offres disponibles...</div>
          <div *ngIf="!loadingOffers() && offers().length === 0" class="empty">
            Aucune offre disponible pour le moment.
          </div>

          <form *ngIf="!loadingOffers() && offers().length > 0" (ngSubmit)="submit()" #f="ngForm">

            <!-- Sélection de l'offre -->
            <div class="field">
              <label>Offre souhaitée *</label>
              <select [(ngModel)]="form.jobOfferId" name="jobOfferId" required>
                <option value="">-- Choisir une offre --</option>
                <option *ngFor="let o of offers()" [value]="o.id">
                  {{ o.title }} — {{ o.department }} ({{ o.location }})
                </option>
              </select>
            </div>

            <!-- Informations personnelles -->
            <div class="row-2">
              <div class="field">
                <label>Nom complet *</label>
                <input type="text" [(ngModel)]="form.applicantName" name="applicantName"
                       placeholder="Prénom Nom" required minlength="2" />
              </div>
              <div class="field">
                <label>Email *</label>
                <input type="email" [(ngModel)]="form.applicantEmail" name="applicantEmail"
                       placeholder="votre@email.com" required />
              </div>
            </div>

            <!-- Lettre de motivation -->
            <div class="field">
              <label>Lettre de motivation *</label>
              <textarea [(ngModel)]="form.coverLetter" name="coverLetter"
                        placeholder="Décrivez vos compétences, votre expérience et votre motivation..."
                        rows="7" required minlength="50"></textarea>
              <span class="hint">💡 Mentionnez vos compétences et années d'expérience — notre IA analysera votre profil automatiquement.</span>
            </div>

            <!-- Upload CV -->
            <div class="field">
              <label>CV (PDF, max 5 Mo)</label>
              <div class="file-upload" [class.has-file]="form.cvFileName">
                <input type="file" accept=".pdf" (change)="onFileChange($event)" id="cv-upload" />
                <label for="cv-upload" class="file-label">
                  <span *ngIf="!form.cvFileName">📎 Choisir un fichier PDF</span>
                  <span *ngIf="form.cvFileName">✅ {{ form.cvFileName }}</span>
                </label>
              </div>
            </div>

            <!-- Erreur -->
            <div *ngIf="errorMsg()" class="error-msg">⚠️ {{ errorMsg() }}</div>

            <!-- Soumission -->
            <button type="submit" class="btn-primary" [disabled]="submitting() || !f.valid">
              <span *ngIf="!submitting()">Envoyer ma candidature</span>
              <span *ngIf="submitting()">Envoi en cours...</span>
            </button>

          </form>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .public-apply-page {
      min-height: 100vh;
      background: #f0f4f8;
      font-family: 'Inter', sans-serif;
    }
    .apply-header {
      background: #1e293b;
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
    }
    .logo-area { display: flex; align-items: center; gap: .75rem; color: #fff; }
    .logo-icon { font-size: 1.5rem; }
    .logo-text { font-size: 1.1rem; font-weight: 600; }

    .apply-main {
      max-width: 720px;
      margin: 2.5rem auto;
      padding: 0 1rem;
    }

    .apply-card, .success-card {
      background: #fff;
      border-radius: 12px;
      padding: 2.5rem;
      box-shadow: 0 2px 16px rgba(0,0,0,.08);
    }
    h1 { font-size: 1.6rem; font-weight: 700; color: #1e293b; margin: 0 0 .4rem; }
    .subtitle { color: #64748b; margin: 0 0 2rem; }

    .field { margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: .35rem; }
    .field label { font-size: .85rem; font-weight: 600; color: #374151; }
    .field input, .field select, .field textarea {
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: .65rem .9rem;
      font-size: .95rem;
      color: #1e293b;
      transition: border-color .2s;
      width: 100%;
      box-sizing: border-box;
    }
    .field input:focus, .field select:focus, .field textarea:focus {
      outline: none;
      border-color: #6366f1;
    }
    .field textarea { resize: vertical; }
    .hint { font-size: .78rem; color: #6366f1; }

    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 500px) { .row-2 { grid-template-columns: 1fr; } }

    .file-upload { position: relative; }
    .file-upload input[type=file] { position: absolute; opacity: 0; width: 0; height: 0; }
    .file-label {
      display: block;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
      cursor: pointer;
      color: #64748b;
      font-size: .9rem;
      transition: border-color .2s;
    }
    .file-upload.has-file .file-label { border-color: #22c55e; color: #16a34a; }
    .file-label:hover { border-color: #6366f1; }

    .btn-primary {
      width: 100%;
      padding: .85rem;
      background: #6366f1;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: .5rem;
      transition: background .2s;
    }
    .btn-primary:hover:not(:disabled) { background: #4f46e5; }
    .btn-primary:disabled { background: #a5b4fc; cursor: not-allowed; }

    .btn-secondary {
      padding: .7rem 1.5rem;
      background: #f1f5f9;
      color: #374151;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 1rem;
      font-size: .95rem;
    }

    .error-msg {
      background: #fef2f2;
      color: #dc2626;
      border-radius: 8px;
      padding: .75rem 1rem;
      font-size: .9rem;
      margin-bottom: 1rem;
    }

    .success-card { text-align: center; }
    .success-icon { font-size: 3.5rem; margin-bottom: 1rem; }
    .success-card h2 { font-size: 1.5rem; color: #16a34a; }
    .success-card p { color: #374151; }
    .sub { color: #64748b; font-size: .9rem; }

    .loading, .empty { text-align: center; padding: 2rem; color: #94a3b8; }
  `]
})
export class PublicApplyPageComponent implements OnInit {
  offers = signal<JobOffer[]>([]);
  loadingOffers = signal(true);
  submitting = signal(false);
  submitted = signal(false);
  errorMsg = signal('');
  selectedOffer = signal<JobOffer | null>(null);

  form = {
    jobOfferId: '',
    applicantName: '',
    applicantEmail: '',
    coverLetter: '',
    cvBase64: '',
    cvFileName: '',
  };

  constructor(
    private recruitment: RecruitmentService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.recruitment.getPublishedOffersPublic().subscribe({
      next: (offers) => {
        this.offers.set(offers);
        this.loadingOffers.set(false);
        // Pré-sélectionner si offerId dans l'URL
        const offerId = this.route.snapshot.paramMap.get('offerId');
        if (offerId) {
          this.form.jobOfferId = offerId;
          const found = offers.find(o => o.id === offerId);
          if (found) this.selectedOffer.set(found);
        }
      },
      error: () => this.loadingOffers.set(false),
    });
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.errorMsg.set('Le fichier dépasse 5 Mo.');
      return;
    }
    this.errorMsg.set('');
    this.form.cvFileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      this.form.cvBase64 = base64;
    };
    reader.readAsDataURL(file);
  }

  submit() {
    if (!this.form.jobOfferId) { this.errorMsg.set('Veuillez choisir une offre.'); return; }
    this.submitting.set(true);
    this.errorMsg.set('');

    const found = this.offers().find(o => o.id === this.form.jobOfferId);
    this.selectedOffer.set(found ?? null);

    this.recruitment.applyExternal({
      jobOfferId: this.form.jobOfferId,
      applicantName: this.form.applicantName,
      applicantEmail: this.form.applicantEmail,
      coverLetter: this.form.coverLetter,
      cvBase64: this.form.cvBase64 || undefined,
      cvFileName: this.form.cvFileName || undefined,
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(err?.error?.message || 'Erreur lors de l\'envoi. Veuillez réessayer.');
      },
    });
  }

  resetForm() {
    this.submitted.set(false);
    this.form = { jobOfferId: '', applicantName: '', applicantEmail: '', coverLetter: '', cvBase64: '', cvFileName: '' };
  }
}
