import { spawn } from "node:child_process";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

import type { WebServerArgs } from "./args";
import { createUserError } from "../internal/userError";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function killProcessTree(pid: number): Promise<void> {
  if (!Number.isFinite(pid) || pid <= 0) return;

  if (process.platform === "win32") {
    const { spawnSync } = await import("node:child_process");
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  // POSIX: negative PID kills the process group when spawned with `detached: true`.
  try {
    process.kill(-pid, "SIGINT");
  } catch {
    // ignore
  }
  await sleep(300);
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    // ignore
  }
}

async function isUrlReachable(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const client = parsed.protocol === "https:" ? https : http;

  return new Promise((resolve) => {
    const req = client.get(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        timeout: 1_000,
      },
      (res) => {
        res.resume();
        const code = res.statusCode ?? 0;
        resolve(code >= 200 && code < 500);
      },
    );

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await isUrlReachable(url);
    if (ok) return;
    // eslint-disable-next-line no-await-in-loop
    await sleep(250);
  }
  throw createUserError(`Timed out waiting for web server URL: ${url}`);
}

export async function withWebServer<T>(
  webServer: WebServerArgs | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (!webServer) return fn();

  if (webServer.reuseExisting) {
    const reachable = await isUrlReachable(webServer.url);
    if (reachable) return fn();
  }

  const child = spawn(webServer.command, webServer.args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
    detached: process.platform !== "win32",
  });

  try {
    await waitForUrl(webServer.url, webServer.timeoutMs);
    return await fn();
  } finally {
    await killProcessTree(child.pid ?? 0);
  }
}
