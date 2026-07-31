import { Injectable } from '@angular/core';

import { PipelineStage } from '@core/models';
import { AiPrompt, AiProvider, EvaluationContext } from '@core/ai/ai-provider';

/** How much of a requirement's vocabulary must appear in the CV to count. */
const EVIDENCE_THRESHOLD = 0.5;

/** A CV shorter than this reads as a stub rather than a real document. */
const THIN_RESUME_WORDS = 120;

/**
 * Words that say nothing about capability. Dropping them is what stops
 * "5+ years of strong experience with Angular" from matching every CV that
 * happens to contain the word "experience".
 */
const STOP_WORDS = new Set([
  'a',
  'ability',
  'able',
  'and',
  'an',
  'as',
  'at',
  'background',
  'be',
  'building',
  'built',
  'deep',
  'demonstrated',
  'excellent',
  'experience',
  'experienced',
  'familiar',
  'familiarity',
  'for',
  'good',
  'have',
  'hands',
  'in',
  'is',
  'knowledge',
  'level',
  'of',
  'on',
  'or',
  'plus',
  'proven',
  'skills',
  'solid',
  'strong',
  'the',
  'to',
  'understanding',
  'using',
  'with',
  'work',
  'working',
  'year',
  'years',
  'yrs',
]);

interface RequirementVerdict {
  readonly requirement: string;
  readonly terms: readonly string[];
  readonly matchedTerms: readonly string[];
  readonly missingTerms: readonly string[];
  readonly met: boolean;
}

/**
 * Stand-in for a real language model.
 *
 * It scores the **text extracted from the CV** against the job's requirements —
 * the same evidence a real model is given — so a résumé that never mentions the
 * required skills scores badly, exactly as it should. No network, no API key.
 *
 * Like a real provider it returns a JSON *string*, so `parseAiEvaluation` runs
 * on this path too and the validation code is exercised in development.
 */
@Injectable({ providedIn: 'root' })
export class MockAiProvider extends AiProvider {
  readonly model = 'mock-screener-v1';

  async complete(prompt: AiPrompt): Promise<string> {
    // A beat of latency so the pending state is observable in the UI.
    await new Promise((resolve) => setTimeout(resolve, 600));

    return JSON.stringify(this.evaluate(prompt.context));
  }

  private evaluate(context: EvaluationContext): Record<string, unknown> {
    const { job, resumeText } = context;

    const haystack = normalize(resumeText);
    const wordCount = haystack.split(' ').filter(Boolean).length;
    const verdicts = job.requirements.map((requirement) => assess(requirement, haystack));

    const met = verdicts.filter((verdict) => verdict.met);
    const unmet = verdicts.filter((verdict) => !verdict.met);
    const coverage = verdicts.length ? met.length / verdicts.length : 0;

    const matchScore = scoreOf(coverage, wordCount, yearsOfExperienceIn(haystack));
    const missingSkills = dedupe(unmet.flatMap((verdict) => verdict.missingTerms)).slice(0, 6);

    return {
      rating: ratingOf(matchScore),
      matchScore,
      summary: summarize(job.title, met.length, verdicts.length, matchScore, wordCount, haystack),
      strengths: met.map(
        (verdict) => `${verdict.requirement} — CV mentions ${verdict.matchedTerms.join(', ')}.`,
      ),
      weaknesses: weaknessesFor(unmet, wordCount),
      missingSkills,
      recommendedStage: stageOf(matchScore),
      interviewQuestions: questionsFor(job.title, met, missingSkills),
    };
  }
}

/** Lowercases and reduces the CV to space-separated word characters. */
function normalize(value: string): string {
  return ` ${value
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim()} `;
}

/** Pulls the meaningful vocabulary out of one requirement line. */
function significantTerms(requirement: string): readonly string[] {
  return dedupe(
    requirement
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .map((term) => term.replace(/^\.+|\.+$/g, ''))
      .filter((term) => term.length > 1 && !STOP_WORDS.has(term) && !/^\d/.test(term)),
  );
}

function assess(requirement: string, haystack: string): RequirementVerdict {
  const terms = significantTerms(requirement);
  const matchedTerms = terms.filter((term) => haystack.includes(` ${term} `));
  const missingTerms = terms.filter((term) => !matchedTerms.includes(term));

  return {
    requirement,
    terms,
    matchedTerms,
    missingTerms,
    met: terms.length > 0 && matchedTerms.length / terms.length >= EVIDENCE_THRESHOLD,
  };
}

/**
 * Requirement coverage carries the score; CV depth and stated experience only
 * nudge it, so a keyword-stuffed one-liner can't reach the top band.
 */
function scoreOf(coverage: number, wordCount: number, years: number): number {
  const depthBonus = Math.min(10, Math.round(wordCount / 120));
  const experienceBonus = Math.min(5, years);

  return Math.max(0, Math.min(100, Math.round(coverage * 85 + depthBonus + experienceBonus)));
}

function ratingOf(matchScore: number): number {
  if (matchScore >= 85) return 5;
  if (matchScore >= 70) return 4;
  if (matchScore >= 50) return 3;
  if (matchScore >= 30) return 2;
  return 1;
}

function stageOf(matchScore: number): PipelineStage {
  if (matchScore >= 75) return 'interview';
  if (matchScore >= 45) return 'screening';
  return 'rejected';
}

/** Highest "N years"/"N yrs" figure stated anywhere in the CV. */
function yearsOfExperienceIn(haystack: string): number {
  const matches = [...haystack.matchAll(/(\d{1,2})\s*\+?\s*(?:years|yrs)/g)];
  return matches.reduce((highest, match) => Math.max(highest, Number(match[1])), 0);
}

function summarize(
  jobTitle: string,
  metCount: number,
  totalCount: number,
  matchScore: number,
  wordCount: number,
  haystack: string,
): string {
  if (wordCount === 0) {
    return `No readable text was found in this CV, so it could not be assessed against ${jobTitle}.`;
  }

  const years = yearsOfExperienceIn(haystack);
  const experience = years > 0 ? ` The CV states around ${years} years of experience.` : '';
  const verdict =
    matchScore >= 75
      ? 'A strong fit worth moving forward quickly.'
      : matchScore >= 45
        ? 'A partial fit — worth a screening call to probe the gaps.'
        : 'Weak evidence of the core requirements for this role.';

  return (
    `The CV evidences ${metCount} of ${totalCount} requirements for ${jobTitle}, ` +
    `giving a ${matchScore}% match.${experience} ${verdict}`
  );
}

function weaknessesFor(unmet: readonly RequirementVerdict[], wordCount: number): readonly string[] {
  const gaps = unmet.map((verdict) => `No evidence of "${verdict.requirement}" in the CV.`);

  if (wordCount > 0 && wordCount < THIN_RESUME_WORDS) {
    gaps.push('The CV is very short, so there is little detail to assess.');
  }

  return gaps;
}

function questionsFor(
  jobTitle: string,
  met: readonly RequirementVerdict[],
  missingSkills: readonly string[],
): readonly string[] {
  const questions: string[] = [];

  const evidenced = met[0]?.matchedTerms[0];
  if (evidenced) {
    questions.push(
      `Your CV mentions ${evidenced} — walk us through the project where you used it most heavily.`,
    );
  }

  if (missingSkills[0]) {
    questions.push(
      `We didn't see ${missingSkills[0]} anywhere in your CV. What exposure have you had to it?`,
    );
  }

  questions.push(`How would you approach your first 90 days as a ${jobTitle}?`);
  questions.push('Describe a time your work was blocked by another team. What did you do?');

  return questions;
}

function dedupe(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
