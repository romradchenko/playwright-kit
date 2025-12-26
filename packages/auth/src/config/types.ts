import type { LaunchOptions, Page } from "playwright";

export interface AuthCredentials {
  email: string;
  password: string;
}

export type AuthCredentialsResolver = (ctx: {
  profile: string;
  env: NodeJS.ProcessEnv;
}) => AuthCredentials;

export interface AuthLoginContext {
  profile: string;
  credentials: AuthCredentials;
}

export interface AuthValidateContext {
  profile: string;
}

export type AuthValidateResult = { ok: true } | { ok: false; reason: string };

export interface AuthProfileConfig {
  baseURL?: string;
  validateUrl?: string;
  login(page: Page, ctx: AuthLoginContext): Promise<void>;
  validate(page: Page, ctx: AuthValidateContext): Promise<AuthValidateResult>;
  launchOptions?: LaunchOptions;
  credentials?: AuthCredentialsResolver;
}

export interface AuthConfig {
  baseURL?: string;
  validateUrl?: string;
  statesDir?: string;
  browser?: "chromium" | "firefox" | "webkit";
  launchOptions?: LaunchOptions;
  credentials?: AuthCredentialsResolver;
  profiles: Record<string, AuthProfileConfig>;
}

export interface AuthConfigLoadResult {
  config: AuthConfig;
  configFilePath: string;
  projectRoot: string;
}

