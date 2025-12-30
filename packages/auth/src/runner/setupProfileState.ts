import type { AuthConfig, AuthProfileConfig } from "../config/types";
import { resolveProfileCredentials } from "../credentials/resolveCredentials";
import { resolveFailuresDir, resolveStatePath, resolveStatesDir } from "../state/paths";
import { writeFileAtomic } from "../state/writeStorageState";

import { chromium, firefox, webkit } from "playwright";

import { createRunId, writeFailureArtifacts } from "./artifacts";
import { mergeLaunchOptions } from "./mergeLaunchOptions";
import { resolveBaseURL, resolveValidateUrl } from "./resolveUrls";

export async function setupProfileState(options: {
  config: AuthConfig;
  projectRoot: string;
  profileName: string;
  profile: AuthProfileConfig;
  headed: boolean;
  env: NodeJS.ProcessEnv;
  browserName?: "chromium" | "firefox" | "webkit";
}): Promise<{ statePath: string }> {
  const statesDir = resolveStatesDir({
    projectRoot: options.projectRoot,
    statesDir: options.config.statesDir,
  });
  const statePath = resolveStatePath({ statesDir, profile: options.profileName });

  const browserName = options.browserName ?? options.config.browser ?? "chromium";
  const baseURL = resolveBaseURL(options.config, options.profile);
  const validateUrl = resolveValidateUrl(options.config, options.profile);

  const credentials = resolveProfileCredentials({
    profileName: options.profileName,
    profile: options.profile,
    config: options.config,
    env: options.env,
  });

  let browserType = chromium;
  if (browserName === "firefox") {
    browserType = firefox;
  } else if (browserName === "webkit") {
    browserType = webkit;
  }

  const browser = await browserType.launch(
    mergeLaunchOptions({ config: options.config, profile: options.profile, headed: options.headed }),
  );

  const context = await browser.newContext({ baseURL });
  let tracingStarted = false;
  try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    tracingStarted = true;
  } catch {
    tracingStarted = false;
  }
  const page = await context.newPage();

  try {
    await options.profile.login(page, {
      profile: options.profileName,
      credentials,
    });

    await page.goto(validateUrl, { waitUntil: "domcontentloaded" });
    const result = await options.profile.validate(page, { profile: options.profileName });
    if (!result.ok) {
      throw new Error(`Validation failed for profile "${options.profileName}": ${result.reason}`);
    }

    const storageState = await context.storageState();
    await writeFileAtomic(statePath, JSON.stringify(storageState, null, 2));
    return { statePath };
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
    throw new Error(
      `${message}\nArtifacts: ${artifactsMessage}`,
    );
  } finally {
    if (tracingStarted) {
      await context.tracing.stop().catch(() => undefined);
    }
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

