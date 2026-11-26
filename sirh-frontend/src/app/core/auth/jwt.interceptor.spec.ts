import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { jwtInterceptor } from './jwt.interceptor';

/** Minimal stub that exposes writable token properties. */
class AuthServiceStub {
  accessToken: string | null = null;
  refreshToken: string | null = null;
  logout = jasmine.createSpy('logout');
  refresh = jasmine.createSpy('refresh');
  isAuthenticated = jasmine.createSpy('isAuthenticated').and.returnValue(false);
}

describe('jwtInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let stub: AuthServiceStub;

  beforeEach(() => {
    stub = new AuthServiceStub();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: stub },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('forwards request without Authorization header when no token', () => {
    stub.accessToken = null;
    http.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('adds Bearer Authorization header when token is present', () => {
    stub.accessToken = 'my-token';
    http.get('/api/test').subscribe();
    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({});
  });

  it('calls logout when 401 and no refresh token', () => {
    stub.accessToken = null;
    stub.refreshToken = null;
    http.get('/api/secure').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/secure');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    expect(stub.logout).toHaveBeenCalled();
  });
});
