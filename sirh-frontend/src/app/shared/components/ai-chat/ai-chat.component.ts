import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../../core/services/ai.service';
import { RecruitmentService } from '../../../core/services/recruitment.service';
import { animate, style, transition, trigger } from '@angular/animations';

interface ChatMessage {
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss',
  animations: [
    trigger('slideInOut', [
      transition('void => *', [
        style({ transform: 'translateY(30px) scale(0.95)', opacity: 0 }),
        animate('350ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          style({ transform: 'translateY(0) scale(1)', opacity: 1 }))
      ]),
      transition('* => void', [
        animate('200ms ease-in',
          style({ transform: 'translateY(20px) scale(0.95)', opacity: 0 }))
      ])
    ]),
    trigger('fadeIn', [
      transition('void => *', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AiChatComponent implements AfterViewChecked {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  isOpen = false;
  messages: ChatMessage[] = [];
  newMessage = '';
  isTyping = false;
  private shouldScroll = false;

  quickSuggestions = [
    '🔍 Quelles offres sont disponibles ?',
    '📋 Comment postuler à une offre ?',
    '🎯 Comment fonctionne le score IA ?',
    '🚀 Je veux évoluer en interne',
  ];
  showSuggestions = true;
  private offersLoaded = false;

  constructor(private aiService: AiService, private recruitmentService: RecruitmentService) {
    this.messages.push({
      text: "Bonjour ! Je suis **ARIA**, votre assistant RH intelligent. 🤖\n\nJe suis là pour vous aider avec :\n- 📋 L'utilisation du SIRH\n- 📝 Les procédures RH\n- 🎯 Le recrutement et la gestion des talents\n- ❓ Toute question sur l'application\n\nComment puis-je vous aider ?",
      sender: 'ai',
      timestamp: new Date()
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  scrollToBottom(): void {
    try {
      if (this.myScrollContainer) {
        this.myScrollContainer.nativeElement.scrollTop =
          this.myScrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      setTimeout(() => { this.shouldScroll = true; }, 150);
      // Charger les offres réelles une seule fois
      if (!this.offersLoaded) {
        this.recruitmentService.getJobOffers('PUBLISHED').subscribe({
          next: (offers) => {
            this.aiService.setOffersContext(offers.map(o => ({
              title: o.title,
              department: o.department,
              location: o.location,
              skills: o.requiredSkills?.map(s => s.name) ?? [],
              deadline: o.deadlineDate
            })));
            this.offersLoaded = true;
          },
          error: () => { /* silencieux */ }
        });
      }
    }
  }

  useSuggestion(suggestion: string) {
    // Remove emoji prefix
    this.newMessage = suggestion.replace(/^[\p{Emoji}\s]+/u, '').trim();
    this.showSuggestions = false;
    this.sendMessage();
  }

  async sendMessage() {
    if (!this.newMessage.trim() || this.isTyping) return;

    this.showSuggestions = false;
    const userMessage = this.newMessage.trim();
    this.messages.push({ text: userMessage, sender: 'user', timestamp: new Date() });
    this.newMessage = '';
    this.isTyping = true;
    this.shouldScroll = true;

    const response = await this.aiService.chat(userMessage);

    this.messages.push({ text: response, sender: 'ai', timestamp: new Date() });
    this.isTyping = false;
    this.shouldScroll = true;
  }

  resetConversation() {
    this.aiService.resetChat();
    this.messages = [{
      text: "Conversation réinitialisée. 🔄 Comment puis-je vous aider ?",
      sender: 'ai',
      timestamp: new Date()
    }];
    this.showSuggestions = true;
    this.shouldScroll = true;
  }

  /** Formate le Markdown basique en HTML pour l'affichage */
  formatMessage(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }
}
