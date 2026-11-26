import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AppNotification, NotificationService } from '../../core/services/notification.service';

export interface NavLink {
  label: string;
  path?: string;
  externalUrl?: string;
  badge?: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside class="sidebar no-print">
        <div class="brand">
          <div class="dot"></div>
          <div>
            <p class="kicker">SIRH</p>
            <p class="title">{{ title }}</p>
          </div>
        </div>
        <nav>
          <ng-container *ngFor="let link of links">
            <a
              *ngIf="link.externalUrl; else internalLink"
              [href]="link.externalUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="nav-link"
            >
              <span>{{ link.label }}</span>
              <small *ngIf="link.badge" class="badge">{{ link.badge }}</small>
            </a>

            <ng-template #internalLink>
              <a
                [routerLink]="link.path"
                routerLinkActive="active"
                class="nav-link"
              >
                <span>{{ link.label }}</span>
                <small *ngIf="link.badge" class="badge">{{ link.badge }}</small>
              </a>
            </ng-template>
          </ng-container>
        </nav>
      </aside>
      <main class="content">
        <header class="topbar no-print">
          <div class="pill">{{ subtitle }}</div>
          <div class="topbar-right">
            <!-- Cloche notifications -->
            <div class="notif-wrapper">
              <button class="notif-btn" (click)="toggleNotif()">
                🔔
                <span class="notif-badge" *ngIf="unreadCount() > 0">{{ unreadCount() }}</span>
              </button>
              <div class="notif-panel" *ngIf="showNotif()">
                <div class="notif-header">
                  <span class="notif-title">Notifications</span>
                  <button class="notif-clear" (click)="markAllRead()" [disabled]="unreadCount() === 0">Tout marquer lu</button>
                </div>
                <div class="notif-tabs">
                  <button class="notif-tab" [class.active]="showAll()" (click)="showAll.set(true)">Historique</button>
                  <button class="notif-tab" [class.active]="!showAll()" (click)="showAll.set(false)">Non lues <span *ngIf="unreadCount() > 0" class="tab-badge">{{ unreadCount() }}</span></button>
                </div>
                <div class="notif-loading" *ngIf="loadingNotifs()">Chargement...</div>
                <div class="notif-list" *ngIf="!loadingNotifs()">
                  <div
                    class="notif-item"
                    *ngFor="let n of filteredNotifications()"
                    [class.unread]="!n.isRead"
                    (click)="markRead(n)"
                  >
                    <span class="notif-icon">{{ notifSvc.iconFor(n.type) }}</span>
                    <div class="notif-body">
                      <div class="notif-text">{{ n.title }}</div>
                      <div class="notif-sub">{{ n.message }}</div>
                      <div class="notif-date">{{ n.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                    </div>
                    <span class="unread-dot" *ngIf="!n.isRead"></span>
                  </div>
                  <div class="notif-empty" *ngIf="filteredNotifications().length === 0">
                    {{ showAll() ? 'Aucune notification' : 'Aucune notification non lue' }}
                  </div>
                </div>
              </div>
            </div>
            <button class="ghost" (click)="logout()">Se deconnecter</button>
          </div>
        </header>
        <section class="viewport">
          <router-outlet></router-outlet>
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      :host { display: block; min-height: 100vh; }

      .layout {
        display: grid;
        grid-template-columns: 260px 1fr;
        min-height: 100vh;
        background: var(--bg);
        color: var(--text);
      }

      /* ── Sidebar ──────────────────────────────────────────── */
      .sidebar {
        background: rgba(255, 255, 255, 0.94);
        border-right: 1px solid var(--border);
        padding: 1.5rem 1.25rem;
        display: flex;
        flex-direction: column;
        backdrop-filter: blur(12px);
        box-shadow: 8px 0 30px rgba(59, 130, 246, 0.08);
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 2rem;
        padding: 0.75rem 0.85rem;
        background: linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.08));
        border-radius: 12px;
        border: 1px solid var(--border);
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        box-shadow: 0 0 0 4px rgba(59,130,246,0.22);
        flex-shrink: 0;
      }

      .kicker {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.65rem;
        color: var(--primary);
        font-weight: 700;
      }

      .title {
        margin: 0;
        font-size: 1.15rem;
        font-weight: 800;
        color: #0F172A;
        letter-spacing: -0.01em;
      }

      nav { display: flex; flex-direction: column; gap: 0.3rem; }

      .nav-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.7rem 0.9rem;
        border-radius: 10px;
        color: #475569;
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        transition: all 0.15s ease;
      }
      .nav-link:hover {
        background: rgba(59,130,246,0.1);
        color: #1E3A8A;
      }
      .nav-link.active {
        background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.12));
        color: #1E3A8A;
        font-weight: 600;
        border: 1px solid rgba(59,130,246,0.3);
      }

      .badge {
        background: linear-gradient(135deg, var(--primary), var(--accent));
        color: white;
        border-radius: 999px;
        padding: 0.1rem 0.55rem;
        font-size: 0.7rem;
        font-weight: 700;
      }

      /* ── Main content ─────────────────────────────────────── */
      .content {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: transparent;
      }

      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.75rem;
        background: rgba(255, 255, 255, 0.92);
        border-bottom: 1px solid var(--border);
        box-shadow: 0 6px 22px rgba(59, 130, 246, 0.08);
        backdrop-filter: blur(10px);
        position: relative;
        z-index: 300;
      }
      .topbar-right { display: flex; align-items: center; gap: 0.75rem; }

      /* Notifications */
      .notif-wrapper { position: relative; }
      .notif-btn { background: transparent; border: 1px solid var(--border); border-radius: 8px; padding: 0.4rem 0.65rem; cursor: pointer; font-size: 1rem; position: relative; transition: all 0.15s; }
      .notif-btn:hover { background: rgba(59,130,246,0.08); border-color: #4DA3FF; }
      .notif-badge { position: absolute; top: -6px; right: -6px; background: #FF6B6B; color: white; font-size: 0.6rem; font-weight: 700; min-width: 16px; height: 16px; border-radius: 999px; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
      .notif-panel { position: absolute; top: calc(100% + 8px); right: 0; width: 320px; background: white; border: 1px solid #E5E7EB; border-radius: 14px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); z-index: 999; overflow: hidden; }
      .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1rem; border-bottom: 1px solid #F1F5F9; }
      .notif-title { font-weight: 700; font-size: 0.9rem; color: #1e293b; }
      .notif-clear { background: none; border: none; cursor: pointer; font-size: 0.75rem; color: #4DA3FF; font-weight: 600; }
      .notif-clear:hover { text-decoration: underline; }
      .notif-clear:disabled { color: #CBD5E1; cursor: default; text-decoration: none; }
      .notif-tabs { display: flex; border-bottom: 1px solid #F1F5F9; }
      .notif-tab { flex: 1; background: none; border: none; padding: 0.5rem; font-size: 0.78rem; cursor: pointer; color: #64748B; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 0.35rem; }
      .notif-tab.active { color: #1D4ED8; border-bottom: 2px solid #1D4ED8; font-weight: 700; }
      .tab-badge { background: #FF6B6B; color: white; border-radius: 999px; padding: 0 5px; font-size: 0.65rem; font-weight: 700; }
      .notif-list { max-height: 340px; overflow-y: auto; }
      .notif-loading { padding: 1.5rem; text-align: center; color: #9CA3AF; font-size: 0.85rem; }
      .notif-empty { padding: 1.5rem; text-align: center; color: #9CA3AF; font-size: 0.85rem; }
      .notif-item { display: flex; gap: 0.75rem; padding: 0.85rem 1rem; border-bottom: 1px solid #F8FAFC; transition: background 0.1s; cursor: pointer; align-items: flex-start; position: relative; }
      .notif-item:hover { background: #F8FAFC; }
      .notif-item.unread { background: rgba(77,163,255,0.05); }
      .notif-item.unread:hover { background: rgba(77,163,255,0.1); }
      .notif-icon { width: 34px; height: 34px; border-radius: 8px; background: rgba(77,163,255,0.12); display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
      .notif-body { flex: 1; min-width: 0; }
      .notif-text { font-size: 0.82rem; color: #1e293b; font-weight: 500; line-height: 1.3; }
      .notif-sub  { font-size: 0.72rem; color: #64748B; margin-top: 0.15rem; line-height: 1.4; white-space: normal; }
      .notif-date { font-size: 0.68rem; color: #CBD5E1; margin-top: 0.2rem; }
      .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #4DA3FF; flex-shrink: 0; margin-top: 4px; }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 0.9rem;
        border-radius: 999px;
        background: rgba(59,130,246,0.12);
        color: #1D4ED8;
        font-weight: 700;
        font-size: 0.85rem;
        border: 1px solid rgba(59,130,246,0.3);
      }

      .ghost {
        background: transparent;
        color: #475569;
        border: 1px solid var(--border);
        padding: 0.45rem 0.9rem;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 500;
        transition: all 0.15s ease;
      }
      .ghost:hover {
        background: var(--red-soft, rgba(255,107,107,0.1));
        color: #FF6B6B;
        border-color: rgba(255,107,107,0.3);
      }

      .viewport { padding: 1.5rem 1.75rem; }

      @media (max-width: 960px) {
        .layout { grid-template-columns: 1fr; }
        .sidebar { display: none; }
      }
    `,
  ],
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  @Input() title = 'Espace';
  @Input() subtitle = 'Plateforme RH';
  @Input() links: NavLink[] = [];

  showNotif     = signal(false);
  showAll       = signal(true);
  loadingNotifs = signal(false);
  notifications = signal<AppNotification[]>([]);
  unreadCount   = signal(0);

  notifSvc = inject(NotificationService);
  private router = inject(Router);
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.refreshUnreadCount();
    // Rafraîchir le badge toutes les 30 secondes
    this.pollInterval = setInterval(() => this.refreshUnreadCount(), 30000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  filteredNotifications(): AppNotification[] {
    const all = this.notifications();
    return this.showAll() ? all : all.filter(n => !n.isRead);
  }

  refreshUnreadCount(): void {
    this.notifSvc.getUnreadCount().subscribe({
      next: res => this.unreadCount.set(res.count),
      error: () => {}
    });
  }

  loadNotifications(): void {
    this.loadingNotifs.set(true);
    this.notifSvc.getMyNotifications().subscribe({
      next: notifs => {
        this.notifications.set(notifs);
        this.unreadCount.set(notifs.filter(n => !n.isRead).length);
        this.loadingNotifs.set(false);
      },
      error: () => { this.loadingNotifs.set(false); }
    });
  }

  toggleNotif(): void {
    this.showNotif.update(v => !v);
    if (this.showNotif()) {
      this.loadNotifications();
    }
  }

  markRead(n: AppNotification): void {
    // Navigate to the relevant page
    this.showNotif.set(false);
    this.navigateFromNotif(n);
    // Mark as read if needed
    if (n.isRead) return;
    this.notifSvc.markRead(n.id).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(item => item.id === n.id ? { ...item, isRead: true } : item)
        );
        this.unreadCount.update(c => Math.max(0, c - 1));
      },
      error: () => {}
    });
  }

  navigateFromNotif(n: AppNotification): void {
    let meta: Record<string, string> = {};
    try { if (n.metadata) meta = JSON.parse(n.metadata); } catch {}

    switch (n.type) {
      case 'APPLICATION_RECEIVED':
      case 'APPLICATION_ACCEPTED':
      case 'APPLICATION_REJECTED':
        this.router.navigate(['/employee/candidatures']); break;
      case 'INTERVIEW_SCHEDULED':
        this.router.navigate(['/employee/entretiens']); break;
      case 'NEW_APPLICATION':
      case 'EMAIL_SENT_CONFIRMATION':
        this.router.navigate(['/rh-admin/recrutement']); break;
      case 'OFFER_PENDING_VALIDATION':
        this.router.navigate(['/rh-admin/recrutement']); break;
      case 'CANDIDATE_ACCEPTED_IN_DEPT':
      case 'INTERVIEW_IN_DEPT':
        this.router.navigate(['/manager/candidatures']); break;
      case 'OFFER_VALIDATED':
      case 'OFFER_REFUSED':
        this.router.navigate(['/manager/postes']); break;
      case 'MOBILITY_REQUEST_SUBMITTED':
        this.router.navigate(['/manager/mobilite']); break;
      case 'MOBILITY_MANAGER_VALIDATED':
        this.router.navigate(['/rh-admin/mobilite']); break;
      case 'MOBILITY_APPROVED':
      case 'MOBILITY_REJECTED':
        this.router.navigate(['/employee/mobilite']); break;
      default: break;
    }
  }

  markAllRead(): void {
    this.notifSvc.markAllRead().subscribe({
      next: () => {
        this.notifications.update(list => list.map(n => ({ ...n, isRead: true })));
        this.unreadCount.set(0);
      },
      error: () => {}
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
