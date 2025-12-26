export function formatHelp(): string {
  return `
playwright-kit auth

Usage:
  playwright-kit auth setup --profile <name> [--config <path>] [--headed] [--browser <chromium|firefox|webkit>]
  playwright-kit auth ensure [--profile <name> ...] [--config <path>] [--fail-fast] [--headed] [--browser <chromium|firefox|webkit>]

Notes:
  - Config must default-export the result of defineAuthConfig(...).
  - Credentials default to env vars AUTH_<PROFILE>_EMAIL and AUTH_<PROFILE>_PASSWORD.
  - Auth states are stored in .auth/<profile>.json (relative to the config file directory by default).
`.trim();
}

