import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class KeycloakAuthService {
  readonly enabled = !!environment.keycloak?.enabled;

  private kc?: any;
  private initPromise: Promise<boolean> | null = null;

  async init(): Promise<boolean> {
    if (!this.enabled) return false;
    if (this.initPromise) return this.initPromise;

    this.kc = new Keycloak({
      url: environment.keycloak.url,
      realm: environment.keycloak.realm,
      clientId: environment.keycloak.clientId,
    });

    const stableRedirectUri = window.location.origin + '/';
    const silentCheckSsoRedirectUri =
      window.location.origin + '/assets/silent-check-sso.html';

    this.initPromise = (this.kc.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      redirectUri: stableRedirectUri,
      silentCheckSsoRedirectUri,
    }) as Promise<boolean | null>)
      .then((authenticated: any) => !!authenticated)
      .catch(() => false) as Promise<boolean>;

    return this.initPromise;
  }

  get token(): string | null {
    return this.kc?.token ?? null;
  }

  get refreshToken(): string | null {
    return this.kc?.refreshToken ?? null;
  }

  get tokenParsed(): any {
    return this.kc?.tokenParsed ?? null;
  }

  isAuthenticated(): boolean {
    // keycloak-js peut mettre `authenticated` à jour de façon asynchrone,
    // mais dès qu'on a un token, on peut considérer l'utilisateur comme loggué.
    return !!this.kc?.token;
  }

  async updateToken(minValiditySeconds = 30): Promise<boolean> {
    if (!this.kc) return false;
    try {
      return await this.kc.updateToken(minValiditySeconds);
    } catch {
      return false;
    }
  }

  login(redirectUri?: string): void {
    const target = redirectUri ?? window.location.origin + '/';
    this.kc?.login({ redirectUri: target });
  }

  logout(redirectUri?: string): void {
    const target = redirectUri ?? window.location.origin + '/';
    this.kc?.logout({ redirectUri: target });
  }
}

