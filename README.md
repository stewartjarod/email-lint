# email-lint

Catch email client compatibility issues before your users do. Validates HTML and CSS against [caniemail](https://www.caniemail.com/) data for 30+ email clients including Gmail, Outlook, Apple Mail, and Yahoo.

```
$ npx @email-lint/core check welcome.html

welcome.html
  12:5   error    cursor not supported (4/4 variants)  [gmail]
  18:3   warning  background-image not supported (2/6 variants: windows, windows-mail)  [outlook]
  24:10  warning  <picture> not supported (4/4 variants)  [gmail]

✖ 1 error, 2 warnings
```

## Quick start

```sh
# Lint an HTML email
npx @email-lint/core check welcome.html

# Lint a React Email component (renders to HTML automatically)
npx @email-lint/core check src/emails/welcome.tsx

# Check only Gmail compatibility
npx @email-lint/core check welcome.html --preset gmail
```

## Install

```sh
npm install @email-lint/core
```

## What it does

Raw [caniemail](https://www.npmjs.com/package/caniemail) data gives you one diagnostic per client variant — 26+ results per issue, no severity levels, no formatting. email-lint makes that data useful:

- **Collapses by family** — 4 Gmail variants become one line: `(4/4 variants) [gmail]`
- **Smart severity** — `cursor` is cosmetic (info, not error). Gmail forces `target="_blank"` on all links — if you already use it, that's info too
- **React Email aware** — Suppresses false positives from framework internals (preview blocks, preload images, forced `target="_blank"`)
- **CI-ready** — Exit code 1 on errors. GitHub Actions formatter shows inline annotations on PR diffs
- **TSX support** — Point it at a `.tsx` component, it renders and lints in one step

## Use with React Email

```sh
npm install @email-lint/react-email
```

```ts
import { lintComponent } from '@email-lint/react-email';

const result = await lintComponent(<Welcome name="Jane" />);
// Framework-aware filtering enabled by default
```

Or use the CLI directly — it auto-detects `.tsx` files:

```sh
email-lint check src/emails/welcome.tsx
```

## Use in CI

```yaml
# GitHub Actions
- name: Lint emails
  run: npx @email-lint/core check 'src/emails/**/*.html' --format github
```

```sh
# Any CI — exit code 1 on errors
email-lint check src/emails/ --format json
```

## Use in tests

```ts
import { expect, test } from 'vitest';
import { lintComponent } from '@email-lint/react-email';
import { Welcome } from './emails/welcome';

test('Welcome email has no compatibility errors', async () => {
  const result = await lintComponent(<Welcome name="Jane" />);
  expect(result.errorCount).toBe(0);
});

test('Welcome email passes Gmail checks', async () => {
  const result = await lintComponent(<Welcome name="Jane" />, { preset: 'gmail' });
  expect(result.success).toBe(true);
});
```

## Packages

| Package | Description | |
|---|---|---|
| [`@email-lint/core`](./packages/email-lint) | Linter engine + CLI | [![npm](https://img.shields.io/npm/v/@email-lint/core)](https://www.npmjs.com/package/@email-lint/core) |
| [`@email-lint/react-email`](./packages/react-email) | React Email integration | [![npm](https://img.shields.io/npm/v/@email-lint/react-email)](https://www.npmjs.com/package/@email-lint/react-email) |

## Contributing

```sh
pnpm install
pnpm build
pnpm test
```

## License

MIT
