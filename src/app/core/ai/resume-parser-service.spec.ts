import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ResumeParseError, ResumeParserService } from '@core/ai/resume-parser-service';

/**
 * A hand-built one-page PDF with a single line of selectable text.
 *
 * The xref table is deliberately left with placeholder offsets — pdfjs
 * reconstructs it, which is the same recovery path real-world CVs exercise.
 */
function pdfWithText(text: string): File {
  const content = `BT /F1 12 Tf 20 100 Td (${text}) Tj ET`;
  const body = [
    '%PDF-1.4',
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] ' +
      '/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj',
    `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    'trailer\n<< /Size 6 /Root 1 0 R >>',
    '%%EOF',
  ].join('\n');

  return new File([new Blob([body])], 'cv.pdf', { type: 'application/pdf' });
}

// Loads the real pdfjs bundle and its worker — this is the one spec that proves
// the parsing path actually works in a browser, rather than stubbing it out.
describe('ResumeParserService', () => {
  let parser: ResumeParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    parser = TestBed.inject(ResumeParserService);
  });

  it('extracts the text of a real PDF', async () => {
    const parsed = await parser.parse(pdfWithText('Angular TypeScript design systems'));

    expect(parsed.text).toContain('Angular');
    expect(parsed.text).toContain('TypeScript');
    expect(parsed.text).toContain('design systems');
    expect(parsed.pageCount).toBe(1);
  });

  it('reuses the loaded worker across calls', async () => {
    await parser.parse(pdfWithText('First CV'));
    const second = await parser.parse(pdfWithText('Second CV'));

    expect(second.text).toContain('Second CV');
  });

  it('explains a PDF with no selectable text instead of returning nothing', async () => {
    await expectAsync(parser.parse(pdfWithText(''))).toBeRejectedWithError(
      ResumeParseError,
      /No selectable text/,
    );
  });

  it('explains a file that is not a PDF at all', async () => {
    const notAPdf = new File([new Blob(['just some words'])], 'cv.pdf', {
      type: 'application/pdf',
    });

    await expectAsync(parser.parse(notAPdf)).toBeRejectedWithError(ResumeParseError);
  });
});
