import type { CanIEmailOptions } from 'caniemail';

type ClientGlobs = CanIEmailOptions['clients'];

const presets: Record<string, ClientGlobs> = {
  gmail: ['gmail.*'],
  outlook: ['outlook.*'],
  'apple-mail': ['apple-mail.*'],
  yahoo: ['yahoo.*'],
  'all-clients': ['*'],
};

export const PRESET_NAMES = Object.keys(presets);

export function resolvePreset(name: string): ClientGlobs {
  const names = name
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  if (names.length === 0) {
    throw new Error(`Empty preset. Valid: ${PRESET_NAMES.join(', ')}`);
  }

  const clients = new Set<ClientGlobs[number]>();
  for (const n of names) {
    const preset = presets[n];
    if (!preset) {
      throw new Error(`Unknown preset "${n}". Valid: ${PRESET_NAMES.join(', ')}`);
    }
    for (const glob of preset) {
      clients.add(glob);
    }
  }

  return [...clients];
}

/** Split a comma-separated list into trimmed, non-empty entries. */
function splitList(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

/**
 * Predicate that answers "should this client be linted?".
 *
 * Exclusion is applied to the results rather than the request, because
 * caniemail's glob syntax has no negation and the helpers that expand a glob
 * to concrete client names (`parseClients`, `clientNames`) are not re-exported
 * from its package root -- its `exports` map only exposes `.` and the raw JSON.
 * Filtering what comes back needs neither.
 *
 * Accepted forms, matching the glob shapes caniemail itself takes:
 * `orange` (bare provider, the shape people type), `orange.ios`, `*.ios`, `*`.
 */
export function makeClientFilter(exclude?: string): (client: string) => boolean {
  if (!exclude) {
    return () => true;
  }

  const patterns = splitList(exclude);
  if (patterns.length === 0) {
    return () => true;
  }

  const matches = (pattern: string, client: string): boolean => {
    if (pattern === '*') {
      return true;
    }
    const [provider, platform] = pattern.includes('.')
      ? pattern.split('.')
      : [pattern, '*'];
    const [clientProvider, clientPlatform] = client.split('.');
    return (
      (provider === '*' || provider === clientProvider) &&
      (platform === '*' || platform === clientPlatform)
    );
  };

  return (client: string) => !patterns.some((p) => matches(p, client));
}
