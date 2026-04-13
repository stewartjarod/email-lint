# @email-lint/react-email

Lint [React Email](https://react.email) components for client compatibility. Renders your component to HTML and validates it against [caniemail](https://www.caniemail.com/) data using [email-lint](https://www.npmjs.com/package/email-lint).

```ts
import { lintComponent } from '@email-lint/react-email';
import { Welcome } from './emails/welcome';

const result = await lintComponent(<Welcome name="Jane" />);

console.log(result.success);      // true
console.log(result.errorCount);   // 0
console.log(result.diagnostics);  // LintDiagnostic[]
```

## Install

```sh
npm install @email-lint/react-email
```

Peer dependencies: `react` and `@react-email/render`.

## API

### `lintComponent(element, config?)`

Renders a React element to HTML via `@react-email/render`, then lints it with `email-lint`.

Framework-aware filtering is enabled by default — diagnostics caused by React Email internals (preview text blocks, preload image tags, forced `target="_blank"`) are automatically suppressed. Pass `framework: undefined` to opt out.

```ts
// Lint against specific clients
const result = await lintComponent(<Welcome />, { preset: 'gmail' });

// Disable framework filtering
const result = await lintComponent(<Welcome />, { framework: undefined });

// Keep suppressed diagnostics visible
const result = await lintComponent(<Welcome />, { showIgnored: true });
```

Returns the same `LintResult` type as `email-lint` — see [email-lint docs](https://www.npmjs.com/package/email-lint) for the full type reference.

## Use in tests

```ts
import { describe, it, expect } from 'vitest';
import { lintComponent } from '@email-lint/react-email';
import { Welcome } from './emails/welcome';

describe('email compatibility', () => {
  it('Welcome has no errors', async () => {
    const result = await lintComponent(<Welcome name="Jane" />);
    expect(result.errorCount).toBe(0);
  });

  it('Welcome passes Gmail checks', async () => {
    const result = await lintComponent(<Welcome name="Jane" />, { preset: 'gmail' });
    expect(result.success).toBe(true);
  });
});
```

## License

MIT
