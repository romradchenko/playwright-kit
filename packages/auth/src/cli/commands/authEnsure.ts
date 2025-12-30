import type { AuthConfigLoadResult } from "../../config/types";
import { setupProfileState } from "../../runner/setupProfileState";
import { validateProfileState } from "../../runner/validateProfileState";
import { createUserError } from "../../internal/userError";
import { resolveStatesDir } from "../../state/paths";
import { withProfileLock } from "../../state/lock";

export async function authEnsure(options: {
  loaded: AuthConfigLoadResult;
  profileNames?: string[];
  headed: boolean;
  browserName?: "chromium" | "firefox" | "webkit";
  env: NodeJS.ProcessEnv;
  onLog?: (line: string) => void;
}): Promise<void> {
  const log = options.onLog ?? ((line: string) => console.log(line));
  const availableProfiles = Object.keys(options.loaded.config.profiles);
  const statesDir = resolveStatesDir({
    projectRoot: options.loaded.projectRoot,
    statesDir: options.loaded.config.statesDir,
  });

  const profileNames =
    options.profileNames && options.profileNames.length > 0
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

    if (!profile.validateUrl && !options.loaded.config.validateUrl) {
      log(
        `auth ensure: warning: "${profileName}" has no validateUrl; defaulting to "/" (set validateUrl to make validation deterministic).`,
      );
    }

    try {
      // Avoid concurrent processes corrupting/overwriting the same state file.
      await withProfileLock({ statesDir, profile: profileName }, async () => {
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
          return;
        }

        log(`auth ensure: "${profileName}" invalid (${validation.reason}); refreshing...`);
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
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`auth ensure: "${profileName}" failed: ${message}`);
      failures.push({ profile: profileName, error });
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
