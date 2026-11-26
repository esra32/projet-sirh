import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Department, Employee } from '../../core/services/employee.models';
import { EmployeeService } from '../../core/services/employee.service';
import { filterActiveEmployees } from '../../core/services/employee-activity';

@Component({
  selector: 'app-directory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="directory-page">
      <div class="page-head">
        <div>
          <h2>Annuaire des employés</h2>
          <p class="muted">Contacts professionnels internes · {{ filteredEmployees().length }} résultat(s)</p>
        </div>
        <span class="count-pill">{{ allEmployees().length }} contacts</span>
      </div>

      <div class="directory-panel">
        <div class="toolbar">
          <div class="search-wrap">
            <span class="search-icon">⌕</span>
            <input
              type="text"
              class="search-input"
              placeholder="Rechercher par nom, email, poste ou service"
              [(ngModel)]="searchQuery"
              (ngModelChange)="applyFilter()"
            />
          </div>
          <select class="dept-select" [(ngModel)]="selectedDept" (ngModelChange)="applyFilter()">
            <option value="">Tous les départements</option>
            <option *ngFor="let d of departments()" [value]="d.id">{{ d.name }}</option>
          </select>
        </div>

        <div *ngIf="loading()" class="directory-list">
          <div class="employee-row skeleton-row" *ngFor="let i of [1,2,3,4,5,6,7,8]">
            <div class="person-cell">
              <div class="emp-avatar skeleton"></div>
              <div class="row-main">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
              </div>
            </div>
            <div class="skeleton skeleton-line"></div>
            <div class="skeleton skeleton-chip"></div>
            <div class="skeleton skeleton-contact"></div>
          </div>
        </div>

        <div *ngIf="error()" class="error-alert">{{ error() }}</div>

        <div class="list-head" *ngIf="!loading() && filteredEmployees().length > 0">
          <span>Collaborateur</span>
          <span>Poste</span>
          <span>Département</span>
          <span>Contact</span>
        </div>

        <div class="directory-list" *ngIf="!loading()">
          <article class="employee-row" *ngFor="let emp of paginatedEmployees(); trackBy: trackByEmployee">
            <div class="person-cell">
              <div class="emp-avatar">{{ initials(emp) }}</div>
              <div class="person-copy">
                <h3 [title]="fullName(emp)">{{ fullName(emp) }}</h3>
                <a class="email-mobile" [href]="'mailto:' + emp.email">{{ emp.email }}</a>
              </div>
            </div>

            <div class="job-cell">
              <strong [title]="positionTitle(emp)">{{ positionTitle(emp) }}</strong>
              <span *ngIf="emp.serviceName">{{ emp.serviceName }}</span>
            </div>

            <div class="dept-cell">
              <span class="dept-chip" [title]="departmentName(emp)">{{ departmentName(emp) }}</span>
            </div>

            <div class="contact-cell">
              <a [href]="'mailto:' + emp.email" [title]="emp.email">{{ emp.email }}</a>
              <span *ngIf="emp.phone">{{ emp.phone }}</span>
            </div>
          </article>

          <div class="empty-state" *ngIf="filteredEmployees().length === 0">
            <strong>Aucun résultat</strong>
            <p class="muted">Essayez un autre nom, poste ou département.</p>
          </div>
        </div>

        <div class="pager" *ngIf="!loading() && filteredEmployees().length > 0">
          <span>Page {{ page() }} sur {{ totalPages() }}</span>
          <div>
            <button type="button" (click)="firstPage()" [disabled]="page() === 1" aria-label="Première page">&laquo;</button>
            <button type="button" (click)="previousPage()" [disabled]="page() === 1" aria-label="Page précédente">&lsaquo;</button>
            <b>{{ pageStart() }}-{{ pageEnd() }} / {{ filteredEmployees().length }}</b>
            <button type="button" (click)="nextPage()" [disabled]="page() === totalPages()" aria-label="Page suivante">&rsaquo;</button>
            <button type="button" (click)="lastPage()" [disabled]="page() === totalPages()" aria-label="Dernière page">&raquo;</button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .directory-page { display: flex; flex-direction: column; gap: 1rem; }
    .page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
    h2 { margin: 0 0 0.25rem; color: #0F172A; font-size: 1.45rem; font-weight: 800; }
    .muted { color: #8A94A6; margin: 0; font-size: 0.88rem; }
    .count-pill { background: #EEF6FF; border: 1px solid #CFE5FF; color: #1D4ED8; padding: 0.35rem 0.75rem; border-radius: 999px; font-size: 0.78rem; font-weight: 800; white-space: nowrap; }

    .directory-panel { background: #FFFFFF; border: 1px solid #E5EAF2; border-radius: 14px; box-shadow: 0 6px 24px rgba(15,23,42,0.05); overflow: hidden; }
    .toolbar { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(220px, 260px); gap: 0.75rem; padding: 1rem; border-bottom: 1px solid #EEF2F7; background: #FAFBFD; }
    .search-wrap { position: relative; }
    .search-icon { position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: #64748B; font-size: 1rem; pointer-events: none; }
    .search-input { width: 100%; padding: 0.7rem 0.9rem 0.7rem 2.35rem; border-radius: 8px; border: 1px solid #DDE5EF; background: #FFFFFF; color: #172033; font-size: 0.9rem; outline: none; box-sizing: border-box; }
    .search-input:focus { border-color: #4DA3FF; box-shadow: 0 0 0 3px rgba(77,163,255,0.12); }
    .dept-select { width: 100%; padding: 0.7rem 0.9rem; border-radius: 8px; border: 1px solid #DDE5EF; background: #FFFFFF; color: #172033; font-size: 0.9rem; cursor: pointer; outline: none; }
    .dept-select:focus { border-color: #4DA3FF; box-shadow: 0 0 0 3px rgba(77,163,255,0.12); }

    .error-alert { margin: 1rem; background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C; border-radius: 8px; padding: 0.8rem 1rem; font-weight: 700; }
    .list-head { display: grid; grid-template-columns: minmax(240px, 1.2fr) minmax(190px, 1fr) minmax(160px, 0.8fr) minmax(230px, 1fr); gap: 1rem; padding: 0.8rem 1.15rem; background: #F8FAFC; color: #64748B; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #E8EEF6; }
    .directory-list { display: flex; flex-direction: column; }
    .employee-row { display: grid; grid-template-columns: minmax(240px, 1.2fr) minmax(190px, 1fr) minmax(160px, 0.8fr) minmax(230px, 1fr); gap: 1rem; align-items: center; padding: 0.9rem 1.15rem; border-bottom: 1px solid #EEF2F7; min-height: 74px; box-sizing: border-box; }
    .employee-row:hover { background: #F9FCFF; }
    .employee-row:last-child { border-bottom: 0; }
    .person-cell { display: flex; align-items: center; gap: 0.85rem; min-width: 0; }
    .emp-avatar { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #3B82F6, #14B8A6); display: flex; align-items: center; justify-content: center; font-weight: 800; color: white; font-size: 0.88rem; flex-shrink: 0; }
    .person-copy, .job-cell, .dept-cell, .contact-cell { min-width: 0; }
    .person-copy h3 { margin: 0 0 0.18rem; font-size: 0.96rem; color: #0F172A; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .email-mobile { display: none; color: #64748B; text-decoration: none; font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .job-cell { display: flex; flex-direction: column; gap: 0.15rem; }
    .job-cell strong { color: #1D4ED8; font-size: 0.9rem; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .job-cell span { color: #8A94A6; font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dept-chip { display: inline-block; max-width: 100%; background: #F1F5F9; color: #334155; border: 1px solid #E2E8F0; padding: 0.28rem 0.55rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-sizing: border-box; }
    .contact-cell { display: flex; flex-direction: column; gap: 0.18rem; align-items: flex-start; }
    .contact-cell a { max-width: 100%; color: #475569; text-decoration: none; font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .contact-cell a:hover, .email-mobile:hover { color: #1D4ED8; }
    .contact-cell span { color: #8A94A6; font-size: 0.78rem; }

    .pager { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.9rem 1rem; border-top: 1px solid #EEF2F7; background: #FAFBFD; color: #64748B; font-size: 0.84rem; font-weight: 700; }
    .pager div { display: flex; align-items: center; gap: 0.45rem; }
    .pager button { width: 34px; height: 32px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; color: #0F172A; cursor: pointer; font-weight: 800; }
    .pager button:hover:not(:disabled) { border-color: #4DA3FF; color: #1D4ED8; }
    .pager button:disabled { opacity: 0.45; cursor: not-allowed; }
    .pager b { min-width: 112px; text-align: center; color: #0F172A; }

    .empty-state { text-align: center; padding: 3rem 1rem; background: #FFFFFF; }
    .empty-state strong { display: block; color: #0F172A; margin-bottom: 0.35rem; }
    .skeleton { background: linear-gradient(90deg, #EEF2F7 25%, #E2E8F0 50%, #EEF2F7 75%); background-size: 200% 100%; animation: shimmer 1.35s infinite; color: transparent; }
    .skeleton-row:hover { background: #FFFFFF; }
    .skeleton-title { width: 62%; height: 14px; border-radius: 6px; margin-bottom: 0.45rem; }
    .skeleton-text { width: 42%; height: 12px; border-radius: 6px; }
    .skeleton-line { width: 72%; height: 14px; border-radius: 6px; }
    .skeleton-chip { width: 110px; height: 26px; border-radius: 999px; }
    .skeleton-contact { width: 170px; height: 14px; border-radius: 6px; }
    .row-main { min-width: 0; flex: 1; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    @media (max-width: 920px) {
      .toolbar { grid-template-columns: 1fr; }
      .list-head { display: none; }
      .employee-row { grid-template-columns: 1fr; gap: 0.65rem; align-items: start; }
      .email-mobile { display: block; }
      .contact-cell a { display: none; }
      .dept-chip { border-radius: 8px; }
      .pager { flex-direction: column; align-items: stretch; }
      .pager div { justify-content: space-between; }
      .pager b { min-width: 0; }
    }

    @media (max-width: 560px) {
      .page-head { align-items: flex-start; flex-direction: column; }
      .toolbar { padding: 0.85rem; }
      .employee-row { padding: 0.9rem; }
      .pager button { width: 32px; }
    }
  `]
})
export class DirectoryComponent implements OnInit {
  private employeeService = inject(EmployeeService);

  allEmployees      = signal<Employee[]>([]);
  filteredEmployees = signal<Employee[]>([]);
  departments       = signal<Department[]>([]);
  loading           = signal(true);
  error             = signal('');
  page              = signal(1);
  readonly pageSize = 12;
  searchQuery       = '';
  selectedDept      = '';

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredEmployees().length / this.pageSize)));
  pageStart = computed(() => this.filteredEmployees().length === 0 ? 0 : ((this.page() - 1) * this.pageSize) + 1);
  pageEnd = computed(() => Math.min(this.page() * this.pageSize, this.filteredEmployees().length));
  paginatedEmployees = computed(() => {
    const current = Math.min(this.page(), this.totalPages());
    const start = (current - 1) * this.pageSize;
    return this.filteredEmployees().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.employeeService.getDepartments().subscribe({
      next: depts => this.departments.set(depts),
      error: () => {}
    });

    this.employeeService.getEmployees().subscribe({
      next: (list) => {
        const active = filterActiveEmployees(list);
        this.allEmployees.set(active);
        this.filteredEmployees.set(active);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? "Impossible de charger l'annuaire.");
        this.loading.set(false);
      }
    });
  }

  applyFilter(): void {
    const q = this.searchQuery.toLowerCase().trim();
    const deptId = this.selectedDept || null;

    this.page.set(1);
    this.filteredEmployees.set(
      this.allEmployees().filter(emp => {
        const haystack = [
          this.fullName(emp),
          emp.email,
          this.positionTitle(emp),
          this.departmentName(emp),
          emp.serviceName ?? '',
        ].join(' ').toLowerCase();

        const matchQuery = !q || haystack.includes(q);
        const matchDept = !deptId || emp.department?.id === deptId;
        return matchQuery && matchDept;
      })
    );
  }

  initials(emp: Employee): string {
    return `${emp.firstName?.charAt(0) ?? ''}${emp.lastName?.charAt(0) ?? ''}`.toUpperCase() || '??';
  }

  fullName(emp: Employee): string {
    return `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || 'Collaborateur';
  }

  positionTitle(emp: Employee): string {
    return emp.position?.title || 'Poste non renseigné';
  }

  departmentName(emp: Employee): string {
    return emp.department?.name || 'Département non renseigné';
  }

  firstPage(): void { this.page.set(1); }
  previousPage(): void { this.page.set(Math.max(1, this.page() - 1)); }
  nextPage(): void { this.page.set(Math.min(this.totalPages(), this.page() + 1)); }
  lastPage(): void { this.page.set(this.totalPages()); }
  trackByEmployee(_: number, emp: Employee): string { return emp.id; }
}
