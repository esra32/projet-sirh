import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { EmployeeService } from '../../core/services/employee.service';
import { MobilityRequest, MobilityService } from '../../core/services/mobility.service';

@Component({
  selector: 'app-my-mobility',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Ma mobilité interne</h2>
          <p class="muted">Soumettez une demande de changement de poste ou département.</p>
        </div>
        <button class="btn-new" (click)="showForm.set(!showForm())" *ngIf="!showForm()">
          + Nouvelle demande
        </button>
      </div>

      <!-- Formulaire nouvelle demande -->
      <div class="form-card" *ngIf="showForm()">
        <h3>Nouvelle demande de mobilité</h3>
        <div class="form-grid">
          <div class="field">
            <label>Département cible</label>
            <select [(ngModel)]="form.targetDepartment">
              <option value="">-- Non précisé --</option>
              <option *ngFor="let d of departments()" [value]="d.name">{{ d.name }}</option>
            </select>
          </div>
          <div class="field">
            <label>Poste souhaité</label>
            <input type="text" placeholder="Ex: Lead Developer, Chef de projet..." [(ngModel)]="form.targetPosition" />
          </div>
          <div class="field full">
            <label>Motif de la demande <span class="required">*</span></label>
            <textarea rows="4" placeholder="Décrivez vos motivations et objectifs professionnels..."
                      [(ngModel)]="form.reason"></textarea>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn-cancel" (click)="cancelForm()">Annuler</button>
          <button class="btn-submit" (click)="submit()" [disabled]="submitting() || !form.reason.trim()">
            {{ submitting() ? 'Envoi...' : 'Soumettre la demande' }}
          </button>
        </div>
        <div class="form-error" *ngIf="formError()">{{ formError() }}</div>
      </div>

      <!-- Liste des demandes -->
      <div *ngIf="loading()" class="loader">Chargement de vos demandes...</div>

      <div class="requests-list" *ngIf="!loading()">
        <div class="empty-state" *ngIf="myRequests().length === 0 && !showForm()">
          <p>Vous n'avez pas encore soumis de demande de mobilité.</p>
          <button class="btn-new" (click)="showForm.set(true)">+ Faire une demande</button>
        </div>

        <div class="request-card" *ngFor="let r of myRequests()">
          <div class="card-top">
            <div class="transfer">
              <span class="dept current">{{ r.currentDepartment || 'Département actuel' }}</span>
              <span class="arrow">→</span>
              <span class="dept target">{{ r.targetDepartment || 'Non précisé' }}</span>
            </div>
            <div class="card-top-right">
              <span class="status-badge" [ngClass]="r.status">{{ statusLabel(r.status) }}</span>
              <button class="btn-delete" (click)="deleteRequest(r.id)" title="Supprimer la demande">✕</button>
            </div>
          </div>

          <div class="card-body">
            <div class="positions" *ngIf="r.currentPosition || r.targetPosition">
              <span>{{ r.currentPosition || '—' }}</span>
              <span class="arrow-sm">→</span>
              <span class="pos-target">{{ r.targetPosition || 'Non précisé' }}</span>
            </div>
            <div class="reason">
              <label>Votre motif</label>
              <p>{{ r.reason }}</p>
            </div>
            <div class="meta">
              <span>📅 Soumis le {{ r.requestDate | date:'dd/MM/yyyy' }}</span>
              <span *ngIf="r.processedDate">· Traité le {{ r.processedDate | date:'dd/MM/yyyy' }}</span>
            </div>
            <div class="hr-feedback" *ngIf="r.hrComment">
              <label>Réponse RH</label>
              <p>{{ r.hrComment }}</p>
            </div>
          </div>

          <!-- Timeline statut -->
          <div class="timeline">
            <div class="step" [class.active]="isAtLeast(r.status, 'PENDING')">
              <div class="dot"></div><span>Soumis</span>
            </div>
            <div class="step" [class.active]="isAtLeast(r.status, 'MANAGER_APPROVED')">
              <div class="line"></div><div class="dot"></div><span>Manager</span>
            </div>
            <div class="step" [class.active]="r.status === 'APPROVED'" [class.rejected]="r.status === 'REJECTED'">
              <div class="line" [class.rejected]="r.status === 'REJECTED'"></div>
              <div class="dot"></div>
              <span>{{ r.status === 'REJECTED' ? 'Refusé' : 'RH' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div class="toast success" *ngIf="successMsg()">{{ successMsg() }}</div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .page-header h2 { margin: 0 0 0.25rem; color: #1e293b; }
    .muted { color: #9CA3AF; font-size: 0.875rem; margin: 0; }
    .btn-new { padding: 0.5rem 1.25rem; border-radius: 8px; border: none; background: linear-gradient(135deg,#4DA3FF,#6EE7B7); color: #fff; font-weight: 700; font-size: 0.9rem; cursor: pointer; }

    .form-card { background: #fff; border: 1.5px solid rgba(77,163,255,0.3); border-radius: 14px; padding: 1.5rem; box-shadow: 0 2px 12px rgba(77,163,255,0.1); }
    .form-card h3 { margin: 0 0 1.25rem; color: #1e293b; font-size: 1.05rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.4rem; }
    .field.full { grid-column: 1 / -1; }
    .field label { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; font-weight: 700; }
    .required { color: #EF4444; }
    .field input, .field select, .field textarea { padding: 0.5rem 0.75rem; border: 1.5px solid #E5E7EB; border-radius: 8px; font-size: 0.9rem; color: #374151; font-family: inherit; resize: vertical; }
    .field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: #4DA3FF; }
    .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1rem; }
    .btn-cancel { padding: 0.45rem 1.1rem; border-radius: 8px; border: 1.5px solid #E5E7EB; background: transparent; color: #6B7280; font-weight: 600; cursor: pointer; }
    .btn-submit { padding: 0.45rem 1.25rem; border-radius: 8px; border: none; background: #4DA3FF; color: #fff; font-weight: 700; cursor: pointer; }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    .form-error { color: #B91C1C; background: rgba(239,68,68,0.08); padding: 0.6rem 0.9rem; border-radius: 8px; font-size: 0.875rem; margin-top: 0.5rem; }

    .loader { color: #9CA3AF; font-style: italic; }
    .requests-list { display: flex; flex-direction: column; gap: 1rem; }
    .empty-state { text-align: center; padding: 3rem; background: #F8FAFC; border-radius: 12px; border: 1.5px dashed #D1D5DB; color: #9CA3AF; display: flex; flex-direction: column; gap: 1rem; align-items: center; }

    .request-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1.25rem 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .card-top-right { display: flex; align-items: center; gap: 0.6rem; }
    .btn-delete { background: transparent; border: 1px solid rgba(239,68,68,0.3); color: #EF4444; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .btn-delete:hover { background: rgba(239,68,68,0.1); border-color: #EF4444; }
    .transfer { display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem; }
    .dept { padding: 0.25rem 0.75rem; border-radius: 6px; font-weight: 600; }
    .dept.current { background: #F1F5F9; color: #475569; }
    .dept.target { background: rgba(77,163,255,0.1); color: #2E86FF; }
    .arrow { color: #9CA3AF; font-size: 1.1rem; }

    .status-badge { padding: 0.25rem 0.8rem; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .status-badge.PENDING { background: rgba(245,158,11,0.1); color: #B45309; border: 1px solid rgba(245,158,11,0.3); }
    .status-badge.MANAGER_APPROVED { background: rgba(139,92,246,0.1); color: #6D28D9; border: 1px solid rgba(139,92,246,0.3); }
    .status-badge.APPROVED { background: rgba(34,197,94,0.1); color: #166534; border: 1px solid rgba(34,197,94,0.25); }
    .status-badge.REJECTED { background: rgba(239,68,68,0.1); color: #B91C1C; border: 1px solid rgba(239,68,68,0.25); }

    .card-body { display: flex; flex-direction: column; gap: 0.75rem; }
    .positions { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: #374151; }
    .arrow-sm { color: #9CA3AF; }
    .pos-target { font-weight: 600; color: #1e293b; }
    .reason label { font-size: 0.7rem; text-transform: uppercase; color: #9CA3AF; font-weight: 700; display: block; margin-bottom: 0.25rem; }
    .reason p { margin: 0; font-size: 0.875rem; color: #374151; background: #F8FAFC; padding: 0.65rem 0.9rem; border-radius: 8px; border-left: 3px solid #4DA3FF; }
    .meta { font-size: 0.8rem; color: #9CA3AF; }
    .hr-feedback { background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.2); border-radius: 8px; padding: 0.65rem 0.9rem; }
    .hr-feedback label { font-size: 0.7rem; text-transform: uppercase; color: #166534; font-weight: 700; display: block; margin-bottom: 0.2rem; }
    .hr-feedback p { margin: 0; font-size: 0.875rem; color: #374151; }

    .timeline { display: flex; align-items: flex-start; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #F1F5F9; }
    .step { display: flex; flex-direction: column; align-items: center; flex: 1; text-align: center; position: relative; }
    .step span { font-size: 0.7rem; text-transform: uppercase; color: #9CA3AF; margin-top: 0.4rem; font-weight: 600; }
    .dot { width: 12px; height: 12px; border-radius: 50%; background: #E5E7EB; border: 2px solid #D1D5DB; z-index: 2; }
    .line { position: absolute; top: 6px; left: calc(-50% + 6px); width: calc(100% - 12px); height: 2px; background: #E5E7EB; z-index: 0; }
    .step.active .dot { background: #4DA3FF; border-color: #4DA3FF; box-shadow: 0 0 0 3px rgba(77,163,255,0.2); }
    .step.active .line { background: #4DA3FF; }
    .step.active span { color: #2E86FF; font-weight: 700; }
    .step.rejected .dot { background: #EF4444; border-color: #EF4444; }
    .step.rejected span { color: #EF4444; font-weight: 700; }
    .line.rejected { background: #EF4444; }

    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 600; font-size: 0.9rem; z-index: 999; box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
    .toast.success { background: #22C55E; color: #fff; }
  `]
})
export class MyMobilityComponent implements OnInit {
  private mobilityService = inject(MobilityService);
  private employeeService = inject(EmployeeService);
  private authService = inject(AuthService);

  myRequests = signal<MobilityRequest[]>([]);
  departments = signal<{ id: string; name: string }[]>([]);
  loading = signal(true);
  showForm = signal(false);
  submitting = signal(false);
  formError = signal<string | null>(null);
  successMsg = signal('');

  form = { targetDepartment: '', targetPosition: '', reason: '' };

  private readonly ORDER: MobilityRequest['status'][] = ['PENDING', 'MANAGER_APPROVED', 'APPROVED'];

  ngOnInit(): void {
    this.loadRequests();
    this.employeeService.getDepartments().subscribe({
      next: (d) => this.departments.set(d)
    });
  }

  loadRequests(): void {
    const email = this.authService.getEmail();
    if (!email) { this.loading.set(false); return; }
    this.loading.set(true);
    this.mobilityService.getMyRequests(email).subscribe({
      next: (data) => { this.myRequests.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  submit(): void {
    const email = this.authService.getEmail();
    if (!email || !this.form.reason.trim()) return;

    // Récupérer l'ID de l'employé depuis le profil
    this.employeeService.getEmployeeByEmail(email).subscribe({
      next: (emp) => {
        this.submitting.set(true);
        this.formError.set(null);
        this.mobilityService.create({
          employeeId: emp.id,
          targetDepartment: this.form.targetDepartment || undefined,
          targetPosition: this.form.targetPosition || undefined,
          reason: this.form.reason
        }).subscribe({
          next: (created) => {
            this.myRequests.update(list => [created, ...list]);
            this.cancelForm();
            this.submitting.set(false);
            this.successMsg.set('Demande soumise avec succès !');
            setTimeout(() => this.successMsg.set(''), 3500);
          },
          error: (err) => {
            this.formError.set(err?.error?.message ?? 'Erreur lors de la soumission.');
            this.submitting.set(false);
          }
        });
      },
      error: () => this.formError.set('Impossible de récupérer votre profil employé.')
    });
  }

  deleteRequest(id: string): void {
    if (!confirm('Supprimer cette demande de mobilité ? Cette action est irréversible.')) return;
    this.mobilityService.delete(id).subscribe({
      next: () => this.myRequests.update(list => list.filter(r => r.id !== id)),
      error: () => alert('Erreur lors de la suppression. Veuillez réessayer.')
    });
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.form = { targetDepartment: '', targetPosition: '', reason: '' };
    this.formError.set(null);
  }

  isAtLeast(current: MobilityRequest['status'], step: MobilityRequest['status']): boolean {
    if (current === 'REJECTED') return step === 'PENDING';
    return this.ORDER.indexOf(current) >= this.ORDER.indexOf(step);
  }

  statusLabel(s: MobilityRequest['status']): string {
    const labels: Record<string, string> = {
      PENDING: 'En attente',
      MANAGER_APPROVED: 'Validé manager',
      APPROVED: 'Approuvée',
      REJECTED: 'Refusée'
    };
    return labels[s] ?? s;
  }
}