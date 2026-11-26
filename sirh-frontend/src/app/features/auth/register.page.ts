import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { KeycloakAuthService } from '../../core/auth/keycloak-auth.service';

const passwordMatchValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value ?? '';
  const confirm = group.get('confirmPassword')?.value ?? '';
  return password === confirm ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="brand">
          <div class="dot"></div>
          <h1>SIRH</h1>
          <span>Inscription</span>
        </div>
        <div *ngIf="keycloakEnabled()" class="kc-register">
          <p class="role-note">
            Inscription publique via Keycloak (role par defaut: EMPLOYEE).
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

          <label>
            Email professionnel
            <input type="email" formControlName="email" placeholder="prenom.nom@entreprise.com" />
            <span class="field-error" *ngIf="f['email'].touched && f['email'].errors?.['email']">
              Adresse email invalide
            </span>
          </label>

          <label>
            Mot de passe
            <input type="password" formControlName="password" placeholder="Min. 8 caractères" />
            <span class="field-error" *ngIf="f['password'].touched && f['password'].errors?.['minlength']">
              Au moins 8 caractères requis
            </span>
          </label>

          <label>
            Confirmer le mot de passe
            <input type="password" formControlName="confirmPassword" placeholder="Répétez le mot de passe" />
            <span class="field-error"
              *ngIf="f['confirmPassword'].touched && form.errors?.['passwordMismatch']">
              Les mots de passe ne correspondent pas
            </span>
          </label>
          <p class="role-note">
            Inscription publique: compte employe uniquement.
            Les roles manager et administrateur RH sont attribues par l'equipe RH.
          </p>

          <button type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Création du compte...' : "Créer mon compte" }}
          </button>

          <p class="hint error" *ngIf="error()">{{ error() }}</p>
          <p class="hint success" *ngIf="success()">{{ success() }}</p>

          <p class="switch-link">
            Déjà inscrit ?
            <a routerLink="/auth/login">Se connecter</a>
          </p>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 50%, #FFFBEB 100%);
        color: #1e293b;
      }
      .auth-wrapper {
        display: grid;
        place-items: center;
        min-height: 100vh;
        padding: 2rem;
      }
      .auth-card {
        width: min(460px, 100%);
        background: #FFFFFF;
        border: 1px solid #E5E7EB;
        border-radius: 20px;
        padding: 2.25rem;
        box-shadow: 0 8px 40px rgba(77,163,255,0.12);
      }
      .brand {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        margin-bottom: 1.75rem;
      }
      .brand h1 {
        font-size: 1.55rem;
        letter-spacing: 0.03em;
        margin: 0;
        color: #1e293b;
        font-weight: 800;
      }
      .brand span {
        color: #9CA3AF;
        font-size: 0.9rem;
      }
      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4DA3FF, #6EE7B7);
        box-shadow: 0 0 0 5px rgba(77,163,255,0.15);
      }
      form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-weight: 600;
        color: #374151;
        font-size: 0.875rem;
      }
      input {
        padding: 0.72rem 0.9rem;
        border-radius: 10px;
        border: 1.5px solid #E5E7EB;
        background: #F8FAFC;
        color: #1e293b;
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
        font-size: 0.95rem;
      }
      input:focus {
        border-color: #4DA3FF;
        background: #FFFFFF;
        box-shadow: 0 0 0 3px rgba(77,163,255,0.15);
      }
      .role-note {
        margin: 0;
        font-size: 0.82rem;
        color: #475569;
        background: rgba(59,130,246,0.08);
        border: 1px solid rgba(59,130,246,0.18);
        border-radius: 8px;
        padding: 0.65rem 0.75rem;
        line-height: 1.45;
      }
      .field-error {
        font-size: 0.78rem;
        color: #FF6B6B;
        font-weight: 500;
      }
      button {
        margin-top: 0.5rem;
        padding: 0.85rem;
        border: none;
        border-radius: 12px;
        background: linear-gradient(135deg, #4DA3FF, #6EE7B7);
        color: white;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.2s ease;
        font-size: 1rem;
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      button:not(:disabled):hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 30px rgba(77,163,255,0.3);
      }
      .hint {
        margin: 0;
        font-size: 0.9rem;
        text-align: center;
        color: #9CA3AF;
      }
      .hint.error {
        background: rgba(255,107,107,0.08);
        border: 1px solid rgba(255,107,107,0.2);
        padding: 0.6rem 1rem;
        border-radius: 8px;
        color: #B91C1C;
        font-weight: 500;
        text-align: center;
      }
      .hint.success {
        background: rgba(34,197,94,0.1);
        border: 1px solid rgba(34,197,94,0.25);
        padding: 0.6rem 1rem;
        border-radius: 8px;
        color: #166534;
        font-weight: 600;
        text-align: center;
      }
      .switch-link {
        margin: 0;
        text-align: center;
        color: #9CA3AF;
        font-size: 0.9rem;
      }
      .switch-link a {
        color: #4DA3FF;
        text-decoration: none;
        font-weight: 700;
        margin-left: 0.25rem;
      }
      .switch-link a:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class RegisterPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private keycloak = inject(KeycloakAuthService);

  loading = signal(false);
  error = signal('');
  success = signal('');

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      const target = this.auth.defaultRouteForSession();
      void this.router.navigateByUrl(target);
    }
  }

  form = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  get f() {
    return this.form.controls;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    const { email, password } = this.form.getRawValue();

    if (this.keycloak.enabled) {
      this.auth.registerKeycloakEmployee({ email, password }).subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set('Compte créé avec succès.');
          setTimeout(() => void this.router.navigateByUrl('/auth/login'), 2200);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message ?? "Échec de la création du compte dans Keycloak");
        },
      });
      return;
    }

    this.auth.register({ email, password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set('Compte créé avec succès.');
        setTimeout(() => void this.router.navigateByUrl('/auth/login'), 1800);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? "Échec de la création du compte");
      },
    });
  }

  keycloakEnabled(): boolean {
    return this.keycloak.enabled;
  }
}
