import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { JobStore } from '@core/services/job-store';
import { Dashboard } from './dashboard';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  function cards(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.stat'));
  }

  /** Overlay content is attached to the body, not to the fixture element. */
  function panel(): HTMLElement | null {
    return document.querySelector('.stat-panel');
  }

  async function hover(index: number): Promise<void> {
    cards()[index].dispatchEvent(new MouseEvent('mouseenter'));
    await fixture.whenStable();
  }

  it('renders the four headline metrics', () => {
    expect(cards().length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('Open roles');
    expect(fixture.nativeElement.textContent).toContain('Active in pipeline');
  });

  it('shows no panel until a card is hovered', () => {
    expect(panel()).toBeNull();
  });

  it('opens the open-roles breakdown on hover', async () => {
    await hover(0);

    expect(panel()).not.toBeNull();
    expect(panel()!.textContent).toContain('Applicants per open role');

    // Every open requisition is listed, capped at five rows.
    const openJobs = TestBed.inject(JobStore).openJobs();
    expect(panel()!.textContent).toContain(openJobs[0].title);
  });

  it('opens the candidate source breakdown on the second card', async () => {
    await hover(1);

    expect(panel()!.textContent).toContain('Where candidates came from');
    expect(panel()!.textContent).toContain('Referral');
  });

  it('closes the panel on Escape', async () => {
    await hover(0);
    expect(panel()).not.toBeNull();

    cards()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('opens on keyboard focus so the panel is not mouse-only', async () => {
    cards()[3].dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();

    expect(panel()!.textContent).toContain('Most recent hires');
  });

  it('exposes the open panel to assistive tech via aria-describedby', async () => {
    await hover(0);

    const describedBy = cards()[0].getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(panel()!.id).toBe(describedBy!);
    expect(panel()!.getAttribute('role')).toBe('tooltip');
  });
});
