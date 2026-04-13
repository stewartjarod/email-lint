import { describe, expect, it } from 'vitest';

import type { LintResult } from '../types.ts';
import { formatJson } from './json.ts';

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
  ],
  errorCount: 1,
  warningCount: 0,
  success: false,
  filePath: 'email.html',
});

describe('formatJson', () => {
  it('outputs valid JSON that round-trips to LintResult[]', () => {
    const results = [makeResult()];
    const output = formatJson(results);

    const parsed = JSON.parse(output) as LintResult[];
    expect(parsed).toEqual(results);
    expect(parsed[0].diagnostics[0].family).toBe('outlook');
    expect(parsed[0].diagnostics[0].variants).toEqual(['windows']);
    expect(parsed[0].errorCount).toBe(1);
  });
});
