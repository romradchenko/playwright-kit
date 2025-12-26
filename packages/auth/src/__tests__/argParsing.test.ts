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
  ]);
  assert.deepEqual(parsed, {
    kind: "setup",
    profile: "admin",
    configPath: "playwright.auth.config.ts",
    headed: true,
    browser: "firefox",
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
  });
});

