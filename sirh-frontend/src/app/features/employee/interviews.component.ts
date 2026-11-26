import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AppNotification, NotificationService } from '../../core/services/notification.service';

interface InterviewEntry {
  notifId: string;
  poste: string;
  interviewDate: string | null;
  interviewLocation: string | null;
  interviewerName: string | null;
  interviewInstructions: string | null;
  emailContent: string;
  createdAt: string;
  isRead: boolean;
}

interface RhMessage {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

@Component({
  selector: 'app-interviews',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">

      <!-- ══ Section Entretiens ══ -->
      <section class="section">
        <div class="section-header">
          <h2>📅 Mes entretiens</h2>
          <p class="muted">Vos convocations d'entretiens reçues de la RH.</p>
          <button class="btn-refresh" (click)="loadData()" [disabled]="loading()">🔄 Rafraîchir</button>
        </div>

        <div *ngIf="loading()" class="loader">Chargement...</div>

        <div *ngIf="!loading() && interviews().length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>Aucun entretien planifié pour le moment.</p>
        </div>

        <div class="interview-grid" *ngIf="!loading() && interviews().length > 0">
          <div class="interview-card" *ngFor="let iv of interviews()" [class.past]="isPast(iv.interviewDate)">

            <div class="iv-header">
              <span class="status-badge" [class]="isPast(iv.interviewDate) ? 'badge-past' : 'badge-upcoming'">
                {{ isPast(iv.interviewDate) ? '✔ Passé' : '⏳ À venir' }}
              </span>
              <span class="iv-date-small">Convocation le {{ iv.createdAt | date:'dd/MM/yyyy' }}</span>
            </div>

            <h3 class="poste-title">{{ iv.poste }}</h3>

            <div class="iv-details">
              <div class="detail-row" *ngIf="iv.interviewDate">
                <span class="detail-icon">🗓️</span>
                <div>
                  <div class="detail-label">Date et heure</div>
                  <div class="detail-value">{{ iv.interviewDate }}</div>
                </div>
              </div>
              <div class="detail-row" *ngIf="iv.interviewLocation">
                <span class="detail-icon">📍</span>
                <div>
                  <div class="detail-label">Lieu / Lien visio</div>
                  <div class="detail-value link-like">{{ iv.interviewLocation }}</div>
                </div>
              </div>
              <div class="detail-row" *ngIf="iv.interviewerName">
                <span class="detail-icon">👤</span>
                <div>
                  <div class="detail-label">Intervieweur</div>
                  <div class="detail-value">{{ iv.interviewerName }}</div>
                </div>
              </div>
              <div class="detail-row" *ngIf="iv.interviewInstructions">
                <span class="detail-icon">📝</span>
                <div>
                  <div class="detail-label">Instructions</div>
                  <div class="detail-value">{{ iv.interviewInstructions }}</div>
                </div>
              </div>
              <div class="no-detail" *ngIf="!iv.interviewDate && !iv.interviewLocation">
                Les détails seront précisés par la RH.
              </div>
            </div>

            <button class="btn-see-mail" (click)="openMail(iv)">
              📧 Voir le mail reçu
            </button>
          </div>
        </div>
      </section>

      <!-- ══ Section Messages RH ══ -->
      <section class="section">
        <div class="section-header">
          <h2>📬 Mes messages RH</h2>
          <p class="muted">Historique de tous les emails reçus de l'équipe RH.</p>
        </div>

        <div *ngIf="loading()" class="loader">Chargement des messages...</div>

        <div *ngIf="!loading() && rhMessages().length === 0" class="empty-state">
          <div class="empty-icon">📭</div>
          <p>Aucun message RH pour le moment.</p>
        </div>

        <div class="messages-list" *ngIf="!loading() && rhMessages().length > 0">
          <div
            class="message-item"
            *ngFor="let msg of rhMessages()"
            [class.unread]="!msg.isRead"
            (click)="openMessage(msg)"
          >
            <div class="msg-icon-wrap">
              <span>{{ iconFor(msg.type) }}</span>
            </div>
            <div class="msg-body">
              <div class="msg-title">{{ msg.title }}</div>
              <div class="msg-preview">{{ msg.message }}</div>
              <div class="msg-date">{{ msg.createdAt | date:'dd/MM/yyyy à HH:mm' }}</div>
            </div>
            <div class="msg-right">
              <span class="unread-dot" *ngIf="!msg.isRead"></span>
              <span class="msg-type-badge" [class]="typeClass(msg.type)">{{ typeLabel(msg.type) }}</span>
            </div>
          </div>
        </div>
      </section>

    </div>

    <!-- ══ Modal : Mail reçu ══ -->
    <div class="modal-overlay" *ngIf="modalContent()" (click)="closeModal()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ modalTitle() }}</h3>
          <button class="modal-close" (click)="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div class="email-card">
            <div class="email-meta">
              <span class="email-from">De : <strong>RH SIRH</strong></span>
              <span class="email-date">{{ modalDate() | date:'dd/MM/yyyy à HH:mm' }}</span>
            </div>
            <div class="email-divider"></div>
            <p class="email-content">{{ modalContent() }}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-close-modal" (click)="closeModal()">Fermer</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 2rem; }

    .section { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 1.5rem; }
    .section-header { margin-bottom: 1.25rem; display: flex; flex-wrap: wrap; align-items: baseline; gap: .5rem; }
    .section-header h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #0F172A; flex: none; }
    .muted { color: #9CA3AF; font-size: .875rem; margin: 0; flex: 1; }
    .btn-refresh { background: transparent; border: 1px solid #E5E7EB; border-radius: 8px; padding: .3rem .7rem; cursor: pointer; font-size: .78rem; color: #64748B; }
    .btn-refresh:hover:not(:disabled) { border-color: #4DA3FF; color: #4DA3FF; }
    .btn-refresh:disabled { opacity: .5; cursor: not-allowed; }

    .loader { text-align: center; padding: 2rem; color: #9CA3AF; font-style: italic; }
    .empty-state { text-align: center; padding: 3rem 1rem; background: #F8FAFC; border-radius: 12px; border: 2px dashed #E5E7EB; color: #9CA3AF; }
    .empty-icon { font-size: 2.5rem; margin-bottom: .75rem; }

    /* Interview cards */
    .interview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .interview-card { border: 1.5px solid #BAE6FD; border-left: 4px solid #38BDF8; border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: .75rem; background: linear-gradient(135deg, rgba(56,189,248,.04), #fff); box-shadow: 0 2px 8px rgba(56,189,248,.08); }
    .interview-card.past { border-color: #D1D5DB; border-left-color: #9CA3AF; background: #FAFAFA; box-shadow: none; opacity: .85; }

    .iv-header { display: flex; justify-content: space-between; align-items: center; }
    .status-badge { border-radius: 999px; font-size: .65rem; font-weight: 700; padding: .2rem .7rem; text-transform: uppercase; border: 1px solid transparent; }
    .badge-upcoming { background: rgba(56,189,248,.15); color: #0E7490; border-color: rgba(56,189,248,.3); }
    .badge-past     { background: rgba(100,116,139,.1); color: #475569; border-color: rgba(100,116,139,.2); }
    .iv-date-small  { font-size: .7rem; color: #CBD5E1; }
    .poste-title    { margin: 0; font-size: 1rem; font-weight: 800; color: #0F172A; }

    .iv-details { display: flex; flex-direction: column; gap: .55rem; }
    .detail-row { display: flex; gap: .6rem; align-items: flex-start; }
    .detail-icon { width: 28px; height: 28px; border-radius: 7px; background: rgba(56,189,248,.1); display: flex; align-items: center; justify-content: center; font-size: .9rem; flex-shrink: 0; }
    .detail-label { font-size: .65rem; color: #9CA3AF; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    .detail-value { font-size: .85rem; color: #1e293b; font-weight: 500; margin-top: .1rem; }
    .link-like { color: #2563EB; word-break: break-all; }
    .no-detail { font-size: .78rem; color: #9CA3AF; font-style: italic; text-align: center; }

    .btn-see-mail { background: #F8FAFC; border: 1.5px solid #E5E7EB; border-radius: 8px; padding: .45rem .85rem; cursor: pointer; font-size: .8rem; font-weight: 600; color: #4DA3FF; transition: all .15s; margin-top: .25rem; align-self: flex-start; }
    .btn-see-mail:hover { background: rgba(77,163,255,.08); border-color: #4DA3FF; }

    /* Messages list */
    .messages-list { display: flex; flex-direction: column; gap: .5rem; }
    .message-item { display: flex; gap: .85rem; align-items: flex-start; padding: .9rem 1rem; border-radius: 10px; border: 1px solid #F1F5F9; background: #FAFAFA; cursor: pointer; transition: background .1s; position: relative; }
    .message-item:hover { background: #F1F5F9; }
    .message-item.unread { background: rgba(77,163,255,.05); border-color: rgba(77,163,255,.2); }
    .msg-icon-wrap { width: 36px; height: 36px; border-radius: 9px; background: rgba(77,163,255,.1); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
    .msg-body { flex: 1; min-width: 0; }
    .msg-title { font-size: .88rem; font-weight: 700; color: #1e293b; }
    .msg-preview { font-size: .78rem; color: #64748B; margin-top: .15rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .msg-date { font-size: .68rem; color: #CBD5E1; margin-top: .25rem; }
    .msg-right { display: flex; flex-direction: column; align-items: flex-end; gap: .4rem; flex-shrink: 0; }
    .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #4DA3FF; }
    .msg-type-badge { font-size: .6rem; font-weight: 700; padding: .15rem .5rem; border-radius: 999px; white-space: nowrap; }
    .type-interview  { background: rgba(56,189,248,.12);  color: #0E7490; }
    .type-accepted   { background: rgba(34,197,94,.12);   color: #166534; }
    .type-rejected   { background: rgba(255,107,107,.1);  color: #B91C1C; }
    .type-received   { background: rgba(99,102,241,.1);   color: #4338CA; }
    .type-default    { background: #F1F5F9; color: #64748B; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.45); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
    .modal { background: #fff; border-radius: 18px; width: 100%; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,.18); overflow: hidden; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.1rem 1.5rem; border-bottom: 1px solid #F1F5F9; }
    .modal-header h3 { margin: 0; font-size: 1rem; font-weight: 800; color: #0F172A; }
    .modal-close { background: transparent; border: none; font-size: 1.1rem; cursor: pointer; color: #94A3B8; }
    .modal-close:hover { color: #475569; }
    .modal-body { padding: 1.25rem 1.5rem; }
    .email-card { background: #F8FAFC; border-radius: 12px; border: 1px solid #E5E7EB; padding: 1rem; }
    .email-meta { display: flex; justify-content: space-between; align-items: center; font-size: .8rem; color: #64748B; }
    .email-from strong { color: #1e293b; }
    .email-date { font-size: .72rem; color: #9CA3AF; }
    .email-divider { height: 1px; background: #E5E7EB; margin: .75rem 0; }
    .email-content { font-size: .88rem; color: #334155; line-height: 1.65; margin: 0; white-space: pre-wrap; }
    .modal-footer { display: flex; justify-content: flex-end; padding: 1rem 1.5rem; border-top: 1px solid #F1F5F9; }
    .btn-close-modal { background: #F1F5F9; border: none; padding: .55rem 1.1rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: .85rem; color: #374151; }
    .btn-close-modal:hover { background: #E5E7EB; }
  `]
})
export class InterviewsComponent implements OnInit {
  private notificationService = inject(NotificationService);

  loading = signal(false);
  allNotifications = signal<AppNotification[]>([]);

  modalContent = signal<string | null>(null);
  modalTitle   = signal('');
  modalDate    = signal<string>('');

  /** Interviews: all INTERVIEW_SCHEDULED notifications, newest first */
  interviews = computed<InterviewEntry[]>(() =>
    this.allNotifications()
      .filter(n => n.type === 'INTERVIEW_SCHEDULED')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(n => {
        let meta: Record<string, string> = {};
        try { if (n.metadata) meta = JSON.parse(n.metadata); } catch {}
        return {
          notifId: n.id,
          poste: meta['poste'] || n.title,
          interviewDate: meta['interviewDate'] || null,
          interviewLocation: meta['interviewLocation'] || null,
          interviewerName: meta['interviewerName'] || null,
          interviewInstructions: meta['interviewInstructions'] || null,
          emailContent: n.message,
          createdAt: n.createdAt,
          isRead: n.isRead,
        };
      })
  );

  /** RH messages: interview + acceptance + rejection notifications, newest first */
  rhMessages = computed<RhMessage[]>(() =>
    this.allNotifications()
      .filter(n => [
        'INTERVIEW_SCHEDULED',
        'APPLICATION_ACCEPTED',
        'APPLICATION_REJECTED',
        'APPLICATION_RECEIVED',
      ].includes(n.type))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt,
        isRead: n.isRead,
      }))
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.notificationService.getMyNotifications().subscribe({
      next: notifs => { this.allNotifications.set(notifs); this.loading.set(false); },
      error: ()     => this.loading.set(false),
    });
  }

  isPast(dateStr: string | null): boolean {
    if (!dateStr) return false;
    // dateStr format: "2026-04-20 à 10h00" or ISO
    try {
      const normalized = dateStr.replace(' à ', 'T').replace('h', ':').replace(/:\d{0,2}$/, match => match.length < 3 ? match + '00' : match);
      return new Date(normalized).getTime() < Date.now();
    } catch { return false; }
  }

  openMail(iv: InterviewEntry): void {
    let content = iv.emailContent;
    if (iv.interviewDate)    content += `\n\n📅 Date : ${iv.interviewDate}`;
    if (iv.interviewLocation) content += `\n📍 Lieu : ${iv.interviewLocation}`;
    if (iv.interviewerName)   content += `\n👤 Intervieweur : ${iv.interviewerName}`;
    if (iv.interviewInstructions) content += `\n📝 Instructions : ${iv.interviewInstructions}`;
    this.modalTitle.set(`Convocation — ${iv.poste}`);
    this.modalDate.set(iv.createdAt);
    this.modalContent.set(content);
  }

  openMessage(msg: RhMessage): void {
    this.modalTitle.set(msg.title);
    this.modalDate.set(msg.createdAt);
    this.modalContent.set(msg.message);
  }

  closeModal(): void {
    this.modalContent.set(null);
  }

  iconFor(type: string): string {
    return this.notificationService.iconFor(type);
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      INTERVIEW_SCHEDULED:  'Entretien',
      APPLICATION_ACCEPTED: 'Accepté',
      APPLICATION_REJECTED: 'Refusé',
      APPLICATION_RECEIVED: 'Reçue',
    };
    return map[type] ?? 'Message';
  }

  typeClass(type: string): string {
    const map: Record<string, string> = {
      INTERVIEW_SCHEDULED:  'type-interview',
      APPLICATION_ACCEPTED: 'type-accepted',
      APPLICATION_REJECTED: 'type-rejected',
      APPLICATION_RECEIVED: 'type-received',
    };
    return map[type] ?? 'type-default';
  }
}