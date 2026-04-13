import { describe, expect, it } from 'vitest';

import type { LintResult } from '../types.ts';
import { formatPretty } from './pretty.ts';

const makeResult = (overrides?: Partial<LintResult>): LintResult => ({
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
      notes: ['Supported with limitations'],
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
  ...overrides,
});

const fullFamilyResult = (): LintResult => ({
  diagnostics: [
    {
      severity: 'error',
      title: 'cursor',
      message: 'cursor not supported',
      notes: [],
      support: 'none',
      family: 'gmail',
      variants: ['desktop-webmail', 'ios', 'android', 'mobile-webmail'],
      familySize: 4,
      position: { start: { line: 1, column: 12 }, end: { line: 1, column: 30 } },
    },
  ],
  errorCount: 1,
  warningCount: 0,
  success: false,
  filePath: 'email.html',
});

const partialFamilyResult = (): LintResult => ({
  diagnostics: [
    {
      severity: 'error',
      title: 'cursor',
      message: 'cursor not supported',
      notes: [],
      support: 'none',
      family: 'gmail',
      variants: ['mobile-webmail'],
      familySize: 4,
      position: { start: { line: 1, column: 12 }, end: { line: 1, column: 30 } },
    },
  ],
  errorCount: 1,
  warningCount: 0,
  success: false,
  filePath: 'email.html',
});

const noteResult = (): LintResult => ({
  diagnostics: [
    {
      severity: 'warning',
      title: 'transform',
      message: 'transform not supported — Partially supported in Outlook 2019.',
      notes: ['Partially supported in Outlook 2019.'],
      support: 'partial',
      family: 'outlook',
      variants: ['windows'],
      familySize: 5,
      position: { start: { line: 2, column: 5 }, end: { line: 2, column: 25 } },
    },
  ],
  errorCount: 0,
  warningCount: 1,
  success: true,
  filePath: 'email.html',
});

const suppressedResult = (): LintResult => ({
  diagnostics: [
    {
      severity: 'error',
      title: 'cursor',
      message: 'cursor not supported',
      notes: [],
      support: 'none',
      family: 'gmail',
      variants: ['android'],
      familySize: 4,
      position: { start: { line: 1, column: 10 }, end: { line: 1, column: 20 } },
    },
    {
      severity: 'info',
      title: 'target attribute',
      message: 'target attribute not supported — forced on all links',
      notes: ['target="_blank" is forced on all links'],
      support: 'none',
      family: 'gmail',
      variants: ['android'],
      familySize: 4,
      position: { start: { line: 3, column: 1 }, end: { line: 3, column: 20 } },
      suppressedByFramework: true,
      frameworkRule: 'target-blank',
    },
  ],
  errorCount: 1,
  warningCount: 0,
  success: false,
  filePath: 'email.html',
});

describe('formatPretty', () => {
  it('includes file path, line number, severity, message, and family name', () => {
    const output = formatPretty([makeResult()]);

    expect(output).toContain('email.html');
    expect(output).toContain('1:12');
    expect(output).toContain('error');
    expect(output).toContain('background-image is not supported');
    expect(output).toContain('outlook');
    expect(output).toContain('3:5');
    expect(output).toContain('warning');
    expect(output).toContain('gap is partially supported');
    expect(output).toContain('gmail');
  });

  it('prints summary line with error and warning counts', () => {
    const output = formatPretty([makeResult()]);

    expect(output).toContain('1 error');
    expect(output).toContain('1 warning');
  });

  it('renders a fully-collapsed family diagnostic as "(4/4 variants)" without a list', () => {
    const output = formatPretty([fullFamilyResult()]);

    expect(output).toContain('(4/4 variants)');
    // No variant names should be listed when it's the full family
    expect(output).not.toContain('desktop-webmail');
  });

  it('renders a partial family diagnostic as "(1/4 variants: mobile-webmail)"', () => {
    const output = formatPretty([partialFamilyResult()]);

    expect(output).toContain('(1/4 variants: mobile-webmail)');
  });

  it('surfaces the first note inline in the diagnostic line', () => {
    const output = formatPretty([noteResult()]);

    expect(output).toContain('— Partially supported in Outlook 2019.');
  });

  it('--verbose expands a 4/4 diagnostic to one line per variant', () => {
    const output = formatPretty([fullFamilyResult()], { verbose: true });

    for (const variant of ['desktop-webmail', 'ios', 'android', 'mobile-webmail']) {
      expect(output).toContain(variant);
    }
    // Each variant gets its own cursor line
    const cursorLines = output.split('\n').filter((l) => l.includes('cursor not supported'));
    expect(cursorLines).toHaveLength(4);
  });

  it('renders a framework-ignored section separator when suppressed diagnostics exist', () => {
    const output = formatPretty([suppressedResult()]);

    expect(output).toContain('── Ignored (framework) ──');
    // Suppressed diagnostic appears below the separator
    const separatorIdx = output.indexOf('── Ignored (framework) ──');
    const targetIdx = output.indexOf('target attribute not supported');
    expect(targetIdx).toBeGreaterThan(separatorIdx);
  });
});
