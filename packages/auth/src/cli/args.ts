import { createUserError } from "../internal/userError";

import {
  DEFAULT_WEB_SERVER_REUSE_EXISTING,
  DEFAULT_WEB_SERVER_TIMEOUT_MS,
} from "./webServerDefaults";

type BrowserName = "chromium" | "firefox" | "webkit";

export interface WebServerArgs {
  command: string;
  args: string[];
  url: string;
  timeoutMs: number;
  reuseExisting: boolean;
  env?: Record<string, string>;
}

export interface DotenvArgs {
  enabled: boolean;
  path?: string;
}

export type ParsedArgs =
  | { kind: "help" }
  | {
      kind: "setup";
      profile: string;
      configPath?: string;
      headed: boolean;
      browser?: BrowserName;
      webServer?: WebServerArgs;
      dotenv?: DotenvArgs;
    }
  | {
      kind: "ensure";
      profiles?: string[];
      configPath?: string;
      headed: boolean;
      browser?: BrowserName;
      webServer?: WebServerArgs;
      dotenv?: DotenvArgs;
    };

function isBrowserName(value: string): value is BrowserName {
  return value === "chromium" || value === "firefox" || value === "webkit";
}

function takeAttachedValue(arg: string, flag: string): string | undefined {
  const prefix = `${flag}=`;
  if (!arg.startsWith(prefix)) return undefined;

  const value = arg.slice(prefix.length);
  if (!value) {
    throw createUserError(`Flag "${flag}" expects a value.`);
  }
  return value;
}

function takeValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) {
    throw createUserError(`Flag "${flag}" expects a value.`);
  }
  if (value.startsWith("-")) {
    throw createUserError(
      `Flag "${flag}" expects a value. If your value starts with "-", pass it as "${flag}=<value>".`,
    );
  }
  return value;
}

function takeAnyValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) {
    throw createUserError(`Flag "${flag}" expects a value.`);
  }
  return value;
}

function parsePositiveInt(flag: string, raw: string): number {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw createUserError(`Flag "${flag}" expects a positive integer (got "${raw}").`);
  }
  return value;
}

function takeInt(argv: string[], index: number, flag: string): number {
  const raw = takeValue(argv, index, flag);
  return parsePositiveInt(flag, raw);
}

function getWebServerArgConsumeCount(arg: string): 0 | 1 | undefined {
  if (
    arg === "--web-server-reuse-existing" ||
    arg === "--no-web-server-reuse-existing"
  ) {
    return 0;
  }

  const flagsWithValues = [
    "--web-server-command",
    "--web-server-arg",
    "--web-server-url",
    "--web-server-timeout-ms",
  ] as const;

  for (const flag of flagsWithValues) {
    if (arg === flag) return 1;
    if (arg.startsWith(`${flag}=`)) return 0;
  }

  return undefined;
}

function parseWebServerArgs(rest: string[]): WebServerArgs | undefined {
  let command: string | undefined;
  const args: string[] = [];
  let url: string | undefined;
  let timeoutMs = DEFAULT_WEB_SERVER_TIMEOUT_MS;
  let reuseExisting = DEFAULT_WEB_SERVER_REUSE_EXISTING;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    {
      const value = takeAttachedValue(arg, "--web-server-command");
      if (value !== undefined) {
        command = value;
        continue;
      }
    }
    if (arg === "--web-server-command") {
      command = takeValue(rest, i, arg);
      i++;
      continue;
    }
    {
      const value = takeAttachedValue(arg, "--web-server-arg");
      if (value !== undefined) {
        args.push(value);
        continue;
      }
    }
    if (arg === "--web-server-arg") {
      args.push(takeAnyValue(rest, i, arg));
      i++;
      continue;
    }
    {
      const value = takeAttachedValue(arg, "--web-server-url");
      if (value !== undefined) {
        url = value;
        continue;
      }
    }
    if (arg === "--web-server-url") {
      url = takeValue(rest, i, arg);
      i++;
      continue;
    }
    {
      const value = takeAttachedValue(arg, "--web-server-timeout-ms");
      if (value !== undefined) {
        timeoutMs = parsePositiveInt("--web-server-timeout-ms", value);
        continue;
      }
    }
    if (arg === "--web-server-timeout-ms") {
      timeoutMs = takeInt(rest, i, arg);
      i++;
      continue;
    }
    if (arg === "--web-server-reuse-existing") {
      reuseExisting = true;
      continue;
    }
    if (arg === "--no-web-server-reuse-existing") {
      reuseExisting = false;
      continue;
    }
  }

  if (!command && !url) return undefined;
  if (!command || !url) {
    throw createUserError(
      `Web server requires both "--web-server-command <cmd>" and "--web-server-url <url>".`,
    );
  }

  return { command, args, url, timeoutMs, reuseExisting };
}

export function parseArgs(argv: string[]): ParsedArgs {
  if (argv.includes("--help") || argv.includes("-h")) return { kind: "help" };

  const [topic, command, ...rest] = argv;
  if (topic !== "auth" || !command) {
    return { kind: "help" };
  }

  if (command === "setup") {
    let profile: string | undefined;
    let configPath: string | undefined;
    let headed = false;
    let browser: BrowserName | undefined;
    const webServer = parseWebServerArgs(rest);
    let dotenv: DotenvArgs | undefined;

    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i];
      {
        const value = takeAttachedValue(arg, "--profile");
        if (value !== undefined) {
          profile = value;
          continue;
        }
      }
      if (arg === "--profile") {
        profile = takeValue(rest, i, arg);
        i++;
        continue;
      }
      {
        const value = takeAttachedValue(arg, "--config");
        if (value !== undefined) {
          configPath = value;
          continue;
        }
      }
      if (arg === "--config") {
        configPath = takeValue(rest, i, arg);
        i++;
        continue;
      }
      if (arg === "--headed") {
        headed = true;
        continue;
      }
      {
        const value = takeAttachedValue(arg, "--browser");
        if (value !== undefined) {
          if (!isBrowserName(value)) {
            throw createUserError(`Invalid --browser value "${value}".`);
          }
          browser = value;
          continue;
        }
      }
      if (arg === "--browser") {
        const value = takeValue(rest, i, arg);
        if (!isBrowserName(value)) {
          throw createUserError(`Invalid --browser value "${value}".`);
        }
        browser = value;
        i++;
        continue;
      }
      if (arg === "--dotenv") {
        dotenv = { enabled: true };
        continue;
      }
      {
        const value = takeAttachedValue(arg, "--dotenv-path");
        if (value !== undefined) {
          dotenv = { enabled: true, path: value };
          continue;
        }
      }
      if (arg === "--dotenv-path") {
        dotenv = { enabled: true, path: takeValue(rest, i, arg) };
        i++;
        continue;
      }
      const consumeWebServer = getWebServerArgConsumeCount(arg);
      if (consumeWebServer !== undefined) {
        i += consumeWebServer;
        continue;
      }
      throw createUserError(`Unknown argument "${arg}".`);
    }

    if (!profile) {
      throw createUserError(`Missing required flag "--profile <name>".`);
    }

    return { kind: "setup", profile, configPath, headed, browser, webServer, dotenv };
  }

  if (command === "ensure") {
    const profiles: string[] = [];
    let configPath: string | undefined;
    let headed = false;
    let browser: BrowserName | undefined;
    const webServer = parseWebServerArgs(rest);
    let dotenv: DotenvArgs | undefined;

    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i];
      {
        const value = takeAttachedValue(arg, "--profile");
        if (value !== undefined) {
          profiles.push(value);
          continue;
        }
      }
      if (arg === "--profile") {
        profiles.push(takeValue(rest, i, arg));
        i++;
        continue;
      }
      {
        const value = takeAttachedValue(arg, "--config");
        if (value !== undefined) {
          configPath = value;
          continue;
        }
      }
      if (arg === "--config") {
        configPath = takeValue(rest, i, arg);
        i++;
        continue;
      }
      if (arg === "--headed") {
        headed = true;
        continue;
      }
      {
        const value = takeAttachedValue(arg, "--browser");
        if (value !== undefined) {
          if (!isBrowserName(value)) {
            throw createUserError(`Invalid --browser value "${value}".`);
          }
          browser = value;
          continue;
        }
      }
      if (arg === "--browser") {
        const value = takeValue(rest, i, arg);
        if (!isBrowserName(value)) {
          throw createUserError(`Invalid --browser value "${value}".`);
        }
        browser = value;
        i++;
        continue;
      }
      if (arg === "--dotenv") {
        dotenv = { enabled: true };
        continue;
      }
      {
        const value = takeAttachedValue(arg, "--dotenv-path");
        if (value !== undefined) {
          dotenv = { enabled: true, path: value };
          continue;
        }
      }
      if (arg === "--dotenv-path") {
        dotenv = { enabled: true, path: takeValue(rest, i, arg) };
        i++;
        continue;
      }
      const consumeWebServer = getWebServerArgConsumeCount(arg);
      if (consumeWebServer !== undefined) {
        i += consumeWebServer;
        continue;
      }
      throw createUserError(`Unknown argument "${arg}".`);
    }

    return {
      kind: "ensure",
      profiles: profiles.length > 0 ? profiles : undefined,
      configPath,
      headed,
      browser,
      webServer,
      dotenv,
    };
  }

  return { kind: "help" };
}
