import { Injectable } from '@angular/core';

import { PIPELINE_STAGES, RESUME_TEXT_LIMIT } from '@core/models';
import { AiPrompt, EvaluationContext } from '@core/ai/ai-provider';

/**
 * Turns a job and an extracted CV into a prompt.
 *
 * Pure and dependency-free: the same context always produces the same prompt,
 * which is what makes provider behaviour comparable when the mock is swapped
 * for a real model.
 */
@Injectable({ providedIn: 'root' })
export class PromptBuilderService {
  build(context: EvaluationContext): AiPrompt {
    return {
      system: this.system(),
      user: this.user(context),
      context,
    };
  }

  private system(): string {
    const stages = PIPELINE_STAGES.map((stage) => `"${stage}"`).join(' | ');

    return [
      'You are an experienced technical recruiter screening a candidate for a specific role.',
      'Judge the candidate only on evidence present in the résumé text you are given.',
      'Do not invent experience that is not written there, and treat an omission as a gap.',
      '',
      'Respond with a single JSON object and nothing else. No prose, no code fences.',
      '',
      'Schema:',
      '{',
      '  "rating": number,              // 1-5 overall, matching a recruiter scorecard',
      '  "matchScore": number,          // 0-100 fit against the job description',
      '  "summary": string,             // 2-3 sentences a recruiter can act on',
      '  "strengths": string[],         // evidenced in the résumé, cite what you saw',
      '  "weaknesses": string[],        // requirements the résumé does not support',
      '  "missingSkills": string[],     // short skill names only, e.g. "AWS", "GraphQL"',
      `  "recommendedStage": ${stages},`,
      '  "interviewQuestions": string[] // 3-5 questions probing the gaps you found',
      '}',
    ].join('\n');
  }

  private user(context: EvaluationContext): string {
    const { job, resumeText } = context;

    const requirements = job.requirements.length
      ? job.requirements.map((requirement) => `- ${requirement}`).join('\n')
      : '- None specified.';

    const trimmed = resumeText.trim();
    const truncated = trimmed.length > RESUME_TEXT_LIMIT;
    const resume = truncated ? trimmed.slice(0, RESUME_TEXT_LIMIT) : trimmed;

    return [
      `# Job Title\n${job.title}`,
      `# Job Description\n${job.description}`,
      `# Required Skills\n${requirements}`,
      `# Candidate Résumé\n${resume || '(No text could be extracted from the CV.)'}`,
      truncated ? '\n(Résumé truncated to fit the context window.)' : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }
}
