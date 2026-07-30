import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

/** Thin wrapper so components never depend on snackbar configuration details. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.open(message, 'notification--success');
  }

  error(message: string): void {
    this.open(message, 'notification--error', 8000);
  }

  private open(message: string, panelClass: string, duration = 4000): void {
    this.snackBar.open(message, 'Dismiss', {
      duration,
      panelClass,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }
}
