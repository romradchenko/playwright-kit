import fs from "node:fs/promises";
import path from "node:path";

import type { BrowserContext, Page } from "playwright";

import { writeFileAtomic } from "../state/writeStorageState";

export function createRunId(date: Date = new Date()): string {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeFailureArtifacts(options: {
  failuresDir: string;
  error: unknown;
  page?: Page;
  context?: BrowserContext;
}): Promise<{ tracePath: string; screenshotPath: string; errorPath: string }> {
  await ensureDir(options.failuresDir);

  const tracePath = path.join(options.failuresDir, "trace.zip");
  const screenshotPath = path.join(options.failuresDir, "screenshot.png");
  const errorPath = path.join(options.failuresDir, "error.txt");

  const errorText =
    options.error instanceof Error
      ? `${options.error.name}: ${options.error.message}\n${options.error.stack ?? ""}`
      : String(options.error);

  await writeFileAtomic(errorPath, errorText);

  if (options.context) {
    try {
      await options.context.tracing.stop({ path: tracePath });
    } catch {
      // ignore
    }
  }

  if (options.page) {
    try {
      await options.page.screenshot({ path: screenshotPath, fullPage: true });
    } catch {
      // ignore
    }
  }

  return { tracePath, screenshotPath, errorPath };
}

