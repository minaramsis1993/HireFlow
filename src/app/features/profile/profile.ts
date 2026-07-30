import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '@core/auth/auth-service';
import { RESUME_MIME_TYPE, resumeRejectionReason, USER_ROLE_LABELS } from '@core/models';
import { CandidateStore } from '@core/services/candidate-store';
import { NotificationService } from '@core/services/notification-service';
import { EmptyState } from '@shared/ui/empty-state/empty-state';
import { PageHeader } from '@shared/ui/page-header/page-header';
import { ResumeChip } from '@shared/ui/resume-chip/resume-chip';

/** The candidate's own view of the profile recruiters see. */
@Component({
  selector: 'app-profile',
  imports: [
    EmptyState,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    PageHeader,
    ReactiveFormsModule,
    ResumeChip,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  private readonly auth = inject(AuthService);
  private readonly candidateStore = inject(CandidateStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);

  protected readonly user = this.auth.user;
  protected readonly profile = this.auth.candidateProfile;
  protected readonly roleLabels = USER_ROLE_LABELS;
  protected readonly acceptedType = RESUME_MIME_TYPE;

  protected readonly fileError = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    headline: ['', [Validators.required, Validators.maxLength(120)]],
    location: [''],
    phone: [''],
    yearsOfExperience: [0, [Validators.required, Validators.min(0), Validators.max(60)]],
    skills: [''],
  });

  constructor() {
    // Fill the form once the profile is available, and again after each save.
    effect(() => {
      const profile = this.profile();
      if (!profile) {
        return;
      }

      this.form.reset({
        headline: profile.headline,
        location: profile.location,
        phone: profile.phone,
        yearsOfExperience: profile.yearsOfExperience,
        skills: profile.skills.join(', '),
      });
    });
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const profile = this.profile();
    if (!file || !profile) {
      return;
    }

    const rejection = resumeRejectionReason(file);
    if (rejection) {
      this.fileError.set(rejection);
      input.value = '';
      return;
    }

    this.fileError.set('');
    this.candidateStore.update(profile.id, {
      resume: {
        name: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        url: URL.createObjectURL(file),
      },
    });

    this.notifications.success('CV updated.');
  }

  protected submit(): void {
    const profile = this.profile();
    if (!profile) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.candidateStore.update(profile.id, {
      headline: value.headline.trim(),
      location: value.location.trim(),
      phone: value.phone.trim(),
      yearsOfExperience: value.yearsOfExperience,
      skills: value.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
    });

    this.notifications.success('Profile saved.');
  }
}
