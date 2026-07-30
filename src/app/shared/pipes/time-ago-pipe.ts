import { Pipe, PipeTransform } from '@angular/core';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Formats an ISO timestamp as a relative label: `3 days ago`. */
@Pipe({ name: 'timeAgo' })
export class TimeAgoPipe implements PipeTransform {
  private readonly formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '—';
    }

    const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return '—';
    }

    const elapsed = timestamp - Date.now();
    const magnitude = Math.abs(elapsed);

    if (magnitude < HOUR) {
      return this.formatter.format(Math.round(elapsed / MINUTE), 'minute');
    }
    if (magnitude < DAY) {
      return this.formatter.format(Math.round(elapsed / HOUR), 'hour');
    }
    if (magnitude < 30 * DAY) {
      return this.formatter.format(Math.round(elapsed / DAY), 'day');
    }

    return this.formatter.format(Math.round(elapsed / (30 * DAY)), 'month');
  }
}
