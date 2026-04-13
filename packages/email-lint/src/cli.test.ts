import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const PKG_DIR = join(import.meta.dirname, '..');

let cliPath: string;

beforeAll(() => {
  // Build the CLI so we can run it as a child process
  execFileSync('pnpm', ['build'], { cwd: PKG_DIR, stdio: 'pipe' });
  cliPath = join(PKG_DIR, 'dist', 'cli.mjs');
});

function runCli(args: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [cliPath, 'check', ...args], {
      cwd: PKG_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: (err.stdout ?? '') + (err.stderr ?? ''),
      exitCode: err.status ?? 1,
    };
  }
}

function makeTempHtml(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'email-lint-'));
  const file = join(dir, 'test.html');
  writeFileSync(file, content, 'utf-8');
  return file;
}

describe('CLI', () => {
  it('reads an HTML file and prints lint results in pretty format', () => {
    const file = makeTempHtml('<div style="background-image: url(test.png)">hello</div>');
    const { stdout } = runCli([file]);

    expect(stdout).toContain('test.html');
    expect(stdout).toContain('background-image');
    expect(stdout).toContain('error');
  });

  it('exits 1 on errors, 0 when clean', () => {
    const bad = makeTempHtml('<div style="background-image: url(test.png)">hello</div>');
    const good = makeTempHtml('<table><tr><td style="color: #000;">Hello</td></tr></table>');

    const badResult = runCli([bad]);
    const goodResult = runCli([good]);

    expect(badResult.exitCode).toBe(1);
    expect(goodResult.exitCode).toBe(0);
  });

  it('--format json outputs valid JSON', () => {
    const file = makeTempHtml('<div style="background-image: url(test.png)">hello</div>');
    const { stdout } = runCli(['--format', 'json', file]);

    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].diagnostics).toBeDefined();
  });

  it('--preset gmail scopes diagnostics to Gmail clients', () => {
    const file = makeTempHtml('<div style="background-image: url(test.png)">hello</div>');
    const { stdout } = runCli(['--format', 'json', '--preset', 'gmail', file]);

    const parsed = JSON.parse(stdout);
    for (const result of parsed) {
      for (const diag of result.diagnostics) {
        expect(diag.family).toBe('gmail');
      }
    }
  });

  it('--verbose expands a 4/4 gmail diagnostic to one line per variant', () => {
    // `cursor: pointer` is unsupported in all 4 Gmail variants
    const file = makeTempHtml('<div style="cursor: pointer">hello</div>');
    const { stdout } = runCli(['--verbose', '--preset', 'gmail', file]);

    // All four variants should appear in the expanded output
    for (const variant of ['desktop-webmail', 'ios', 'android', 'mobile-webmail']) {
      expect(stdout).toContain(variant);
    }
  });

  it('--show-ignored with --framework react-email surfaces target-blank in the ignored section', () => {
    // target="_blank" on gmail is suppressed by the framework filter.
    const file = makeTempHtml('<a href="https://example.com" target="_blank">click</a>');
    const { stdout } = runCli([
      '--preset',
      'gmail',
      '--framework',
      'react-email',
      '--show-ignored',
      file,
    ]);

    expect(stdout).toContain('── Ignored (framework) ──');
    expect(stdout).toContain('target attribute');
  });
});
