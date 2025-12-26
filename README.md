# playwright-kit

A focused toolkit for solving real-world Playwright E2E pain points without changing your existing workflow.

This repo is a small monorepo of production-ready utilities built on top of Playwright (not a testing framework).

## Packages

- `@playwright-kit/auth` — manage Playwright `storageState` artifacts before tests (multi-profile, `ensure`, CI-friendly failures).
  - Docs: `packages/auth/README.md`
  - Install: `npm i -D @playwright-kit/auth`
  - Example: `examples/next-admin-auth`

## Local dev

```bash
npm i
```

## Contributing

See `CONTRIBUTING.md`.
