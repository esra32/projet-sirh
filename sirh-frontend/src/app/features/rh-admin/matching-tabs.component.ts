import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { EmployeeMatchingComponent } from './employee-matching.component';
import { ExternalMatchingComponent } from './external-matching.component';

type Tab = 'internal' | 'external';

@Component({
  selector: 'app-matching-tabs',
  standalone: true,
  imports: [CommonModule, EmployeeMatchingComponent, ExternalMatchingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tabs-root">

      <!-- ── Barre de navigation ─────────────────────────────── -->
      <div class="tabs-nav">
        <div class="tabs-nav-inner">

          <div class="tabs-brand">
            <div class="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <span>Talent Matching</span>
          </div>

          <div class="tabs-list">
            <button
              class="tab-item"
              [class.active]="activeTab() === 'internal'"
              (click)="activeTab.set('internal')">
              <span class="tab-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </span>
              <span class="tab-label">Postes Internes</span>
              <span class="tab-chip internal-chip">IA Scoring</span>
            </button>

            <button
              class="tab-item"
              [class.active]="activeTab() === 'external'"
              (click)="activeTab.set('external')">
              <span class="tab-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </span>
              <span class="tab-label">Recrutement Externe</span>
              <span class="tab-chip external-chip">Marche Live</span>
            </button>
          </div>

          <div class="tabs-meta">
            <span class="meta-dot"></span>
            <span>Module RH · Intelligence Marché</span>
          </div>
        </div>
        <div class="tabs-indicator-track">
          <div class="tabs-indicator" [class.right]="activeTab() === 'external'"></div>
        </div>
      </div>

      <!-- ── Contenu ──────────────────────────────────────────── -->
      <div class="tab-content">
        <app-employee-matching *ngIf="activeTab() === 'internal'" />
        <app-external-matching *ngIf="activeTab() === 'external'" />
      </div>

    </div>
  `,
  styles: [`
    :host { display:flex; flex-direction:column; height:100%; }

    .tabs-root { display:flex; flex-direction:column; height:100%; background:#F8FAFF; }

    /* ── Nav bar ─────────────────────────────────────────────── */
    .tabs-nav {
      background: #fff;
      border: 1px solid #EEF1F6;
      border-radius: 18px;
      box-shadow: 0 1px 2px rgba(16,24,40,.04);
      position: relative;
      z-index: 10;
      margin-bottom: 18px;
    }

    .tabs-nav-inner {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 0 28px;
      height: 62px;
    }

    .tabs-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #0F172A;
      font-weight: 800;
      font-size: .95rem;
      letter-spacing: -.01em;
      white-space: nowrap;
      margin-right: 8px;
    }

    .brand-icon {
      width: 34px;
      height: 34px;
      background: linear-gradient(135deg, #6366F1, #38BDF8);
      border-radius: 10px;
      display: grid;
      place-items: center;
      color: #fff;
      box-shadow: 0 6px 14px rgba(99,102,241,.35);
    }

    .tabs-list {
      display: flex;
      gap: 4px;
      flex: 1;
    }

    .tab-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      border: none;
      background: transparent;
      color: #64748B;
      font-size: .88rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 10px;
      transition: all .2s ease;
      white-space: nowrap;
    }

    .tab-item:hover { background: #F1F5F9; color: #334155; }

    .tab-item.active {
      background: #EEF2FF;
      color: #4338CA;
      box-shadow: inset 0 0 0 1px #C7D2FE;
    }

    .tab-icon { display: flex; align-items: center; opacity: .8; }
    .tab-item.active .tab-icon { opacity: 1; }

    .tab-chip {
      font-size: .68rem;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 20px;
      letter-spacing: .02em;
    }

    .internal-chip { background: #EFF6FF; color: #2563EB; }
    .tab-item.active .internal-chip { background: #6366F1; color: #fff; }

    .external-chip { background: #ECFDF5; color: #059669; }
    .tab-item.active .external-chip { background: #10B981; color: #fff; }

    .tabs-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #94A3B8;
      font-size: .75rem;
      margin-left: auto;
      white-space: nowrap;
    }

    .meta-dot {
      width: 6px; height: 6px;
      background: #10B981;
      border-radius: 50%;
      box-shadow: 0 0 0 3px rgba(16,185,129,.25);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 3px rgba(16,185,129,.25); }
      50% { box-shadow: 0 0 0 6px rgba(16,185,129,.1); }
    }

    .tabs-indicator-track {
      height: 3px;
      background: #F1F5F9;
      position: relative;
      border-radius: 0 0 18px 18px;
      overflow: hidden;
    }

    .tabs-indicator {
      position: absolute;
      height: 100%;
      width: 50%;
      left: 0;
      background: linear-gradient(90deg, #6366F1, #8B5CF6);
      border-radius: 999px;
      transition: left .3s cubic-bezier(.4,0,.2,1);
      box-shadow: 0 0 12px rgba(99,102,241,.5);
    }

    .tabs-indicator.right { left: 50%; }

    /* ── Contenu ─────────────────────────────────────────────── */
    .tab-content { flex: 1; overflow-y: auto; }
  `]
})
export class MatchingTabsComponent {
  activeTab = signal<Tab>('internal');
}