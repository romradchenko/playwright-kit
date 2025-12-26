import path from "node:path";

import { createUserError } from "../internal/userError";

export async function maybeLoadDotenv(options: {
  enabled: boolean;
  cwd: string;
  dotenvPath?: string;
}): Promise<void> {
  if (!options.enabled) return;

  let dotenv: typeof import("dotenv");
  try {
    dotenv = (await import("dotenv")) as typeof import("dotenv");
  } catch {
    throw createUserError(
      `--dotenv requires "dotenv" to be installed in your project (npm i -D dotenv).`,
    );
  }

  const resolvedPath = options.dotenvPath
    ? path.resolve(options.cwd, options.dotenvPath)
    : undefined;

  const result = dotenv.config(resolvedPath ? { path: resolvedPath } : undefined);
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : String(result.error);
    throw createUserError(`Failed to load .env: ${message}`);
  }
}

