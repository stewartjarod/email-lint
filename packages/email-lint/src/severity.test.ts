import { describe, expect, it } from 'vitest';

import type { ProtoDiagnostic } from './collapse.ts';
import { applySeverityRules } from './severity.ts';

const baseProto = (overrides?: Partial<ProtoDiagnostic>): ProtoDiagnostic => ({
  severity: 'error',
  title: 'cursor',
  message: 'cursor not supported',
  notes: [],
  support: 'none',
  client: 'gmail.android',
  position: { start: { line: 1, column: 1 }, end: { line: 1, column: 10 } },
  ...overrides,
});

const targetNote = 'Not supported. `target="_blank"` is forced on all links.';

describe('applySeverityRules', () => {
  it('downgrades `cursor` diagnostics to severity: "info" (cosmetic-only in email)', () => {
    const proto = baseProto({ title: 'cursor' });

    const result = applySeverityRules(proto, '<div style="cursor:pointer">');

    expect(result.severity).toBe('info');
  });

  it('drops `target attribute` + gmail to info when html actually uses target="_blank"', () => {
    const proto = baseProto({
      title: 'target attribute',
      message: 'target attribute not supported',
      notes: [targetNote],
      client: 'gmail.desktop-webmail',
    });

    const result = applySeverityRules(proto, '<a href="https://example.com" target="_blank">x</a>');

    expect(result.severity).toBe('info');
  });

  it('downgrades `target attribute` + gmail to warning when html uses target="_self"', () => {
    const proto = baseProto({
      title: 'target attribute',
      message: 'target attribute not supported',
      notes: [targetNote],
      client: 'gmail.desktop-webmail',
    });

    const result = applySeverityRules(proto, '<a href="https://example.com" target="_self">x</a>');

    expect(result.severity).toBe('warning');
  });

  it('downgrades `transform` to info when element only has text-transform', () => {
    const html = '<p style="text-transform:uppercase">Hello</p>';
    const proto = baseProto({
      title: 'transform',
      message: '`transform` is not supported',
      notes: [],
      client: 'gmail.desktop-webmail',
      position: { start: { line: 1, column: 1 }, end: { line: 1, column: 47 } },
    });

    const result = applySeverityRules(proto, html);

    expect(result.severity).toBe('info');
  });

  it('keeps `transform` as error when element has bare transform', () => {
    const html = '<p style="transform:rotate(45deg)">Hello</p>';
    const proto = baseProto({
      title: 'transform',
      message: '`transform` is not supported',
      notes: [],
      client: 'gmail.desktop-webmail',
      position: { start: { line: 1, column: 1 }, end: { line: 1, column: 45 } },
    });

    const result = applySeverityRules(proto, html);

    expect(result.severity).toBe('error');
  });

  it('keeps `transform` as error when element has both text-transform and transform', () => {
    const html = '<p style="text-transform:uppercase;transform:scale(2)">Hello</p>';
    const proto = baseProto({
      title: 'transform',
      message: '`transform` is not supported',
      notes: [],
      client: 'gmail.desktop-webmail',
      position: { start: { line: 1, column: 1 }, end: { line: 1, column: 65 } },
    });

    const result = applySeverityRules(proto, html);

    expect(result.severity).toBe('error');
  });

  it('appends " — <note>" to message when proto has a note', () => {
    const proto = baseProto({
      title: 'transform',
      message: 'transform not supported',
      notes: ['Partially supported in newer Outlook builds.'],
      support: 'partial',
      severity: 'warning',
    });

    const result = applySeverityRules(proto, '<div style="transform:scale(0.5)">');

    expect(result.message).toBe(
      'transform not supported — Partially supported in newer Outlook builds.'
    );
  });

  it('leaves message unchanged when proto has no notes', () => {
    const proto = baseProto({
      title: 'background-image',
      message: 'background-image not supported',
      notes: [],
    });

    const result = applySeverityRules(proto, '<div style="background-image:url(x.png)">');

    expect(result.message).toBe('background-image not supported');
  });
});
