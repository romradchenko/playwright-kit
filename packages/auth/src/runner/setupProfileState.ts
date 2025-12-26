import fs from "node:fs/promises";

import type { AuthConfig, AuthProfileConfig } from "../config/types";
import { resolveProfileCredentials } from "../credentials/resolveCredentials";
import { resolveFailuresDir, resolveStatePath, resolveStatesDir } from "../state/paths";

import { createRunId, writeFailureArtifacts } from "./artifacts";
import { resolveBaseURL, resolveValidateUrl } from "./resolveUrls";

function mergeLaunchOptions(options: {
  config: AuthConfig;
  profile: AuthProfileConfig;
  headed: boolean;
}) {
  return {
    ...(options.config.launchOptions ?? {}),
    ...(options.profile.launchOptions ?? {}),
    headless: !options.headed,
  };
}

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

  const { chromium, firefox, webkit } = await import("playwright");
  const browserType =
    browserName === "firefox"
      ? firefox
      : browserName === "webkit"
        ? webkit
        : chromium;

  const browser = await browserType.launch(
    mergeLaunchOptions({ config: options.config, profile: options.profile, headed: options.headed }),
  );

  const context = await browser.newContext({ baseURL });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
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

    await fs.mkdir(statesDir, { recursive: true });
    await context.storageState({ path: statePath });
    return { statePath };
  } catch (error) {
    const runId = createRunId();
    const failuresDir = resolveFailuresDir({
      statesDir,
      profile: options.profileName,
      runId,
    });
    const artifacts = await writeFailureArtifacts({ failuresDir, error, page, context });

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${message}\nArtifacts: ${artifacts.screenshotPath}, ${artifacts.tracePath}`,
    );
  } finally {
    await context.tracing.stop().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

