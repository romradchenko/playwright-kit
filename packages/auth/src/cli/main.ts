import { loadAuthConfig } from "../config/loadAuthConfig";

import { parseArgs } from "./args";
import { authEnsure } from "./commands/authEnsure";
import { authSetup } from "./commands/authSetup";
import { EXIT_FAILURE, EXIT_OK, EXIT_USAGE } from "./exitCodes";
import { formatHelp } from "./help";
import { isUserError } from "../internal/userError";
import { withWebServer } from "./webServer";
import { maybeLoadDotenv } from "./dotenv";
import type { WebServerArgs } from "./args";
import { createUserError } from "../internal/userError";

async function run(argv: string[]): Promise<number> {
  try {
    const parsed = parseArgs(argv);
    if (parsed.kind === "help") {
      console.log(formatHelp());
      return EXIT_OK;
    }

    await maybeLoadDotenv({
      enabled: parsed.dotenv?.enabled === true,
      cwd: process.cwd(),
      dotenvPath: parsed.dotenv?.path,
    });

    const loaded = await loadAuthConfig({ cwd: process.cwd(), configPath: parsed.configPath });
    console.log(`auth: config ${loaded.configFilePath}`);

    const resolvedWebServer: WebServerArgs | undefined =
      parsed.webServer ??
      (loaded.config.webServer
        ? {
            command: loaded.config.webServer.command,
            args: loaded.config.webServer.args ?? [],
            url:
              loaded.config.webServer.url ??
              loaded.config.baseURL ??
              (() => {
                throw createUserError(
                  `Auth config webServer.url is missing and baseURL is not set.`,
                );
              })(),
            timeoutMs: loaded.config.webServer.timeoutMs ?? 60_000,
            reuseExisting: loaded.config.webServer.reuseExisting ?? true,
          }
        : undefined);

    if (parsed.kind === "setup") {
      const result = await withWebServer(resolvedWebServer, async () =>
        authSetup({
          loaded,
          profileName: parsed.profile,
          headed: parsed.headed,
          browserName: parsed.browser,
          env: process.env,
        }),
      );
      console.log(`auth setup: wrote ${result.statePath}`);
      return EXIT_OK;
    }

    await withWebServer(resolvedWebServer, async () =>
      authEnsure({
        loaded,
        profileNames: parsed.profiles,
        headed: parsed.headed,
        failFast: parsed.failFast,
        browserName: parsed.browser,
        env: process.env,
      }),
    );
    return EXIT_OK;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    if (isUserError(error)) {
      console.error("");
      console.error(formatHelp());
      return EXIT_USAGE;
    }
    return EXIT_FAILURE;
  }
}

void (async () => {
  const exitCode = await run(process.argv.slice(2));
  process.exitCode = exitCode;
})();
