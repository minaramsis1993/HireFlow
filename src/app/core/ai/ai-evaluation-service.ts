import { inject, Injectable, signal } from '@angular/core';

import { AiScreeningState, IDLE_SCREENING_STATE, Job, parseAiEvaluation } from '@core/models';
import { AiProvider } from '@core/ai/ai-provider';
import { PromptBuilderService } from '@core/ai/prompt-builder-service';
import { ResumeParserService } from '@core/ai/resume-parser-service';
import { ApplicationStore } from '@core/services/application-store';
import { JobStore } from '@core/services/job-store';

export interface ScreeningRequest {
  readonly applicationId: string;
  readonly job: Job;
  /** The uploaded PDF, still in memory at submission time. */
  readonly file: File;
}

/**
 * Runs the screening pipeline, and is the only AI class a component touches:
 *
 * ```
 * PDF → ResumeParserService → PromptBuilderService → AiProvider → AiEvaluation
 *     → ApplicationStore.attachEvaluation()
 * ```
 *
 * The finished evaluation is persisted on the application; in-flight progress
 * lives here, keyed by application id, so nothing AI-shaped leaks into
 * `ApplicationStore`.
 */
@Injectable({ providedIn: 'root' })
export class AiEvaluationService {
  private readonly parser = inject(ResumeParserService);
  private readonly prompts = inject(PromptBuilderService);
  private readonly provider = inject(AiProvider);
  private readonly applications = inject(ApplicationStore);
  private readonly jobs = inject(JobStore);

  private readonly states = signal<Readonly<Record<string, AiScreeningState>>>({});

  /**
   * Progress for one application; drives the card's spinner and error.
   * Reads inside a template or `computed` stay reactive, as with `byId` on the
   * stores.
   */
  stateFor(applicationId: string): AiScreeningState {
    return this.states()[applicationId] ?? IDLE_SCREENING_STATE;
  }

  /**
   * Full run for a freshly submitted application: read the PDF, then evaluate.
   *
   * Never rejects. It is started without `await` from the apply flow so the
   * candidate is not blocked, which means a failure has to land in `states`
   * rather than become an unhandled rejection.
   */
  async screen(request: ScreeningRequest): Promise<void> {
    const { applicationId, job, file } = request;

    this.setState(applicationId, { phase: 'parsing', error: null });

    let resumeText: string;
    try {
      resumeText = (await this.parser.parse(file)).text;
    } catch (cause) {
      this.fail(applicationId, cause, 'The CV could not be read.');
      return;
    }

    await this.evaluate(applicationId, job, resumeText);
  }

  /**
   * Re-runs the evaluation from the text already stored on the application.
   *
   * This is what makes the recruiter's "Re-run" button work after a reload:
   * by then the uploaded `File` is gone and its object URL is dead, but the
   * extracted text was persisted, so parsing is skipped entirely.
   */
  async reEvaluate(applicationId: string): Promise<void> {
    const application = this.applications.applications().find((row) => row.id === applicationId);
    const job = application ? this.jobs.byId(application.jobId) : undefined;

    if (!application || !job) {
      this.setState(applicationId, {
        phase: 'failed',
        error: 'This application is no longer available.',
      });
      return;
    }

    if (!application.resumeText) {
      this.setState(applicationId, {
        phase: 'failed',
        error: 'No CV text is stored for this application, so it cannot be re-evaluated.',
      });
      return;
    }

    await this.evaluate(applicationId, job, application.resumeText);
  }

  private async evaluate(applicationId: string, job: Job, resumeText: string): Promise<void> {
    this.setState(applicationId, { phase: 'evaluating', error: null });

    try {
      const prompt = this.prompts.build({ job, resumeText });
      const raw = await this.provider.complete(prompt);
      const evaluation = parseAiEvaluation(raw, this.provider.model);

      this.applications.attachEvaluation(applicationId, evaluation, resumeText);
      this.setState(applicationId, { phase: 'ready', error: null });
    } catch (cause) {
      this.fail(applicationId, cause, 'The evaluation could not be completed.');
    }
  }

  private fail(applicationId: string, cause: unknown, fallback: string): void {
    this.setState(applicationId, {
      phase: 'failed',
      error: cause instanceof Error ? cause.message : fallback,
    });
  }

  private setState(applicationId: string, state: AiScreeningState): void {
    this.states.update((states) => ({ ...states, [applicationId]: state }));
  }
}
