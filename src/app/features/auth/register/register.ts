import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '@core/auth/auth-service';
import { USER_ROLE_DESCRIPTIONS, USER_ROLE_LABELS, USER_ROLES, UserRole } from '@core/models';
import { NotificationService } from '@core/services/notification-service';
import { AuthCard } from '../auth-card/auth-card';

/** Cross-field rule: the confirmation has to match what was typed above. */
function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value as string;
  const confirm = control.get('confirmPassword')?.value as string;
  return confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [
    AuthCard,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly roles = USER_ROLES;
  protected readonly roleLabels = USER_ROLE_LABELS;
  protected readonly roleDescriptions = USER_ROLE_DESCRIPTIONS;

  protected readonly error = signal('');
  protected readonly pending = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email]],
      role: this.formBuilder.nonNullable.control<UserRole>('candidate'),
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.pending.set(true);
    this.error.set('');

    const { fullName, email, role, password } = this.form.getRawValue();
    const result = await this.auth.register({ fullName, email, role, password });

    this.pending.set(false);

    if (!result.ok) {
      this.error.set(result.error);
      return;
    }

    this.notifications.success(`Welcome to HireFlow, ${result.user.fullName}.`);
    await this.router.navigateByUrl(this.auth.homeRoute());
  }
}
