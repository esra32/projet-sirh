import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="not-found">
      <h1>404</h1>
      <p>La page demandee est introuvable.</p>
      <a routerLink="/employee" class="cta">Retour au tableau de bord</a>
    </div>
  `,
  styles: [
    `
      .not-found {
        min-height: 60vh;
        display: grid;
        place-items: center;
        text-align: center;
        gap: 0.75rem;
        color: #e5e7eb;
      }
      h1 {
        font-size: 4rem;
        margin: 0;
      }
      .cta {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.65rem 1rem;
        border-radius: 12px;
        text-decoration: none;
        background: linear-gradient(135deg, #22d3ee, #6366f1);
        color: #0b1220;
        font-weight: 700;
      }
    `,
  ],
})
export class NotFoundComponent {}
