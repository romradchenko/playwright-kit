import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadAuthConfig } from "../config/loadAuthConfig";
import { isUserError } from "../internal/userError";

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "playwright-kit-auth-"));
}

test("loadAuthConfig finds config by walking up from cwd", async () => {
  const root = await makeTempDir();
  const nested = path.join(root, "a", "b");
  await fs.mkdir(nested, { recursive: true });

  const configPath = path.join(root, "playwright.auth.config.ts");
  await fs.writeFile(
    configPath,
    [
      "export default {",
      "  profiles: {",
      "    admin: {",
      "      baseURL: 'https://example.com',",
      "      validateUrl: '/',",
      "      async login() {},",
      "      async validate() { return { ok: true }; },",
      "    },",
      "  },",
      "};",
      "",
    ].join("\n"),
    "utf8",
  );

  const loaded = await loadAuthConfig({ cwd: nested });
  assert.equal(loaded.configFilePath, configPath);
  assert.equal(loaded.projectRoot, root);
  assert.equal(typeof loaded.config.profiles.admin.login, "function");
  assert.equal(typeof loaded.config.profiles.admin.validate, "function");
});

test("loadAuthConfig throws a user error when config is missing", async () => {
  const root = await makeTempDir();
  await assert.rejects(
    () => loadAuthConfig({ cwd: root }),
    (error) => isUserError(error),
  );
});

