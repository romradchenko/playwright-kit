import fs from "node:fs";
import path from "node:path";

import type { Browser, BrowserContext, Expect, TestType } from "@playwright/test";

export interface CreateAuthTestOptions {
  statesDir?: string;
  defaultProfile?: string;
  baseTest?: TestType<any, any>;
  baseExpect?: Expect<any>;
}

type PlaywrightTestFn = Parameters<TestType<any, any>>[1];

export type AuthTest = TestType<any, any> & {
  withAuth(profile?: string): TestType<any, any>;
  auth(profile: string, title: string, fn: PlaywrightTestFn): void;
  auth(title: string, fn: PlaywrightTestFn): void;
};

export type AuthTestWithExpect = AuthTest & { expect: Expect<any> };

function resolveStatePath(options: { statesDir: string; profile: string }): string {
  const dir = path.isAbsolute(options.statesDir)
    ? options.statesDir
    : path.resolve(process.cwd(), options.statesDir);
  return path.join(dir, `${options.profile}.json`);
}

function assertStateFileReadable(statePath: string, profile: string): void {
  if (!fs.existsSync(statePath)) {
    throw new Error(
      `Missing auth state for profile "${profile}" at "${statePath}". Run: playwright-kit auth setup --profile ${profile} (or playwright-kit auth ensure).`,
    );
  }

  try {
    const raw = fs.readFileSync(statePath, "utf8");
    JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Invalid auth state JSON for profile "${profile}" at "${statePath}": ${message}`,
    );
  }
}

function loadPlaywrightTestModule(): typeof import("@playwright/test") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("@playwright/test") as typeof import("@playwright/test");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `@playwright-kit/auth wrapper requires @playwright/test to be installed (peer dependency). ${message}`,
    );
  }
}

export interface AuthTestOptions {
  /** Directory containing `<profile>.json`; default `.auth` relative to `process.cwd()`. */
  statesDir?: string;
  /** Alias for statesDir (kept for ergonomics). */
  stateDir?: string;
  defaultProfile: string;
  baseTest?: TestType<any, any>;
  baseExpect?: Expect<any>;
}

export function authTest(options: AuthTestOptions): AuthTestWithExpect {
  const loaded = loadPlaywrightTestModule();
  const baseTest = options.baseTest ?? loaded.test;
  const expect = options.baseExpect ?? loaded.expect;

  const statesDir = options.statesDir ?? options.stateDir ?? ".auth";
  const defaultProfile = options.defaultProfile;

  const testBase = baseTest.extend<{
    auth: string;
    _authStatePath: string;
  }>({
    auth: [defaultProfile, { option: true }],
    _authStatePath: async (
      { auth }: { auth: string },
      use: (value: string) => Promise<void>,
    ) => {
      if (!auth) {
        throw new Error(
          `No auth profile selected. Set defaultProfile in authTest({ defaultProfile }) or use test.use({ auth: "<profile>" }).`,
        );
      }
      const statePath = resolveStatePath({ statesDir, profile: auth });
      assertStateFileReadable(statePath, auth);
      await use(statePath);
    },
    context: async (
      {
        browser,
        baseURL,
        _authStatePath,
      }: { browser: Browser; baseURL: string | undefined; _authStatePath: string },
      use: (context: BrowserContext) => Promise<void>,
    ) => {
      const context = await browser.newContext({
        baseURL,
        storageState: _authStatePath,
      });
      await use(context);
      await context.close();
    },
  });

  const withAuth = (profile?: string): TestType<any, any> => {
    const selectedProfile = profile ?? defaultProfile;
    const derived = testBase.extend({});
    derived.use({ auth: selectedProfile });
    return derived;
  };

  const auth: AuthTest["auth"] = (
    a: string,
    b: string | PlaywrightTestFn,
    c?: PlaywrightTestFn,
  ) => {
    if (typeof b === "function") {
      const title = a;
      const fn = b;
      (testBase as any)(title, fn);
      return;
    }

    const profile = a;
    const title = b;
    const fn = c as PlaywrightTestFn;
    const derived = testBase.extend({});
    derived.use({ auth: profile });
    (derived as any)(title, fn);
  };

  const test = testBase as AuthTestWithExpect;
  test.withAuth = withAuth;
  test.auth = auth;
  test.expect = expect;
  return test;
}

export function createAuthTest(options: CreateAuthTestOptions = {}): {
  test: AuthTest;
  expect: Expect<any>;
} {
  let baseTest = options.baseTest;
  let baseExpect = options.baseExpect;

  if (!baseTest || !baseExpect) {
    const loaded = loadPlaywrightTestModule();
    baseTest = baseTest ?? loaded.test;
    baseExpect = baseExpect ?? loaded.expect;
  }

  const defaultProfile = options.defaultProfile;
  if (!defaultProfile) {
    throw new Error(
      `createAuthTest() requires "defaultProfile" (pass { defaultProfile: "<profile>" }).`,
    );
  }

  const test = authTest({
    defaultProfile,
    statesDir: options.statesDir,
    baseTest,
    baseExpect,
  });

  return { test, expect: test.expect };
}
