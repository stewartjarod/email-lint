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
