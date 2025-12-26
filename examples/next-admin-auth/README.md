# Next.js admin auth example

A working example of `@playwright-kit/auth` with a tiny Next.js app that has:

- `/login` page (email/password)
- `/admin` page (requires `session=admin` cookie)

Auth state is generated **before** tests via the CLI, and tests use `storageState`.

## Install

From the repo root:

```bash
npm install
npm -w packages/auth run build
```

## Setup env

Copy `.env.example` to `.env`:

```bash
copy .env.example .env
```

## Generate/refresh auth state

Manual (starts the app via CLI `--web-server-*`, waits for the URL, runs ensure):

```bash
npm -w examples/next-admin-auth run auth:ensure
```

This writes `examples/next-admin-auth/.auth/admin.json`.

## Run tests

```bash
npm -w examples/next-admin-auth test
```

`npm test` runs `pretest` automatically, which runs `playwright-kit auth ensure` before Playwright.

## CI flow

```bash
npm -w packages/auth run build
npm -w examples/next-admin-auth test
```
