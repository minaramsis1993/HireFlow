import { TimeAgoPipe } from '@shared/pipes/time-ago-pipe';

describe('TimeAgoPipe', () => {
  const pipe = new TimeAgoPipe();

  it('returns a dash for empty or invalid input', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform('')).toBe('—');
    expect(pipe.transform('not-a-date')).toBe('—');
  });

  it('formats recent timestamps in minutes', () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
    expect(pipe.transform(tenMinutesAgo)).toContain('minute');
  });

  it('formats day-old timestamps in days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString();
    expect(pipe.transform(threeDaysAgo)).toContain('day');
  });

  it('accepts Date instances', () => {
    expect(pipe.transform(new Date())).toBeTruthy();
  });
});
