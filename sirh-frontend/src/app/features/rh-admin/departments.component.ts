import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Department } from '../../core/services/employee.models';
import { EmployeeService } from '../../core/services/employee.service';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="panel">
      <div class="header-row">
        <div>
          <h2>Départements</h2>
          <p class="muted">Gestion des départements et rattachements · {{ filteredDepartments().length }} element(s)</p>
        </div>
        <button class="btn btn-primary" (click)="toggleForm()">
          {{ showForm() ? 'Annuler' : 'Nouveau Département' }}
        </button>
      </div>

      <div class="search-row">
        <input type="text" class="form-control" [(ngModel)]="searchQuery" placeholder="Rechercher un departement..." />
      </div>

      <div *ngIf="showForm()" class="form-container">
        <h3>Créer un département</h3>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="name">Nom du département *</label>
            <input id="name" type="text" formControlName="name" class="form-control" placeholder="ex: Ressources Humaines" />
            <div *ngIf="form.get('name')?.invalid && form.get('name')?.touched" class="error-text">
              Le nom est requis
            </div>
          </div>
          <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" formControlName="description" class="form-control" rows="3" placeholder="Description du département..."></textarea>
          </div>
          
          <div *ngIf="error()" class="error-alert">{{ error() }}</div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-success" [disabled]="loading() || form.invalid">
              {{ loading() ? 'Création...' : 'Créer' }}
            </button>
          </div>
        </form>
      </div>

      <div class="data-table-container" *ngIf="!loadingData()">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nom</th>
              <th>Description</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let dept of filteredDepartments(); let i = index">
              <td class="muted">{{ i + 1 }}</td>
              <td>
                <ng-container *ngIf="editId() !== dept.id">{{ dept.name }}</ng-container>
                <input *ngIf="editId() === dept.id" class="form-control form-control-sm" [formControl]="editForm.controls.name" />
              </td>
              <td>
                <ng-container *ngIf="editId() !== dept.id">{{ dept.description || '-' }}</ng-container>
                <input *ngIf="editId() === dept.id" class="form-control form-control-sm" [formControl]="editForm.controls.description" />
              </td>
              <td class="text-right">
                <ng-container *ngIf="editId() !== dept.id">
                  <button class="btn btn-sm btn-outline" (click)="startEdit(dept)">Modifier</button>
                  <button class="btn btn-sm btn-danger ml-1" (click)="deleteDept(dept.id)">Supprimer</button>
                </ng-container>
                <ng-container *ngIf="editId() === dept.id">
                  <button class="btn btn-sm btn-success" (click)="saveEdit(dept.id)" [disabled]="saving()">Enregistrer</button>
                  <button class="btn btn-sm btn-outline ml-1" (click)="cancelEdit()">Annuler</button>
                </ng-container>
              </td>
            </tr>
            <tr *ngIf="filteredDepartments().length === 0">
              <td colspan="4" class="text-center muted py-4">Aucun département trouvé.</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div *ngIf="loadingData()" class="loader">Chargement des départements...</div>
    </div>
  `,
  styles: [
    `
      .panel { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
      .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
      .muted { color: #9CA3AF; margin: 0.5rem 0 0; }
      .search-row { margin-bottom: 1rem; max-width: 380px; }

      /* Buttons */
      .btn { padding: 0.5rem 1rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 0.875rem; }
      .btn-primary { background: linear-gradient(135deg,#4DA3FF,#6EE7B7); color: white; box-shadow: 0 2px 8px rgba(77,163,255,0.3); }
      .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
      .btn-success { background: #22C55E; color: white; }
      .btn-success:hover { background: #16A34A; }
      .btn-success:disabled { background: #BBF7D0; color: #6B7280; cursor: not-allowed; }
      .btn-outline { border: 1.5px solid #E5E7EB; color: #374151; background: transparent; }
      .btn-outline:hover { border-color: #4DA3FF; color: #4DA3FF; background: rgba(77,163,255,0.06); }
      .btn-danger { background: rgba(255,107,107,0.08); color: #B91C1C; border: 1px solid rgba(255,107,107,0.2); }
      .btn-danger:hover { background: rgba(255,107,107,0.15); }
      .btn-sm { padding: 0.25rem 0.75rem; font-size: 0.8rem; }
      .ml-1 { margin-left: 0.25rem; }
      .form-control-sm { padding: 0.35rem 0.6rem; font-size: 0.85rem; }

      /* Form */
      .form-container { background: #F8FAFC; padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem; border: 1px dashed #D1D5DB; }
      .form-container h3 { margin-top: 0; margin-bottom: 1rem; font-size: 1.05rem; color: #1e293b; font-weight: 700; }
      .form-group { margin-bottom: 1rem; }
      .form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #374151; font-weight: 600; }
      .form-control { width: 100%; padding: 0.75rem; border-radius: 8px; border: 1.5px solid #E5E7EB; background: #FFFFFF; color: #1e293b; font-family: inherit; transition: border-color 0.15s; box-sizing: border-box; }
      .form-control:focus { outline: none; border-color: #4DA3FF; box-shadow: 0 0 0 3px rgba(77,163,255,0.12); }
      .form-actions { margin-top: 1.5rem; display: flex; justify-content: flex-end; }
      .error-text { color: #B91C1C; font-size: 0.8rem; margin-top: 0.2rem; }
      .error-alert { background: rgba(255,107,107,0.08); border-left: 4px solid #FF6B6B; padding: 0.75rem; color: #B91C1C; margin-bottom: 1rem; font-size: 0.9rem; border-radius: 4px; }

      /* Table */
      .data-table-container { overflow-x: auto; }
      .data-table { width: 100%; border-collapse: collapse; text-align: left; }
      .data-table th { padding: 0.85rem 1rem; border-bottom: 2px solid #F1F5F9; color: #9CA3AF; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; }
      .data-table td { padding: 1rem; border-bottom: 1px solid #F1F5F9; color: #374151; }
      .data-table tr:hover td { background: rgba(77,163,255,0.03); }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .font-medium { font-weight: 500; }
      .py-4 { padding-top: 2rem !important; padding-bottom: 2rem !important; }
      .loader { margin: 2rem 0; color: #9CA3AF; font-style: italic; }
    `,
  ],
})
export class DepartmentsComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private fb = inject(FormBuilder);

  departments = signal<Department[]>([]);
  searchQuery = '';
  filteredDepartments = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.departments();
    return this.departments().filter((d) =>
      d.name.toLowerCase().includes(q) ||
      (d.description ?? '').toLowerCase().includes(q)
    );
  });
  loadingData = signal(true);

  showForm = signal(false);
  loading = signal(false);
  error = signal('');

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
  });

  ngOnInit(): void {
    this.loadDepartments();
  }

  loadDepartments(): void {
    this.loadingData.set(true);
    this.employeeService.getDepartments().subscribe({
      next: (data) => {
        this.departments.set(data);
        this.loadingData.set(false);
      },
      error: (err) => {
        console.error('Failed to load departments', err);
        this.loadingData.set(false);
      }
    });
  }

  toggleForm(): void {
    this.showForm.set(!this.showForm());
    if (!this.showForm()) {
      this.form.reset();
      this.error.set('');
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set('');

    const newDept = this.form.getRawValue();

    this.employeeService.createDepartment(newDept).subscribe({
      next: (created) => {
        this.departments.update(deps => [...deps, created]);
        this.loading.set(false);
        this.toggleForm();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Erreur lors de la création du département');
        this.loading.set(false);
      }
    });
  }

  deleteDept(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce département ?')) return;
    this.employeeService.deleteDepartment(id).subscribe({
      next: () => this.departments.update(deps => deps.filter(d => d.id !== id)),
      error: (err) => alert(err?.error?.message ?? 'Erreur lors de la suppression')
    });
  }

  editId   = signal<string | null>(null);
  saving   = signal(false);
  editForm = this.fb.nonNullable.group({
    name:        ['', [Validators.required]],
    description: [''],
  });

  startEdit(dept: Department): void {
    this.editId.set(dept.id);
    this.editForm.setValue({ name: dept.name, description: dept.description ?? '' });
  }

  cancelEdit(): void {
    this.editId.set(null);
    this.editForm.reset();
  }

  saveEdit(id: string): void {
    if (this.editForm.invalid) return;
    this.saving.set(true);
    const val = this.editForm.getRawValue();
    this.employeeService.updateDepartment(id, val).subscribe({
      next: (updated) => {
        this.departments.update(deps => deps.map(d => d.id === id ? updated : d));
        this.editId.set(null);
        this.saving.set(false);
      },
      error: (err) => {
        alert(err?.error?.message ?? 'Erreur lors de la mise à jour');
        this.saving.set(false);
      }
    });
  }
}
