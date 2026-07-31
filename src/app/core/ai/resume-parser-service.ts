import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/** Plain-text form of an uploaded CV. */
export interface ParsedResume {
  readonly text: string;
  readonly pageCount: number;
}

/** Raised for a CV that yields no usable text, so the UI can explain why. */
export class ResumeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResumeParseError';
  }
}

/**
 * Extracts plain text from a PDF CV.
 *
 * This is the primary evidence the whole screening pipeline runs on — the
 * evaluation and its rating are derived from what is actually written in the
 * candidate's résumé, not from the skills already stored on their profile.
 *
 * `pdfjs-dist` is loaded with a dynamic `import()` so it stays in its own lazy
 * chunk and never counts against the 750 kB initial bundle. Its worker is
 * copied into the build output by the `assets` entry in `angular.json`.
 */
@Injectable({ providedIn: 'root' })
export class ResumeParserService {
  private readonly document = inject(DOCUMENT);

  private workerConfigured = false;

  async parse(file: File): Promise<ParsedResume> {
    const pdfjs = await import('pdfjs-dist');

    if (!this.workerConfigured) {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdf.worker.min.mjs',
        this.document.baseURI,
      ).href;
      this.workerConfigured = true;
    }

    const data = new Uint8Array(await file.arrayBuffer());

    let document: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;
    try {
      document = await pdfjs.getDocument({ data }).promise;
    } catch (cause) {
      throw new ResumeParseError(
        `This PDF could not be opened${cause instanceof Error ? `: ${cause.message}` : '.'}`,
      );
    }

    try {
      const pages: string[] = [];

      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();

        // `items` mixes text runs with marked-content markers; only runs have `str`.
        pages.push(
          content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
            .trim(),
        );
      }

      const text = collapseWhitespace(pages.join('\n\n'));
      if (!text) {
        throw new ResumeParseError(
          'No selectable text was found — this CV may be a scan or an image-only PDF.',
        );
      }

      return { text, pageCount: document.numPages };
    } finally {
      await document.destroy();
    }
  }
}

/**
 * PDF text extraction is full of stray spacing; squash it to readable prose.
 *
 * `\u00a0` is the non-breaking space PDFs are littered with, written as an
 * escape so the source stays free of invisible characters.
 */
function collapseWhitespace(value: string): string {
  return value
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
