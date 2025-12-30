# Changelog

## 0.2.0

- Breaking: removed `baseTest` / `baseExpect` options from `authTest()` and `createAuthTest()` to keep types strictly aligned with Playwright’s default `test`.
- CLI: removed `--fail-fast` (undocumented) to keep `ensure` behavior consistent and deterministic across multiple profiles.

## 0.1.0

- CLI: `playwright-kit auth setup/ensure` with failure artifacts and optional `webServer` + `dotenv`.
- Config: `defineAuthConfig()` + multi-profile auth state generation and validation.
- Tests: `authTest()` wrapper for clean `test.use({ auth: "profile" })` ergonomics.

## 0.1.1

- Docs: clearer copy/paste quickstart and pnpm notes.
