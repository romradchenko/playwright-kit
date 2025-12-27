import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { URL } from "node:url";

import type { WebServerArgs } from "./args";
import { createUserError } from "../internal/userError";

const WEB_SERVER_POLL_INTERVAL_MS = 250;

function shouldSpawnInShell(command: string): boolean {
  // If the command includes whitespace or quotes, users are likely passing something like:
  // - `npm run dev`
  // - `"C:\\Program Files\\My App\\app.exe" --flag`
  // In these cases, using the OS shell preserves existing behavior, but it also means the
  // string is interpreted by a shell. Treat it as trusted configuration.
  return /[\s"'`]/.test(command.trim());
}

function resolveWindowsCommand(command: string): string {
  // Avoid `shell: true` by resolving `npm` -> `npm.cmd`, etc.
  const hasPathSep = command.includes("\\") || command.includes("/") || command.includes(":");
  const ext = path.extname(command);

  const rawPathEnv = process.env.PATH ?? process.env.Path ?? "";
  const pathEntries = rawPathEnv
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const pathext = (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
    .split(";")
    .map((e) => e.trim())
    .filter(Boolean);

  const tryResolve = (fullPath: string): string | undefined => {
    // If command has no extension, prefer PATHEXT matches even if an extensionless
    // file exists (e.g. Node installs `npm` + `npm.cmd`, but only `.cmd` is runnable).
    if (!ext) {
      for (const extension of pathext) {
        const candidate = `${fullPath}${extension.toLowerCase()}`;
        if (fs.existsSync(candidate)) return candidate;
      }
    }
    if (fs.existsSync(fullPath)) return fullPath;
    return undefined;
  };

  if (hasPathSep) {
    const fullPath = path.isAbsolute(command) ? command : path.resolve(command);
    return tryResolve(fullPath) ?? command;
  }

  // Approximate Windows command resolution order: check CWD first, then PATH.
  const fromCwd = tryResolve(path.join(process.cwd(), command));
  if (fromCwd) return fromCwd;

  for (const entry of pathEntries) {
    const resolved = tryResolve(path.join(entry, command));
    if (resolved) return resolved;
  }

  return command;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quoteCmdArg(value: string): string {
  // Basic quoting for Windows `cmd.exe`. This is intentionally conservative.
  if (value.length === 0) return "\"\"";
  if (!/[ \t"]/g.test(value)) return value;
  return `"${value.replace(/"/g, "\"\"")}"`;
}

async function killProcessTree(pid: number): Promise<void> {
  if (!Number.isFinite(pid) || pid <= 0) return;

  if (process.platform === "win32") {
    const runTaskkill = async (
      args: readonly string[],
      timeoutMs: number,
    ): Promise<void> => {
      await new Promise<void>((resolve) => {
        const taskkill = spawn("taskkill", args, {
          stdio: "ignore",
          windowsHide: true,
        });

        const timeout = setTimeout(() => {
          taskkill.kill();
          resolve();
        }, timeoutMs);

        taskkill.on("error", () => {
          clearTimeout(timeout);
          resolve();
        });
        taskkill.on("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    };

    const isPidAlive = (): boolean => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    };

    // Try graceful termination first to allow cleanup; fall back to force-kill.
    await runTaskkill(["/PID", String(pid), "/T"], 2_000);
    await sleep(300);
    if (isPidAlive()) await runTaskkill(["/PID", String(pid), "/T", "/F"], 5_000);
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
  const isLocalhost =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "::1";

  return new Promise((resolve) => {
    const req = client.get(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        timeout: 1_000,
        ...(parsed.protocol === "https:" && isLocalhost
          ? { rejectUnauthorized: false }
          : undefined),
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

async function waitForUrlOrExit(options: {
  url: string;
  timeoutMs: number;
  child: ReturnType<typeof spawn>;
  getSpawnError?: () => unknown;
}): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < options.timeoutMs) {
    const spawnError = options.getSpawnError?.();
    if (spawnError) {
      const message = spawnError instanceof Error ? spawnError.message : String(spawnError);
      throw createUserError(`Failed to start web server: ${message}`);
    }
    if (options.child.exitCode !== null) {
      throw createUserError(
        `Web server exited with code ${options.child.exitCode} before becoming reachable at ${options.url}`,
      );
    }
    // eslint-disable-next-line no-await-in-loop
    const ok = await isUrlReachable(options.url);
    if (ok) return;
    // eslint-disable-next-line no-await-in-loop
    await sleep(WEB_SERVER_POLL_INTERVAL_MS);
  }
  if (options.child.exitCode !== null) {
    throw createUserError(
      `Web server exited with code ${options.child.exitCode} before becoming reachable at ${options.url}`,
    );
  }
  throw createUserError(`Timed out waiting for web server URL: ${options.url}`);
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

  let useShell = shouldSpawnInShell(webServer.command);
  let command = webServer.command;
  let forceQuotedCommandLine = false;
  if (!useShell && process.platform === "win32") {
    const resolved = resolveWindowsCommand(webServer.command);
    const ext = path.extname(resolved).toLowerCase();
    command = resolved;
    // `.cmd` / `.bat` require `cmd.exe` (shell) to execute reliably.
    if (ext === ".cmd" || ext === ".bat") {
      useShell = true;
      forceQuotedCommandLine = true;
    }
  }

  const commandForSpawn = forceQuotedCommandLine
    ? [quoteCmdArg(command), ...webServer.args.map(quoteCmdArg)].join(" ")
    : command;
  const argsForSpawn = forceQuotedCommandLine ? [] : webServer.args;

  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(commandForSpawn, argsForSpawn, {
      stdio: "inherit",
      shell: useShell,
      env: process.env,
      detached: process.platform !== "win32",
      windowsHide: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createUserError(`Failed to start web server: ${message}`);
  }
  let spawnError: unknown;
  child.once("error", (error) => {
    spawnError = error;
  });

  try {
    if (spawnError) {
      const message = spawnError instanceof Error ? spawnError.message : String(spawnError);
      throw createUserError(`Failed to start web server: ${message}`);
    }
    await waitForUrlOrExit({
      url: webServer.url,
      timeoutMs: webServer.timeoutMs,
      child,
      getSpawnError: () => spawnError,
    });
    return await fn();
  } finally {
    await killProcessTree(child.pid ?? 0);
  }
}
