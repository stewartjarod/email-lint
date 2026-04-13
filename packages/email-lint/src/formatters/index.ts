import type { LintResult } from '../types.ts';
import { formatGitHub } from './github.ts';
import { formatJson } from './json.ts';
import { formatPretty, type PrettyFormatterOpts } from './pretty.ts';

export interface FormatterOpts extends PrettyFormatterOpts {}

export type Formatter = (results: LintResult[], opts?: FormatterOpts) => string;

const formatters: Record<string, Formatter> = {
  pretty: formatPretty,
  json: formatJson,
  github: formatGitHub,
};

export function getFormatter(name: string): Formatter {
  const formatter = formatters[name];
  if (!formatter) {
    throw new Error(`Unknown format "${name}". Valid: ${Object.keys(formatters).join(', ')}`);
  }
  return formatter;
}

export { formatGitHub } from './github.ts';
export { formatJson } from './json.ts';
export { formatPretty } from './pretty.ts';
