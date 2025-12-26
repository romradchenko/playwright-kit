import { createUserError } from "../internal/userError";

type BrowserName = "chromium" | "firefox" | "webkit";

export type ParsedArgs =
  | { kind: "help" }
  | {
      kind: "setup";
      profile: string;
      configPath?: string;
      headed: boolean;
      browser?: BrowserName;
    }
  | {
      kind: "ensure";
      profiles?: string[];
      configPath?: string;
      failFast: boolean;
      headed: boolean;
      browser?: BrowserName;
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
      throw createUserError(`Unknown argument "${arg}".`);
    }

    if (!profile) {
      throw createUserError(`Missing required flag "--profile <name>".`);
    }

    return { kind: "setup", profile, configPath, headed, browser };
  }

  if (command === "ensure") {
    const profiles: string[] = [];
    let configPath: string | undefined;
    let failFast = false;
    let headed = false;
    let browser: BrowserName | undefined;

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
      throw createUserError(`Unknown argument "${arg}".`);
    }

    return {
      kind: "ensure",
      profiles: profiles.length > 0 ? profiles : undefined,
      configPath,
      failFast,
      headed,
      browser,
    };
  }

  return { kind: "help" };
}
