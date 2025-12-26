import type { AuthConfigLoadResult } from "../../config/types";
import { setupProfileState } from "../../runner/setupProfileState";
import { createUserError } from "../../internal/userError";

export async function authSetup(options: {
  loaded: AuthConfigLoadResult;
  profileName: string;
  headed: boolean;
  browserName?: "chromium" | "firefox" | "webkit";
  env: NodeJS.ProcessEnv;
}): Promise<{ statePath: string }> {
  const profile = options.loaded.config.profiles[options.profileName];
  if (!profile) {
    const available = Object.keys(options.loaded.config.profiles).sort().join(", ");
    throw createUserError(
      `Unknown profile "${options.profileName}". Available profiles: ${available}.`,
    );
  }

  return setupProfileState({
    config: options.loaded.config,
    projectRoot: options.loaded.projectRoot,
    profileName: options.profileName,
    profile,
    headed: options.headed,
    env: options.env,
    browserName: options.browserName,
  });
}
