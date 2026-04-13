import { render } from '@react-email/render';
import type { LintConfig, LintResult } from '@email-lint/core';
import { lint } from '@email-lint/core';

export async function lintComponent(
  element: React.ReactElement,
  config?: LintConfig
): Promise<LintResult> {
  const html = await render(element);
  // Default framework to 'react-email' so preview blocks and preload-image tags
  // don't produce noisy diagnostics. Callers can opt out with `framework: undefined`.
  const merged: LintConfig = { framework: 'react-email', ...config };
  return lint(html, merged);
}
