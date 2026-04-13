import { caniemail, formatIssue } from 'caniemail';

import { collapseByFamily, type ProtoDiagnostic } from './collapse.ts';
import { applyFrameworkFilter } from './framework-filter.ts';
import { resolvePreset } from './presets.ts';
import { applySeverityRules } from './severity.ts';
import type { LintConfig, LintDiagnostic, LintResult } from './types.ts';

export function lint(html: string, config?: LintConfig): LintResult {
  const clients = resolvePreset(config?.preset ?? 'all-clients');
  const result = caniemail({ html, clients });

  const protos: ProtoDiagnostic[] = [];

  for (const [client, issues] of result.issues.errors) {
    for (const issue of issues) {
      const formatted = formatIssue({ client, issue, issueType: 'error' });
      protos.push(
        applySeverityRules(
          {
            severity: 'error',
            title: issue.title,
            message: formatted.message,
            notes: formatted.notes,
            support: issue.support,
            client,
            position: issue.position
              ? {
                  start: { line: issue.position.start.line, column: issue.position.start.column },
                  end: { line: issue.position.end.line, column: issue.position.end.column },
                }
              : undefined,
          },
          html
        )
      );
    }
  }

  for (const [client, issues] of result.issues.warnings) {
    for (const issue of issues) {
      const formatted = formatIssue({ client, issue, issueType: 'warning' });
      protos.push(
        applySeverityRules(
          {
            severity: 'warning',
            title: issue.title,
            message: formatted.message,
            notes: formatted.notes,
            support: issue.support,
            client,
            position: issue.position
              ? {
                  start: { line: issue.position.start.line, column: issue.position.start.column },
                  end: { line: issue.position.end.line, column: issue.position.end.column },
                }
              : undefined,
          },
          html
        )
      );
    }
  }

  let diagnostics = collapseByFamily(protos);

  if (config?.framework) {
    diagnostics = applyFrameworkFilter(diagnostics, html, config.framework);
    diagnostics = finalizeFrameworkFilter(diagnostics, config.showIgnored === true);
  }

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  return {
    diagnostics,
    errorCount,
    warningCount,
    success: errorCount === 0,
  };
}

/**
 * After the framework filter marks diagnostics, either drop them (default) or keep
 * them but downgrade severity to `info` so counts don't lie and formatters can render
 * them in a separate section.
 */
function finalizeFrameworkFilter(
  diagnostics: LintDiagnostic[],
  showIgnored: boolean
): LintDiagnostic[] {
  if (!showIgnored) {
    return diagnostics.filter((d) => d.suppressedByFramework !== true);
  }
  return diagnostics.map((d) =>
    d.suppressedByFramework ? { ...d, severity: 'info' as const } : d
  );
}
