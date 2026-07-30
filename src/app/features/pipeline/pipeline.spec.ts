import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PIPELINE_STAGES } from '@core/models';
import { ApplicationStore } from '@core/services/application-store';
import { Pipeline } from './pipeline';

describe('Pipeline', () => {
  let fixture: ComponentFixture<Pipeline>;
  let applicationStore: ApplicationStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pipeline],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Pipeline);
    applicationStore = TestBed.inject(ApplicationStore);
    await fixture.whenStable();
  });

  it('renders a column for every pipeline stage', () => {
    expect(fixture.nativeElement.querySelectorAll('.column').length).toBe(PIPELINE_STAGES.length);
  });

  it('renders a draggable ticket per application', () => {
    expect(fixture.nativeElement.querySelectorAll('.ticket').length).toBe(
      applicationStore.views().length,
    );
  });

  it('moves a ticket between columns when the store changes stage', async () => {
    const application = applicationStore.views().find((view) => view.stage !== 'hired')!;
    const hiredIndex = PIPELINE_STAGES.indexOf('hired');
    const columnsBefore = fixture.nativeElement.querySelectorAll('.column');
    const hiredBefore = columnsBefore[hiredIndex].querySelectorAll('.ticket').length;

    applicationStore.moveToStage(application.id, 'hired');
    await fixture.whenStable();

    const columnsAfter = fixture.nativeElement.querySelectorAll('.column');
    expect(columnsAfter[hiredIndex].querySelectorAll('.ticket').length).toBe(hiredBefore + 1);
  });
});
