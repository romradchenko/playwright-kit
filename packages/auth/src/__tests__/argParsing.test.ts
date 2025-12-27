import test from "node:test";
import assert from "node:assert/strict";

import { parseArgs } from "../cli/args";
import { isUserError } from "../internal/userError";

test("parseArgs: setup requires --profile", () => {
  assert.throws(() => parseArgs(["auth", "setup"]), (e) => isUserError(e));
});

test("parseArgs: setup parses flags", () => {
  const parsed = parseArgs([
    "auth",
    "setup",
    "--profile",
    "admin",
    "--config",
    "playwright.auth.config.ts",
    "--headed",
    "--browser",
    "firefox",
    "--dotenv",
    "--web-server-command",
    "npx",
    "--web-server-arg",
    "next",
    "--web-server-arg",
    "dev",
    "--web-server-arg",
    "-p",
    "--web-server-arg",
    "3017",
    "--web-server-url",
    "http://127.0.0.1:3017/login",
    "--web-server-timeout-ms",
    "120000",
    "--no-web-server-reuse-existing",
  ]);
  assert.deepEqual(parsed, {
    kind: "setup",
    profile: "admin",
    configPath: "playwright.auth.config.ts",
    headed: true,
    browser: "firefox",
    dotenv: { enabled: true },
    webServer: {
      command: "npx",
      args: ["next", "dev", "-p", "3017"],
      url: "http://127.0.0.1:3017/login",
      timeoutMs: 120000,
      reuseExisting: false,
    },
  });
});

test("parseArgs: ensure supports repeated --profile", () => {
  const parsed = parseArgs(["auth", "ensure", "--profile", "a", "--profile", "b"]);
  assert.deepEqual(parsed, {
    kind: "ensure",
    profiles: ["a", "b"],
    configPath: undefined,
    failFast: false,
    headed: false,
    browser: undefined,
    webServer: undefined,
    dotenv: undefined,
  });
});

test("parseArgs: supports --flag=value (including values starting with '-')", () => {
  const parsed = parseArgs([
    "auth",
    "setup",
    "--profile=admin",
    "--config=-playwright.auth.config.ts",
    "--browser=firefox",
  ]);
  assert.deepEqual(parsed, {
    kind: "setup",
    profile: "admin",
    configPath: "-playwright.auth.config.ts",
    headed: false,
    browser: "firefox",
    dotenv: undefined,
    webServer: undefined,
  });
});
