import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastsComponent } from './shared/ui/toast/toasts.component';
import { CommandPaletteComponent } from './shared/ui/command-palette/command-palette.component';
import { AiChatComponent } from './shared/components/ai-chat/ai-chat.component';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, ToastsComponent, CommandPaletteComponent, AiChatComponent],
  template: `
    <router-outlet></router-outlet>
    <app-toasts></app-toasts>
    <app-command-palette></app-command-palette>
    <app-ai-chat *ngIf="auth.isAuthenticated()"></app-ai-chat>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  auth = inject(AuthService);
  title = 'sirh-frontend';
}
