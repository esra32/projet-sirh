import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit {
  isOpen = false;
  message = '';
  history: Array<{ sender: 'USER' | 'BOT'; content: string; timestamp: string }> = [];
  isTyping = false;
  sessionId = this.getOrCreateSessionId();
  private readonly storageKey = `sirh_chat_history_${this.sessionId}`;
  private readonly chatApiUrl = `${environment.apiBaseUrl}/chat/${this.sessionId}`;
  private readonly maxHistoryItems = 30;
  private readonly maxMessageLength = 800;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadHistory();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.history.length === 0) {
      this.loadHistory();
    }
  }

  loadHistory() {
    const local = localStorage.getItem(this.storageKey);
    if (local) {
      try {
        const parsed = JSON.parse(local) as Array<{ sender: 'USER' | 'BOT'; content: string; timestamp: string }>;
        this.history = Array.isArray(parsed) ? parsed.slice(-this.maxHistoryItems) : [];
      } catch {
        this.history = [];
      }
    }
    this.http.get<any[]>(this.chatApiUrl)
      .subscribe({
        next: (res) => {
          // Accept backend payload but normalize it to safe, bounded structure.
          const normalized = (Array.isArray(res) ? res : [])
            .map((m: any) => ({
              sender: (m?.sender === 'USER' ? 'USER' : 'BOT') as 'USER' | 'BOT',
              content: this.sanitizeText(String(m?.content ?? '')),
              timestamp: typeof m?.timestamp === 'string' ? m.timestamp : new Date().toISOString(),
            }))
            .slice(-this.maxHistoryItems);
          this.history = normalized;
          this.persistHistory();
        },
        error: () => {} // Silently fail if chatbot service is down
      });
  }

  sendSuggestion(text: string) {
    this.message = text;
    this.sendMessage();
  }

  sendMessage() {
    if (!this.message.trim() || this.isTyping) return;

    const cleaned = this.sanitizeText(this.message);
    if (!cleaned) return;
    const userMsg = { sender: 'USER' as const, content: cleaned, timestamp: new Date().toISOString() };
    this.history.push(userMsg);
    const currentMessage = cleaned;
    this.message = '';
    this.isTyping = true;
    this.scrollToBottom();
    this.persistHistory();

    this.http.post<any>(this.chatApiUrl, { message: currentMessage })
      .subscribe({
        next: (res) => {
          this.isTyping = false;
          const botMsg = {
            sender: 'BOT' as const,
            content: this.sanitizeText(String(res?.content ?? '')),
            timestamp: typeof res?.timestamp === 'string' ? res.timestamp : new Date().toISOString(),
          };
          this.history.push(botMsg);
          this.persistHistory();
          this.scrollToBottom();
        },
        error: () => {
          this.isTyping = false;
          this.history.push(this.buildFallbackReply(currentMessage));
          this.persistHistory();
          this.scrollToBottom();
        }
      });
  }

  private scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.chat-messages');
      if (container) container.scrollTop = container.scrollHeight;
    }, 100);
  }

  private persistHistory(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.history.slice(-this.maxHistoryItems)));
  }

  private buildFallbackReply(userMessage: string): { sender: 'BOT'; content: string; timestamp: string } {
    const msg = userMessage.toLowerCase();
    if (msg.includes('offre') || msg.includes('poste')) {
      return {
        sender: 'BOT',
        content: 'Vous pouvez consulter les offres dans "Offres internes" (employe) ou "Publier un poste" (manager). Utilisez les filtres par competences pour des resultats plus pertinents.',
        timestamp: new Date().toISOString()
      };
    }
    if (msg.includes('competence') || msg.includes('skill')) {
      return {
        sender: 'BOT',
        content: 'Ajoutez vos competences dans "Profil". Le moteur de matching priorise ensuite les offres et candidatures selon vos skills detectes.',
        timestamp: new Date().toISOString()
      };
    }
    if (msg.includes('cv') || msg.includes('candidature')) {
      return {
        sender: 'BOT',
        content: 'Le CV est accessible depuis les ecrans manager/RH. Vous pouvez aussi suivre vos candidatures dans "Mes candidatures".',
        timestamp: new Date().toISOString()
      };
    }
    return {
      sender: 'BOT',
      content: 'Assistant actif. Je peux vous aider sur les offres, competences, candidatures et workflows RH. Essayez: "offres data", "mes competences", "ouvrir cv".',
      timestamp: new Date().toISOString()
    };
  }

  private getOrCreateSessionId(): string {
    const key = 'sirh_chat_session_id';
    const existing = localStorage.getItem(key);
    if (existing && /^session-[a-z0-9]+$/i.test(existing)) {
      return existing;
    }
    const created = 'session-' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, created);
    return created;
  }

  private sanitizeText(input: string): string {
    // Defense-in-depth: Angular interpolation already escapes HTML, but we also:
    // - remove control chars (incl. bidi overrides)
    // - trim, collapse excessive whitespace
    // - cap size to avoid storage abuse
    const withoutControls = input
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/[\u202A-\u202E\u2066-\u2069]/g, '') // bidi controls
      .replace(/\s+/g, ' ')
      .trim();
    const clipped = withoutControls.slice(0, this.maxMessageLength);
    // Prevent accidental HTML-like payloads being echoed in other contexts.
    return clipped.replace(/[<>]/g, '');
  }
}
