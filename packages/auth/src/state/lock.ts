import fs from "node:fs/promises";
import path from "node:path";

import { createUserError } from "../internal/userError";
import { assertSafeProfileNameForFile } from "./paths";

const DEFAULT_LOCK_TIMEOUT_MS = 120_000;
const LOCK_POLL_INTERVAL_MS = 250;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveProfileLockPath(statesDir: string, profile: string): string {
  assertSafeProfileNameForFile(profile);
  return path.join(statesDir, ".locks", `${profile}.lock`);
}

async function tryAcquireLock(lockPath: string): Promise<fs.FileHandle | undefined> {
  try {
    const handle = await fs.open(lockPath, "wx");
    await handle.writeFile(
      JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }, null, 2),
      "utf8",
    );
    return handle;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST") return undefined;
    throw error;
  }
}

async function acquireLockOrThrow(options: {
  lockPath: string;
  profile: string;
  timeoutMs: number;
}): Promise<fs.FileHandle> {
  const start = Date.now();

  // Intentionally polling: this lock is file-system based and must remain
  // compatible across multiple Node processes.
  // eslint-disable-next-line no-constant-condition
  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const handle = await tryAcquireLock(options.lockPath);
    if (handle) return handle;

    if (Date.now() - start > options.timeoutMs) {
      throw createUserError(
        `Timed out waiting for auth lock for profile "${options.profile}" at "${options.lockPath}". ` +
          `Another "playwright-kit auth" process might be running; if this is stale, delete the lock file.`,
      );
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(LOCK_POLL_INTERVAL_MS);
  }
}

export async function withProfileLock<T>(
  options: { statesDir: string; profile: string; timeoutMs?: number },
  fn: () => Promise<T>,
): Promise<T> {
  const lockPath = resolveProfileLockPath(options.statesDir, options.profile);
  const timeoutMs = options.timeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS;

  await fs.mkdir(path.dirname(lockPath), { recursive: true });

  const handle = await acquireLockOrThrow({ lockPath, profile: options.profile, timeoutMs });

  try {
    return await fn();
  } finally {
    await handle.close().catch(() => undefined);
    await fs.rm(lockPath, { force: true }).catch(() => undefined);
  }
}
