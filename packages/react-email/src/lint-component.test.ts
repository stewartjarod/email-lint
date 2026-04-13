import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-email/render', () => ({
  render: vi.fn(),
}));

import { render } from '@react-email/render';
import type { ReactElement } from 'react';
import { lintComponent } from './lint-component.ts';

const mockedRender = vi.mocked(render);

const KNOWN_HTML = `<!DOCTYPE html>
<html>
<head></head>
<body>
<div style="background-image: url(test.png)">test</div>
</body>
</html>`;

const PREVIEW_HTML = `<!DOCTYPE html>
<html>
<head></head>
<body>
<div data-skip-in-text="true" style="display:none;cursor:pointer">Preview</div>
<p>real body</p>
</body>
</html>`;

const fakeElement = { type: 'div', props: {}, key: null } as unknown as ReactElement;

describe('lintComponent', () => {
  it('calls render() then lint() and returns diagnostics', async () => {
    mockedRender.mockResolvedValue(KNOWN_HTML);

    const result = await lintComponent(fakeElement);

    expect(mockedRender).toHaveBeenCalledWith(fakeElement);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result).toHaveProperty('errorCount');
    expect(result).toHaveProperty('warningCount');
    expect(result).toHaveProperty('success');
  });

  it('passes config through to lint() when preset is specified', async () => {
    mockedRender.mockResolvedValue(KNOWN_HTML);

    const result = await lintComponent(fakeElement, { preset: 'outlook' });

    expect(mockedRender).toHaveBeenCalledWith(fakeElement);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    for (const diagnostic of result.diagnostics) {
      expect(diagnostic.family).toBe('outlook');
    }
  });

  it('defaults framework to "react-email" so preview-block diagnostics are suppressed', async () => {
    mockedRender.mockResolvedValue(PREVIEW_HTML);

    // The preview div contains `cursor:pointer` which normally flags on gmail.
    const result = await lintComponent(fakeElement, { preset: 'gmail' });

    // Diagnostics on the preview line should be suppressed (filtered out by default)
    const previewLineDiags = result.diagnostics.filter((d) => d.position?.start.line === 5);
    expect(previewLineDiags).toHaveLength(0);
  });

  it('respects explicit framework: undefined override (no framework filter)', async () => {
    mockedRender.mockResolvedValue(PREVIEW_HTML);

    const result = await lintComponent(fakeElement, {
      preset: 'gmail',
      framework: undefined,
    });

    // Without the filter, diagnostics on the preview line appear
    const previewLineDiags = result.diagnostics.filter((d) => d.position?.start.line === 5);
    expect(previewLineDiags.length).toBeGreaterThan(0);
  });
});
