import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  const state = { url: '/employee/dashboard' } as RouterStateSnapshot;
  const route = {} as ActivatedRouteSnapshot;

  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'isAuthenticated',
    ]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('returns true when user is authenticated', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBeTrue();
  });

  it('redirects to /auth/login when not authenticated', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toContain('/auth/login');
  });

  it('preserves redirectTo query param in the returned UrlTree', () => {
    authServiceSpy.isAuthenticated.and.returnValue(false);
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    const tree = result as UrlTree;
    expect(tree.queryParams['redirectTo']).toBe('/employee/dashboard');
  });
});
