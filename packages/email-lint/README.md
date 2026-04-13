# email-lint

Lint email HTML for client compatibility. Validates CSS properties, HTML elements, and attributes against [caniemail](https://www.caniemail.com/) data for 30+ email clients.

```
$ email-lint check welcome.html

welcome.html
  12:5   error    cursor not supported (4/4 variants)  [gmail]
  18:3   warning  background-image not supported (2/6 variants: windows, windows-mail)  [outlook]
  24:10  warning  <picture> not supported (4/4 variants)  [gmail]

✖ 1 error, 2 warnings
```

## Install

```sh
npm install email-lint
```

## CLI

```sh
# Lint HTML files
email-lint check emails/*.html

# Lint React Email components directly (.tsx/.jsx)
email-lint check src/emails/welcome.tsx

# Target specific clients
email-lint check welcome.html --preset gmail
email-lint check welcome.html --preset outlook

# Output formats
email-lint check welcome.html --format pretty   # default, colored terminal output
email-lint check welcome.html --format json      # structured JSON for tooling
email-lint check welcome.html --format github    # GitHub Actions annotations

# Expand collapsed diagnostics to one line per variant
email-lint check welcome.html --verbose
```

Exits with code `1` when errors are found — drop it into CI and it just works.

### Presets

| Preset | Clients |
|---|---|
| `all-clients` | All 30+ clients (default) |
| `gmail` | Gmail desktop, iOS, Android, mobile web |
| `outlook` | Outlook desktop, web, Windows Mail |
| `apple-mail` | Apple Mail macOS, iOS |
| `yahoo` | Yahoo Mail desktop, iOS, Android |

### React Email / TSX

When you pass `.tsx` or `.jsx` files, the CLI automatically:

1. Loads the component using [jiti](https://github.com/unjs/jiti) (no build step needed)
2. Renders it to HTML via `@react-email/components`
3. Enables framework-aware filtering to suppress known false positives

Export your component as default and optionally export `testData` for props:

```tsx
export const testData = { name: 'Jane' };

export default function Welcome({ name }: { name: string }) {
  return (
    <Html>
      <Body>
        <Text>Hey {name}</Text>
      </Body>
    </Html>
  );
}
```

```sh
email-lint check src/emails/welcome.tsx
```

Use `--no-ignore-framework` to disable framework filtering, or `--show-ignored` to see suppressed diagnostics in a separate section.

## Library API

```ts
import { lint } from 'email-lint';

const html = '<div style="cursor: pointer;">Click</div>';
const result = lint(html, { preset: 'gmail' });

console.log(result.success);      // false
console.log(result.errorCount);   // 1
console.log(result.diagnostics);  // LintDiagnostic[]
```

### `lint(html, config?)`

Returns a `LintResult` with diagnostics grouped by client family.

```ts
interface LintResult {
  diagnostics: LintDiagnostic[];
  errorCount: number;
  warningCount: number;
  success: boolean;
}

interface LintDiagnostic {
  severity: 'error' | 'warning' | 'info';
  title: string;                    // Feature name from caniemail
  message: string;                  // Human-readable message with notes
  family: string;                   // "gmail", "outlook", etc.
  variants: string[];               // Affected variants within the family
  familySize: number;               // Total variants in this family
  position?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

interface LintConfig {
  preset?: string;                  // Client preset (default: "all-clients")
  framework?: 'react-email';       // Enable framework-aware filtering
  showIgnored?: boolean;            // Keep suppressed diagnostics in output
}
```

### Formatters

```ts
import { lint, formatPretty, formatJson, formatGitHub } from 'email-lint';

const result = lint(html);
console.log(formatPretty([result]));
console.log(formatJson([result]));
console.log(formatGitHub([result]));
```

## How it works

1. **Parse** — Feeds your HTML to [caniemail](https://www.npmjs.com/package/caniemail), which checks every CSS property, HTML element, and attribute against its compatibility database
2. **Severity rules** — Applies context-aware rules. `cursor` is cosmetic in email, so it downgrades to `info`. Gmail forces `target="_blank"` on all links, so if you already use it, that's `info` too
3. **Family collapsing** — Groups per-variant diagnostics into families. Instead of 4 separate "Gmail Android / Gmail iOS / Gmail desktop / Gmail mobile" entries, you get one diagnostic showing `(4/4 variants)`
4. **Framework filtering** — When linting React Email components, suppresses diagnostics caused by the framework itself (preview text blocks, preload image tags, forced `target="_blank"`)

## GitHub Actions

```yaml
- name: Lint emails
  run: email-lint check 'src/emails/**/*.tsx' --format github
```

The `github` formatter emits [workflow commands](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/workflow-commands-for-github-actions) that show inline annotations on your PR diffs.

## License

MIT
