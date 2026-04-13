import type { LintResult } from '../types.ts';

export function formatJson(results: LintResult[]): string {
  return JSON.stringify(results, null, 2);
}
