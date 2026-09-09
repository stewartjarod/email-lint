# CLAUDE.md — email-lint

## Commits

Conventional commits, from 2026-09-09 onward. Earlier history uses sentence-case
imperative subjects; do not rewrite it.

```
feat(core): add comma-separated preset handling
fix(react-email): stop flagging preview blocks as errors
docs: correct the caniemail comparison
chore(deps): bump nanoid to 3.3.18
```

Scopes are the package directory names: `core` for `packages/email-lint`,
`react-email` for `packages/react-email`. Omit the scope for repo-wide changes.

Describe the why, not the what. Commits are GPG-signed.

## Claims about caniemail

`packages/email-lint` depends on `caniemail@^1.0.4`, which resolves to **1.x, not
the 2.x on npm latest**. Verify against the resolved version before writing
anything comparative — both READMEs previously described a library that did not
match the one actually installed (issue #1, reported by @shellscape).

What caniemail 1.0.5 actually provides, verified 2026-09-09 from the published
tarball:

- `caniemail()` returns `{ issues, success }` — structured, not raw
- `FeatureIssues` splits `errors` and `warnings`, so severity already exists
- `formatIssue()` returns `{ message, notes }`
- `groupIssues()` and `sortIssues()` are exported from `helpers`
- the client-variant count moves between versions, so do not quote a number

The honest distinction is **linter versus data API**: caniemail reports what is
unsupported, email-lint decides what matters (opinionated severity, framework
filtering) and gets it into a terminal and CI.

## Releasing

Publishing to npm is the maintainer's job and is never delegated to an agent.
Prepare the version bump and changelog, then stop and hand over.
