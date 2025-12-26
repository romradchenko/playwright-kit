# @playwright-kit/auth

Infrastructure utilities for managing Playwright `storageState` auth artifacts *before* running tests.

- Users define project-specific auth flows in `playwright.auth.config.ts`
- CLI generates `.auth/<profile>.json`
- CLI `ensure` validates and refreshes states **before** tests (no auto-login during test execution)

## Why this package (if Playwright already has `storageState`)?

Playwright gives you the low-level primitives:

- Save: `context.storageState({ path })`
- Use: `test.use({ storageState: "state.json" })`
- Optional: write a custom `globalSetup` to generate states before a run

This package provides the missing “infrastructure layer” many teams end up building themselves:

- **Multi-profile auth states** (`admin`, `user`, `...`) in one config file
- **Ensure** workflow: validate existing states and refresh only when missing/invalid
- **Explicit pre-test step** (runs before `playwright test`, not hidden inside fixtures)
- **Failure artifacts** (trace + screenshot) in deterministic locations for CI debugging
- **Optional app startup** via `webServer` so `ensure` can be self-contained in CI
- **Optional `.env` loading** via `--dotenv` to keep scripts copy/paste friendly

The “Native Playwright” section below is intentional: it shows that after generation, auth states are plain Playwright `storageState` files — there’s no runtime magic.

## Install

```bash
npm i -D @playwright-kit/auth
```

With pnpm:

```bash
pnpm add -D @playwright-kit/auth
```

## TL;DR (copy/paste)

1) Add `playwright.auth.config.ts` (example below), then:

```bash
playwright-kit auth ensure --dotenv
playwright test
```

2) In tests, either use native Playwright:

```ts
test.use({ storageState: ".auth/admin.json" });
```

or the wrapper:

```ts
import { authTest } from "@playwright-kit/auth";

export const test = authTest({ defaultProfile: "user" });
test.use({ auth: "admin" });
```

Choose:
- Native: simplest; you reference `.auth/<profile>.json` directly.
- Wrapper: cleaner multi-profile switching via `test.use({ auth: "<profile>" })`.

## What you get

- Config API: `defineAuthConfig(...)`
- CLI: `playwright-kit auth setup` / `playwright-kit auth ensure`
- Test ergonomics: `authTest(...)` (optional)

## Quick start (copy/paste)

### 1) Add `playwright.auth.config.ts`

This example supports two profiles: `admin` and `user`.

```ts
import { defineAuthConfig } from "@playwright-kit/auth";

export default defineAuthConfig({
  baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3000",

  // Optional: have the CLI start your app and wait until it's reachable.
  // Use this in CI (or anytime your app isn't already running).
  // If omitted, the CLI assumes your app is already running at `baseURL`.
  webServer: {
    command: "npm run dev",
    // Optional; defaults to baseURL when omitted.
    // url: "http://127.0.0.1:3000/login",
  },

  profiles: {
    admin: {
      validateUrl: "/admin",
      async login(page, { credentials }) {
        await page.goto("/login");
        await page.getByLabel("Email").fill(credentials.email);
        await page.getByLabel("Password").fill(credentials.password);
        await page.getByRole("button", { name: "Sign in" }).click();
      },
      async validate(page) {
        const ok = await page.getByRole("heading", { name: "Admin" }).isVisible();
        return ok ? { ok: true } : { ok: false, reason: "Admin heading not visible" };
      },
    },

    user: {
      validateUrl: "/me",
      async login(page, { credentials }) {
        await page.goto("/login");
        await page.getByLabel("Email").fill(credentials.email);
        await page.getByLabel("Password").fill(credentials.password);
        await page.getByRole("button", { name: "Sign in" }).click();
      },
      async validate(page) {
        const ok = await page.getByRole("heading", { name: "Me" }).isVisible();
        return ok ? { ok: true } : { ok: false, reason: "Me heading not visible" };
      },
    },
  },
});
```

### 2) Provide credentials (env convention)

Default mapping is:
- `AUTH_<PROFILE>_EMAIL`
- `AUTH_<PROFILE>_PASSWORD`

Where `<PROFILE>` is uppercased and non-alphanumerics become `_` (`qa-admin` → `QA_ADMIN`).

Examples:
- `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD`
- `AUTH_USER_EMAIL`, `AUTH_USER_PASSWORD`

### 3) Add scripts to `package.json`

This keeps tests “pure”: auth refresh happens before Playwright tests run.

```json
{
  "scripts": {
    "auth:ensure": "playwright-kit auth ensure --dotenv",
    "pretest": "npm run auth:ensure",
    "test": "playwright test"
  }
}
```

With pnpm:

```json
{
  "scripts": {
    "auth:ensure": "playwright-kit auth ensure --dotenv",
    "pretest": "pnpm run auth:ensure",
    "test": "playwright test"
  }
}
```

Now:

```bash
npm test
```

## CLI

### `playwright-kit auth setup`

Generate a single profile:

```bash
playwright-kit auth setup --profile admin --dotenv
```

### `playwright-kit auth ensure`

Ensure all profiles from config (default):

```bash
playwright-kit auth ensure --dotenv
```

Ensure a subset:

```bash
playwright-kit auth ensure --profile admin --profile user --dotenv
```

### `--dotenv` / `--dotenv-path`

Node does not load `.env` automatically. If you want `.env` support:

```bash
playwright-kit auth ensure --dotenv
```

Or:

```bash
playwright-kit auth ensure --dotenv-path .env.ci
```

This requires `dotenv` to be installed in your project (`npm i -D dotenv`).

## Using in tests

### Native Playwright

Use this if you prefer the simplest, framework-native approach: you reference the generated `storageState` file directly.
This does not require any `@playwright-kit/auth` test wrapper.

```ts
import { test } from "@playwright/test";

test.use({ storageState: ".auth/admin.json" });
```

### `authTest()` wrapper (recommended ergonomics)

Use this if you have multiple profiles and want clean switching via `test.use({ auth: "user" })` (Playwright-native patterns),
while still keeping auth refresh outside of test execution.

Create a single fixtures file and reuse it:

```ts
// tests/fixtures.ts
import { authTest } from "@playwright-kit/auth";

export const test = authTest({ defaultProfile: "user" });
export const expect = test.expect;
```

Usage (default profile):

```ts
import { test, expect } from "./fixtures";

test("user by default", async ({ page }) => {
  await page.goto("/me");
  await expect(page.getByTestId("whoami")).toHaveText("user");
});
```

Switch profile using native Playwright patterns:

```ts
import { test, expect } from "./fixtures";

test.use({ auth: "admin" });

test("admin view", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByTestId("whoami")).toHaveText("admin");
});
```

The wrapper never regenerates state; if a state file is missing/invalid it fails with instructions to run `playwright-kit auth ensure`.

## Artifacts

- Auth states: `.auth/<profile>.json`
- Failures: `.auth/.failures/<profile>/<runId>/{trace.zip,screenshot.png,error.txt}`

## `.gitignore`

Recommended:

```
.auth/
```

## When is `webServer` required?

- Required when your `login()` / `validate()` needs the app UI (via `baseURL`), but the app is not guaranteed to be running before `playwright-kit auth ensure/setup` (typical in CI).
- Not needed if the app is already started externally (docker-compose, separate terminal/job) before running the auth CLI.
- Recommended for CI to avoid “connection refused” and to keep `ensure` self-contained and deterministic.
