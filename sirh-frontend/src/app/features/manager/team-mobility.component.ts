import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { MobilityRequest, MobilityService } from '../../core/services/mobility.service';

@Component({
  selector: 'app-team-mobility',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Demandes de mobilité — Mon équipe</h2>
          <p class="muted">Validez ou refusez les demandes de vos collaborateurs avant transmission au RH.</p>
        </div>
        <button class="btn-refresh" (click)="load()" [disabled]="loading()">🔄 Rafraîchir</button>
      </div>

      <div *ngIf="loading()" class="loader">Chargement...</div>
      <div *ngIf="error()" class="error-msg">{{ error() }}</div>

      <div class="empty-state" *ngIf="!loading() && !error() && requests().length === 0">
        <p>Aucune demande de mobilité en attente dans votre équipe.</p>
      </div>

      <div class="requests-list" *ngIf="!loading() && requests().length > 0">

        <div class="summary-bar">
          <span class="badge pending">{{ countPending() }} en attente</span>
          <span class="badge manager">{{ countManagerApproved() }} transmises au RH</span>
        </div>

        <div class="request-card" *ngFor="let r of requests()">
          <div class="card-top">
            <div class="employee-info">
              <div class="avatar">{{ initials(r.employeeName) }}</div>
              <div>
                <strong>{{ r.employeeName }}</strong>
                <span class="muted">{{ r.employeeEmail }}</span>
              </div>
            </div>
            <span class="status-badge" [ngClass]="r.status">{{ statusLabel(r.status) }}</span>
          </div>

          <div class="transfer-row">
            <div class="box current">
              <label>Département actuel</label>
              <span>{{ r.currentDepartment || '—' }}</span>
            </div>
            <span class="arrow">→</span>
            <div class="box target">
              <label>Département cible</label>
              <span>{{ r.targetDepartment || 'Non précisé' }}</span>
            </div>
          </div>

          <div class="transfer-row" *ngIf="r.targetPosition">
            <div class="box current"><label>Poste actuel</label><span>{{ r.currentPosition || '—' }}</span></div>
            <span class="arrow">→</span>
            <div class="box target"><label>Poste cible</label><span>{{ r.targetPosition }}</span></div>
          </div>

          <div class="reason-block">
            <label>Motif du collaborateur</label>
            <p>{{ r.reason }}</p>
          </div>

          <div class="meta">📅 Soumis le {{ r.requestDate | date:'dd/MM/yyyy' }}</div>

          <!-- Actions manager — seulement si PENDING -->
          <div class="card-actions" *ngIf="r.status === 'PENDING'">
            <input type="text" class="comment-input" placeholder="Commentaire pour le RH (optionnel)"
                   [(ngModel)]="comments[r.id]" />
            <button class="btn-approve" (click)="approve(r)">✓ Valider et transmettre au RH</button>
            <button class="btn-reject"  (click)="reject(r)">✗ Refuser</button>
          </div>

          <div class="transmitted-msg" *ngIf="r.status === 'MANAGER_APPROVED'">
            ✅ Validée par vous — en attente de décision RH
          </div>
        </div>
      </div>
    </div>

    <div class="toast success" *ngIf="toast()">{{ toast() }}</div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .page-header h2 { margin: 0 0 0.25rem; color: #1e293b; }
    .muted { color: #9CA3AF; font-size: 0.875rem; margin: 0; }
    .btn-refresh { padding: 0.45rem 1rem; border-radius: 8px; border: 1.5px solid rgba(77,163,255,0.3); background: rgba(77,163,255,0.08); color: #4DA3FF; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    .loader { color: #9CA3AF; font-style: italic; }
    .error-msg { color: #B91C1C; background: rgba(239,68,68,0.08); padding: 0.75rem 1rem; border-radius: 8px; }
    .empty-state { text-align: center; padding: 3rem; background: #F8FAFC; border-radius: 12px; border: 1.5px dashed #D1D5DB; color: #9CA3AF; }
    .summary-bar { display: flex; gap: 0.75rem; }
    .badge { padding: 0.3rem 0.9rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; }
    .badge.pending { background: rgba(245,158,11,0.1); color: #B45309; border: 1px solid rgba(245,158,11,0.3); }
    .badge.manager { background: rgba(139,92,246,0.1); color: #6D28D9; border: 1px solid rgba(139,92,246,0.3); }
    .requests-list { display: flex; flex-direction: column; gap: 1rem; }
    .request-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1.25rem 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 0.85rem; }
    .card-top { display: flex; justify-content: space-between; align-items: center; }
    .employee-info { display: flex; align-items: center; gap: 0.75rem; }
    .avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg,#4DA3FF,#6EE7B7); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; flex-shrink: 0; }
    .employee-info strong { display: block; color: #1e293b; }
    .employee-info .muted { display: block; }
    .status-badge { padding: 0.25rem 0.8rem; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .status-badge.PENDING { background: rgba(245,158,11,0.1); color: #B45309; border: 1px solid rgba(245,158,11,0.3); }
    .status-badge.MANAGER_APPROVED { background: rgba(139,92,246,0.1); color: #6D28D9; border: 1px solid rgba(139,92,246,0.3); }
    .transfer-row { display: flex; align-items: center; gap: 0.75rem; }
    .box { flex: 1; background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 8px; padding: 0.5rem 0.75rem; }
    .box.target { border-color: rgba(77,163,255,0.3); background: rgba(77,163,255,0.04); }
    .box label { display: block; font-size: 0.7rem; text-transform: uppercase; color: #9CA3AF; font-weight: 700; margin-bottom: 0.2rem; }
    .box span { font-size: 0.875rem; font-weight: 600; color: #1e293b; }
    .arrow { color: #9CA3AF; font-size: 1.1rem; flex-shrink: 0; }
    .reason-block { background: #F8FAFC; border-left: 3px solid #4DA3FF; padding: 0.75rem 1rem; border-radius: 0 8px 8px 0; }
    .reason-block label { font-size: 0.7rem; text-transform: uppercase; color: #9CA3AF; font-weight: 700; display: block; margin-bottom: 0.25rem; }
    .reason-block p { margin: 0; font-size: 0.875rem; color: #374151; }
    .meta { font-size: 0.8rem; color: #9CA3AF; }
    .card-actions { display: flex; align-items: center; gap: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #F1F5F9; flex-wrap: wrap; }
    .comment-input { flex: 1; min-width: 200px; padding: 0.4rem 0.75rem; border: 1.5px solid #E5E7EB; border-radius: 8px; font-size: 0.875rem; }
    .comment-input:focus { outline: none; border-color: #4DA3FF; }
    .btn-approve { padding: 0.4rem 1.1rem; border-radius: 8px; border: none; background: #22C55E; color: #fff; font-weight: 700; font-size: 0.875rem; cursor: pointer; white-space: nowrap; }
    .btn-reject  { padding: 0.4rem 1.1rem; border-radius: 8px; border: none; background: #EF4444; color: #fff; font-weight: 700; font-size: 0.875rem; cursor: pointer; }
    .transmitted-msg { color: #166534; background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); border-radius: 8px; padding: 0.5rem 0.9rem; font-size: 0.875rem; font-weight: 600; }
    .toast { position: fixed; bottom: 2rem; right: 2rem; background: #22C55E; color: #fff; padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 600; box-shadow: 0 4px 16px rgba(0,0,0,0.15); z-index: 999; }
  `]
})
export class TeamMobilityComponent implements OnInit {
  private mobilityService = inject(MobilityService);
  private authService = inject(AuthService);

  requests = signal<MobilityRequest[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  toast = signal('');
  comments: Record<string, string> = {};

  countPending = computed(() => this.requests().filter(r => r.status === 'PENDING').length);
  countManagerApproved = computed(() => this.requests().filter(r => r.status === 'MANAGER_APPROVED').length);

  ngOnInit(): void { this.load(); }

  load(): void {
    const email = this.authService.getEmail();
    if (!email) { this.loading.set(false); return; }
    this.loading.set(true);
    this.mobilityService.getTeamRequests(email).subscribe({
      next: (data) => { this.requests.set(data); this.loading.set(false); },
      error: () => { this.error.set('Impossible de charger les demandes.'); this.loading.set(false); }
    });
  }

  approve(r: MobilityRequest): void {
    const email = this.authService.getEmail() ?? 'manager@sirh.com';
    this.mobilityService.updateStatus(r.id, {
      status: 'MANAGER_APPROVED',
      hrComment: this.comments[r.id] || undefined,
      processedByEmail: email
    }).subscribe({
      next: (updated) => {
        this.requests.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.showToast('Demande validée et transmise au RH.');
      }
    });
  }

  reject(r: MobilityRequest): void {
    const email = this.authService.getEmail() ?? 'manager@sirh.com';
    this.mobilityService.updateStatus(r.id, {
      status: 'REJECTED',
      hrComment: this.comments[r.id] || undefined,
      processedByEmail: email
    }).subscribe({
      next: (updated) => {
        this.requests.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.showToast('Demande refusée.');
      }
    });
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      PENDING: 'En attente', MANAGER_APPROVED: 'Transmise RH',
      APPROVED: 'Approuvée', REJECTED: 'Refusée'
    };
    return m[s] ?? s;
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3500);
  }
}