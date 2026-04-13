import type { LintDiagnostic, Severity, SupportLevel } from './types.ts';

/**
 * Internal per-variant row emitted by the caniemail pass, before collapsing by family.
 * Not exported from the package — only used between the caniemail call and `collapseByFamily`.
 */
export interface ProtoDiagnostic {
  severity: Severity;
  title: string;
  message: string;
  notes: string[];
  support: SupportLevel;
  /** Full caniemail client identifier — e.g., "gmail.android". */
  client: string;
  position?: LintDiagnostic['position'];
}

/**
 * Mirrored from caniemail@1.0.5 `clientNames` — we can't deep-import it because
 * caniemail's package.json `exports` field only publishes `.`. Update this list when
 * caniemail adds/removes clients.
 */
const CANIEMAIL_CLIENT_NAMES = [
  'apple-mail.macos',
  'apple-mail.ios',
  'gmail.desktop-webmail',
  'gmail.ios',
  'gmail.android',
  'gmail.mobile-webmail',
  'orange.desktop-webmail',
  'orange.ios',
  'orange.android',
  'outlook.windows',
  'outlook.windows-mail',
  'outlook.macos',
  'outlook.ios',
  'outlook.android',
  'yahoo.desktop-webmail',
  'yahoo.ios',
  'yahoo.android',
  'aol.desktop-webmail',
  'aol.ios',
  'aol.android',
  'samsung-email.android',
  'sfr.desktop-webmail',
  'sfr.ios',
  'sfr.android',
  'thunderbird.macos',
  'protonmail.desktop-webmail',
  'protonmail.ios',
  'protonmail.android',
  'hey.desktop-webmail',
  'mail-ru.desktop-webmail',
  'fastmail.desktop-webmail',
  'laposte.desktop-webmail',
] as const;

function familyOf(client: string): string {
  const dot = client.indexOf('.');
  return dot === -1 ? client : client.slice(0, dot);
}

function variantOf(client: string): string {
  const dot = client.indexOf('.');
  return dot === -1 ? '' : client.slice(dot + 1);
}

/**
 * Family sizes derived once from the canonical client list.
 * Example: { gmail: 4, outlook: 5, 'apple-mail': 2, ... }
 */
export const FAMILY_SIZES: Record<string, number> = (() => {
  const sizes: Record<string, number> = {};
  for (const client of CANIEMAIL_CLIENT_NAMES) {
    const family = familyOf(client);
    sizes[family] = (sizes[family] ?? 0) + 1;
  }
  return sizes;
})();

function positionKey(position: ProtoDiagnostic['position']): string {
  if (!position) return '-';
  return `${position.start.line}:${position.start.column}-${position.end.line}:${position.end.column}`;
}

/**
 * Group ProtoDiagnostics by (title, family, position). Each group collapses to a single
 * LintDiagnostic carrying all matched variants and the family's total size.
 *
 * Collapse key: `title × family × position`. Diagnostics at different positions stay
 * distinct; diagnostics missing position collapse within family+title.
 */
export function collapseByFamily(protos: ProtoDiagnostic[]): LintDiagnostic[] {
  const groups = new Map<string, LintDiagnostic>();
  const order: string[] = [];

  for (const proto of protos) {
    const family = familyOf(proto.client);
    const variant = variantOf(proto.client);
    const key = `${proto.title}|${family}|${positionKey(proto.position)}`;

    const existing = groups.get(key);
    if (existing) {
      if (variant && !existing.variants.includes(variant)) {
        existing.variants.push(variant);
      }
      continue;
    }

    groups.set(key, {
      severity: proto.severity,
      title: proto.title,
      message: proto.message,
      notes: proto.notes,
      support: proto.support,
      family,
      variants: variant ? [variant] : [],
      familySize: FAMILY_SIZES[family] ?? 1,
      position: proto.position,
    });
    order.push(key);
  }

  return order.map((key) => groups.get(key) as LintDiagnostic);
}
