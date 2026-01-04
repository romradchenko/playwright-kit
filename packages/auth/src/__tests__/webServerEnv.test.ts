import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { withWebServer } from "../cli/webServer";

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "playwright-kit-auth-webserver-env-"));
}

function getFreePort(): number {
  return 20_000 + Math.floor(Math.random() * 10_000);
}

test("withWebServer passes webServer.env to the spawned process", async () => {
  const root = await makeTempDir();
  const port = getFreePort();
  const serverPath = path.join(root, "server.mjs");
  await fs.writeFile(
    serverPath,
    [
      "import http from 'node:http';",
      "",
      "const port = Number(process.argv[2]);",
      "const server = http.createServer((req, res) => {",
      "  if (req.url === '/env') {",
      "    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });",
      "    res.end(JSON.stringify({ PLAYWRIGHT_KIT_EXAMPLE: process.env.PLAYWRIGHT_KIT_EXAMPLE ?? null }));",
      "    return;",
      "  }",
      "  res.writeHead(404);",
      "  res.end('not found');",
      "});",
      "",
      "server.listen(port, '127.0.0.1');",
      "process.on('SIGINT', () => server.close(() => process.exit(0)));",
      "",
    ].join("\n"),
    "utf8",
  );

  const url = `http://127.0.0.1:${port}/env`;
  await withWebServer(
    {
      command: "node",
      args: [serverPath, String(port)],
      url,
      timeoutMs: 10_000,
      reuseExisting: false,
      env: { PLAYWRIGHT_KIT_EXAMPLE: "vite-react-auth" },
    },
    async () => {
      const res = await fetch(url);
      assert.equal(res.status, 200);
      const data: unknown = await res.json();
      assert.deepEqual(data, { PLAYWRIGHT_KIT_EXAMPLE: "vite-react-auth" });
    },
  );
});
