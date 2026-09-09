#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { defineCommand, runMain } from 'citty';
import { createJiti } from 'jiti';

import { getFormatter } from './formatters/index.ts';
import { lint } from './lint.ts';
import type { LintConfig, LintResult } from './types.ts';

const TSX_EXTENSIONS = new Set(['.tsx', '.jsx']);

async function resolveHtml(filePath: string): Promise<string> {
  const ext = extname(filePath);
  if (!TSX_EXTENSIONS.has(ext)) {
    return readFileSync(filePath, 'utf-8');
  }

  const jiti = createJiti(filePath, {
    jsx: { runtime: 'automatic', importSource: 'react', throwIfNamespace: false },
    interopDefault: true,
    fsCache: false,
    moduleCache: false,
  });

  const mod = (await jiti.import(filePath)) as Record<string, unknown>;
  let Component = mod.default as ((...args: unknown[]) => unknown) | undefined;
  if (typeof Component !== 'function') {
    // Fall back to first exported function (handles named components like `const MyEmail = () => ...`)
    Component = Object.values(mod).find((v) => typeof v === 'function') as typeof Component;
  }
  if (typeof Component !== 'function') {
    throw new Error(
      `${filePath}: no component found. Export a React component as default or named export.`
    );
  }

  let render: (element: unknown) => Promise<string>;
  let createElement: (...args: unknown[]) => unknown;
  try {
    const components = (await jiti.import('@react-email/components')) as Record<string, unknown>;
    render = components.render as typeof render;
    const React = (await jiti.import('react')) as Record<string, unknown>;
    createElement = React.createElement as typeof createElement;
  } catch {
    throw new Error(
      'To lint .tsx/.jsx templates, install @react-email/components and react in your project:\n  pnpm add -D @react-email/components react'
    );
  }

  const props = (mod.testData as Record<string, unknown>) ?? {};
  const element = createElement(Component, props);
  return await render(element);
}

const check = defineCommand({
  meta: { name: 'check', description: 'Lint email HTML/TSX files for client compatibility' },
  args: {
    files: {
      type: 'positional',
      description: 'HTML or React Email (.tsx) files to lint',
      required: true,
    },
    preset: { type: 'string', default: 'all-clients', description: 'Client preset' },
    format: {
      type: 'string',
      default: 'pretty',
      description: 'Output format: pretty, json, github',
    },
    verbose: {
      type: 'boolean',
      default: false,
      description: 'Expand collapsed diagnostics to one line per variant',
    },
    framework: {
      type: 'string',
      description: 'Enable framework-aware filtering explicitly (e.g. "react-email")',
    },
    'no-ignore-framework': {
      type: 'boolean',
      default: false,
      description: 'Disable framework-aware filtering for .tsx/.jsx templates',
    },
    'show-ignored': {
      type: 'boolean',
      default: false,
      description: 'Include framework-suppressed diagnostics in the output',
    },
  },
  run: async ({ args }) => {
    const filePaths = args._.map((f) => resolve(f));
    const format = args.format;
    const preset = args.preset;
    const verbose = args.verbose === true;
    const noIgnoreFramework = args['no-ignore-framework'] === true;
    const showIgnored = args['show-ignored'] === true;
    const formatter = getFormatter(format);

    const results: LintResult[] = [];
    const loadErrors: { filePath: string; message: string }[] = [];

    for (const filePath of filePaths) {
      try {
        const html = await resolveHtml(filePath);
        const isTsx = TSX_EXTENSIONS.has(extname(filePath));
        const explicitFramework =
          args.framework === 'react-email' ? ('react-email' as const) : undefined;
        const framework: LintConfig['framework'] =
          explicitFramework ?? (isTsx && !noIgnoreFramework ? 'react-email' : undefined);
        const result = lint(html, { preset, framework, showIgnored });
        results.push({ ...result, filePath });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        loadErrors.push({ filePath, message });
      }
    }

    const output = formatter(results, { verbose });
    if (output.trim()) {
      process.stdout.write(output);
    }

    for (const { filePath, message } of loadErrors) {
      process.stderr.write(`\n${filePath}\n  load error: ${message}\n`);
    }

    const hasErrors = results.some((r) => r.errorCount > 0) || loadErrors.length > 0;
    if (hasErrors) {
      process.exit(1);
    }
  },
});

const main = defineCommand({
  meta: {
    name: 'email-lint',
    version: '0.2.1',
    description: 'Lint email HTML for client compatibility',
  },
  subCommands: { check },
});

runMain(main);
