# @playwright-kit/auth

Infrastructure utilities for managing Playwright `storageState` authentication artifacts *before* running tests.

V1 intentionally avoids “magic” during test execution: auth states are generated/refreshed via CLI, then tests reference the JSON files.

## Install

```bash
npm i -D @playwright-kit/auth
```

## Quick start

1) Create `playwright.auth.config.ts` in your project root:

```ts
import { defineAuthConfig } from "@playwright-kit/auth";

export default defineAuthConfig({
  baseURL: process.env.BASE_URL,
  profiles: {
    admin: {
      validateUrl: "/dashboard",
      async login(page, { credentials }) {
        await page.goto("/login");
        await page.getByLabel("Email").fill(credentials.email);
        await page.getByLabel("Password").fill(credentials.password);
        await page.getByRole("button", { name: "Sign in" }).click();
      },
      async validate(page) {
        const visible = await page.getByRole("heading", { name: "Dashboard" }).isVisible();
        return visible ? { ok: true } : { ok: false, reason: "Dashboard heading not visible" };
      },
    },
  },
});
```

2) Provide credentials via environment variables:

- `AUTH_ADMIN_EMAIL`
- `AUTH_ADMIN_PASSWORD`

Rule: `AUTH_<PROFILE>_EMAIL` and `AUTH_<PROFILE>_PASSWORD`, where `<PROFILE>` is uppercased and non-alphanumerics become `_`.

3) Generate state:

```bash
pnpm exec playwright-kit auth setup --profile admin
```

This writes `.auth/admin.json` (relative to the config file directory by default).

## CLI

### `playwright-kit auth setup`

```bash
pnpm exec playwright-kit auth setup --profile admin
```

Deterministic steps: load config → resolve credentials → launch → login → validate → save `storageState`.

### `playwright-kit auth ensure`

```bash
pnpm exec playwright-kit auth ensure
```

- Validates all profiles in the config (or a subset via `--profile`).
- Missing/invalid states are regenerated via the same flow as `setup`.
- No hidden retries.

### Artifacts

- Auth states: `.auth/<profile>.json`
- Failures: `.auth/.failures/<profile>/<runId>/{trace.zip,screenshot.png,error.txt}`

## Using in tests

### Native Playwright

```ts
import { test } from "@playwright/test";

test.use({ storageState: ".auth/admin.json" });
```

### Wrapper (optional)

```ts
import { createAuthTest } from "@playwright-kit/auth";

const { test, expect } = createAuthTest({ statesDir: ".auth", defaultProfile: "admin" });

test.withAuth("admin")("admin can access dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/dashboard/);
});
```

The wrapper never regenerates state; it fails with an actionable message if the file is missing or invalid.

## `.gitignore`

Recommended:

```
.auth/
```

## CI

```bash
pnpm exec playwright-kit auth ensure
pnpm exec playwright test
```
