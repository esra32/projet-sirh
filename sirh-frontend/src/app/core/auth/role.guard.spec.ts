import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from './auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const state = { url: '/rh-admin' } as RouterStateSnapshot;

  function routeWithRoles(roles: string[]): ActivatedRouteSnapshot {
    return { data: { roles } } as unknown as ActivatedRouteSnapshot;
  }

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'isAuthenticated',
      'hasAnyRole',
    ]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });
  });

  it('returns true when no roles required', () => {
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeWithRoles([]), state)
    );
    expect(result).toBeTrue();
  });

  it('returns true when authenticated and has required role', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.hasAnyRole.and.returnValue(true);
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeWithRoles(['RH_ADMIN']), state)
    );
    expect(result).toBeTrue();
  });

  it('redirects when authenticated but lacks required role', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.hasAnyRole.and.returnValue(false);
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeWithRoles(['RH_ADMIN']), state)
    );
    expect(result instanceof UrlTree).toBeTrue();
  });

  it('redirects when not authenticated at all', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    authServiceSpy.hasAnyRole.and.returnValue(false);
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(routeWithRoles(['MANAGER']), state)
    );
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toContain('/auth/login');
  });
});
