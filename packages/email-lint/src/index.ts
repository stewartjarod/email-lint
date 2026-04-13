export type { Formatter } from './formatters/index.ts';
export { formatGitHub, formatJson, formatPretty, getFormatter } from './formatters/index.ts';
export { lint } from './lint.ts';
export { PRESET_NAMES, resolvePreset } from './presets.ts';
export type {
  LintConfig,
  LintDiagnostic,
  LintResult,
  Severity,
  SupportLevel,
} from './types.ts';
