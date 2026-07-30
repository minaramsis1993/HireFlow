import { inject, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { JobStore } from '@core/services/job-store';
import { ApplyDialog, ApplySubmission } from './apply-dialog';

describe('ApplyDialog', () => {
  let fixture: ComponentFixture<ApplyDialog>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<ApplyDialog, ApplySubmission>>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<ApplyDialog, ApplySubmission>>('MatDialogRef', [
      'close',
    ]);

    await TestBed.configureTestingModule({
      imports: [ApplyDialog],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useFactory: () => ({ job: inject(JobStore).openJobs()[0] }) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplyDialog);
    await fixture.whenStable();
  });

  async function attach(name: string, type: string, size = 1024): Promise<void> {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    const file = new File([new Uint8Array(size)], name, { type });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  function submitButton(): HTMLButtonElement {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Submit application'),
    )!;
  }

  it('cannot be submitted without a CV', () => {
    expect(submitButton().disabled).toBeTrue();
  });

  it('rejects anything that is not a PDF', async () => {
    await attach('cv.docx', 'application/msword');

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Only PDF files are accepted',
    );
    expect(submitButton().disabled).toBeTrue();
  });

  it('rejects a file over the size limit', async () => {
    await attach('cv.pdf', 'application/pdf', 6 * 1024 * 1024);

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Keep the file under',
    );
  });

  it('returns the CV descriptor and a trimmed cover letter', async () => {
    await attach('amara-bello.pdf', 'application/pdf');

    expect(fixture.nativeElement.textContent).toContain('amara-bello.pdf');
    expect(submitButton().disabled).toBeFalse();

    const letter: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    letter.value = '  Excited about this one.  ';
    letter.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    submitButton().click();
    await fixture.whenStable();

    expect(dialogRef.close).toHaveBeenCalledTimes(1);
    const submission = dialogRef.close.calls.mostRecent().args[0] as ApplySubmission;
    expect(submission.coverLetter).toBe('Excited about this one.');
    expect(submission.resume.name).toBe('amara-bello.pdf');
    expect(submission.resume.mimeType).toBe('application/pdf');
    expect(submission.resume.url).toBeTruthy();
  });
});
