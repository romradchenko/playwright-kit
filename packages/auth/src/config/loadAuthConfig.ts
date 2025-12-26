import path from "node:path";
import { pathToFileURL } from "node:url";

import { findAuthConfigFile } from "./findAuthConfigFile";
import type { AuthConfig, AuthConfigLoadResult, AuthProfileConfig } from "./types";
import { createUserError } from "../internal/userError";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertProfileConfig(
  profileName: string,
  profile: unknown,
  global: AuthConfig,
): asserts profile is AuthProfileConfig {
  if (!isObject(profile)) {
    throw createUserError(`Auth profile "${profileName}" must be an object.`);
  }

  if (typeof profile.login !== "function") {
    throw createUserError(
      `Auth profile "${profileName}" must define "login(page, ctx)".`,
    );
  }

  if (typeof profile.validate !== "function") {
    throw createUserError(
      `Auth profile "${profileName}" must define "validate(page, ctx)" (required).`,
    );
  }

  const hasValidateUrl =
    typeof profile.validateUrl === "string" && profile.validateUrl.length > 0;
  const hasProfileBaseUrl =
    typeof profile.baseURL === "string" && profile.baseURL.length > 0;
  const hasGlobalValidateUrl =
    typeof global.validateUrl === "string" && global.validateUrl.length > 0;
  const hasGlobalBaseUrl =
    typeof global.baseURL === "string" && global.baseURL.length > 0;

  if (!(hasValidateUrl || hasProfileBaseUrl || hasGlobalValidateUrl || hasGlobalBaseUrl)) {
    throw createUserError(
      `Auth profile "${profileName}" must set "validateUrl" (or a baseURL) either on the profile or in the root config.`,
    );
  }
}

function assertAuthConfig(config: unknown): asserts config is AuthConfig {
  if (!isObject(config)) {
    throw createUserError(`Auth config must be an object (default export).`);
  }

  if (!isObject(config.profiles)) {
    throw createUserError(`Auth config must define "profiles" as an object.`);
  }

  if (config.webServer !== undefined) {
    if (!isObject(config.webServer)) {
      throw createUserError(`Auth config "webServer" must be an object.`);
    }
    if (typeof config.webServer.command !== "string" || config.webServer.command.length === 0) {
      throw createUserError(`Auth config "webServer.command" must be a non-empty string.`);
    }
    if (
      config.webServer.url !== undefined &&
      (typeof config.webServer.url !== "string" || config.webServer.url.length === 0)
    ) {
      throw createUserError(`Auth config "webServer.url" must be a non-empty string.`);
    }
    if (
      config.webServer.url === undefined &&
      !(typeof config.baseURL === "string" && config.baseURL.length > 0)
    ) {
      throw createUserError(
        `Auth config "webServer.url" is optional, but when omitted you must set root "baseURL".`,
      );
    }
    if (
      config.webServer.args !== undefined &&
      !Array.isArray(config.webServer.args)
    ) {
      throw createUserError(`Auth config "webServer.args" must be an array of strings.`);
    }
  }

  if (
    config.browser !== undefined &&
    config.browser !== "chromium" &&
    config.browser !== "firefox" &&
    config.browser !== "webkit"
  ) {
    throw createUserError(
      `Auth config "browser" must be "chromium", "firefox", or "webkit".`,
    );
  }

  const profileNames = Object.keys(config.profiles);
  if (profileNames.length === 0) {
    throw createUserError(
      `Auth config must contain at least one profile in "profiles".`,
    );
  }

  for (const name of profileNames) {
    assertProfileConfig(name, config.profiles[name], config as unknown as AuthConfig);
  }
}

export async function loadAuthConfig(options: {
  cwd: string;
  configPath?: string;
}): Promise<AuthConfigLoadResult> {
  const configFilePath = options.configPath
    ? path.resolve(options.cwd, options.configPath)
    : findAuthConfigFile(options.cwd);

  if (!configFilePath) {
    throw createUserError(
      `Could not find a Playwright auth config. Create "playwright.auth.config.ts" in your project root or pass "--config <path>".`,
    );
  }

  const configUrl = pathToFileURL(configFilePath).href;
  const moduleExports: unknown = await import(configUrl);

  const config = (moduleExports as { default?: unknown }).default;
  if (!config) {
    throw createUserError(
      `Auth config at "${configFilePath}" must have a default export (e.g. "export default defineAuthConfig({...})").`,
    );
  }

  assertAuthConfig(config);

  return {
    config,
    configFilePath,
    projectRoot: path.dirname(configFilePath),
  };
}
