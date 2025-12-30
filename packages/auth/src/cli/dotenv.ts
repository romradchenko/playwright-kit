import path from "node:path";
import dotenv from "dotenv";

import { createUserError } from "../internal/userError";

export async function maybeLoadDotenv(options: {
  enabled: boolean;
  cwd: string;
  dotenvPath?: string;
}): Promise<void> {
  if (!options.enabled) return;

  const resolvedPath = options.dotenvPath
    ? path.resolve(options.cwd, options.dotenvPath)
    : undefined;

  const result = dotenv.config(resolvedPath ? { path: resolvedPath } : undefined);
  if (result.error) {
    throw createUserError(`Failed to load .env: ${result.error.message}`);
  }
}
