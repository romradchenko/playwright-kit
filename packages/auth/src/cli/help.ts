import {
  DEFAULT_WEB_SERVER_REUSE_EXISTING,
  DEFAULT_WEB_SERVER_TIMEOUT_MS,
} from "./webServerDefaults";

export function formatHelp(): string {
  return `
playwright-kit auth

Usage:
  playwright-kit auth setup --profile <name> [--config <path>] [--headed] [--browser <chromium|firefox|webkit>]
  playwright-kit auth ensure [--profile <name> ...] [--config <path>] [--fail-fast] [--headed] [--browser <chromium|firefox|webkit>]

Env (optional):
  --dotenv                          Load .env from current working directory (requires "dotenv").
  --dotenv-path <path>              Load env from a specific file path (requires "dotenv").

Web server (optional):
  --web-server-command <cmd>         Command to start your app/server (quote if it contains spaces).
  --web-server-arg <arg>             Repeatable argument (e.g. "--web-server-arg run --web-server-arg dev").
  --web-server-url <url>             URL to wait for before running auth flows.
  --web-server-timeout-ms <ms>       Default: ${DEFAULT_WEB_SERVER_TIMEOUT_MS}.
  --web-server-reuse-existing        Default: ${DEFAULT_WEB_SERVER_REUSE_EXISTING} (skip starting if URL is already reachable).
  --no-web-server-reuse-existing

Notes:
  - Config must default-export the result of defineAuthConfig(...).
  - Credentials default to env vars AUTH_<PROFILE>_EMAIL and AUTH_<PROFILE>_PASSWORD.
  - Auth states are stored in .auth/<profile>.json (relative to the config file directory by default).
`.trim();
}
