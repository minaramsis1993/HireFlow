import { NgTemplateOutlet } from '@angular/common';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
  TemplateRef,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Delay before closing, so the pointer can travel from the card to the panel. */
const CLOSE_DELAY_MS = 120;

let nextPanelId = 0;

/**
 * Single headline metric for the dashboard.
 *
 * Pass a `<ng-template>` to `details` to get a hover/focus panel with the
 * breakdown behind the number. The panel renders in a CDK overlay so it is
 * never clipped by the surrounding grid and flips above the card when there
 * is no room below.
 */
@Component({
  selector: 'app-stat-card',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, MatIconModule, NgTemplateOutlet],
  template: `
    <div
      class="stat"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      [class.stat--interactive]="details()"
      [attr.tabindex]="details() ? 0 : null"
      [attr.aria-describedby]="open() ? panelId : null"
      (mouseenter)="show()"
      (mouseleave)="scheduleHide()"
      (focus)="show()"
      (blur)="hide()"
      (keydown.escape)="hide()"
    >
      <div class="stat__icon" aria-hidden="true">
        <mat-icon>{{ icon() }}</mat-icon>
      </div>
      <div>
        <p class="stat__value">{{ value() }}</p>
        <p class="stat__label">{{ label() }}</p>
      </div>
    </div>

    @if (details(); as detailTemplate) {
      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="origin"
        [cdkConnectedOverlayOpen]="open()"
        [cdkConnectedOverlayPositions]="positions"
        [cdkConnectedOverlayPush]="true"
        (detach)="hide()"
      >
        <div
          class="stat-panel"
          role="tooltip"
          [id]="panelId"
          (mouseenter)="show()"
          (mouseleave)="scheduleHide()"
        >
          <p class="stat-panel__title">{{ label() }}</p>
          <ng-container [ngTemplateOutlet]="detailTemplate" />
        </div>
      </ng-template>
    }
  `,
  styleUrl: './stat-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input<string>('insights');
  /** Optional breakdown shown on hover or keyboard focus. */
  readonly details = input<TemplateRef<unknown>>();

  protected readonly open = signal(false);
  protected readonly panelId = `stat-panel-${nextPanelId++}`;

  // `cdkConnectedOverlayPositions` takes a mutable array, so this cannot be `readonly`.
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  ];

  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.closeTimer));
  }

  protected show(): void {
    clearTimeout(this.closeTimer);
    if (this.details()) {
      this.open.set(true);
    }
  }

  protected hide(): void {
    clearTimeout(this.closeTimer);
    this.open.set(false);
  }

  protected scheduleHide(): void {
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => this.open.set(false), CLOSE_DELAY_MS);
  }
}
