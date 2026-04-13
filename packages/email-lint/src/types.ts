export type Severity = 'error' | 'warning' | 'info';
export type SupportLevel = 'full' | 'partial' | 'none';

export interface LintDiagnostic {
  severity: Severity;
  /** Feature title from caniemail (e.g., "cursor", "target attribute", "transform"). */
  title: string;
  /** Human-readable diagnostic message, with note text appended when present. */
  message: string;
  /** Original caniemail notes (already-resolved text). */
  notes: string[];
  /** Support level from caniemail — the raw signal for severity mapping. */
  support: SupportLevel;
  /** Client family — e.g., "gmail", "outlook", "apple-mail". Split from "gmail.android". */
  family: string;
  /** Affected variants within the family — e.g., ["android", "mobile-webmail"]. */
  variants: string[];
  /** Total variants in this family (denominator) — e.g., 4 for Gmail. */
  familySize: number;
  position?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  /** Set true when framework filtering suppressed this diagnostic; only present when showIgnored is on. */
  suppressedByFramework?: boolean;
  /** Which framework rule matched — e.g., "preview", "preload-image", "target-blank". */
  frameworkRule?: string;
}

export interface LintResult {
  diagnostics: LintDiagnostic[];
  errorCount: number;
  warningCount: number;
  success: boolean;
  filePath?: string;
}

export interface LintConfig {
  preset?: string;
  /** When set, apply framework-aware filtering. Currently only 'react-email' is supported. */
  framework?: 'react-email';
  /**
   * When true, retain framework-suppressed diagnostics in the result with
   * `suppressedByFramework: true` and `severity: "info"` so formatters can render
   * them in a separate section. Default: false.
   */
  showIgnored?: boolean;
}
