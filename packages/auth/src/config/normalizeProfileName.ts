import { createUserError } from "../internal/userError";

export function normalizeProfileNameToEnvKey(profile: string): string {
  const normalized = profile
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) {
    throw createUserError(
      `Invalid profile name "${profile}" (cannot derive env key).`,
    );
  }

  return normalized;
}
