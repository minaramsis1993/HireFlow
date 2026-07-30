import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from '@core/auth/auth-service';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
  });

  async function submit(email: string, password: string): Promise<void> {
    const emailInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type="email"]');
    const passwordInput: HTMLInputElement =
      fixture.nativeElement.querySelector('input[type="password"]');

    emailInput.value = email;
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input'));

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('offers the seeded demo accounts', () => {
    expect(fixture.nativeElement.textContent).toContain('recruiter@hireflow.dev');
    expect(fixture.nativeElement.textContent).toContain('candidate@hireflow.dev');
  });

  it('reports credentials it does not recognise', async () => {
    await submit('recruiter@hireflow.dev', 'wrong');

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'not recognised',
    );
    expect(TestBed.inject(AuthService).isAuthenticated()).toBeFalse();
  });

  it('signs in and navigates to the role home page', async () => {
    await submit('recruiter@hireflow.dev', 'password');

    expect(TestBed.inject(AuthService).isRecruiter()).toBeTrue();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('returns to the page that triggered the sign-in', async () => {
    fixture.componentRef.setInput('returnUrl', '/pipeline');
    await fixture.whenStable();

    await submit('recruiter@hireflow.dev', 'password');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/pipeline');
  });

  it('does not submit an empty form', async () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(TestBed.inject(AuthService).isAuthenticated()).toBeFalse();
  });
});
