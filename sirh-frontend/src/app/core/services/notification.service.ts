import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppNotification {
  id: string;
  userEmail: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  metadata: string | null; // JSON string
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/notifications`;

  getMyNotifications(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(this.base);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/unread-count`);
  }

  markRead(id: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.put<void>(`${this.base}/mark-all-read`, {});
  }

  /** Retourne l'icône selon le type de notification */
  iconFor(type: string): string {
    const icons: Record<string, string> = {
      APPLICATION_RECEIVED:      '📩',
      INTERVIEW_SCHEDULED:       '📅',
      APPLICATION_ACCEPTED:      '🎉',
      APPLICATION_REJECTED:      '❌',
      NEW_APPLICATION:           '👤',
      OFFER_PENDING_VALIDATION:  '📋',
      EMAIL_SENT_CONFIRMATION:   '📧',
      CANDIDATE_ACCEPTED_IN_DEPT:'✅',
      INTERVIEW_IN_DEPT:         '🗓️',
      OFFER_VALIDATED:           '✅',
      OFFER_REFUSED:             '🚫',
      MOBILITY_REQUEST_SUBMITTED:'🔄',
      MOBILITY_MANAGER_VALIDATED:'👔',
      MOBILITY_APPROVED:         '🎉',
      MOBILITY_REJECTED:         '❌',
    };
    return icons[type] ?? '🔔';
  }
}