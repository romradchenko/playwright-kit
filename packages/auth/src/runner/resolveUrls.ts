import type { AuthConfig, AuthProfileConfig } from "../config/types";

export function resolveBaseURL(config: AuthConfig, profile: AuthProfileConfig): string | undefined {
  return profile.baseURL ?? config.baseURL;
}

export function resolveValidateUrl(
  config: AuthConfig,
  profile: AuthProfileConfig,
): string {
  return profile.validateUrl ?? config.validateUrl ?? "/";
}

