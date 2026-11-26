import { CommonModule } from '@angular/common';
import { Component, HostListener, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface CmdAction {
  label: string;
  icon: string;
  path: string;
  roles?: string[];
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="overlay" (click)="close()">
        <div class="palette" (click)="$event.stopPropagation()">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Rechercher une page ou une action... (Esc pour fermer)" 
              [(ngModel)]="query"
              (ngModelChange)="filter()"
              #searchInput
              autofocus
            />
          </div>
          
          <div class="results">
            @for (action of filteredActions(); track action.path) {
              <div class="action-item" (click)="navigate(action.path)">
                <span class="action-icon">{{ action.icon }}</span>
                <span class="action-label">{{ action.label }}</span>
                <span class="shortcut">Enter</span>
              </div>
            } @empty {
              <div class="no-results">Aucun résultat pour "{{ query() }}"</div>
            }
          </div>
          
          <div class="footer">
            <span>↑↓ pour naviguer</span>
            <span>↵ pour valider</span>
            <span>esc pour fermer</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      justify-content: center;
      padding-top: 15vh;
    }
    .palette {
      width: 100%;
      max-width: 600px;
      background: #1E293B;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      animation: zoomIn 0.2s ease-out;
    }
    @keyframes zoomIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .search-box {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .search-icon { font-size: 1.2rem; margin-right: 12px; }
    input {
      background: transparent;
      border: none;
      color: white;
      font-size: 1.1rem;
      flex: 1;
      outline: none;
    }
    .results {
      max-height: 400px;
      overflow-y: auto;
      padding: 8px;
    }
    .action-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
      gap: 12px;
    }
    .action-item:hover {
      background: rgba(56, 189, 248, 0.1);
    }
    .action-icon { font-size: 1.2rem; min-width: 24px; text-align: center; }
    .action-label { flex: 1; color: #E2E8F0; font-weight: 500; }
    .shortcut {
      font-size: 0.7rem;
      color: #64748B;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .no-results { padding: 32px; text-align: center; color: #94A3B8; }
    .footer {
      padding: 12px 20px;
      background: rgba(0, 0, 0, 0.2);
      display: flex;
      gap: 16px;
      font-size: 0.75rem;
      color: #64748B;
    }
  `]
})
export class CommandPaletteComponent {
  private router = inject(Router);
  
  isOpen = signal(false);
  query = signal('');
  
  actions: CmdAction[] = [
    { label: 'Mon Dashboard', icon: '🏠', path: '/employee' },
    { label: 'Mon Profil', icon: '👤', path: '/employee/profil' },
    { label: 'Mes Candidatures', icon: '📄', path: '/employee/candidatures' },
    { label: 'Annuaire Employés', icon: '📇', path: '/employee/annuaire' },
    { label: 'Offres Internes', icon: '💼', path: '/employee/offres' },
    { label: 'Espace Recrutement', icon: '🤝', path: '/rh-admin/recrutement' },
    { label: 'Gestion des Départements', icon: '🏢', path: '/rh-admin/departements' },
    { label: 'Gestion des Utilisateurs', icon: '🔐', path: '/rh-admin/utilisateurs' },
    { label: 'Tableau de bord RH', icon: '📊', path: '/rh-admin' },
  ];

  filteredActions = computed(() => {
    const q = this.query().toLowerCase();
    if (!q) return this.actions;
    return this.actions.filter(a => a.label.toLowerCase().includes(q));
  });

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.isOpen.set(!this.isOpen());
      if (this.isOpen()) this.query.set('');
    }
    if (event.key === 'Escape' && this.isOpen()) {
      this.close();
    }
  }

  close() {
    this.isOpen.set(false);
  }

  navigate(path: string) {
    this.router.navigate([path]);
    this.close();
  }

  filter() {
    // query signal update triggers filteredActions computation
  }
}
