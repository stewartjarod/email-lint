import { describe, expect, it } from 'vitest';

import { resolvePreset } from './presets.ts';

describe('resolvePreset', () => {
  it('returns gmail client globs for gmail preset', () => {
    expect(resolvePreset('gmail')).toEqual(['gmail.*']);
  });

  it('returns wildcard glob for all-clients preset', () => {
    expect(resolvePreset('all-clients')).toEqual(['*']);
  });

  it('throws descriptive error for unknown preset', () => {
    expect(() => resolvePreset('unknown')).toThrow('Unknown preset "unknown"');
    expect(() => resolvePreset('unknown')).toThrow('Valid:');
  });
});
