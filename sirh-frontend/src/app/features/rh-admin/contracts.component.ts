import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Employee, ContractType, Department, Position, ServiceUnit } from '../../core/services/employee.models';
import { EmployeeService } from '../../core/services/employee.service';
import { filterActiveEmployees } from '../../core/services/employee-activity';

@Component({
  selector: 'app-contracts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="panel no-print">
      <div class="header-row">
        <div>
          <h2>Gestion des Contrats & Employés</h2>
          <p class="muted">Liste des employés actuels, de leurs contrats et de leurs postes.</p>
        </div>
        <button class="btn btn-primary" (click)="showForm() ? cancelForm() : toggleForm()">
          {{ showForm() ? 'Annuler' : '+ Nouvel Employé' }}
        </button>
      </div>

      <div class="toolbar">
        <input type="text" class="form-control" [ngModel]="searchQuery()" (ngModelChange)="onSearchChange($event)" placeholder="Rechercher employe, email, poste..." />
        <select class="form-control contract-select" [ngModel]="contractFilter()" (ngModelChange)="onContractFilterChange($event)">
          <option value="">Tous les contrats</option>
          <option value="CDI">CDI</option>
          <option value="CDD">CDD</option>
          <option value="STAGE">STAGE</option>
          <option value="FREELANCE">FREELANCE</option>
          <option value="ALTERNANCE">ALTERNANCE</option>
        </select>
      </div>

      <!-- Formulaire Création / Modification Employé -->
      <div *ngIf="showForm()" class="form-container">
        <h3>{{ formTitle() }}</h3>
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          
          <div class="form-row">
            <div class="form-group flex-1">
              <label for="firstName">Prénom *</label>
              <input id="firstName" type="text" formControlName="firstName" class="form-control" placeholder="ex: Jean" />
            </div>
            <div class="form-group flex-1">
              <label for="lastName">Nom *</label>
              <input id="lastName" type="text" formControlName="lastName" class="form-control" placeholder="ex: Dupont" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label for="email">Email *</label>
              <input id="email" type="email" formControlName="email" class="form-control" placeholder="jean.dupont@entreprise.com" />
            </div>
            <div class="form-group flex-1">
              <label for="phone">Téléphone</label>
              <input id="phone" type="text" formControlName="phone" class="form-control" placeholder="06..." />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label for="salary">Salaire (DT/mois)</label>
              <input id="salary" type="number" formControlName="salary" class="form-control" placeholder="ex: 2000" min="600" max="5000" />
              <span *ngIf="form.get('salary')?.errors?.['min'] || form.get('salary')?.errors?.['max']" style="color:#B91C1C;font-size:0.8rem;">Salaire entre 600 et 5 000 DT</span>
            </div>
            <div class="form-group flex-1">
              <label for="hireDate">Date d'embauche *</label>
              <input id="hireDate" type="date" formControlName="hireDate" class="form-control" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label for="contractType">Type de contrat *</label>
              <select id="contractType" formControlName="contractType" class="form-control" (change)="onContractTypeChange()">
                <option value="CDI">CDI</option>
                <option value="CDD">CDD</option>
                <option value="STAGE">Stage</option>
                <option value="FREELANCE">Freelance</option>
                <option value="ALTERNANCE">Alternance</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label for="departmentId">Département *</label>
              <select id="departmentId" formControlName="departmentId" class="form-control" (change)="onDepartmentChange()">
                <option value="">Sélectionner</option>
                <option *ngFor="let dept of departments()" [value]="dept.id">{{ dept.name }}</option>
              </select>
            </div>
            <div class="form-group flex-1">
              <label for="positionId">Poste *</label>
              <select id="positionId" formControlName="positionId" class="form-control">
                <option value="">Sélectionner</option>
                <option *ngFor="let pos of filteredPositions()" [value]="pos.id">{{ pos.title }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label for="serviceId">Service (optionnel)</label>
              <select id="serviceId" formControlName="serviceId" class="form-control">
                <option value="">Aucun service</option>
                <option *ngFor="let svc of filteredServices()" [value]="svc.id">
                  {{ svc.parentServiceName ? svc.parentServiceName + ' › ' : '' }}{{ svc.name }}
                </option>
              </select>
            </div>
            <div class="form-group flex-1">
              <label for="managerId">Manager direct (optionnel)</label>
              <select id="managerId" formControlName="managerId" class="form-control">
                <option value="">Aucun manager</option>
                <option *ngFor="let emp of managerCandidates()" [value]="emp.id">
                  {{ emp.firstName }} {{ emp.lastName }} — {{ emp.position?.title }}
                </option>
              </select>
            </div>
          </div>

          <div *ngIf="error()" class="error-alert">{{ error() }}</div>
          
          <div class="form-actions">
            <button type="submit" class="btn btn-success" [disabled]="loading() || form.invalid">
              {{ submitButtonLabel() }}
            </button>
          </div>
        </form>
      </div>

      <!-- Table des Employés -->
      <div class="pager" *ngIf="!loadingData() && filteredEmployees().length > 0">
        <span>{{ filteredEmployees().length }} employe(s)</span>
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
              <th>Nom</th>
              <th>Contact</th>
              <th>Contrat</th>
              <th>Poste & Dpt</th>
              <th>Date d'arrivée</th>
              <th>Salaire</th>
              <th>Manager</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let emp of paginatedEmployees()">
              <td class="font-medium">
                <div class="avatar-cell">
                  <div class="avatar">{{ emp.firstName.charAt(0) }}{{ emp.lastName.charAt(0) }}</div>
                  <div>
                    {{ emp.firstName }} {{ emp.lastName }}
                  </div>
                </div>
              </td>
              <td>
                <div class="contact-info">
                  <span><i class="icon-mail"></i> {{ emp.email }}</span>
                  <span class="muted"><i class="icon-phone"></i> {{ emp.phone || 'N/A' }}</span>
                </div>
              </td>
              <td>
                <span class="badge" [ngClass]="emp.contractType">{{ emp.contractType }}</span>
              </td>
              <td>
                <div class="role-info">
                  <strong>{{ emp.position?.title || 'Aucun poste' }}</strong>
                  <span class="muted">{{ emp.department?.name || 'Aucun département' }}</span>
                </div>
              </td>
              <td>{{ emp.hireDate | date:'mediumDate' }}</td>
              <td>
                <span *ngIf="emp.salary" class="salary-badge">{{ emp.salary | number }} DT</span>
                <span class="muted" *ngIf="!emp.salary">—</span>
              </td>
              <td>
                <span class="manager-chip" *ngIf="emp.managerName">{{ emp.managerName }}</span>
                <span class="muted" *ngIf="!emp.managerName">—</span>
              </td>
              <td class="text-right">
                <button class="btn btn-sm btn-outline-primary" style="margin-right:0.4rem;" (click)="startEdit(emp)">✏️ Modifier</button>
                <button class="btn btn-sm btn-outline-primary" style="margin-right:0.4rem;" (click)="printContract(emp)">🖨️ Imprimer</button>
                <button class="btn btn-sm btn-danger" (click)="deleteEmployee(emp.id)">Supprimer</button>
              </td>
            </tr>
            <tr *ngIf="filteredEmployees().length === 0">
              <td colspan="8" class="text-center muted py-4">Aucun employé trouvé.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="loadingData()" class="loader">Chargement des données...</div>
    </div>

    <!-- Modèle de Contrat à Imprimer -->
    <div id="print-area" class="print-only">
      <div *ngIf="selectedEmployeeToPrint()" class="contract-document">
        <div class="contract-inner">
          <div class="contract-header">
            <div class="logo-placeholder">SIRH<span>NEXT</span></div>
            <div class="company-meta">
              <p><strong>S.I.R.H. NEXT SOLUTIONS</strong></p>
              <p>123 Avenue de l'Innovation, 75001 Paris</p>
              <p>RCS Paris B 123 456 789 | Tél: +33 1 23 45 67 89</p>
            </div>
          </div>
          
          <div class="contract-title">
            <h2>CONTRAT DE TRAVAIL À DURÉE {{ selectedEmployeeToPrint()!.contractType === 'CDI' ? 'INDÉTERMINÉE' : 'DÉTERMINÉE' }}</h2>
            <p class="ref">Réf: CT-{{ selectedEmployeeToPrint()!.id.substring(0,8) }}-{{ currentDate | date:'yyyy' }}</p>
          </div>
          
          <div class="contract-content">
            <p class="intro"><strong>ENTRE LES SOUSSIGNÉS :</strong></p>
            
            <div class="party">
              <p>La société <strong>S.I.R.H. NEXT SOLUTIONS</strong>, Société par Actions Simplifiée au capital de 100 000 €, dont le siège social est situé au 123 Avenue de l'Innovation, 75001 Paris, immatriculée au Registre du Commerce et des Sociétés de Paris sous le numéro 123 456 789, représentée par la Direction des Ressources Humaines.</p>
              <p class="role-desc">Ci-après désignée "l'Employeur",</p>
            </div>

            <p class="dune-part"><em>D'une part,</em></p>
            
            <div class="party">
              <p><strong>M/Mme. {{ selectedEmployeeToPrint()!.firstName }} {{ selectedEmployeeToPrint()!.lastName }}</strong>,</p>
              <p>Demeurant à l'adresse renseignée dans le dossier personnel du salarié.</p>
              <p>Contact : {{ selectedEmployeeToPrint()!.email }} | {{ selectedEmployeeToPrint()!.phone || 'Non renseigné' }}</p>
              <p class="role-desc">Ci-après désigné(e) "le Salarié",</p>
            </div>

            <p class="dune-part"><em>D'autre part,</em></p>
            
            <div class="articles">
              <div class="article">
                <h4>ARTICLE 1 - ENGAGEMENT</h4>
                <p>Sous réserve des résultats de la visite d'information et de prévention, le Salarié est engagé par l'Employeur en qualité de <strong>{{ selectedEmployeeToPrint()!.position?.title || 'Non renseigné' }}</strong> à compter du <strong>{{ selectedEmployeeToPrint()!.hireDate | date:'longDate' }}</strong>.</p>
              </div>

              <div class="article">
                <h4>ARTICLE 2 - FONCTIONS</h4>
                <p>Le Salarié exercera ses fonctions sous l'autorité et selon les directives de la Direction du département <strong>{{ selectedEmployeeToPrint()!.department?.name || 'Non renseigné' }}</strong>.</p>
              </div>

              <div class="article">
                <h4>ARTICLE 3 - LIEU DE TRAVAIL</h4>
                <p>Le lieu de travail habituel est fixé au siège social de l'entreprise. Toutefois, en fonction des nécessités de service, des déplacements pourront être à prévoir.</p>
              </div>

              <div class="article">
                <h4>ARTICLE 4 - DURÉE DU TRAVAIL</h4>
                <p>La durée hebdomadaire de travail est fixée conformément aux dispositions légales et conventionnelles en vigueur au sein de l'entreprise.</p>
              </div>
            </div>
            
            <div class="signatures-section">
              <p>Fait à Paris, le {{ currentDate | date:'longDate' }} en deux exemplaires originaux.</p>
              <div class="signature-grid">
                <div class="signature-box">
                  <p class="sig-title">Pour l'Employeur</p>
                  <p class="sig-name">La Direction RH</p>
                  <div class="sig-space"></div>
                </div>
                <div class="signature-box">
                  <p class="sig-title">Le Salarié</p>
                  <p class="sig-name">(Précéder de la mention "Lu et approuvé")</p>
                  <div class="sig-space"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="page-footer">
            <p>S.I.R.H. NEXT SOLUTIONS - Document Contractuel Confidentiel - Page 1/1</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .panel { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
      .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
      .muted { color: #9CA3AF; margin: 0.5rem 0 0; font-size: 0.85rem; }
      .toolbar { display: flex; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
      .contract-select { max-width: 220px; }

      /* Buttons */
      .btn { padding: 0.5rem 1rem; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; transition: all 0.2s; font-size: 0.875rem; }
      .btn-primary { background: linear-gradient(135deg,#4DA3FF,#6EE7B7); color: white; box-shadow: 0 2px 8px rgba(77,163,255,0.3); }
      .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
      .btn-outline-primary { border: 1px solid #4DA3FF; color: #2E86FF; background: transparent; }
      .btn-outline-primary:hover { background: rgba(77,163,255,0.08); }
      .btn-success { background: #22C55E; color: white; }
      .btn-success:hover { background: #16A34A; }
      .btn-success:disabled { background: #BBF7D0; color: #6B7280; cursor: not-allowed; }
      .btn-sm { padding: 0.25rem 0.75rem; font-size: 0.8rem; }
      .btn-danger { background: rgba(255,107,107,0.08); color: #B91C1C; border: 1px solid rgba(255,107,107,0.2); }
      .btn-danger:hover { background: rgba(255,107,107,0.15); }

      /* Form */
      .form-container { background: #F8FAFC; padding: 1.5rem; border-radius: 10px; margin-bottom: 2rem; border: 1px dashed #D1D5DB; }
      .form-container h3 { margin-top: 0; margin-bottom: 1.5rem; font-size: 1.05rem; color: #1e293b; font-weight: 700; border-bottom: 1px solid #E5E7EB; padding-bottom: 0.75rem; }
      .form-row { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
      .flex-1 { flex: 1; min-width: 200px; }
      .form-group label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; color: #374151; font-weight: 600; }
      .form-control { width: 100%; padding: 0.75rem; border-radius: 8px; border: 1.5px solid #E5E7EB; background: #FFFFFF; color: #1e293b; font-family: inherit; transition: border-color 0.15s; box-sizing: border-box; }
      .form-control:focus { outline: none; border-color: #4DA3FF; box-shadow: 0 0 0 3px rgba(77,163,255,0.12); }
      .form-actions { margin-top: 1.5rem; display: flex; justify-content: flex-end; }
      .error-alert { background: rgba(255,107,107,0.08); border-left: 4px solid #FF6B6B; padding: 0.75rem; color: #B91C1C; margin-bottom: 1rem; font-size: 0.9rem; border-radius: 4px; }

      /* Table */
      .data-table-container { overflow-x: auto; }
      .data-table { width: 100%; border-collapse: collapse; text-align: left; }
      .data-table th { padding: 0.85rem 1rem; border-bottom: 2px solid #F1F5F9; color: #9CA3AF; font-weight: 700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; }
      .data-table td { padding: 1rem; border-bottom: 1px solid #F1F5F9; vertical-align: middle; color: #374151; }
      .data-table tr:hover td { background: rgba(77,163,255,0.03); }
      .pager { display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-top:1rem; padding:.75rem 1rem; border:1px solid #E5E7EB; border-radius:12px; background:#F8FAFC; color:#64748B; font-size:.82rem; font-weight:700; }
      .pager div { display:flex; align-items:center; gap:.45rem; }
      .pager button { width:34px; height:32px; border:1px solid #D1D5DB; border-radius:8px; background:#fff; color:#334155; cursor:pointer; font-size:1rem; font-weight:800; }
      .pager button:disabled { opacity:.45; cursor:default; }
      .pager b { min-width:64px; text-align:center; color:#0F172A; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .font-medium { font-weight: 500; }
      .py-4 { padding-top: 2rem !important; padding-bottom: 2rem !important; }

      .avatar-cell { display: flex; align-items: center; gap: 1rem; }
      .avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #4DA3FF, #6EE7B7); display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; font-size: 0.85rem; flex-shrink: 0; }

      .contact-info { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; color: #6B7280; }
      .role-info { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
      .role-info strong { color: #1e293b; }

      .badge { padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; border: 1px solid transparent; }
      .badge.CDI        { background: rgba(34,197,94,0.1);   color: #166534; border-color: rgba(34,197,94,0.2); }
      .badge.CDD        { background: rgba(255,209,102,0.15); color: #92400E; border-color: rgba(255,209,102,0.3); }
      .badge.STAGE      { background: rgba(167,139,250,0.1); color: #5B21B6; border-color: rgba(167,139,250,0.2); }
      .badge.FREELANCE  { background: rgba(236,72,153,0.1);  color: #9D174D; border-color: rgba(236,72,153,0.2); }
      .badge.ALTERNANCE { background: rgba(6,182,212,0.1);   color: #0E7490; border-color: rgba(6,182,212,0.2); }

      .manager-chip { background: #EFF6FF; color: #1D4ED8; border-radius: 999px; padding: .15rem .55rem; font-size: .72rem; font-weight: 600; white-space: nowrap; }
      .salary-badge { background: #F0FDF4; color: #166534; border: 1px solid #BBF7D0; border-radius: 8px; padding: .15rem .5rem; font-size: .78rem; font-weight: 700; white-space: nowrap; }

      .loader { margin: 2rem 0; color: #9CA3AF; font-style: italic; }

      /* Modèle d'impression caché par défaut */
      .print-only { display: none; }

      @media print {
        @page { size: A4; margin: 0; }
        body * { visibility: hidden !important; }
        #print-area, #print-area * { visibility: visible !important; }
        #print-area {
          display: block !important;
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          z-index: 99999 !important;
        }

        .contract-document {
          font-family: "EB Garamond", "Times New Roman", serif;
          line-height: 1.5;
          width: 210mm;
          min-height: 297mm;
          padding: 25mm !important;
          margin: 0 auto;
          background: white;
          color: black;
          box-sizing: border-box;
        }

        .contract-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1.5px solid #333;
          padding-bottom: 15px;
          margin-bottom: 40px;
        }

        .logo-placeholder { font-size: 24px; font-weight: 900; color: #000; letter-spacing: -1px; }
        .logo-placeholder span { color: #4DA3FF; }
        .company-meta { text-align: right; font-size: 10pt; color: #444; }
        .company-meta p { margin: 0; }

        .contract-title { text-align: center; margin-bottom: 40px; }
        .contract-title h2 { font-size: 18pt; text-decoration: underline; margin: 0; }
        .contract-title .ref { font-size: 9pt; color: #666; margin-top: 5px; }

        .contract-content { font-size: 11pt; text-align: justify; }
        .intro { margin-bottom: 25px; }
        .party { margin-bottom: 20px; }
        .party p { margin: 2px 0; }
        .role-desc { font-style: italic; font-size: 10pt; margin-top: 5px !important; }
        .dune-part { text-align: center; margin: 30px 0; font-weight: bold; }

        .article { margin-bottom: 25px; }
        .article h4 { margin: 0 0 10px 0; font-size: 12pt; border-bottom: 0.5px solid #eee; }
        
        .signatures-section { margin-top: 60px; }
        .signature-grid { display: flex; justify-content: space-between; margin-top: 20px; }
        .signature-box { width: 45%; }
        .sig-title { font-weight: bold; margin-bottom: 5px; }
        .sig-name { font-size: 9pt; color: #666; margin-bottom: 15px; }
        .sig-space { height: 80px; border: 0.5px solid #eee; background: #fafafa; border-radius: 4px; }

        .page-footer {
          position: absolute; bottom: 20mm; left: 0; right: 0;
          text-align: center; font-size: 8pt; color: #999;
          border-top: 0.5px solid #eee; padding-top: 10px;
        }
      }
    `,
  ],
})
export class ContractsComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private fb = inject(FormBuilder);

  employees = signal<Employee[]>([]);
  searchQuery = signal('');
  contractFilter = signal('');
  page = signal(1);
  readonly pageSize = 10;
  departments = signal<Department[]>([]);
  positions = signal<Position[]>([]);
  filteredPositions = signal<Position[]>([]);
  services = signal<ServiceUnit[]>([]);
  filteredServices = signal<ServiceUnit[]>([]);

  loadingData = signal(true);

  showForm = signal(false);
  editingId = signal<string | null>(null);
  loading = signal(false);
  error = signal('');
  
  // Impression
  selectedEmployeeToPrint = signal<Employee | null>(null);
  currentDate = new Date();

  form = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    salary: [null as number | null, [Validators.min(600), Validators.max(5000)]],
    hireDate: [ContractsComponent.formatLocalDate(new Date()), [Validators.required]],
    contractType: ['CDI', [Validators.required]],
    departmentId: ['', [Validators.required]],
    positionId: ['', [Validators.required]],
    serviceId: [''],
    managerId: [''],
  });

  /** Employees available as manager candidates (excludes the one being edited). */
  managerCandidates = computed(() => {
    const editId = this.editingId();
    return this.employees().filter(e => e.id !== editId);
  });

  filteredEmployees = computed(() => {
    const q  = this.searchQuery().trim().toLowerCase();
    const ct = this.contractFilter();
    return this.employees().filter((e) => {
      const matchQuery =
        !q ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.position?.title || '').toLowerCase().includes(q);
      const matchContract = !ct || e.contractType === ct;
      return matchQuery && matchContract;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredEmployees().length / this.pageSize)));
  paginatedEmployees = computed(() => {
    const current = Math.min(this.page(), this.totalPages());
    const start = (current - 1) * this.pageSize;
    return this.filteredEmployees().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loadingData.set(true);
    forkJoin({
      employees:   this.employeeService.getEmployees(),
      departments: this.employeeService.getDepartments(),
      positions:   this.employeeService.getPositions(),
      services:    this.employeeService.getServices(),
    }).subscribe({
      next: ({ employees, departments, positions, services }) => {
        this.employees.set(this.normalizeEmployeeCareers(filterActiveEmployees(employees)));
        this.departments.set(departments);
        this.positions.set(positions);
        this.services.set(services);
        this.loadingData.set(false);
      },
      error: () => this.loadingData.set(false)
    });
  }

  formTitle(): string {
    return this.editingId() ? 'Modifier l employe' : 'Enregistrer un nouvel employe';
  }

  submitButtonLabel(): string {
    if (this.loading()) return this.editingId() ? 'Modification...' : 'Creation...';
    return this.editingId() ? 'Enregistrer les modifications' : 'Creer l employe';
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.page.set(1);
  }

  onContractFilterChange(value: string): void {
    this.contractFilter.set(value);
    this.page.set(1);
  }

  firstPage(): void { this.page.set(1); }
  previousPage(): void { this.page.set(Math.max(1, this.page() - 1)); }
  nextPage(): void { this.page.set(Math.min(this.totalPages(), this.page() + 1)); }
  lastPage(): void { this.page.set(this.totalPages()); }

  private normalizeEmployeeCareers(employees: Employee[]): Employee[] {
    return employees.map((employee) => {
      const title = employee.position?.title ?? '';
      const normalizedTitle = this.normalizedPositionTitle(employee.contractType, title, employee.department?.name ?? '');
      if (normalizedTitle === title) return employee;

      return {
        ...employee,
        position: {
          ...employee.position,
          title: normalizedTitle,
        },
      };
    });
  }

  private normalizedPositionTitle(contract: ContractType, title: string, departmentName: string): string {
    const lowerTitle = this.normalizeText(title);
    const fixedLegacyTitle = this.legacyTestTitleReplacement(lowerTitle, departmentName);
    if (fixedLegacyTitle) return fixedLegacyTitle;

    if (contract === 'STAGE') {
      if (lowerTitle.includes('stagiaire') || lowerTitle.includes('assistant stagiaire')) return title;
      return this.traineeTitle(title, departmentName);
    }

    if (contract === 'ALTERNANCE') {
      if (lowerTitle.includes('alternant') || lowerTitle.includes('alternante')) return title;
      return this.alternanceTitle(title, departmentName);
    }

    if ((contract === 'CDI' || contract === 'CDD') && lowerTitle.includes('stagiaire')) {
      return title.replace(/stagiaire/ig, 'Junior').replace(/\s+/g, ' ').trim();
    }

    return title;
  }

  private legacyTestTitleReplacement(normalizedTitle: string, departmentName: string): string | null {
    const department = this.normalizeText(departmentName);

    if (normalizedTitle === 'dfbd') {
      if (department.includes('juridique') || department.includes('conformite')) return 'Charge de Conformite';
      if (department.includes('marketing')) return 'Charge de Communication Digitale';
      return 'Charge de Mission';
    }

    if (normalizedTitle === 'ing cloud com') {
      if (department.includes('informatique') || department.includes('data')) return 'Ingenieur Cloud';
      return 'Charge de Support Cloud';
    }

    return null;
  }

  private traineeTitle(positionTitle: string, departmentName: string): string {
    const position = this.normalizeText(positionTitle);
    const department = this.normalizeText(departmentName);

    if (position.includes('developpeur') || department.includes('informatique')) return 'Developpeur Stagiaire';
    if (position.includes('data') || position.includes('bi') || position.includes('ml') || department.includes('data')) return 'Stagiaire Data Analyst';
    if (department.includes('ressources humaines') || position.includes('rh') || position.includes('formation') || position.includes('paie')) return 'Assistant RH Stagiaire';
    if (department.includes('marketing') || position.includes('marketing') || position.includes('communication') || position.includes('content')) return 'Assistant Marketing Stagiaire';
    if (department.includes('finance') || position.includes('comptable') || position.includes('audit')) return 'Assistant Finance Stagiaire';
    if (department.includes('commercial') || position.includes('commercial') || position.includes('account')) return 'Assistant Commercial Stagiaire';
    if (department.includes('operation') || position.includes('logistique') || position.includes('achats')) return 'Assistant Operations Stagiaire';
    return 'Stagiaire Polyvalent';
  }

  private alternanceTitle(positionTitle: string, departmentName: string): string {
    const position = this.normalizeText(positionTitle);
    const department = this.normalizeText(departmentName);

    if (position.includes('developpeur') || department.includes('informatique')) return 'Developpeur Alternant';
    if (position.includes('data') || position.includes('bi') || position.includes('ml') || department.includes('data')) return 'Data Analyst Alternant';
    if (department.includes('ressources humaines') || position.includes('rh') || position.includes('formation') || position.includes('paie')) return 'Assistant RH Alternant';
    if (department.includes('marketing') || position.includes('marketing') || position.includes('communication') || position.includes('content')) return 'Assistant Marketing Alternant';
    if (department.includes('finance') || position.includes('comptable') || position.includes('audit')) return 'Assistant Finance Alternant';
    if (department.includes('commercial') || position.includes('commercial') || position.includes('account')) return 'Assistant Commercial Alternant';
    if (department.includes('operation') || position.includes('logistique') || position.includes('achats')) return 'Assistant Operations Alternant';
    return 'Alternant Polyvalent';
  }

  private normalizeText(value: string): string {
    return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  printContract(employee: Employee): void {
    this.selectedEmployeeToPrint.set(employee);
    // Délai légèrement plus long pour garantir que le DOM est prêt
    setTimeout(() => {
      window.print();
    }, 300);
  }

  deleteEmployee(id: string): void {
    if (!confirm('Supprimer cet employé ? Cette action est irréversible.')) return;
    this.employeeService.deleteEmployee(id).subscribe({
      next: () => this.employees.update(list => list.filter(e => e.id !== id)),
      error: (err) => alert(err?.error?.message ?? 'Erreur lors de la suppression')
    });
  }

  onDepartmentChange(): void {
    const deptId = this.form.get('departmentId')?.value;
    this.form.patchValue({ positionId: '', serviceId: '' });
    if (!deptId) {
      this.filteredPositions.set([]);
      this.filteredServices.set([]);
      return;
    }
    this.employeeService.getPositions(deptId).subscribe({
      next: positions => this.filteredPositions.set(positions),
      error: () => this.filteredPositions.set(this.positions().filter(p => p.departmentId === deptId))
    });
    this.employeeService.getServices(deptId).subscribe({
      next: services => this.filteredServices.set(services),
      error: () => this.filteredServices.set(this.services().filter(s => s.departmentId === deptId))
    });
  }

  toggleForm(): void {
    this.showForm.set(true);
    this.editingId.set(null);
    this.form.reset({
      contractType: 'CDI',
      hireDate: ContractsComponent.formatLocalDate(new Date())
    });
    this.filteredPositions.set([]);
    this.filteredServices.set([]);
    this.error.set('');
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.reset({ contractType: 'CDI', hireDate: ContractsComponent.formatLocalDate(new Date()) });
    this.filteredPositions.set([]);
    this.filteredServices.set([]);
    this.error.set('');
  }

  startEdit(emp: Employee): void {
    this.editingId.set(emp.id);
    this.showForm.set(true);
    this.error.set('');

    const deptId = emp.department?.id || '';

    // Load positions + services for this department first, then patch form
    if (deptId) {
      forkJoin({
        positions: this.employeeService.getPositions(deptId),
        services:  this.employeeService.getServices(deptId),
      }).subscribe({
        next: ({ positions, services }) => {
          this.filteredPositions.set(positions);
          this.filteredServices.set(services);
          this.patchFormFromEmployee(emp, deptId);
        },
        error: () => this.patchFormFromEmployee(emp, deptId)
      });
    } else {
      this.patchFormFromEmployee(emp, deptId);
    }

    // Scroll form into view
    setTimeout(() => {
      document.querySelector('.form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  private patchFormFromEmployee(emp: Employee, deptId: string): void {
    this.form.patchValue({
      firstName:    emp.firstName,
      lastName:     emp.lastName,
      email:        emp.email,
      phone:        emp.phone || '',
      salary:       emp.salary ?? null,
      hireDate:     ContractsComponent.formatLocalDate(emp.hireDate),
      contractType: emp.contractType,
      departmentId: deptId,
      positionId:   emp.position?.id || '',
      serviceId:    emp.serviceId   || '',
      managerId:    emp.managerId   || '',
    });
  }

  private static formatLocalDate(value: string | Date): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) {
      return typeof value === 'string' ? value : '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onContractTypeChange(): void {
    const ct = this.form.get('contractType')?.value;
    const currentSalary = this.form.get('salary')?.value;
    if (currentSalary) return; // don't overwrite if already set
    const defaults: Record<string, number> = {
      'STAGE': 750, 'ALTERNANCE': 1000, 'CDD': 1300, 'FREELANCE': 2600, 'CDI': 2000
    };
    if (ct && defaults[ct]) this.form.patchValue({ salary: defaults[ct] });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const fv = this.form.getRawValue();
    const payload = {
      firstName:    fv.firstName!,
      lastName:     fv.lastName!,
      email:        fv.email!,
      phone:        fv.phone || '',
      salary:       fv.salary ? Number(fv.salary) : null,
      hireDate:     fv.hireDate!,
      contractType: fv.contractType as ContractType,
      departmentId: fv.departmentId!,
      positionId:   fv.positionId!,
      serviceId:    fv.serviceId  || null,
      managerId:    fv.managerId  || null,
    };

    const editId = this.editingId();
    const request$ = editId
      ? this.employeeService.updateEmployee(editId, payload)
      : this.employeeService.createEmployee(payload);

    request$.subscribe({
      next: () => {
        this.loadData();
        this.loading.set(false);
        this.cancelForm();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? (editId ? 'Erreur lors de la modification' : "Erreur lors de la création de l'employé"));
        this.loading.set(false);
      }
    });
  }
}
