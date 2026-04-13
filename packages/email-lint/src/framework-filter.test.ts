import { describe, expect, it } from 'vitest';

import { applyFrameworkFilter } from './framework-filter.ts';
import type { LintDiagnostic } from './types.ts';

const makeDiag = (overrides?: Partial<LintDiagnostic>): LintDiagnostic => ({
  severity: 'error',
  title: 'cursor',
  message: 'cursor not supported',
  notes: [],
  support: 'none',
  family: 'gmail',
  variants: ['android'],
  familySize: 4,
  position: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } },
  ...overrides,
});

describe('applyFrameworkFilter', () => {
  it('marks diagnostics inside a data-skip-in-text="true" preview block', () => {
    const html = [
      '<html>',
      '<body>',
      '<div data-skip-in-text="true" style="display:none">Preview text</div>',
      '</body>',
      '</html>',
    ].join('\n');

    // Position points at the preview div (line 3)
    const diag = makeDiag({
      title: 'display:none',
      position: { start: { line: 3, column: 40 }, end: { line: 3, column: 55 } },
    });

    const result = applyFrameworkFilter([diag], html, 'react-email');

    expect(result).toHaveLength(1);
    expect(result[0].suppressedByFramework).toBe(true);
    expect(result[0].frameworkRule).toBe('preview');
  });

  it('marks diagnostics inside a <link rel="preload" as="image"> tag', () => {
    const html = [
      '<html>',
      '<head>',
      '<link rel="preload" as="image" href="/hero.png" />',
      '</head>',
      '</html>',
    ].join('\n');

    // Position points at the <link> tag on line 3
    const diag = makeDiag({
      title: 'link rel="preload"',
      position: { start: { line: 3, column: 2 }, end: { line: 3, column: 45 } },
    });

    const result = applyFrameworkFilter([diag], html, 'react-email');

    expect(result[0].suppressedByFramework).toBe(true);
    expect(result[0].frameworkRule).toBe('preload-image');
  });

  it('marks <a target="_blank"> html-target diagnostics with rule "target-blank"', () => {
    const html = '<p><a href="https://example.com" target="_blank">link</a></p>';

    const diag = makeDiag({
      title: 'target attribute',
      severity: 'info',
      position: { start: { line: 1, column: 4 }, end: { line: 1, column: 50 } },
    });

    const result = applyFrameworkFilter([diag], html, 'react-email');

    expect(result[0].suppressedByFramework).toBe(true);
    expect(result[0].frameworkRule).toBe('target-blank');
  });

  it('leaves diagnostics outside any framework region untouched', () => {
    const html = '<div><p>normal content</p></div>';

    const diag = makeDiag({
      title: 'cursor',
      position: { start: { line: 1, column: 8 }, end: { line: 1, column: 22 } },
    });

    const result = applyFrameworkFilter([diag], html, 'react-email');

    expect(result[0].suppressedByFramework).toBeUndefined();
    expect(result[0].frameworkRule).toBeUndefined();
  });
});
