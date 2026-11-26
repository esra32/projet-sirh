import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MobilityRequest, MobilityService, MobilityStatus } from '../../core/services/mobility.service';

@Component({
  selector: 'app-mobility-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Demandes de mobilité interne</h2>
          <p class="muted">Gérez et traitez les demandes de changement de poste des employés.</p>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" (click)="load()" [disabled]="loading()">🔄 Rafraîchir</button>
          <button class="btn-purge" (click)="purgeRejected()" title="Supprimer toutes les demandes REFUSÉES (réinitialise la carence)">🧹 Purger les refusées</button>
        </div>
      </div>

      <!-- Filtres statut -->
      <div class="filter-bar">
        <button class="filter-btn" [class.active]="statusFilter() === null" (click)="setFilter(null)">
          Toutes <span class="count">{{ requests().length }}</span>
        </button>
        <button class="filter-btn pending" [class.active]="statusFilter() === 'PENDING'" (click)="setFilter('PENDING')">
          En attente <span class="count">{{ countByStatus('PENDING') }}</span>
        </button>
        <button class="filter-btn manager" [class.active]="statusFilter() === 'MANAGER_APPROVED'" (click)="setFilter('MANAGER_APPROVED')">
          Validé manager <span class="count">{{ countByStatus('MANAGER_APPROVED') }}</span>
        </button>
        <button class="filter-btn approved" [class.active]="statusFilter() === 'APPROVED'" (click)="setFilter('APPROVED')">
          Approuvées <span class="count">{{ countByStatus('APPROVED') }}</span>
        </button>
        <button class="filter-btn rejected" [class.active]="statusFilter() === 'REJECTED'" (click)="setFilter('REJECTED')">
          Refusées <span class="count">{{ countByStatus('REJECTED') }}</span>
        </button>
      </div>

      <div *ngIf="loading()" class="loader">Chargement des demandes...</div>
      <div *ngIf="error()" class="error-msg">{{ error() }}</div>

      <div class="requests-list" *ngIf="!loading()">

        <div class="empty-state" *ngIf="!error() && filtered().length === 0">
          <p class="muted">Aucune demande de mobilité trouvée.</p>
        </div>

        <div class="request-card" *ngFor="let r of filtered()">
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

          <div class="card-body">
            <div class="transfer-row">
              <div class="transfer-box">
                <label>Département actuel</label>
                <span>{{ r.currentDepartment || '—' }}</span>
              </div>
              <span class="arrow">→</span>
              <div class="transfer-box target">
                <label>Département cible</label>
                <span>{{ r.targetDepartment || 'Non précisé' }}</span>
              </div>
            </div>
            <div class="transfer-row" *ngIf="r.currentPosition || r.targetPosition">
              <div class="transfer-box">
                <label>Poste actuel</label>
                <span>{{ r.currentPosition || '—' }}</span>
              </div>
              <span class="arrow">→</span>
              <div class="transfer-box target">
                <label>Poste cible</label>
                <span>{{ r.targetPosition || 'Non précisé' }}</span>
              </div>
            </div>
            <div class="reason-block">
              <label>Motif</label>
              <p>{{ r.reason }}</p>
            </div>
            <div class="meta-row">
              <span>📅 Soumis le {{ r.requestDate | date:'dd/MM/yyyy' }}</span>
              <span *ngIf="r.processedDate">✅ Traité le {{ r.processedDate | date:'dd/MM/yyyy' }}</span>
              <span *ngIf="r.processedByEmail">par {{ r.processedByEmail }}</span>
            </div>
            <div class="hr-comment" *ngIf="r.hrComment">
              <label>Commentaire RH :</label>
              <p>{{ r.hrComment }}</p>
            </div>
          </div>

          <!-- Bouton supprimer (toujours visible pour RH) -->
          <div class="card-delete">
            <button class="btn-delete" (click)="delete(r)" title="Supprimer cette demande">🗑 Supprimer</button>
          </div>

          <!-- Actions RH -->
          <div class="card-actions" *ngIf="r.status === 'PENDING' || r.status === 'MANAGER_APPROVED'">
            <div class="comment-field">
              <input type="text" placeholder="Commentaire RH (optionnel)" [(ngModel)]="comments[r.id]" />
            </div>
            <button class="btn-approve" (click)="approve(r)">✓ Approuver</button>
            <button class="btn-reject" (click)="reject(r)">✗ Refuser</button>
          </div>
        </div>
      </div>

      <!-- Toast -->
      <div class="toast" *ngIf="toast()" [class.success]="toast()?.type === 'success'" [class.error]="toast()?.type === 'error'">
        {{ toast()?.msg }}
      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.5rem; position: relative; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .page-header h2 { margin: 0 0 0.25rem; color: #1e293b; }
    .muted { color: #9CA3AF; font-size: 0.875rem; margin: 0; }
    .header-actions { display: flex; gap: 0.5rem; align-items: center; }
    .btn-refresh { padding: 0.45rem 1rem; border-radius: 8px; border: 1.5px solid rgba(77,163,255,0.3); background: rgba(77,163,255,0.08); color: #4DA3FF; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    .btn-purge { padding: 0.45rem 1rem; border-radius: 8px; border: 1.5px solid rgba(239,68,68,0.3); background: rgba(239,68,68,0.06); color: #EF4444; font-size: 0.85rem; font-weight: 600; cursor: pointer; }

    .filter-bar { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .filter-btn { padding: 0.4rem 0.9rem; border-radius: 20px; border: 1.5px solid #E5E7EB; background: transparent; color: #6B7280; font-size: 0.82rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: all 0.15s; }
    .filter-btn .count { background: #F1F5F9; padding: 0.1rem 0.4rem; border-radius: 10px; font-size: 0.75rem; }
    .filter-btn.active { border-color: #4DA3FF; background: rgba(77,163,255,0.08); color: #2E86FF; }
    .filter-btn.pending.active { border-color: #F59E0B; background: rgba(245,158,11,0.08); color: #B45309; }
    .filter-btn.manager.active { border-color: #8B5CF6; background: rgba(139,92,246,0.08); color: #6D28D9; }
    .filter-btn.approved.active { border-color: #22C55E; background: rgba(34,197,94,0.08); color: #166534; }
    .filter-btn.rejected.active { border-color: #EF4444; background: rgba(239,68,68,0.08); color: #B91C1C; }

    .loader { color: #9CA3AF; font-style: italic; padding: 2rem 0; }
    .error-msg { color: #B91C1C; background: rgba(239,68,68,0.08); padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.875rem; }

    .requests-list { display: flex; flex-direction: column; gap: 1rem; }
    .empty-state { text-align: center; padding: 3rem; background: #F8FAFC; border-radius: 12px; border: 1.5px dashed #D1D5DB; }

    .request-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1.25rem 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .employee-info { display: flex; align-items: center; gap: 0.75rem; }
    .avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg,#4DA3FF,#6EE7B7); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.85rem; flex-shrink: 0; }
    .employee-info strong { display: block; color: #1e293b; font-size: 0.95rem; }
    .employee-info .muted { display: block; }

    .status-badge { padding: 0.25rem 0.8rem; border-radius: 9999px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
    .status-badge.PENDING { background: rgba(245,158,11,0.1); color: #B45309; border: 1px solid rgba(245,158,11,0.3); }
    .status-badge.MANAGER_APPROVED { background: rgba(139,92,246,0.1); color: #6D28D9; border: 1px solid rgba(139,92,246,0.3); }
    .status-badge.APPROVED { background: rgba(34,197,94,0.1); color: #166534; border: 1px solid rgba(34,197,94,0.25); }
    .status-badge.REJECTED { background: rgba(239,68,68,0.1); color: #B91C1C; border: 1px solid rgba(239,68,68,0.25); }

    .card-body { display: flex; flex-direction: column; gap: 0.85rem; }
    .transfer-row { display: flex; align-items: center; gap: 0.75rem; }
    .transfer-box { flex: 1; background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 8px; padding: 0.5rem 0.75rem; }
    .transfer-box.target { border-color: rgba(77,163,255,0.3); background: rgba(77,163,255,0.04); }
    .transfer-box label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; font-weight: 700; margin-bottom: 0.2rem; }
    .transfer-box span { font-size: 0.875rem; font-weight: 600; color: #1e293b; }
    .arrow { color: #9CA3AF; font-size: 1.2rem; flex-shrink: 0; }
    .reason-block { background: #F8FAFC; border-left: 3px solid #4DA3FF; padding: 0.75rem 1rem; border-radius: 0 8px 8px 0; }
    .reason-block label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: #9CA3AF; font-weight: 700; display: block; margin-bottom: 0.3rem; }
    .reason-block p { margin: 0; font-size: 0.875rem; color: #374151; }
    .meta-row { display: flex; gap: 1.5rem; font-size: 0.8rem; color: #9CA3AF; }
    .hr-comment { background: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.2); border-radius: 8px; padding: 0.65rem 0.9rem; }
    .hr-comment label { font-size: 0.7rem; text-transform: uppercase; color: #6D28D9; font-weight: 700; display: block; margin-bottom: 0.2rem; }
    .hr-comment p { margin: 0; font-size: 0.85rem; color: #374151; }

    .card-actions { display: flex; align-items: center; gap: 0.75rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #F1F5F9; }
    .comment-field { flex: 1; }
    .comment-field input { width: 100%; padding: 0.4rem 0.75rem; border: 1.5px solid #E5E7EB; border-radius: 8px; font-size: 0.875rem; color: #374151; box-sizing: border-box; }
    .comment-field input:focus { outline: none; border-color: #4DA3FF; }
    .btn-approve { padding: 0.4rem 1.1rem; border-radius: 8px; border: none; background: #22C55E; color: #fff; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: opacity 0.15s; }
    .btn-approve:hover { opacity: 0.85; }
    .btn-reject { padding: 0.4rem 1.1rem; border-radius: 8px; border: none; background: #EF4444; color: #fff; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: opacity 0.15s; }
    .btn-reject:hover { opacity: 0.85; }

    .card-delete { display: flex; justify-content: flex-end; padding-top: 0.5rem; }
    .btn-delete { padding: 0.3rem 0.75rem; border-radius: 8px; border: 1.5px solid rgba(239,68,68,0.3); background: transparent; color: #EF4444; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
    .btn-delete:hover { background: rgba(239,68,68,0.08); border-color: #EF4444; }
    .toast { position: fixed; bottom: 2rem; right: 2rem; padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 600; font-size: 0.9rem; z-index: 999; box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
    .toast.success { background: #22C55E; color: #fff; }
    .toast.error { background: #EF4444; color: #fff; }
  `]
})
export class MobilityRequestsComponent implements OnInit {
  private mobilityService = inject(MobilityService);

  requests = signal<MobilityRequest[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  statusFilter = signal<MobilityStatus | null>(null);
  toast = signal<{ msg: string; type: 'success' | 'error' } | null>(null);
  comments: Record<string, string> = {};

  filtered = computed(() => {
    const f = this.statusFilter();
    return f ? this.requests().filter(r => r.status === f) : this.requests();
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.mobilityService.getAll().subscribe({
      next: (data) => { this.requests.set(data); this.loading.set(false); },
      error: () => { this.error.set('Impossible de charger les demandes.'); this.loading.set(false); }
    });
  }

  setFilter(s: MobilityStatus | null): void { this.statusFilter.set(s); }

  countByStatus(s: MobilityStatus): number {
    return this.requests().filter(r => r.status === s).length;
  }

  approve(r: MobilityRequest): void {
    this.mobilityService.updateStatus(r.id, {
      status: 'APPROVED',
      hrComment: this.comments[r.id] || undefined,
      processedByEmail: 'admin@hr.sirh.com'
    }).subscribe({
      next: (updated) => {
        this.requests.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.showToast('Demande approuvée avec succès.', 'success');
      },
      error: () => this.showToast('Erreur lors de l\'approbation.', 'error')
    });
  }

  reject(r: MobilityRequest): void {
    this.mobilityService.updateStatus(r.id, {
      status: 'REJECTED',
      hrComment: this.comments[r.id] || undefined,
      processedByEmail: 'admin@hr.sirh.com'
    }).subscribe({
      next: (updated) => {
        this.requests.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.showToast('Demande refusée.', 'error');
      },
      error: () => this.showToast('Erreur lors du refus.', 'error')
    });
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  statusLabel(s: MobilityStatus): string {
    const labels: Record<MobilityStatus, string> = {
      PENDING: 'En attente',
      MANAGER_APPROVED: 'Validé manager',
      APPROVED: 'Approuvée',
      REJECTED: 'Refusée'
    };
    return labels[s] ?? s;
  }

  delete(r: MobilityRequest): void {
    if (!confirm(`Supprimer la demande de ${r.employeeName} ?`)) return;
    this.mobilityService.delete(r.id).subscribe({
      next: () => {
        this.requests.update(list => list.filter(x => x.id !== r.id));
        this.showToast('Demande supprimée.', 'success');
      },
      error: () => this.showToast('Erreur lors de la suppression.', 'error')
    });
  }

  purgeRejected(): void {
    const email = prompt('Email de l\'employé dont purger les demandes refusées :');
    if (!email) return;
    this.mobilityService.deleteRejected(email).subscribe({
      next: () => {
        this.requests.update(list => list.filter(r => !(r.employeeEmail === email && r.status === 'REJECTED')));
        this.showToast(`Demandes refusées de ${email} supprimées.`, 'success');
      },
      error: () => this.showToast('Erreur lors de la purge.', 'error')
    });
  }

  private showToast(msg: string, type: 'success' | 'error'): void {
    this.toast.set({ msg, type });
    setTimeout(() => this.toast.set(null), 3500);
  }
}