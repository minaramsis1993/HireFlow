import { Injectable } from '@angular/core';

import { candidateFullName, ResumeFile } from '@core/models';
import {
  AiEvaluation,
  AiEvaluationRequest,
  AiEvaluationService,
  ResumeExtraction,
} from '@core/ai/ai-evaluation-service';

/**
 * Placeholder implementation of {@link AiEvaluationService}.
 *
 * It does keyword overlap between the candidate's skills and the job
 * requirements — no model call, no network. The point is that the shapes it
 * returns are the shapes a real provider will return, so the swap is a
 * one-line provider change in `app.config.ts`.
 */
@Injectable({ providedIn: 'root' })
export class MockAiEvaluationService extends AiEvaluationService {
  async extractResumeText(resume: ResumeFile): Promise<ResumeExtraction> {
    return {
      text: `Placeholder extraction for ${resume.name}. Real parsing arrives with the API.`,
      skills: [],
      yearsOfExperience: null,
    };
  }

  async evaluate(request: AiEvaluationRequest): Promise<AiEvaluation> {
    const { job, candidate } = request;

    const requirements = job.requirements.map(normalize);
    const skills = candidate.skills.map(normalize);
    const matched = job.requirements.filter((requirement, index) =>
      skills.some(
        (skill) => requirements[index].includes(skill) || skill.includes(requirements[index]),
      ),
    );

    const coverage = job.requirements.length ? matched.length / job.requirements.length : 0;
    const matchScore = Math.round(coverage * 100);

    return {
      summary:
        `${candidateFullName(candidate)} covers ${matched.length} of ${job.requirements.length} ` +
        `requirements for ${job.title}, with ${candidate.yearsOfExperience} years of experience.`,
      matchScore,
      suggestedRating: Math.min(5, Math.max(1, Math.round(coverage * 4) + 1)),
      strengths: matched,
      gaps: job.requirements.filter((requirement) => !matched.includes(requirement)),
      interviewQuestions: [
        `Walk through a project where you applied ${job.requirements[0] ?? 'the core skills for this role'}.`,
        `How would you approach the first 90 days as a ${job.title}?`,
        'Describe a time your work was blocked by another team. What did you do?',
      ],
      model: 'mock',
      generatedAt: new Date().toISOString(),
    };
  }
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
