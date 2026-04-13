import type { LintDiagnostic } from './types.ts';

type FrameworkRule = 'preview' | 'preload-image' | 'target-blank';

interface Region {
  /** Inclusive start offset in the raw html string. */
  start: number;
  /** Exclusive end offset in the raw html string. */
  end: number;
  rule: FrameworkRule;
  /** If set, only diagnostics with this title match inside this region. */
  titleMatch?: string;
}

/**
 * Convert a 1-indexed (line, col) position to a 0-indexed character offset in the
 * raw html string. Returns -1 if the position is out of bounds.
 */
function offsetOf(html: string, line: number, col: number): number {
  let offset = 0;
  let currentLine = 1;
  while (currentLine < line) {
    const nl = html.indexOf('\n', offset);
    if (nl === -1) return -1;
    offset = nl + 1;
    currentLine++;
  }
  return offset + (col - 1);
}

/**
 * Find the character range `[openStart, closeEnd)` spanning a tag and its matching
 * closing tag (e.g., `<div ...>...</div>`). Uses naive linear lookup — sufficient
 * for react-email's well-formed output. Returns the end of the opening tag only if
 * no closing tag is found (e.g., self-closing or malformed).
 */
function rangeOfTag(html: string, tagName: string, openEnd: number): number {
  const closeTag = `</${tagName}>`;
  const lowerHtml = html.toLowerCase();
  const closeIdx = lowerHtml.indexOf(closeTag.toLowerCase(), openEnd);
  if (closeIdx === -1) return openEnd;
  return closeIdx + closeTag.length;
}

function findPreviewRegions(html: string): Region[] {
  // Match any opening tag carrying `data-skip-in-text="true"` (react-email uses this
  // on <Preview> and plain-text-only markup).
  const re = /<(\w+)\b[^>]*\bdata-skip-in-text\s*=\s*(?:"true"|'true'|true)[^>]*>/gi;
  const regions: Region[] = [];
  let m: RegExpExecArray | null;
  m = re.exec(html);
  while (m !== null) {
    const tagName = m[1];
    const openStart = m.index;
    const openEnd = openStart + m[0].length;
    const end = rangeOfTag(html, tagName, openEnd);
    regions.push({ start: openStart, end, rule: 'preview' });
    m = re.exec(html);
  }
  return regions;
}

function findPreloadImageRegions(html: string): Region[] {
  // Match `<link rel="preload" as="image" ...>` in any attribute order. Self-closing or not.
  const re = /<link\b[^>]*?>/gi;
  const regions: Region[] = [];
  let m: RegExpExecArray | null;
  m = re.exec(html);
  while (m !== null) {
    const tag = m[0];
    if (/\brel\s*=\s*["']?preload["']?/i.test(tag) && /\bas\s*=\s*["']?image["']?/i.test(tag)) {
      regions.push({ start: m.index, end: m.index + tag.length, rule: 'preload-image' });
    }
    m = re.exec(html);
  }
  return regions;
}

function findTargetBlankRegions(html: string): Region[] {
  // Match `<a ... target="_blank" ...>...</a>` regions; title-filtered so only the
  // target-attribute diagnostic inside gets marked.
  const re = /<a\b[^>]*?\btarget\s*=\s*(?:"_blank"|'_blank'|_blank)[^>]*?>/gi;
  const regions: Region[] = [];
  let m: RegExpExecArray | null;
  m = re.exec(html);
  while (m !== null) {
    const openStart = m.index;
    const openEnd = openStart + m[0].length;
    const end = rangeOfTag(html, 'a', openEnd);
    regions.push({ start: openStart, end, rule: 'target-blank', titleMatch: 'target attribute' });
    m = re.exec(html);
  }
  return regions;
}

/**
 * Mark diagnostics that fall inside framework-known regions as `suppressedByFramework`.
 *
 * Does NOT remove marked diagnostics from the array — `lint()` owns the keep/drop
 * decision based on `config.showIgnored`. This keeps the filter testable in isolation
 * (input n diagnostics → output n diagnostics, some annotated).
 *
 * Match strategy: regex-based structural matching on the raw html string. Three rules:
 *   (a) `<... data-skip-in-text="true" ...>` → `frameworkRule: "preview"`
 *   (b) `<link rel="preload" as="image" ...>` → `frameworkRule: "preload-image"`
 *   (c) `<a ... target="_blank" ...>` with `title === "target attribute"` →
 *       `frameworkRule: "target-blank"`
 *
 * Fallback for diagnostics missing position: if `title === "target attribute"` and the
 * html contains any `<a ... target="_blank">`, mark it anyway. Documented inline —
 * rare but possible when caniemail fails to emit position data.
 */
export function applyFrameworkFilter(
  diagnostics: LintDiagnostic[],
  html: string,
  framework: 'react-email'
): LintDiagnostic[] {
  if (framework !== 'react-email') return diagnostics;

  const regions: Region[] = [
    ...findPreviewRegions(html),
    ...findPreloadImageRegions(html),
    ...findTargetBlankRegions(html),
  ];

  return diagnostics.map((d) => {
    const offset = d.position ? offsetOf(html, d.position.start.line, d.position.start.column) : -1;

    for (const region of regions) {
      if (region.titleMatch && d.title !== region.titleMatch) continue;

      if (offset >= 0 && offset >= region.start && offset < region.end) {
        return { ...d, suppressedByFramework: true, frameworkRule: region.rule };
      }

      // Fallback for title-matched rules when position is missing: any target-blank
      // region in the html suppresses the title-attribute diagnostic.
      if (
        offset === -1 &&
        region.titleMatch &&
        d.title === region.titleMatch &&
        region.rule === 'target-blank'
      ) {
        return { ...d, suppressedByFramework: true, frameworkRule: region.rule };
      }
    }

    return d;
  });
}
