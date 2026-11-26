import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { LoginPageComponent } from './login.page';

describe('LoginPageComponent', () => {
  let fixture: ComponentFixture<LoginPageComponent>;
  let component: LoginPageComponent;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['login']);

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('form should be invalid when empty', () => {
    expect(component.form.invalid).toBeTrue();
  });

  it('email control should be invalid with bad format', () => {
    component.form.controls.email.setValue('notanemail');
    expect(component.form.controls.email.invalid).toBeTrue();
  });

  it('password control should be invalid when shorter than 6 chars', () => {
    component.form.controls.password.setValue('12345');
    expect(component.form.controls.password.invalid).toBeTrue();
  });

  it('form should be valid with correct email and password', () => {
    component.form.controls.email.setValue('user@test.com');
    component.form.controls.password.setValue('password123');
    expect(component.form.valid).toBeTrue();
  });

  it('submit button should be disabled when form is invalid', () => {
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn.disabled).toBeTrue();
  });

  it('submit button should be enabled when form is valid', () => {
    component.form.controls.email.setValue('user@test.com');
    component.form.controls.password.setValue('password123');
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(btn.disabled).toBeFalse();
  });

  it('does not call auth.login when form is invalid', () => {
    component.onSubmit();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('calls auth.login with form values on valid submit', fakeAsync(() => {
    authServiceSpy.login.and.returnValue(of({ accessToken: 't', roles: [] }));
    spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));

    component.form.controls.email.setValue('user@test.com');
    component.form.controls.password.setValue('password123');
    component.onSubmit();
    tick();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'password123',
    });
  }));

  it('navigates away on successful login', fakeAsync(() => {
    authServiceSpy.login.and.returnValue(of({ accessToken: 't', roles: [] }));
    const navSpy = spyOn(router, 'navigateByUrl').and.returnValue(Promise.resolve(true));

    component.form.controls.email.setValue('user@test.com');
    component.form.controls.password.setValue('password123');
    component.onSubmit();
    tick();

    expect(navSpy).toHaveBeenCalled();
    expect(component.loading()).toBeFalse();
  }));

  it('shows error message and clears loading on failed login', fakeAsync(() => {
    authServiceSpy.login.and.returnValue(
      throwError(() => ({ error: { message: 'Identifiants incorrects' } }))
    );

    component.form.controls.email.setValue('user@test.com');
    component.form.controls.password.setValue('password123');
    component.onSubmit();
    tick();

    expect(component.error()).toBe('Identifiants incorrects');
    expect(component.loading()).toBeFalse();
  }));

  it('shows fallback error message when API gives no message', fakeAsync(() => {
    authServiceSpy.login.and.returnValue(throwError(() => ({})));

    component.form.controls.email.setValue('user@test.com');
    component.form.controls.password.setValue('password123');
    component.onSubmit();
    tick();

    expect(component.error()).toBe('Authentification impossible');
  }));
});
