import pc from 'picocolors';

import type { LintDiagnostic, LintResult } from '../types.ts';

export interface PrettyFormatterOpts {
  /** When true, expand collapsed diagnostics to one line per variant. */
  verbose?: boolean;
}

function severityColor(severity: LintDiagnostic['severity'], text: string): string {
  if (severity === 'error') return pc.red(text);
  if (severity === 'warning') return pc.yellow(text);
  return pc.dim(text);
}

function variantSummary(d: LintDiagnostic): string {
  const n = d.variants.length;
  const total = d.familySize;
  if (total <= 1) return '';
  if (n >= total) return `(${total}/${total} variants)`;
  return `(${n}/${total} variants: ${d.variants.join(', ')})`;
}

function baseMessage(d: LintDiagnostic): string {
  const summary = variantSummary(d);
  return summary ? `${d.message} ${summary}` : d.message;
}

function formatLine(d: LintDiagnostic, msg: string): string {
  const loc = d.position ? `${d.position.start.line}:${d.position.start.column}` : '0:0';
  const sev = severityColor(d.severity, d.severity);
  return `  ${loc}  ${sev}  ${msg}  ${pc.dim(`[${d.family}]`)}`;
}

function formatDiagnostic(d: LintDiagnostic, verbose: boolean): string[] {
  if (!verbose || d.variants.length <= 1) {
    return [formatLine(d, baseMessage(d))];
  }
  // Expand one line per variant when --verbose
  return d.variants.map((variant) => formatLine(d, `${d.message} [${d.family}.${variant}]`));
}

function sortByLine(diagnostics: LintDiagnostic[]): LintDiagnostic[] {
  return [...diagnostics].sort((a, b) => {
    const aLine = a.position?.start.line ?? 0;
    const bLine = b.position?.start.line ?? 0;
    return aLine - bLine;
  });
}

export function formatPretty(results: LintResult[], opts?: PrettyFormatterOpts): string {
  const verbose = opts?.verbose === true;
  const lines: string[] = [];

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const result of results) {
    totalErrors += result.errorCount;
    totalWarnings += result.warningCount;

    if (result.diagnostics.length === 0) continue;

    const filePath = result.filePath ?? '<stdin>';
    const visible = result.diagnostics.filter((d) => d.suppressedByFramework !== true);
    const suppressed = result.diagnostics.filter((d) => d.suppressedByFramework === true);

    lines.push('');
    lines.push(pc.underline(filePath));

    for (const d of sortByLine(visible)) {
      for (const line of formatDiagnostic(d, verbose)) {
        lines.push(line);
      }
    }

    if (suppressed.length > 0) {
      lines.push('');
      lines.push(pc.dim('── Ignored (framework) ──'));
      for (const d of sortByLine(suppressed)) {
        lines.push(pc.dim(formatLine(d, baseMessage(d))));
      }
    }
  }

  const parts: string[] = [];
  if (totalErrors > 0) parts.push(`${totalErrors} error${totalErrors === 1 ? '' : 's'}`);
  if (totalWarnings > 0) parts.push(`${totalWarnings} warning${totalWarnings === 1 ? '' : 's'}`);

  if (parts.length > 0) {
    lines.push('');
    lines.push(`${pc.red('\u2716')} ${parts.join(', ')}`);
  }

  lines.push('');
  return lines.join('\n');
}
