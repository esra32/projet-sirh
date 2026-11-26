import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Department, Position } from '../../core/services/employee.models';
import { EmployeeService } from '../../core/services/employee.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { AiService } from '../../core/services/ai.service';


@Component({
  selector: 'app-positions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="panel">
      <div class="header-row">
        <div>
          <h2>Postes</h2>
          <p class="muted">Catalogue des postes, descriptions et grilles · {{ filteredPositionsTable().length }} element(s)</p>
        </div>
        <button class="btn btn-primary" (click)="toggleForm()">
          {{ showForm() ? 'Annuler' : 'Nouveau Poste' }}
        </button>
      </div>

      <div class="search-row">
        <input type="text" class="form-control" [ngModel]="searchQuery()" (ngModelChange)="onSearchChange($event)" placeholder="Rechercher un poste..." />
      </div>

      <div *ngIf="showForm()" class="form-container">
        <h3>Créer un poste</h3>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          
          <div class="form-group">
            <label for="title">Titre du poste *</label>
            <input id="title" type="text" formControlName="title" class="form-control" placeholder="ex: Développeur Fullstack" />
            <div *ngIf="form.get('title')?.invalid && form.get('title')?.touched" class="error-text">
              Le titre est requis
            </div>
          </div>
          
          <div class="form-group">
            <label for="departmentId">Département *</label>
            <select id="departmentId" formControlName="departmentId" class="form-control">
              <option value="" disabled selected>Sélectionner un département</option>
              <option *ngFor="let dept of departments()" [value]="dept.id">{{ dept.name }}</option>
            </select>
            <div *ngIf="form.get('departmentId')?.invalid && form.get('departmentId')?.touched" class="error-text">
              Le département est requis
            </div>
          </div>

          <div class="form-group">
            <div class="label-with-ai">
              <label for="description">Description</label>
              <button type="button" class="btn btn-sm btn-ai" [disabled]="isGenerating()" (click)="generateDescription()">
                <ng-container *ngIf="!isGenerating()">✨ Générer avec l'IA</ng-container>
                <ng-container *ngIf="isGenerating()">⏳ Génération...</ng-container>
              </button>
            </div>
            <textarea id="description" formControlName="description" class="form-control" rows="8" placeholder="Description du poste..."></textarea>
          </div>
          
          <div *ngIf="error()" class="error-alert">{{ error() }}</div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-success" [disabled]="loading() || form.invalid">
              {{ loading() ? 'Création...' : 'Créer' }}
            </button>
          </div>
        </form>
      </div>

      <div class="pager" *ngIf="!loadingData() && filteredPositionsTable().length > 0">
        <span>{{ filteredPositionsTable().length }} poste(s)</span>
        <div>
          <button type="button" (click)="firstPage()" [disabled]="page() === 1" title="Premiere page">&laquo;</button>
          <button type="button" (click)="previousPage()" [disabled]="page() === 1" title="Page precedente">&lsaquo;</button>
          <b>{{ page() }} / {{ totalPages() }}</b>
          <button type="button" (click)="nextPage()" [disabled]="page() === totalPages()" title="Page suivante">&rsaquo;</button>
          <button type="button" (click)="lastPage()" [disabled]="page() === totalPages()" title="Derniere page">&raquo;</button>
        </div>
      </div>

      <div class="data-table-container" *ngIf="!loadingData()">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Titre</th>
              <th>Département</th>
              <th>Description</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let pos of paginatedPositionsTable(); let i = index">
              <td class="muted">{{ ((page() - 1) * pageSize) + i + 1 }}</td>
              <td>
                <ng-container *ngIf="editId() !== pos.id">{{ pos.title }}</ng-container>
                <input *ngIf="editId() === pos.id" class="form-control form-control-sm" [formControl]="editForm.controls.title" />
              </td>
              <td>
                <ng-container *ngIf="editId() !== pos.id">
                  <span class="badge">{{ getDeptName(pos.departmentId) }}</span>
                </ng-container>
                <ng-container *ngIf="editId() === pos.id">
                  <select class="form-control form-control-sm" [formControl]="editForm.controls.departmentId">
                    <option *ngFor="let d of departments()" [value]="d.id">{{ d.name }}</option>
                  </select>
                </ng-container>
              </td>
              <td>
                <ng-container *ngIf="editId() !== pos.id">{{ pos.description || '-' }}</ng-container>
                <input *ngIf="editId() === pos.id" class="form-control form-control-sm" [formControl]="editForm.controls.description" />
              </td>
              <td class="text-right">
                <ng-container *ngIf="editId() !== pos.id">
                  <button class="btn btn-sm btn-outline" (click)="startEdit(pos)">Modifier</button>
                  <button class="btn btn-sm btn-danger ml-1" (click)="deletePos(pos.id)">Supprimer</button>
                </ng-container>
                <ng-container *ngIf="editId() === pos.id">
                  <button class="btn btn-sm btn-success" (click)="saveEdit(pos.id)" [disabled]="saving()">Enregistrer</button>
                  <button class="btn btn-sm btn-outline ml-1" (click)="cancelEdit()">Annuler</button>
                </ng-container>
              </td>
            </tr>
            <tr *ngIf="filteredPositionsTable().length === 0">
              <td colspan="5" class="text-center muted py-4">Aucun poste trouvé.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="loadingData()" class="loader">Chargement des postes...</div>
    </div>
  `,
  styles: [
    `
      .panel { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
      .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
      .muted { color: #9CA3AF; margin: 0.5rem 0 0; }
      .search-row { margin-bottom: 1rem; max-width: 380px; }
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
      .form-container { background: #F8FAFC; padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem; border: 1px dashed #D1D5DB; }
      .form-group { margin-bottom: 1rem; }
      .form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #374151; font-weight: 600; }
      .label-with-ai { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
      .label-with-ai label { margin-bottom: 0 !important; }
      .btn-ai { background: linear-gradient(135deg, #a855f7, #6366f1); color: white; border-radius: 6px; border: none; padding: 0.25rem 0.5rem; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(168,85,247,0.3); }
      .btn-ai:hover:not(:disabled) { opacity: 0.9; transform: scale(1.02); }
      .btn-ai:disabled { background: #cbd5e1; cursor: not-allowed; box-shadow: none; }
      .form-control { width: 100%; padding: 0.75rem; border-radius: 8px; border: 1.5px solid #E5E7EB; background: #FFFFFF; color: #1e293b; font-family: inherit; transition: border-color 0.15s; box-sizing: border-box; }

      .form-control:focus { outline: none; border-color: #4DA3FF; box-shadow: 0 0 0 3px rgba(77,163,255,0.12); }
      .form-actions { margin-top: 1.5rem; display: flex; justify-content: flex-end; }
      .error-text { color: #B91C1C; font-size: 0.8rem; margin-top: 0.2rem; }
      .error-alert { background: rgba(255,107,107,0.08); border-left: 4px solid #FF6B6B; padding: 0.75rem; color: #B91C1C; margin-bottom: 1rem; font-size: 0.9rem; border-radius: 4px; }
      .data-table { width: 100%; border-collapse: collapse; text-align: left; }
      .data-table th { padding: 0.85rem 1rem; border-bottom: 2px solid #F1F5F9; color: #9CA3AF; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; }
      .data-table td { padding: 1rem; border-bottom: 1px solid #F1F5F9; color: #374151; }
      .data-table tr:hover td { background: rgba(77,163,255,0.03); }
      .pager { display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-top:1rem; padding:.75rem 1rem; border:1px solid #E5E7EB; border-radius:12px; background:#F8FAFC; color:#64748B; font-size:.82rem; font-weight:700; }
      .pager div { display:flex; align-items:center; gap:.45rem; }
      .pager button { width:34px; height:32px; border:1px solid #D1D5DB; border-radius:8px; background:#fff; color:#334155; cursor:pointer; font-size:1rem; font-weight:800; }
      .pager button:disabled { opacity:.45; cursor:default; }
      .pager b { min-width:64px; text-align:center; color:#0F172A; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .badge { background: rgba(77,163,255,0.1); color: #2E86FF; padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; border: 1px solid rgba(77,163,255,0.2); font-weight: 600; }
      .loader { margin: 2rem 0; color: #9CA3AF; font-style: italic; }
    `,
  ],
})
export class PositionsComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  private aiService = inject(AiService);

  isGenerating = signal(false);


  positions = signal<Position[]>([]);
  searchQuery = signal('');
  page = signal(1);
  readonly pageSize = 10;
  departments = signal<Department[]>([]);
  loadingData = signal(true);
  showForm = signal(false);
  loading = signal(false);
  error = signal('');

  form = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    departmentId: ['', [Validators.required]],
  });

  editId = signal<string | null>(null);
  saving = signal(false);
  editForm = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    departmentId: ['', [Validators.required]],
  });

  filteredPositionsTable = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.positions();
    return this.positions().filter((p) =>
      p.title.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q) ||
      this.getDeptName(p.departmentId).toLowerCase().includes(q)
    );
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredPositionsTable().length / this.pageSize)));
  paginatedPositionsTable = computed(() => {
    const current = Math.min(this.page(), this.totalPages());
    const start = (current - 1) * this.pageSize;
    return this.filteredPositionsTable().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loadingData.set(true);
    this.employeeService.getDepartments().subscribe({
      next: (depts) => {
        this.departments.set(depts);
        this.employeeService.getPositions().subscribe({
          next: (pos) => {
            this.positions.set(this.normalizePositions(pos));
            this.loadingData.set(false);
          },
          error: () => this.loadingData.set(false)
        });
      },
      error: () => this.loadingData.set(false)
    });
  }

  getDeptName(id: string): string {
    return this.departments().find(d => d.id === id)?.name || 'Inconnu';
  }

  private normalizePositions(positions: Position[]): Position[] {
    return positions.map((position) => {
      const titleKey = this.normalizeKey(position.title);
      const correction = this.positionCorrections[titleKey];
      const title = correction?.title ?? position.title;
      const description = this.cleanDescription(correction?.description ?? position.description, title);
      const departmentId = correction?.department
        ? this.departmentIdByName(correction.department) ?? position.departmentId
        : position.departmentId;

      return { ...position, title, description, departmentId };
    });
  }

  private cleanDescription(description: string | null | undefined, title: string): string {
    const raw = (description ?? '').trim();
    if (raw && raw !== '-' && raw.length >= 20 && !/^[a-zA-Z]{3,25}$/.test(raw)) {
      return raw;
    }
    return this.positionDescriptions[this.normalizeKey(title)] ?? `Missions principales du poste ${title}, avec suivi des activites, coordination des parties prenantes et contribution aux objectifs du departement.`;
  }

  private normalizeKey(value: string): string {
    return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private departmentIdByName(name: string): string | null {
    const key = this.normalizeKey(name);
    return this.departments().find((department) => this.normalizeKey(department.name) === key)?.id ?? null;
  }

  private readonly positionCorrections: Record<string, { title: string; department: string; description: string }> = {
    'fullstack devops': {
      title: 'Developpeur Fullstack DevOps',
      department: 'Informatique',
      description: 'Developpe, integre et automatise les applications web internes, avec CI/CD, conteneurisation et deploiement cloud.'
    },
    'dfbd': {
      title: 'Charge de Communication Digitale',
      department: 'Marketing & Communication',
      description: 'Prepare les contenus digitaux, coordonne les campagnes de communication et suit la performance des supports publies.'
    },
    'ing cloud com': {
      title: 'Ingenieur Cloud',
      department: 'Informatique',
      description: 'Administre les environnements cloud, automatise les deploiements et securise les infrastructures applicatives.'
    }
  };

  private readonly positionDescriptions: Record<string, string> = {
    'developpeur frontend senior': 'Concoit et maintient les interfaces Angular, optimise l experience utilisateur et garantit la qualite du code front-end.',
    'devops engineer': 'Automatise les pipelines CI/CD, supervise les environnements applicatifs et fiabilise les deploiements.',
    'developpeur fullstack': 'Developpe les fonctionnalites front-end et back-end des applications internes en respectant les standards techniques.',
    'charge marketing digital': 'Pilote les campagnes digitales, analyse les indicateurs marketing et optimise les canaux d acquisition.',
    'developpeur junior': 'Participe au developpement applicatif, corrige les anomalies et progresse avec l accompagnement de l equipe technique.',
    'product owner': 'Priorise le backlog, formalise les besoins metier et coordonne la livraison des evolutions produit.',
    'charge de communication': 'Prepare les contenus de communication, coordonne les supports internes et contribue a l image de marque.',
    'manager technique': 'Encadre l equipe technique, arbitre les choix d architecture et suit la qualite des livraisons.',
    'ingenieur cybersecurite': 'Analyse les risques, met en place les controles de securite et accompagne les equipes sur les bonnes pratiques.',
    'cloud engineer': 'Concoit, automatise et supervise les plateformes cloud pour garantir disponibilite, couts maitrises et securite.',
    'developpeur bi': 'Construit les tableaux de bord, modelise les donnees et accompagne les metiers dans l analyse decisionnelle.',
    'ingenieur qa': 'Definit les plans de test, automatise les controles qualite et valide les livraisons applicatives.',
    'ui/ux designer': 'Concoit les parcours utilisateurs, realise les maquettes et ameliore l ergonomie des interfaces.',
    'graphiste': 'Produit les visuels de marque, adapte les supports graphiques et garantit la coherence visuelle des communications.',
    'developpeur fullstack devops': 'Developpe, integre et automatise les applications web internes, avec CI/CD, conteneurisation et deploiement cloud.',
    'community manager': 'Anime les communautes, planifie les publications et suit les performances des reseaux sociaux.',
    'data scientist': 'Developpe des modeles analytiques, exploite les donnees et produit des recommandations mesurables pour les metiers.',
    'charge rh': 'Accompagne les processus RH, suit les dossiers collaborateurs et contribue au recrutement et a l administration du personnel.',
    'administrateur rh': 'Administre les dossiers collaborateurs, fiabilise les donnees RH et assure le support SIRH de premier niveau.',
    'hrbp': 'Accompagne les managers sur les sujets RH, suit les talents et contribue aux plans d evolution des equipes.',
    'data analyst': 'Analyse les donnees metier, construit des rapports fiables et transforme les indicateurs en recommandations operationnelles.',
    'responsable formation': 'Pilote le plan de formation, coordonne les prestataires et mesure l impact des actions de developpement.',
    'architecte solution': 'Definit les architectures applicatives, documente les choix techniques et garantit l alignement avec les besoins metier.',
    'charge de communication digitale': 'Prepare les contenus digitaux, coordonne les campagnes de communication et suit la performance des supports publies.',
    'gestionnaire paie': 'Prepare les elements de paie, controle les variables mensuelles et assure le respect des obligations sociales.',
    'responsable marketing': 'Definit la strategie marketing, pilote les campagnes et suit les indicateurs de performance commerciale.',
    'data engineer': 'Construit les pipelines de donnees, fiabilise les flux et met a disposition des jeux de donnees exploitables.',
    'ingenieur cloud': 'Administre les environnements cloud, automatise les deploiements et securise les infrastructures applicatives.',
    'directeur general': 'Pilote la strategie globale, coordonne les directions et suit la performance de l organisation.',
    'manager data': 'Encadre les equipes data, priorise les cas d usage et garantit la valeur metier des produits analytiques.',
    'developpeur mobile': 'Developpe les applications mobiles, optimise les performances et assure la qualite des parcours utilisateurs.',
    'ingenieur ml': 'Concoit, entraine et industrialise des modeles machine learning pour repondre aux besoins metier.',
    'content manager': 'Planifie la strategie editoriale, produit les contenus et mesure leur performance sur les canaux digitaux.',
    'chef de projet digital': 'Coordonne les projets digitaux, suit les plannings et assure la communication entre metier et technique.',
    'developpeur backend senior': 'Concoit les API, optimise les services back-end et accompagne les developpeurs sur les bonnes pratiques.'
  };

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.page.set(1);
  }

  firstPage(): void { this.page.set(1); }
  previousPage(): void { this.page.set(Math.max(1, this.page() - 1)); }
  nextPage(): void { this.page.set(Math.min(this.totalPages(), this.page() + 1)); }
  lastPage(): void { this.page.set(this.totalPages()); }

  toggleForm(): void {
    this.showForm.set(!this.showForm());
    if (!this.showForm()) {
      this.form.reset({ departmentId: '' });
      this.error.set('');
    }
  }

  async generateDescription() {
    const title = this.form.get('title')?.value;
    const deptId = this.form.get('departmentId')?.value;
    
    if (!title || !deptId) {
      this.toastService.show('Veuillez renseigner le titre et le département d\'abord.', 'error');
      return;
    }
    
    this.isGenerating.set(true);
    try {
      const deptName = this.getDeptName(deptId);
      const description = await this.aiService.generateJobDescription(title, deptName, '');
      this.form.patchValue({ description });
      this.toastService.show('Description générée par l\'IA avec succès !');
    } catch (err) {
      this.toastService.show('Erreur de génération avec l\'IA.', 'error');
    } finally {
      this.isGenerating.set(false);
    }
  }



  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const formValue = this.form.getRawValue();
    const newPos = {
      title: formValue.title!,
      description: formValue.description || '',
      departmentId: formValue.departmentId!
    };
    this.employeeService.createPosition(newPos).subscribe({
      next: (created) => {
        this.positions.update(pos => [...pos, created]);
        this.loading.set(false);
        this.toggleForm();
        this.toastService.show('Poste créé avec succès !');
      },
      error: (err) => {
        this.toastService.show(err?.error?.message ?? 'Erreur lors de la création du poste', 'error');
        this.loading.set(false);
      }
    });
  }

  deletePos(id: string): void {
    if (!confirm('Souhaitez-vous vraiment supprimer ce poste ?')) return;
    this.employeeService.deletePosition(id).subscribe({
      next: () => {
        this.positions.update(pos => pos.filter(p => p.id !== id));
        this.toastService.show('Poste supprimé.');
      },
      error: (err) => this.toastService.show(err?.error?.message ?? 'Erreur lors de la suppression', 'error')
    });
  }

  startEdit(pos: Position): void {
    this.editId.set(pos.id);
    this.editForm.setValue({
      title: pos.title,
      description: pos.description ?? '',
      departmentId: pos.departmentId
    });
  }

  cancelEdit(): void {
    this.editId.set(null);
    this.editForm.reset();
  }

  saveEdit(id: string): void {
    if (this.editForm.invalid) return;
    this.saving.set(true);
    const val = this.editForm.getRawValue();
    const payload = { title: val.title!, description: val.description ?? '', departmentId: val.departmentId! };
    this.employeeService.updatePosition(id, payload).subscribe({
      next: (updated) => {
        this.positions.update(list => list.map(p => p.id === id ? updated : p));
        this.editId.set(null);
        this.saving.set(false);
        this.toastService.show('Poste mis à jour.');
      },
      error: (err) => {
        this.toastService.show(err?.error?.message ?? 'Erreur lors de la mise à jour', 'error');
        this.saving.set(false);
      }
    });
  }
}
