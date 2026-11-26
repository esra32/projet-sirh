import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, from, lastValueFrom, map, of, switchMap, tap, throwError } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, UserSession } from './auth.models';
import { environment } from '../../../environments/environment';
import { KeycloakAuthService } from './keycloak-auth.service';

const ACCESS_KEY  = 'sirh_access_token';
const REFRESH_KEY = 'sirh_refresh_token';
const ROLES_KEY   = 'sirh_roles';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private keycloak = inject(KeycloakAuthService);
  private sessionSignal = signal<UserSession | null>(this.hydrateFromStorage());
  private refreshInProgress = false;

  get keycloakEnabled(): boolean {
    return this.keycloak.enabled;
  }

  get session(): UserSession | null {
    return this.sessionSignal();
  }

  get accessToken(): string | null {
    return this.sessionSignal()?.accessToken ?? null;
  }

  get refreshToken(): string | null {
    return this.sessionSignal()?.refreshToken ?? null;
  }

  userRoles(): string[] {
    return this.sessionSignal()?.roles ?? [];
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getEmail(): string | null {
    const token = this.accessToken;
    if (!token) return null;
    const payload = this.decodePayload(token);
    if (!payload) return null;

    // Priorité Email > Preferred Username > Subject
    return (payload['email'] as string) ?? 
           (payload['preferred_username'] as string) ?? 
           (payload['sub'] as string) ?? 
           null;
  }

  getDisplayName(): string {
    const token = this.accessToken;
    if (!token) return 'Employe';
    const payload = this.decodePayload(token);
    if (!payload) return 'Employe';

    const candidate =
      this.asNonEmptyString(payload['name']) ??
      this.asNonEmptyString(payload['given_name']) ??
      this.asNonEmptyString(payload['preferred_username']) ??
      this.asNonEmptyString(payload['email']) ??
      this.asNonEmptyString(payload['sub']);

    return this.displayNameFromClaim(candidate);
  }

  hasAnyRole(roles: string[]): boolean {
    if (!roles.length) {
      return true;
    }
    const current = this.userRoles();
    return roles.some((r) => current.includes(r));
  }

  defaultRouteForSession(session?: UserSession | null): string {
    const sourceRoles = session?.roles ?? this.userRoles();
    const roles = this.normalizeRoles(sourceRoles);
    if (roles.includes('HR_ADMIN')) {
      return '/rh-admin';
    }
    if (roles.includes('MANAGER')) {
      return '/manager';
    }
    return '/employee';
  }

  register(body: RegisterRequest): Observable<void> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/register`, body)
      .pipe(
        map(() => void 0)
      );
  }

  registerKeycloakEmployee(payload: { email: string; password: string }): Observable<void> {
    return this.http
      .post<void>(`${environment.apiBaseUrl}/auth/keycloak/register`, payload);
  }

  login(body: LoginRequest): Observable<UserSession> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, body)
      .pipe(
        map((res) => this.buildSession(res)),
        tap((session) => this.persistSession(session))
      );
  }

  exchangeKeycloakToken(token: string): Observable<UserSession> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/keycloak/exchange`, { token })
      .pipe(
        map((res) => this.buildSession(res)),
        tap((session) => this.persistSession(session))
      );
  }

  refresh(): Observable<UserSession> {
    if (this.keycloakEnabled && this.keycloak.isAuthenticated()) {
      return from(this.keycloak.updateToken(30)).pipe(
        switchMap(() => {
          if (!this.keycloak.token) {
            throw new Error('Keycloak access token missing');
          }
          return this.exchangeKeycloakToken(this.keycloak.token);
        }),
        catchError((err) => {
          this.logout();
          return throwError(() => err);
        })
      );
    }

    if (this.refreshInProgress || !this.refreshToken) {
      return of(this.sessionSignal()!);
    }
    this.refreshInProgress = true;
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/refresh`, {
        refreshToken: this.refreshToken,
      })
      .pipe(
        map((res) => this.buildSession(res)),
        tap((session) => this.persistSession(session)),
        catchError((err) => {
          this.logout();
          return throwError(() => err);
        }),
        finalize(() => {
          this.refreshInProgress = false;
        })
      );
  }

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ROLES_KEY);
    this.sessionSignal.set(null);
    if (this.keycloakEnabled) {
      // Keycloak redirige vers la racine après déconnexion (toujours enregistré)
      this.keycloak.logout(window.location.origin);
    } else {
      void this.router.navigate(['/']);
    }
  }

  async initKeycloak(): Promise<void> {
    if (!this.keycloakEnabled) return;

    // Délai de grâce de 3 secondes pour éviter l'écran blanc infini
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Keycloak initialization timed out')), 3500)
    );

    try {
      await Promise.race([this.keycloak.init(), timeoutPromise]);
      const token = this.keycloak.token;
      if (token) {
        await lastValueFrom(this.exchangeKeycloakToken(token));
      }
    } catch (err) {
      console.warn('Keycloak initialization failed — keeping existing internal session if present.', err);
      // Only clear if this was a Keycloak session; preserve internal JWT sessions.
      if (this.keycloak.isAuthenticated()) {
        this.clearLocalStorageSession();
      }
    }
  }

  private clearLocalStorageSession(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ROLES_KEY);
    this.sessionSignal.set(null);
  }

  private buildSession(res: AuthResponse): UserSession {
    // Prefer roles from the response body (backend sends them directly).
    // Fall back to JWT extraction if the field is absent.
    const roles = (res.roles && res.roles.length > 0)
      ? res.roles.map(r => String(r))          // ensure plain strings
      : this.extractRoles(res.accessToken);
    const expiresAt = this.extractExpiry(res.accessToken);
    return {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      roles: this.normalizeRoles(roles),
      expiresAt,
    };
  }

  private persistSession(session: UserSession): void {
    localStorage.setItem(ACCESS_KEY, session.accessToken);
    if (session.refreshToken) {
      localStorage.setItem(REFRESH_KEY, session.refreshToken);
    }
    localStorage.setItem(ROLES_KEY, JSON.stringify(session.roles));
    this.sessionSignal.set(session);
  }

  private hydrateFromStorage(): UserSession | null {
    const access = localStorage.getItem(ACCESS_KEY);
    if (!access) return null;
    const refresh    = localStorage.getItem(REFRESH_KEY) ?? undefined;
    // Prefer persisted roles (avoid re-parsing JWT on every reload)
    const savedRoles = localStorage.getItem(ROLES_KEY);
    const roles      = savedRoles ? (JSON.parse(savedRoles) as string[]) : this.extractRoles(access);
    const expiresAt  = this.extractExpiry(access);
    return {
      accessToken: access,
      refreshToken: refresh,
      roles: this.normalizeRoles(roles),
      expiresAt,
    };
  }

  private extractRoles(token: string): string[] {
    const payload = this.decodePayload(token);
    if (!payload) return [];

    // Priorité rôles Keycloak (ne pas se laisser polluer par `scope`)
    const realmAccess = payload['realm_access'] as any;
    if (realmAccess?.roles && Array.isArray(realmAccess.roles)) {
      return realmAccess.roles.map((r: any) => String(r)).filter(Boolean);
    }

    const resourceAccess = payload['resource_access'] as any;
    if (resourceAccess && typeof resourceAccess === 'object') {
      const union: string[] = [];
      for (const val of Object.values(resourceAccess)) {
        const r = (val as any)?.roles;
        if (Array.isArray(r)) {
          for (const rr of r) union.push(String(rr));
        }
      }
      if (union.length) return union.filter(Boolean);
    }

    // Fallback Internal JWT
    const raw: unknown = payload['roles'] ?? payload['authorities'] ?? payload['scope'];
    const toStr = (v: unknown): string => {
      if (typeof v === 'string') return v;
      // JJWT may serialize Java enums as {"name": "HR_ADMIN"} objects
      if (v && typeof v === 'object') {
        const obj = v as Record<string, unknown>;
        return String(obj['name'] ?? obj['value'] ?? obj['role'] ?? JSON.stringify(v));
      }
      return String(v);
    };
    if (Array.isArray(raw)) return raw.map(toStr).filter(Boolean);
    if (typeof raw === 'string') return raw.split(/[\s,]+/).filter(Boolean);
    return [];
  }

  private extractExpiry(token: string): number | undefined {
    const payload = this.decodePayload(token);
    if (!payload || !payload['exp']) {
      return undefined;
    }
    return Number(payload['exp']) * 1000;
  }

  private normalizeRoles(roles: string[]): string[] {
    const normalized = roles
      .map((role) => role.trim().toUpperCase())
      // Remplacer les espaces, tirets et points par des underscores
      .map((role) => role.replace(/[\s.-]+/g, '_'))
      .map((role) => role.replace(/^ROLE_/, ''))
      .filter(Boolean);
    return Array.from(new Set(normalized));
  }

  private asNonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private displayNameFromClaim(value: string | null | undefined): string {
    if (!value) return 'Employe';
    const withoutDomain = value.includes('@') ? value.split('@')[0] : value;
    return withoutDomain.trim() || 'Employe';
  }

  private decodePayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    try {
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      return JSON.parse(decoded);
    } catch (e) {
      console.error('Cannot decode token payload', e);
      return null;
    }
  }
}
