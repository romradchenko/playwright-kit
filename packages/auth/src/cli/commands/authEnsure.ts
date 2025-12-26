import type { AuthConfigLoadResult } from "../../config/types";
import { setupProfileState } from "../../runner/setupProfileState";
import { validateProfileState } from "../../runner/validateProfileState";
import { createUserError } from "../../internal/userError";

export async function authEnsure(options: {
  loaded: AuthConfigLoadResult;
  profileNames?: string[];
  headed: boolean;
  failFast: boolean;
  browserName?: "chromium" | "firefox" | "webkit";
  env: NodeJS.ProcessEnv;
  onLog?: (line: string) => void;
}): Promise<void> {
  const log = options.onLog ?? ((line: string) => console.log(line));
  const availableProfiles = Object.keys(options.loaded.config.profiles);

  const profileNames =
    options.profileNames?.length && options.profileNames.length > 0
      ? options.profileNames
      : availableProfiles;

  const unknown = profileNames.filter((p) => !options.loaded.config.profiles[p]);
  if (unknown.length > 0) {
    const available = availableProfiles.sort().join(", ");
    throw createUserError(
      `Unknown profiles: ${unknown.join(", ")}. Available: ${available}.`,
    );
  }

  const failures: Array<{ profile: string; error: unknown }> = [];

  for (const profileName of profileNames) {
    const profile = options.loaded.config.profiles[profileName];
    log(`auth ensure: validating "${profileName}"...`);

    const validation = await validateProfileState({
      config: options.loaded.config,
      projectRoot: options.loaded.projectRoot,
      profileName,
      profile,
      headed: options.headed,
      browserName: options.browserName,
    });

    if (validation.ok) {
      log(`auth ensure: "${profileName}" is valid; skipped.`);
      continue;
    }

    log(`auth ensure: "${profileName}" invalid (${validation.reason}); refreshing...`);

    try {
      const { statePath } = await setupProfileState({
        config: options.loaded.config,
        projectRoot: options.loaded.projectRoot,
        profileName,
        profile,
        headed: options.headed,
        env: options.env,
        browserName: options.browserName,
      });
      log(`auth ensure: "${profileName}" refreshed -> ${statePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`auth ensure: "${profileName}" failed: ${message}`);
      failures.push({ profile: profileName, error });
      if (options.failFast) break;
    }
  }

  if (failures.length > 0) {
    const summary = failures
      .map((f) => {
        const msg = f.error instanceof Error ? f.error.message : String(f.error);
        return `${f.profile}: ${msg}`;
      })
      .join("\n");
    throw new Error(`Auth ensure failed:\n${summary}`);
  }
}
