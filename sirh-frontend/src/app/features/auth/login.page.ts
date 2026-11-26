import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { KeycloakAuthService } from '../../core/auth/keycloak-auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="splash">
      <div class="splash-content">
        <div class="logo-dot"></div>
        <span class="logo-text">SIRH</span>
        <div class="spinner"></div>
        <p>Redirection vers la connexion...</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .splash {
      min-height: 100vh;
      background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 100%);
      display: flex; align-items: center; justify-content: center;
    }
    .splash-content {
      display: flex; flex-direction: column; align-items: center; gap: 1rem;
    }
    .logo-dot {
      width: 16px; height: 16px; border-radius: 50%;
      background: linear-gradient(135deg, #4DA3FF, #6EE7B7);
      box-shadow: 0 0 0 6px rgba(77,163,255,0.2);
    }
    .logo-text { color: #fff; font-size: 1.6rem; font-weight: 900; letter-spacing: 0.1em; }
    .spinner {
      width: 28px; height: 28px; border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: #4DA3FF;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #94A3B8; font-size: 0.85rem; margin: 0; }
  `],
})
export class LoginPageComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private keycloak = inject(KeycloakAuthService);

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      const target = this.auth.defaultRouteForSession();
      void this.router.navigateByUrl(target);
    } else {
      // Redirection automatique vers Keycloak sans attendre le clic
      this.keycloak.login();
    }
  }

  loginWithKeycloak(): void {
    this.keycloak.login();
  }
}