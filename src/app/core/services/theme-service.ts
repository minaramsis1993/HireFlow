import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'hireflow.theme';

/**
 * Drives the CSS `color-scheme` on `<body>`, which is what the Material 3
 * system variables key off. The choice is persisted per browser.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly mode = signal<ThemeMode>(this.readStoredMode());

  constructor() {
    effect(() => {
      const mode = this.mode();
      this.document.body.style.colorScheme = mode;
      this.document.body.dataset['theme'] = mode;
      localStorage.setItem(STORAGE_KEY, mode);
    });
  }

  toggle(): void {
    this.mode.update((mode) => (mode === 'light' ? 'dark' : 'light'));
  }

  private readStoredMode(): ThemeMode {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
