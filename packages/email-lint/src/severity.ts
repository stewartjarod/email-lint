import type { ProtoDiagnostic } from './collapse.ts';

/**
 * Matches `<a ... target="_blank" ...>` tags. Case-insensitive on tag/attr; quote-agnostic.
 * Lets us tell when the author actually used target="_blank" (which gmail forces anyway)
 * vs target="_self" (the real authoring mistake for gmail).
 */
const A_TARGET_BLANK_RE = /<a\b[^>]*?\btarget\s*=\s*(?:"_blank"|'_blank'|_blank)[^>]*?>/i;

/**
 * Matches a bare `transform` property in a style attribute (not `text-transform`).
 * caniemail incorrectly reports `text-transform` with the title "transform".
 * If the element only uses `text-transform` and not bare `transform`, the diagnostic
 * is a false positive.
 */
const BARE_TRANSFORM_RE = /(?<![a-z-])transform\s*:/i;

/**
 * Extract the opening tag at (line, column) from the HTML string.
 * Returns the full `<tag ...>` string, or undefined if not found.
 */
function extractElement(html: string, line: number, column: number): string | undefined {
  const lines = html.split('\n');
  if (line < 1 || line > lines.length) return undefined;
  const offset = lines.slice(0, line - 1).reduce((sum, l) => sum + l.length + 1, 0) + (column - 1);
  if (html[offset] !== '<') return undefined;
  const close = html.indexOf('>', offset);
  if (close === -1) return undefined;
  return html.slice(offset, close + 1);
}

function appendNoteToMessage(message: string, notes: string[]): string {
  if (notes.length === 0) return message;
  return `${message} — ${notes[0]}`;
}

/**
 * Apply project-specific severity and message rules to a ProtoDiagnostic.
 *
 * Rules (applied in order):
 *   (a) `title === "cursor"` → `severity: "info"` (cosmetic-only in email).
 *   (b) `title === "target attribute"` AND `family === "gmail"` AND note mentions
 *       "forced": if html already uses `target="_blank"`, drop to `"info"`
 *       (rank-don't-suppress — gmail forces this anyway). Otherwise downgrade to
 *       `"warning"` because the author's intent might be `_self` which gmail breaks.
 *   (c) `support === "partial"` stays at its existing severity (warning from the
 *       caniemail bucket) — no-op safety.
 *
 * Also enriches `message` with the first resolved note when present:
 *   `"<message> — <first note>"`.
 *
 * Pure function: returns a new proto with adjusted severity/message. Runs per-proto
 * (before collapse) so that identically-transformed diagnostics collapse together.
 */
export function applySeverityRules(proto: ProtoDiagnostic, html: string): ProtoDiagnostic {
  const message = appendNoteToMessage(proto.message, proto.notes);
  const family = proto.client.split('.')[0];

  if (proto.title === 'cursor') {
    return { ...proto, severity: 'info', message };
  }

  // caniemail reports `text-transform` as "transform" (false positive).
  // Check the actual element: if it has `text-transform` but no bare `transform:`,
  // suppress by downgrading to info.
  if (proto.title === 'transform' && proto.position) {
    const element = extractElement(html, proto.position.start.line, proto.position.start.column);
    if (element && !BARE_TRANSFORM_RE.test(element)) {
      return { ...proto, severity: 'info', message };
    }
  }

  if (
    proto.title === 'target attribute' &&
    family === 'gmail' &&
    proto.notes.some((n) => n.toLowerCase().includes('forced'))
  ) {
    const severity = A_TARGET_BLANK_RE.test(html) ? 'info' : 'warning';
    return { ...proto, severity, message };
  }

  return { ...proto, message };
}
