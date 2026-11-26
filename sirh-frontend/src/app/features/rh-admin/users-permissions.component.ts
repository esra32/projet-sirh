import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SirhRole, SirhUser } from '../../core/services/user-admin.models';
import { UserAdminService } from '../../core/services/user-admin.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-users-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="panel">
      <div class="header-row">
        <div>
          <h2>Utilisateurs et Permissions</h2>
          <p class="muted">Gérez les accès au SIRH, attribuez des rôles et révoquez les permissions.</p>
        </div>
        <button class="btn btn-primary" (click)="reload()" [disabled]="loadingData()">
          {{ loadingData() ? 'Chargement...' : 'Actualiser' }}
        </button>
      </div>

      <div *ngIf="error()" class="error-alert">{{ error() }}</div>
      <div *ngIf="loadingData()" class="loader">Chargement des utilisateurs...</div>

      <div class="data-table-container" *ngIf="!loadingData()">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Email</th>
              <th>Rôles Actifs</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users(); let i = index">
              <td class="muted">{{ i + 1 }}</td>
              <td>
                <div class="user-cell">
                  <div class="avatar">{{ user.email.charAt(0).toUpperCase() }}</div>
                  <span class="font-medium">{{ user.email }}</span>
                </div>
              </td>
              <td>
                <span class="role-badge" *ngFor="let role of user.roles"
                      [ngClass]="role">{{ role }}</span>
              </td>
              <td class="text-right">
                <div class="actions" *ngIf="editingUserId() !== user.id">
                  <button class="btn btn-sm btn-outline mr-2" (click)="startEdit(user)">Modifier Rôle</button>
                  <button class="btn btn-sm btn-danger"
                          [disabled]="user.roles.includes('HR_ADMIN')"
                          (click)="confirmDelete(user.id)">Supprimer</button>
                </div>
                <div class="edit-inline" *ngIf="editingUserId() === user.id">
                  <select [(ngModel)]="editRole" class="form-control form-control-sm">
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="HR_ADMIN">HR_ADMIN</option>
                  </select>
                  <button class="btn btn-sm btn-success ml-2"
                          [disabled]="savingRole()"
                          (click)="saveRole(user.id)">{{ savingRole() ? '...' : 'Sauvegarder' }}</button>
                  <button class="btn btn-sm btn-ghost ml-1" (click)="cancelEdit()">Annuler</button>
                </div>
              </td>
            </tr>
            <tr *ngIf="users().length === 0">
              <td colspan="4" class="text-center muted py-4">Aucun utilisateur trouvé.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .panel { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 16px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
    h2 { margin: 0 0 0.35rem; color: #1e293b; }
    .muted { color: #9CA3AF; margin: 0; font-size: 0.875rem; }
    .btn { padding: 0.5rem 1rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; transition: all 0.2s; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: #4DA3FF; color: white; }
    .btn-primary:hover:not(:disabled) { background: #2E86FF; box-shadow: 0 2px 8px rgba(77,163,255,0.3); }
    .btn-success { background: #22C55E; color: white; }
    .btn-success:hover:not(:disabled) { background: #16A34A; box-shadow: 0 2px 8px rgba(34,197,94,0.3); }
    .btn-danger { background: rgba(255,107,107,0.1); color: #FF6B6B; border: 1px solid rgba(255,107,107,0.25); }
    .btn-danger:hover:not(:disabled) { background: rgba(255,107,107,0.18); }
    .btn-outline { border: 1.5px solid #4DA3FF; color: #4DA3FF; background: transparent; }
    .btn-outline:hover { background: rgba(77,163,255,0.08); }
    .btn-ghost { background: transparent; color: #9CA3AF; border: 1.5px solid #E5E7EB; }
    .btn-ghost:hover { background: #F8FAFC; border-color: #D1D5DB; }
    .btn-sm { padding: 0.25rem 0.75rem; font-size: 0.8rem; }
    .mr-2 { margin-right: 0.5rem; }
    .ml-1 { margin-left: 0.25rem; }
    .ml-2 { margin-left: 0.5rem; }
    .data-table-container { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { padding: 0.75rem 1rem; border-bottom: 2px solid #F1F5F9; color: #9CA3AF; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #F1F5F9; vertical-align: middle; color: #374151; }
    .data-table tr:hover td { background: #F8FAFC; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-medium { font-weight: 600; color: #1e293b; }
    .py-4 { padding: 2rem 0; }
    .loader { margin: 2rem 0; color: #9CA3AF; font-style: italic; }
    .user-cell { display: flex; align-items: center; gap: 0.75rem; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#4DA3FF,#6EE7B7); display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; font-size: 0.8rem; flex-shrink: 0; }
    .role-badge { padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; border: 1px solid transparent; letter-spacing: 0.05em; margin-right: 0.3rem; display: inline-block; }
    .role-badge.HR_ADMIN  { background: rgba(255,209,102,0.15); color: #B45309;  border-color: rgba(255,209,102,0.3); }
    .role-badge.MANAGER   { background: rgba(77,163,255,0.12);  color: #2E86FF;  border-color: rgba(77,163,255,0.3); }
    .role-badge.EMPLOYEE  { background: rgba(34,197,94,0.12);   color: #166534;  border-color: rgba(34,197,94,0.25); }
    .edit-inline { display: flex; align-items: center; justify-content: flex-end; }
    .actions { display: flex; align-items: center; justify-content: flex-end; }
    .form-control { background: #FFFFFF; border: 1.5px solid #E5E7EB; border-radius: 8px; color: #1e293b; padding: 0.4rem 0.6rem; outline: none; }
    .form-control:focus { border-color: #4DA3FF; }
    .form-control-sm { font-size: 0.85rem; padding: 0.25rem 0.5rem; }
    .error-alert { background: rgba(255,107,107,0.08); border-left: 4px solid #FF6B6B; padding: 0.75rem 1rem; color: #B91C1C; margin-bottom: 1rem; font-size: 0.9rem; border-radius: 8px; font-weight: 500; }
  `]
})
export class UsersPermissionsComponent implements OnInit {
  private userAdminService = inject(UserAdminService);
  private toastService = inject(ToastService);

  users = signal<SirhUser[]>([]);
  loadingData = signal(true);
  error = signal('');
  editingUserId = signal<string | null>(null);
  editRole = 'EMPLOYEE';
  savingRole = signal(false);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loadingData.set(true);
    this.error.set('');
    this.userAdminService.getUsers().subscribe({
      next: (data) => { this.users.set(data); this.loadingData.set(false); },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Impossible de charger les utilisateurs.');
        this.loadingData.set(false);
      }
    });
  }

  startEdit(user: SirhUser): void {
    this.editingUserId.set(user.id);
    this.editRole = user.roles[0] ?? 'EMPLOYEE';
  }

  cancelEdit(): void { this.editingUserId.set(null); }

  saveRole(userId: string): void {
    this.savingRole.set(true);
    this.userAdminService.updateRoles(userId, [this.editRole as SirhRole]).subscribe({
      next: (updated) => {
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.editingUserId.set(null);
        this.savingRole.set(false);
        this.toastService.show('Rôles mis à jour avec succès !');
      },
      error: (err) => { 
        this.toastService.show(err?.error?.message ?? 'Erreur lors de la mise à jour.', 'error');
        this.savingRole.set(false); 
      }
    });
  }

  confirmDelete(userId: string): void {
    if (!confirm('Supprimer cet utilisateur définitivement ?')) return;
    this.userAdminService.deleteUser(userId).subscribe({
      next: () => {
        this.users.update(list => list.filter(u => u.id !== userId));
        this.toastService.show('Utilisateur supprimé.');
      },
      error: (err) => this.toastService.show(err?.error?.message ?? 'Erreur lors de la suppression.', 'error')
    });
  }
}
