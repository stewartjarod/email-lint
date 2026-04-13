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
  const clients = presets[name];
  if (!clients) {
    throw new Error(`Unknown preset "${name}". Valid: ${PRESET_NAMES.join(', ')}`);
  }
  return clients;
}
