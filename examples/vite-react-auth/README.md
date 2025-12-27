# Vite + React auth example

Minimal Vite+React app showing `@playwright-kit/auth` usage and (importantly) that `authTest()` does **not** override normal `test.use({ ... })` context options.

## Setup

From repo root:

```bash
npm i
```

## Run auth + tests

```bash
cd examples/vite-react-auth
npm run setup:env
npm run test:e2e
```

This runs:

- `playwright-kit auth ensure --dotenv` to generate `.auth/<profile>.json`
- `playwright test`

## Notes

- The app exposes `GET /api/headers` via Vite dev-server middleware to assert `extraHTTPHeaders`.
- Profiles:
  - `admin` writes `localStorage.role = "admin"`
  - `user` writes `localStorage.role = "user"`
