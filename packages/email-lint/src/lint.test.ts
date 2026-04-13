import { describe, expect, it } from 'vitest';

import { lint } from './lint.ts';

describe('lint', () => {
  it('returns diagnostics for unsupported CSS property', () => {
    const html = '<div style="background-image: url(test.png)">hello</div>';
    const result = lint(html, { preset: 'outlook' });

    expect(result.success).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);

    const bgImageError = result.diagnostics.find(
      (d) => d.message.includes('background-image') && d.severity === 'error'
    );
    expect(bgImageError).toBeDefined();
    expect(bgImageError?.family).toBe('outlook');
  });

  it('returns success with zero errors for email-safe HTML', () => {
    const html = '<table><tr><td style="color: #000; font-size: 14px;">Hello</td></tr></table>';
    const result = lint(html, { preset: 'all-clients' });

    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
  });

  it('scopes diagnostics to Gmail clients when preset is gmail', () => {
    const html = '<div style="background-image: url(test.png)">hello</div>';
    const result = lint(html, { preset: 'gmail' });

    for (const diag of result.diagnostics) {
      expect(diag.family).toBe('gmail');
    }
  });

  it('returns correct errorCount and warningCount', () => {
    const html = '<div style="background-image: url(test.png)">hello</div>';
    const result = lint(html, { preset: 'outlook' });

    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    const warnings = result.diagnostics.filter((d) => d.severity === 'warning');

    expect(result.errorCount).toBe(errors.length);
    expect(result.warningCount).toBe(warnings.length);
  });

  it('includes position data in diagnostics', () => {
    const html = '<div style="background-image: url(test.png)">hello</div>';
    const result = lint(html, { preset: 'outlook' });

    const withPosition = result.diagnostics.find((d) => d.position);
    expect(withPosition).toBeDefined();
    expect(withPosition?.position?.start.line).toBeGreaterThan(0);
    expect(withPosition?.position?.start.column).toBeGreaterThan(0);
  });

  it('collapses all-family diagnostics to one row per feature+position', () => {
    // `cursor` is unsupported in all 4 Gmail variants at the same style position.
    const html = '<div style="cursor: pointer">hello</div>';
    const result = lint(html, { preset: 'gmail' });

    const cursorDiags = result.diagnostics.filter((d) => d.title === 'cursor');
    expect(cursorDiags).toHaveLength(1);
    expect(cursorDiags[0].family).toBe('gmail');
    expect(cursorDiags[0].variants).toHaveLength(4);
    expect(cursorDiags[0].familySize).toBe(4);
  });

  it('drops target="_blank" + gmail to info (rank-don\'t-suppress) yielding zero errors', () => {
    const html = '<a href="https://example.com" target="_blank">click</a>';
    const result = lint(html, { preset: 'gmail' });

    expect(result.success).toBe(true);
    expect(result.errorCount).toBe(0);
    // The target-attribute diagnostic, if present, should be info — never error/warning.
    const targetDiag = result.diagnostics.find((d) => d.title === 'target attribute');
    if (targetDiag) {
      expect(targetDiag.severity).toBe('info');
    }
  });

  it('downgrades target="_self" + gmail target-attribute diagnostic to warning', () => {
    const html = '<a href="https://example.com" target="_self">click</a>';
    const result = lint(html, { preset: 'gmail' });

    const targetDiag = result.diagnostics.find((d) => d.title === 'target attribute');
    expect(targetDiag).toBeDefined();
    expect(targetDiag?.severity).toBe('warning');
  });

  it('errorCount and warningCount reflect collapsed diagnostics, not pre-collapse variants', () => {
    // `cursor` is unsupported in all 4 Gmail variants at the same style position — one
    // feature × one position should yield exactly 1 diagnostic, not 4.
    const html = '<div style="cursor: pointer">hello</div>';
    const result = lint(html, { preset: 'gmail' });

    const allErrors = result.diagnostics.filter((d) => d.severity === 'error');
    const allWarnings = result.diagnostics.filter((d) => d.severity === 'warning');
    expect(result.errorCount).toBe(allErrors.length);
    expect(result.warningCount).toBe(allWarnings.length);

    const cursorDiag = result.diagnostics.find((d) => d.title === 'cursor');
    expect(cursorDiag).toBeDefined();
    expect(cursorDiag?.variants.length).toBe(4);
  });

  describe('framework filter (react-email)', () => {
    // A react-email-style preview block: the inner style uses properties that would
    // normally flag on gmail, but the whole region is opted out via data-skip-in-text.
    const previewHtml = [
      '<html>',
      '<body>',
      '<div data-skip-in-text="true" style="display:none;overflow:hidden">Peek text</div>',
      '<p>real body</p>',
      '</body>',
      '</html>',
    ].join('\n');

    it('removes framework-suppressed diagnostics by default', () => {
      const baseline = lint(previewHtml, { preset: 'gmail' });
      const filtered = lint(previewHtml, { preset: 'gmail', framework: 'react-email' });

      // Baseline has at least one diagnostic inside the preview block.
      const previewLineDiags = baseline.diagnostics.filter((d) => d.position?.start.line === 3);
      expect(previewLineDiags.length).toBeGreaterThan(0);

      // Filtered output has none of those line-3 diagnostics.
      const filteredPreviewLineDiags = filtered.diagnostics.filter(
        (d) => d.position?.start.line === 3
      );
      expect(filteredPreviewLineDiags).toHaveLength(0);
    });

    it('retains suppressed diagnostics when showIgnored is true and forces severity to info', () => {
      const result = lint(previewHtml, {
        preset: 'gmail',
        framework: 'react-email',
        showIgnored: true,
      });

      const suppressed = result.diagnostics.filter((d) => d.suppressedByFramework === true);
      expect(suppressed.length).toBeGreaterThan(0);
      for (const d of suppressed) {
        expect(d.severity).toBe('info');
      }
      // None of the suppressed diagnostics count as errors
      expect(result.errorCount).toBe(0);
    });

    it('leaves diagnostics alone when framework option is not set', () => {
      const result = lint(previewHtml, { preset: 'gmail' });

      // Diagnostics appear normally on the preview line — the filter was not applied.
      const previewLineDiags = result.diagnostics.filter((d) => d.position?.start.line === 3);
      expect(previewLineDiags.length).toBeGreaterThan(0);
      for (const d of previewLineDiags) {
        expect(d.suppressedByFramework).toBeUndefined();
      }
    });
  });
});
