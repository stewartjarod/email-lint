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
  var clients: ClientGlobs = [];
  name.split(',').forEach((n) => {
    if (!presets[n]) {
      throw new Error(`Unknown preset "${n}". Valid: ${PRESET_NAMES.join(', ')}`);
    } 
    clients.push(...presets[n]);
  });
  return clients;
}
