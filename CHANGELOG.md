# Changelog

## 0.2.2

### Added

- `--preset` accepts a comma-separated list, so `--preset gmail,outlook` lints
  against the union of both. Thanks to [@deltamualpha](https://github.com/deltamualpha),
  who filed the request in [#3](https://github.com/stewartjarod/email-lint/issues/3)
  and then wrote it in [#4](https://github.com/stewartjarod/email-lint/pull/4).

### Fixed

- `--preset gmail, outlook` no longer fails on the space after the comma.
  Trailing commas and repeated names are handled too.
- Bumped nanoid to 3.3.18.

### Docs

- Corrected what the READMEs say about `caniemail`. The previous wording described
  it as raw data with no severity or formatting; it returns structured errors and
  warnings and ships helpers to group and format them. email-lint is the linter on
  top — opinionated severity, framework filtering, exit codes. Reported by
  [@shellscape](https://github.com/shellscape) in
  [#1](https://github.com/stewartjarod/email-lint/issues/1).
- Documented that the CLI exits 0 when the only findings are warnings, which #3
  asked for and the CLI already did.

## 0.2.1

Initial published release.
