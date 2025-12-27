import fs from "node:fs/promises";

import type { AuthConfig, AuthProfileConfig } from "../config/types";
import { resolveFailuresDir, resolveStatePath, resolveStatesDir } from "../state/paths";
import { readStorageStateJson } from "../state/readStorageState";

import { createRunId, writeFailureArtifacts } from "./artifacts";
import { mergeLaunchOptions } from "./mergeLaunchOptions";
import { resolveBaseURL, resolveValidateUrl } from "./resolveUrls";

export type ValidateResult = { ok: true } | { ok: false; reason: string };

export async function validateProfileState(options: {
  config: AuthConfig;
  projectRoot: string;
  profileName: string;
  profile: AuthProfileConfig;
  headed: boolean;
  browserName?: "chromium" | "firefox" | "webkit";
}): Promise<ValidateResult> {
  const statesDir = resolveStatesDir({
    projectRoot: options.projectRoot,
    statesDir: options.config.statesDir,
  });
  const statePath = resolveStatePath({ statesDir, profile: options.profileName });

  try {
    await fs.access(statePath);
  } catch {
    return { ok: false, reason: `Missing state file at "${statePath}".` };
  }

  try {
    await readStorageStateJson(statePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: message };
  }

  const browserName = options.browserName ?? options.config.browser ?? "chromium";
  const baseURL = resolveBaseURL(options.config, options.profile);
  const validateUrl = resolveValidateUrl(options.config, options.profile);

  const { chromium, firefox, webkit } = await import("playwright");
  let browserType = chromium;
  if (browserName === "firefox") {
    browserType = firefox;
  } else if (browserName === "webkit") {
    browserType = webkit;
  }

  const browser = await browserType.launch(
    mergeLaunchOptions({ config: options.config, profile: options.profile, headed: options.headed }),
  );

  const context = await browser.newContext({
    baseURL,
    storageState: statePath,
  });

  let tracingStarted = false;
  try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    tracingStarted = true;
  } catch {
    tracingStarted = false;
  }
  const page = await context.newPage();

  try {
    await page.goto(validateUrl, { waitUntil: "domcontentloaded" });
    const result = await options.profile.validate(page, { profile: options.profileName });
    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    return { ok: true };
  } catch (error) {
    const runId = createRunId();
    const failuresDir = resolveFailuresDir({
      statesDir,
      profile: options.profileName,
      runId,
    });
    const artifacts = await writeFailureArtifacts({
      failuresDir,
      error,
      page,
      context: tracingStarted ? context : undefined,
    });

    const message = error instanceof Error ? error.message : String(error);
    const artifactsMessage = tracingStarted
      ? `${artifacts.screenshotPath}, ${artifacts.tracePath}`
      : artifacts.screenshotPath;
    return {
      ok: false,
      reason: `${message}\nArtifacts: ${artifactsMessage}`,
    };
  } finally {
    if (tracingStarted) {
      await context.tracing.stop().catch(() => undefined);
    }
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}
