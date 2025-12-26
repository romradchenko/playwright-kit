import type { AuthConfig, AuthCredentials, AuthProfileConfig } from "../config/types";
import { normalizeProfileNameToEnvKey } from "../config/normalizeProfileName";
import { createUserError } from "../internal/userError";

function assertValidCredentials(
  profile: string,
  credentials: AuthCredentials,
): AuthCredentials {
  if (!credentials.email || !credentials.password) {
    throw createUserError(
      `Credentials resolver for profile "${profile}" returned an invalid value; expected { email, password }.`,
    );
  }
  return credentials;
}

function defaultEnvCredentialsResolver(ctx: {
  profile: string;
  env: NodeJS.ProcessEnv;
}): AuthCredentials {
  const envKey = normalizeProfileNameToEnvKey(ctx.profile);
  const emailVar = `AUTH_${envKey}_EMAIL`;
  const passwordVar = `AUTH_${envKey}_PASSWORD`;

  const email = ctx.env[emailVar];
  const password = ctx.env[passwordVar];

  const missing: string[] = [];
  if (!email) missing.push(emailVar);
  if (!password) missing.push(passwordVar);

  if (missing.length > 0) {
    throw createUserError(
      [
        `Missing credentials for profile "${ctx.profile}".`,
        `Set: ${missing.join(", ")}.`,
        `Example: ${emailVar}=user@example.com ${passwordVar}=***`,
      ].join(" "),
    );
  }

  return { email: email!, password: password! };
}

export function resolveProfileCredentials(options: {
  profileName: string;
  profile: AuthProfileConfig;
  config: AuthConfig;
  env: NodeJS.ProcessEnv;
}): AuthCredentials {
  const resolver =
    options.profile.credentials ??
    options.config.credentials ??
    defaultEnvCredentialsResolver;

  const credentials = resolver({ profile: options.profileName, env: options.env });
  return assertValidCredentials(options.profileName, credentials);
}
