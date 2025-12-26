import { createUserError } from "../internal/userError";

type BrowserName = "chromium" | "firefox" | "webkit";

export interface WebServerArgs {
  command: string;
  args: string[];
  url: string;
  timeoutMs: number;
  reuseExisting: boolean;
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
      failFast: boolean;
      headed: boolean;
      browser?: BrowserName;
      webServer?: WebServerArgs;
      dotenv?: DotenvArgs;
    };

function isBrowserName(value: string): value is BrowserName {
  return value === "chromium" || value === "firefox" || value === "webkit";
}

function takeValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value || value.startsWith("-")) {
    throw createUserError(`Flag "${flag}" expects a value.`);
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

function takeInt(argv: string[], index: number, flag: string): number {
  const raw = takeValue(argv, index, flag);
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw createUserError(`Flag "${flag}" expects a positive integer (got "${raw}").`);
  }
  return value;
}

function parseWebServerArgs(rest: string[]): WebServerArgs | undefined {
  let command: string | undefined;
  const args: string[] = [];
  let url: string | undefined;
  let timeoutMs = 60_000;
  let reuseExisting = true;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--web-server-command") {
      command = takeValue(rest, i, arg);
      i++;
      continue;
    }
    if (arg === "--web-server-arg") {
      args.push(takeAnyValue(rest, i, arg));
      i++;
      continue;
    }
    if (arg === "--web-server-url") {
      url = takeValue(rest, i, arg);
      i++;
      continue;
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
      if (arg === "--profile") {
        profile = takeValue(rest, i, arg);
        i++;
        continue;
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
      if (arg === "--dotenv-path") {
        dotenv = { enabled: true, path: takeValue(rest, i, arg) };
        i++;
        continue;
      }
      if (
        arg === "--web-server-command" ||
        arg === "--web-server-arg" ||
        arg === "--web-server-url" ||
        arg === "--web-server-timeout-ms" ||
        arg === "--web-server-reuse-existing" ||
        arg === "--no-web-server-reuse-existing"
      ) {
        if (
          arg === "--web-server-command" ||
          arg === "--web-server-arg" ||
          arg === "--web-server-url" ||
          arg === "--web-server-timeout-ms"
        ) {
          i++;
        }
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
    let failFast = false;
    let headed = false;
    let browser: BrowserName | undefined;
    const webServer = parseWebServerArgs(rest);
    let dotenv: DotenvArgs | undefined;

    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i];
      if (arg === "--profile") {
        profiles.push(takeValue(rest, i, arg));
        i++;
        continue;
      }
      if (arg === "--config") {
        configPath = takeValue(rest, i, arg);
        i++;
        continue;
      }
      if (arg === "--fail-fast") {
        failFast = true;
        continue;
      }
      if (arg === "--headed") {
        headed = true;
        continue;
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
      if (arg === "--dotenv-path") {
        dotenv = { enabled: true, path: takeValue(rest, i, arg) };
        i++;
        continue;
      }
      if (
        arg === "--web-server-command" ||
        arg === "--web-server-arg" ||
        arg === "--web-server-url" ||
        arg === "--web-server-timeout-ms" ||
        arg === "--web-server-reuse-existing" ||
        arg === "--no-web-server-reuse-existing"
      ) {
        if (
          arg === "--web-server-command" ||
          arg === "--web-server-arg" ||
          arg === "--web-server-url" ||
          arg === "--web-server-timeout-ms"
        ) {
          i++;
        }
        continue;
      }
      throw createUserError(`Unknown argument "${arg}".`);
    }

    return {
      kind: "ensure",
      profiles: profiles.length > 0 ? profiles : undefined,
      configPath,
      failFast,
      headed,
      browser,
      webServer,
      dotenv,
    };
  }

  return { kind: "help" };
}
