import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmployeeService } from '../../core/services/employee.service';
import { Employee, Department } from '../../core/services/employee.models';
import { isActiveEmployee } from '../../core/services/employee-activity';

@Component({
  selector: 'app-talent-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2>Talents et mobilité</h2>
          <p class="muted">Identifiez les talents clés et suivez les parcours de mobilité interne.</p>
        </div>
        <span class="count-badge">{{ filtered().length }} / {{ employees().length }} employés</span>
      </div>

      <div class="filter-bar" *ngIf="!loading()">
        <input class="search-input" type="text" placeholder="🔍  Nom, email, poste..." [(ngModel)]="query" (ngModelChange)="runFilter()" />
        <select class="dept-select" [(ngModel)]="selectedDept" (ngModelChange)="runFilter()">
          <option value="">Tous les départements</option>
          <option *ngFor="let d of departments()" [value]="d.name">{{ d.name }}</option>
        </select>
        <select class="dept-select" [(ngModel)]="selectedContract" (ngModelChange)="runFilter()">
          <option value="">Tous les contrats</option>
          <option value="CDI">CDI</option>
          <option value="CDD">CDD</option>
          <option value="STAGE">Stage</option>
          <option value="FREELANCE">Freelance</option>
          <option value="ALTERNANCE">Alternance</option>
        </select>
      </div>

      <div *ngIf="loading()" class="loader">Chargement des talents...</div>

      <div class="talent-grid" *ngIf="!loading()">
        <div class="talent-card" *ngFor="let emp of paged()">
          <div class="card-top">
            <div class="avatar">{{ emp.firstName[0] }}{{ emp.lastName[0] }}</div>
            <div class="card-meta">
              <strong>{{ emp.firstName }} {{ emp.lastName }}</strong>
              <span class="muted">{{ emp.email }}</span>
            </div>
            <span class="contract-badge badge-{{ emp.contractType.toLowerCase() }}">{{ emp.contractType }}</span>
          </div>
          <div class="card-info">
            <div class="info-row">
              <span class="info-label">Poste</span>
              <span>{{ emp.position?.title || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Département</span>
              <span>{{ emp.department?.name || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Date d'embauche</span>
              <span>{{ emp.hireDate | date:'dd/MM/yyyy' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Ancienneté</span>
              <span>{{ seniority(emp.hireDate) }}</span>
            </div>
          </div>
        </div>

        <div class="empty" *ngIf="filtered().length === 0">
          <p class="muted">Aucun talent trouvé avec ces critères.</p>
        </div>
      </div>

      <!-- Pagination -->
      <div class="pagination" *ngIf="!loading() && totalPages() > 1">
        <button class="page-btn nav" [disabled]="currentPage() === 1" (click)="goTo(1)" title="Première page">«</button>
        <button class="page-btn nav" [disabled]="currentPage() === 1" (click)="goTo(currentPage() - 1)" title="Précédent">‹</button>
        <button class="page-btn" *ngFor="let p of pageWindow()" [class.active]="p === currentPage()" (click)="goTo(p)">{{ p }}</button>
        <button class="page-btn nav" [disabled]="currentPage() === totalPages()" (click)="goTo(currentPage() + 1)" title="Suivant">›</button>
        <button class="page-btn nav" [disabled]="currentPage() === totalPages()" (click)="goTo(totalPages())" title="Dernière page">»</button>
        <span class="page-info">Page {{ currentPage() }} / {{ totalPages() }}</span>
      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 1.25rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .page-header h2 { margin: 0 0 0.25rem; color: #1e293b; font-weight: 800; }
    .muted { color: #9CA3AF; margin: 0; }
    .count-badge { background: rgba(77,163,255,0.12); color: #2E86FF; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; white-space: nowrap; border: 1px solid rgba(77,163,255,0.2); }
    .loader { color: #9CA3AF; font-style: italic; }
    .filter-bar { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .search-input { flex: 1; min-width: 180px; padding: 0.65rem 1rem; border-radius: 8px; border: 1.5px solid #E5E7EB; background: #FFFFFF; color: #1e293b; font-size: 0.9rem; outline: none; }
    .search-input:focus { border-color: #4DA3FF; box-shadow: 0 0 0 3px rgba(77,163,255,0.12); }
    .dept-select { padding: 0.65rem 1rem; border-radius: 8px; border: 1.5px solid #E5E7EB; background: #FFFFFF; color: #1e293b; font-size: 0.9rem; cursor: pointer; min-width: 180px; outline: none; }
    .talent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .talent-card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1.25rem; transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
    .talent-card:hover { border-color: rgba(77,163,255,0.35); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(77,163,255,0.1); }
    .card-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
    .avatar { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg,#4DA3FF,#6EE7B7); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; color: white; }
    .card-meta { flex: 1; display: flex; flex-direction: column; }
    .card-meta strong { font-size: 0.95rem; color: #1e293b; }
    .card-meta span { font-size: 0.78rem; color: #9CA3AF; }
    .contract-badge { padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
    .badge-cdi       { background: rgba(34,197,94,0.12);   color: #166534; }
    .badge-cdd       { background: rgba(255,209,102,0.15); color: #B45309; }
    .badge-stage     { background: rgba(167,139,250,0.12); color: #7C3AED; }
    .badge-freelance { background: rgba(251,146,60,0.12);  color: #C2410C; }
    .badge-alternance{ background: rgba(236,72,153,0.12);  color: #9D174D; }
    .card-info { display: grid; gap: 0.4rem; }
    .info-row { display: flex; justify-content: space-between; font-size: 0.85rem; }
    .info-label { color: #9CA3AF; font-weight: 500; }
    .empty { grid-column: 1 / -1; text-align: center; padding: 3rem; color: #9CA3AF; }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 0.4rem; margin-top: 0.5rem; flex-wrap: wrap; }
    .page-btn { min-width: 38px; height: 38px; padding: 0 0.6rem; border-radius: 8px; border: 1.5px solid #E5E7EB; background: #FFFFFF; color: #475569; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
    .page-btn:hover:not(:disabled):not(.active) { border-color: #4DA3FF; color: #2E86FF; }
    .page-btn.active { background: #2E86FF; border-color: #2E86FF; color: #FFFFFF; }
    .page-btn.nav { color: #2E86FF; font-weight: 700; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-info { margin-left: 0.75rem; color: #9CA3AF; font-size: 0.82rem; }
  `]
})
export class TalentTrackingComponent implements OnInit {
  private employeeService = inject(EmployeeService);

  loading = signal(true);
  employees = signal<Employee[]>([]);
  filtered = signal<Employee[]>([]);
  departments = signal<Department[]>([]);

  query = '';
  selectedDept = '';
  selectedContract = '';

  // Pagination
  pageSize = 12;
  currentPage = signal(1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  paged = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });
  // Fenêtre de pages affichées (max 5 boutons : « 1 2 3 4 5 »)
  pageWindow = computed(() => {
    const total = this.totalPages();
    const cur = this.currentPage();
    const maxBtns = 5;
    let start = Math.max(1, cur - 2);
    const end = Math.min(total, start + maxBtns - 1);
    start = Math.max(1, end - maxBtns + 1);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  ngOnInit(): void {
    this.employeeService.getEmployees().subscribe({
      next: emps => {
        // Page Talents = employés ACTIFS uniquement (centralized isActiveEmployee filter)
        const actifs = emps.filter(isActiveEmployee);
        this.employees.set(actifs);
        this.filtered.set(actifs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
    this.employeeService.getDepartments().subscribe({
      next: d => this.departments.set(d),
      error: () => {}
    });
  }

  runFilter(): void {
    const q = this.query.toLowerCase().trim();
    const dept = this.selectedDept;
    const contract = this.selectedContract;
    this.filtered.set(
      this.employees().filter(e => {
        const matchQ = !q ||
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          (e.position?.title ?? '').toLowerCase().includes(q);
        const matchDept = !dept || e.department?.name === dept;
        const matchContract = !contract || e.contractType === contract;
        return matchQ && matchDept && matchContract;
      })
    );
    this.currentPage.set(1); // retour à la 1ère page après un filtre
  }

  goTo(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.currentPage.set(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  seniority(hireDate: string): string {
    const hire = new Date(hireDate);
    const now = new Date();
    const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth());
    if (months < 12) return `${months} mois`;
    const years = Math.floor(months / 12);
    return `${years} an${years > 1 ? 's' : ''}`;
  }
}
