import path from "node:path";

export function resolveStatesDir(options: {
  projectRoot: string;
  statesDir?: string;
}): string {
  const configured = options.statesDir ?? ".auth";
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(options.projectRoot, configured);
}

export function assertSafeProfileNameForFile(profile: string): void {
  if (!profile || profile.trim() !== profile) {
    throw new Error(`Invalid profile name "${profile}".`);
  }
  if (profile.includes("/") || profile.includes("\\") || profile.includes("..")) {
    throw new Error(
      `Invalid profile name "${profile}" (must not contain path separators or "..").`,
    );
  }
}

export function resolveStatePath(options: {
  statesDir: string;
  profile: string;
}): string {
  assertSafeProfileNameForFile(options.profile);
  return path.join(options.statesDir, `${options.profile}.json`);
}

export function resolveFailuresDir(options: {
  statesDir: string;
  profile: string;
  runId: string;
}): string {
  assertSafeProfileNameForFile(options.profile);
  return path.join(options.statesDir, ".failures", options.profile, options.runId);
}
