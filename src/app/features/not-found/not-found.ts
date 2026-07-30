import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { EmptyState } from '@shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-not-found',
  imports: [EmptyState, MatButtonModule, RouterLink],
  template: `
    <app-empty-state
      heading="Page not found"
      message="The page you were looking for doesn't exist or has moved."
      icon="explore_off"
    >
      <a matButton="filled" routerLink="/dashboard">Back to dashboard</a>
    </app-empty-state>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}
