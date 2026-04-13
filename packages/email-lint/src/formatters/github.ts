import type { LintDiagnostic, LintResult } from '../types.ts';

const MAX_ANNOTATIONS = 50;

function severityToGitHub(severity: LintDiagnostic['severity']): string {
  if (severity === 'error') return 'error';
  if (severity === 'warning') return 'warning';
  return 'notice';
}

export function formatGitHub(results: LintResult[]): string {
  const lines: string[] = [];
  let count = 0;

  for (const result of results) {
    const file = result.filePath ?? '<stdin>';

    for (const d of result.diagnostics) {
      if (count >= MAX_ANNOTATIONS) break;

      const level = d.suppressedByFramework ? 'notice' : severityToGitHub(d.severity);
      const line = d.position?.start.line ?? 1;
      const col = d.position?.start.column ?? 1;
      const variantCount = d.variants.length;
      const suffix = `[${d.family} ${variantCount}/${d.familySize}]`;

      lines.push(
        `::${level} file=${file},line=${line},col=${col},title=${d.title}::${d.message} ${suffix}`
      );
      count++;
    }

    if (count >= MAX_ANNOTATIONS) break;
  }

  return lines.join('\n');
}
