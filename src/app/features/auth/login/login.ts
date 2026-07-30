import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { AuthService, DemoLogin } from '@core/auth/auth-service';
import { USER_ROLE_LABELS } from '@core/models';
import { NotificationService } from '@core/services/notification-service';
import { AuthCard } from '../auth-card/auth-card';

@Component({
  selector: 'app-login',
  imports: [
    AuthCard,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  /** `?returnUrl=` set by `authGuard`, bound by `withComponentInputBinding()`. */
  readonly returnUrl = input<string>();

  protected readonly roleLabels = USER_ROLE_LABELS;
  protected readonly demoLogins = this.auth.demoLogins;

  protected readonly error = signal('');
  protected readonly pending = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected fillDemo(demo: DemoLogin): void {
    this.form.setValue({ email: demo.email, password: demo.password });
    this.error.set('');
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.error.set('');

    const result = await this.auth.login(this.form.getRawValue());

    this.pending.set(false);

    if (!result.ok) {
      this.error.set(result.error);
      return;
    }

    this.notifications.success(`Signed in as ${result.user.fullName}.`);
    await this.router.navigateByUrl(this.returnUrl() ?? this.auth.homeRoute());
  }
}
