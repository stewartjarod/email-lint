import { describe, expect, it } from 'vitest';

import type { LintResult } from '../types.ts';
import { formatGitHub } from './github.ts';

const makeResult = (): LintResult => ({
  diagnostics: [
    {
      severity: 'error',
      title: 'background-image',
      message: 'background-image is not supported',
      notes: [],
      support: 'none',
      family: 'outlook',
      variants: ['windows'],
      familySize: 5,
      position: {
        start: { line: 1, column: 12 },
        end: { line: 1, column: 45 },
      },
    },
    {
      severity: 'warning',
      title: 'gap',
      message: 'gap is partially supported',
      notes: [],
      support: 'partial',
      family: 'gmail',
      variants: ['android'],
      familySize: 4,
      position: {
        start: { line: 3, column: 5 },
        end: { line: 3, column: 20 },
      },
    },
  ],
  errorCount: 1,
  warningCount: 1,
  success: false,
  filePath: 'email.html',
});

describe('formatGitHub', () => {
  it('outputs ::error annotation for error-severity diagnostics', () => {
    const output = formatGitHub([makeResult()]);
    const lines = output.split('\n');

    const errorLine = lines.find((l) => l.startsWith('::error'));
    expect(errorLine).toBeDefined();
    expect(errorLine).toContain('file=email.html');
    expect(errorLine).toContain('line=1');
    expect(errorLine).toContain('col=12');
    expect(errorLine).toContain('background-image is not supported');
    expect(errorLine).toContain('[outlook 1/5]');
  });

  it('outputs ::warning annotation for warning-severity diagnostics', () => {
    const output = formatGitHub([makeResult()]);
    const lines = output.split('\n');

    const warningLine = lines.find((l) => l.startsWith('::warning'));
    expect(warningLine).toBeDefined();
    expect(warningLine).toContain('file=email.html');
    expect(warningLine).toContain('line=3');
    expect(warningLine).toContain('col=5');
    expect(warningLine).toContain('gap is partially supported');
    expect(warningLine).toContain('[gmail 1/4]');
  });

  it('includes title=<feature> parameter on each annotation', () => {
    const output = formatGitHub([makeResult()]);

    expect(output).toContain('title=background-image');
    expect(output).toContain('title=gap');
  });
});
