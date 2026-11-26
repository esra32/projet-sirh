import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Build a minimal fake JWT whose payload is base64-encoded JSON. */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const body = btoa(JSON.stringify(payload))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${body}.fakesignature`;
}

const FUTURE = Math.floor(Date.now() / 1000) + 3600;
const EMPLOYEE_TOKEN = fakeJwt({ sub: 'emp@test.com', roles: ['EMPLOYEE'], exp: FUTURE });
const MANAGER_TOKEN  = fakeJwt({ sub: 'mgr@test.com', roles: ['MANAGER'], exp: FUTURE });

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [provideRouter([]), AuthService],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isAuthenticated()', () => {
    it('returns false when no token stored', () => {
      expect(service.isAuthenticated()).toBeFalse();
    });

    it('returns true after successful login', () => {
      service.login({ email: 'emp@test.com', password: 'pass' }).subscribe();
      httpMock.expectOne(req => req.url.includes('/auth/login')).flush({
        accessToken: EMPLOYEE_TOKEN,
        refreshToken: fakeJwt({ sub: 'emp@test.com', type: 'refresh', exp: FUTURE }),
      });
      expect(service.isAuthenticated()).toBeTrue();
    });
  });

  describe('login()', () => {
    it('stores tokens and sets session on success', () => {
      const refreshTok = fakeJwt({ sub: 'emp@test.com', type: 'refresh', exp: FUTURE });
      service.login({ email: 'emp@test.com', password: 'pass' }).subscribe(session => {
        expect(session.accessToken).toBe(EMPLOYEE_TOKEN);
        expect(session.roles).toContain('EMPLOYEE');
      });
      httpMock.expectOne(req => req.url.includes('/auth/login')).flush({
        accessToken: EMPLOYEE_TOKEN,
        refreshToken: refreshTok,
      });
      expect(localStorage.getItem('sirh_access_token')).toBe(EMPLOYEE_TOKEN);
    });

    it('propagates HTTP error to subscriber', () => {
      let caught = false;
      service.login({ email: 'bad@test.com', password: 'wrong' }).subscribe({
        error: () => (caught = true),
      });
      httpMock.expectOne(req => req.url.includes('/auth/login')).flush('Unauthorized', {
        status: 401,
        statusText: 'Unauthorized',
      });
      expect(caught).toBeTrue();
    });
  });

  describe('logout()', () => {
    it('clears storage and session', () => {
      localStorage.setItem('sirh_access_token', EMPLOYEE_TOKEN);
      const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
      service.logout();
      expect(localStorage.getItem('sirh_access_token')).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('hasAnyRole()', () => {
    it('returns true when user has required role', () => {
      service.login({ email: 'mgr@test.com', password: 'p' }).subscribe();
      httpMock.expectOne(req => req.url.includes('/auth/login')).flush({
        accessToken: MANAGER_TOKEN,
        refreshToken: fakeJwt({ sub: 'mgr@test.com', exp: FUTURE }),
      });
      expect(service.hasAnyRole(['MANAGER'])).toBeTrue();
    });

    it('returns false when user lacks required role', () => {
      service.login({ email: 'mgr@test.com', password: 'p' }).subscribe();
      httpMock.expectOne(req => req.url.includes('/auth/login')).flush({
        accessToken: MANAGER_TOKEN,
        refreshToken: fakeJwt({ sub: 'mgr@test.com', exp: FUTURE }),
      });
      expect(service.hasAnyRole(['RH_ADMIN'])).toBeFalse();
    });

    it('returns true when required roles list is empty', () => {
      expect(service.hasAnyRole([])).toBeTrue();
    });
  });

});

/**
 * Hydration test lives in its own describe so that localStorage is set
 * BEFORE TestBed first injects AuthService (which triggers hydrateFromStorage).
 */
describe('AuthService – hydrateFromStorage', () => {
  afterEach(() => localStorage.clear());

  it('restores session from localStorage on service init', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = fakeJwt({ sub: 'emp@test.com', roles: ['EMPLOYEE'], exp });

    // Token must be in storage BEFORE the service is created
    localStorage.setItem('sirh_access_token', token);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [provideRouter([]), AuthService],
    });

    const svc = TestBed.inject(AuthService);
    expect(svc.isAuthenticated()).toBeTrue();
    expect(svc.userRoles()).toContain('EMPLOYEE');
  });
});
