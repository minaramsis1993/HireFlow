import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CandidateStore } from '@core/services/candidate-store';
import { CandidateDetail } from './candidate-detail';

describe('CandidateDetail', () => {
  let fixture: ComponentFixture<CandidateDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateDetail],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CandidateDetail);
  });

  it('renders the profile for the routed id', async () => {
    const candidate = TestBed.inject(CandidateStore).candidates()[0];
    fixture.componentRef.setInput('id', candidate.id);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain(candidate.firstName);
    expect(fixture.nativeElement.textContent).toContain(candidate.email);
  });

  it('falls back to an empty state for an unknown id', async () => {
    fixture.componentRef.setInput('id', 'cand-does-not-exist');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Candidate not found');
  });
});
