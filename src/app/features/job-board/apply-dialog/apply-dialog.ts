import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';

import { Job, RESUME_MIME_TYPE, ResumeFile, resumeRejectionReason } from '@core/models';
import { ResumeChip } from '@shared/ui/resume-chip/resume-chip';

export interface ApplyDialogData {
  readonly job: Job;
}

export interface ApplySubmission {
  readonly resume: ResumeFile;
  readonly coverLetter: string;
  /**
   * The uploaded PDF itself. `ResumeFile` keeps metadata only, so this is the
   * one moment the bytes are reachable — AI screening reads its text here or
   * not at all.
   */
  readonly file: File;
}

/**
 * Apply flow: attach a PDF CV, optionally write a cover letter, submit.
 *
 * Only the file descriptor leaves this dialog. The bytes stay in an object URL
 * for the life of the tab, which is enough for a recruiter to open the CV and
 * changes to a signed storage URL the day uploads hit a real API.
 */
@Component({
  selector: 'app-apply-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
    ResumeChip,
  ],
  template: `
    <h2 mat-dialog-title>Apply for {{ data.job.title }}</h2>

    <mat-dialog-content>
      <p class="apply__meta">{{ data.job.department }} · {{ data.job.location }}</p>

      <input
        #fileInput
        hidden
        type="file"
        [accept]="acceptedType"
        (change)="onFileSelected($event)"
      />

      <div class="apply__upload">
        <button matButton="outlined" type="button" (click)="fileInput.click()">
          <mat-icon>upload_file</mat-icon>
          {{ resume() ? 'Replace CV' : 'Upload CV (PDF)' }}
        </button>

        @if (resume(); as attached) {
          <app-resume-chip [resume]="attached" />
        }
      </div>

      @if (fileError()) {
        <p class="apply__error" role="alert">{{ fileError() }}</p>
      }

      <form [formGroup]="form">
        <mat-form-field class="apply__letter">
          <mat-label>Cover letter (optional)</mat-label>
          <textarea
            matInput
            rows="6"
            formControlName="coverLetter"
            placeholder="Why this role, and what you would bring to it."
          ></textarea>
          @if (form.controls.coverLetter.hasError('maxlength')) {
            <mat-error>Keep the cover letter under 2000 characters.</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button matButton type="button" (click)="dialogRef.close()">Cancel</button>
      <button matButton="filled" type="button" [disabled]="!resume()" (click)="submit()">
        Submit application
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .apply__meta {
      margin: 0 0 1rem;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }

    .apply__upload {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .apply__error {
      margin: 0 0 0.5rem;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-error);
    }

    .apply__letter {
      width: 100%;
      margin-top: 0.75rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplyDialog {
  private readonly formBuilder = inject(FormBuilder);

  protected readonly dialogRef = inject<MatDialogRef<ApplyDialog, ApplySubmission>>(MatDialogRef);
  protected readonly data = inject<ApplyDialogData>(MAT_DIALOG_DATA);

  protected readonly acceptedType = RESUME_MIME_TYPE;
  protected readonly resume = signal<ResumeFile | null>(null);
  protected readonly fileError = signal('');

  /** Held alongside `resume` so the raw PDF can be screened after submission. */
  private readonly file = signal<File | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    coverLetter: ['', Validators.maxLength(2000)],
  });

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const rejection = resumeRejectionReason(file);
    if (rejection) {
      this.fileError.set(rejection);
      this.resume.set(null);
      this.file.set(null);
      input.value = '';
      return;
    }

    this.fileError.set('');
    this.file.set(file);
    this.resume.set({
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      url: URL.createObjectURL(file),
    });
  }

  protected submit(): void {
    const resume = this.resume();
    const file = this.file();
    if (!resume || !file) {
      this.fileError.set('Attach your CV as a PDF to apply.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      resume,
      file,
      coverLetter: this.form.getRawValue().coverLetter.trim(),
    });
  }
}

/** Opens the apply dialog; resolves to `undefined` when the candidate backs out. */
export function openApplyDialog(
  dialog: MatDialog,
  data: ApplyDialogData,
): Promise<ApplySubmission | undefined> {
  const ref = dialog.open<ApplyDialog, ApplyDialogData, ApplySubmission>(ApplyDialog, {
    data,
    width: '34rem',
    autoFocus: 'dialog',
  });

  return firstValueFrom(ref.afterClosed());
}
