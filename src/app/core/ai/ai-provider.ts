import { Job } from '@core/models';

/** Everything an evaluation is derived from. The CV text is the primary input. */
export interface EvaluationContext {
  readonly job: Job;
  /** Plain text extracted from the candidate's PDF CV. */
  readonly resumeText: string;
}

/**
 * A prompt ready to send to a model.
 *
 * `system`/`user` are what a real provider puts on the wire. `context` carries
 * the structured source alongside them, so a provider that supports schema-
 * constrained output (Claude tool use, OpenAI structured outputs) can build a
 * typed request instead of re-parsing its own prompt text.
 */
export interface AiPrompt {
  readonly system: string;
  readonly user: string;
  readonly context: EvaluationContext;
}

/**
 * The one seam between HireFlow and a language model.
 *
 * Implementations do exactly one thing: send a prompt, return the model's raw
 * text. They never parse, validate or interpret it — `parseAiEvaluation` owns
 * that, so every provider gets identical guarantees. Swapping to OpenAI,
 * Claude, Gemini or Ollama means writing one class against this interface and
 * changing one line in `app.config.ts`.
 */
export interface IAiProvider {
  /** Identifies the model in stored evaluations. */
  readonly model: string;

  /** Resolves with the model's raw response, expected to be JSON. */
  complete(prompt: AiPrompt): Promise<string>;
}

/**
 * Abstract class form of {@link IAiProvider}, so the contract doubles as an
 * Angular DI token — the same pattern the rest of `core/` uses.
 */
export abstract class AiProvider implements IAiProvider {
  abstract readonly model: string;

  abstract complete(prompt: AiPrompt): Promise<string>;
}
