import { describe, expect, it } from 'vitest';

import { collapseByFamily, type ProtoDiagnostic } from './collapse.ts';

const pos = (line: number, col: number) => ({
  start: { line, column: col },
  end: { line, column: col + 10 },
});

const makeProto = (client: string, overrides?: Partial<ProtoDiagnostic>): ProtoDiagnostic => ({
  severity: 'error',
  title: 'cursor',
  message: 'cursor not supported',
  notes: [],
  support: 'none',
  client,
  position: pos(1, 1),
  ...overrides,
});

describe('collapseByFamily', () => {
  it('collapses 4 Gmail variants of the same feature+position into 1 diagnostic', () => {
    const protos: ProtoDiagnostic[] = [
      makeProto('gmail.desktop-webmail'),
      makeProto('gmail.ios'),
      makeProto('gmail.android'),
      makeProto('gmail.mobile-webmail'),
    ];

    const result = collapseByFamily(protos);

    expect(result).toHaveLength(1);
    expect(result[0].family).toBe('gmail');
    expect(result[0].variants).toHaveLength(4);
    expect(result[0].variants).toEqual(
      expect.arrayContaining(['desktop-webmail', 'ios', 'android', 'mobile-webmail'])
    );
    expect(result[0].familySize).toBe(4);
  });

  it('keeps two diagnostics at different positions for the same feature+family distinct', () => {
    const protos: ProtoDiagnostic[] = [
      makeProto('gmail.android', { position: pos(1, 10) }),
      makeProto('gmail.ios', { position: pos(1, 10) }),
      makeProto('gmail.android', { position: pos(5, 20) }),
      makeProto('gmail.ios', { position: pos(5, 20) }),
    ];

    const result = collapseByFamily(protos);

    expect(result).toHaveLength(2);
    expect(result[0].position?.start.line).toBe(1);
    expect(result[0].variants).toHaveLength(2);
    expect(result[1].position?.start.line).toBe(5);
    expect(result[1].variants).toHaveLength(2);
  });

  it('records partial family coverage (1 of 4 Gmail variants)', () => {
    const protos: ProtoDiagnostic[] = [makeProto('gmail.mobile-webmail')];

    const result = collapseByFamily(protos);

    expect(result).toHaveLength(1);
    expect(result[0].family).toBe('gmail');
    expect(result[0].variants).toEqual(['mobile-webmail']);
    expect(result[0].familySize).toBe(4);
  });
});
