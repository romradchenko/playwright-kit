import fs from "node:fs";
import path from "node:path";

import { expect as playwrightExpect, test as playwrightTest } from "@playwright/test";
import type {
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  TestInfo,
  TestType,
} from "@playwright/test";

type BaseTestArgs = PlaywrightTestArgs & PlaywrightTestOptions;
type BaseWorkerArgs = PlaywrightWorkerArgs & PlaywrightWorkerOptions;
type StorageStateOption = PlaywrightTestOptions["storageState"];

type DefaultExpect = typeof playwrightExpect;

type AuthFixtures = {
  auth: string;
  _authStatePath: string;
  storageState: StorageStateOption;
};

type AuthTestArgs = BaseTestArgs & BaseWorkerArgs & AuthFixtures;
export type AuthTestBody = (args: AuthTestArgs, testInfo: TestInfo) => Promise<void> | void;

type AuthWrappedTest = TestType<BaseTestArgs & AuthFixtures, BaseWorkerArgs>;

export type AuthTest = AuthWrappedTest & {
  withAuth(profile?: string): AuthWrappedTest;
  auth(profile: string, title: string, fn: AuthTestBody): void;
  auth(title: string, fn: AuthTestBody): void;
};

export type AuthTestWithExpect = AuthTest & { expect: DefaultExpect };

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
    throw new Error(`Invalid auth state JSON for profile "${profile}" at "${statePath}": ${message}`);
  }
}

export interface AuthTestOptions {
  /** Directory containing `<profile>.json`; default `.auth` relative to `process.cwd()`. */
  statesDir?: string;
  /** Alias for statesDir (kept for ergonomics). */
  stateDir?: string;
  defaultProfile: string;
}

export function authTest(options: AuthTestOptions): AuthTestWithExpect {
  const statesDir = options.statesDir ?? options.stateDir ?? ".auth";
  const defaultProfile = options.defaultProfile;

  const authOption: [string, { option: true }] = [defaultProfile, { option: true }];

  const testBase = playwrightTest.extend<AuthFixtures>({
    auth: authOption,
    _authStatePath: async ({ auth }, use) => {
      if (!auth) {
        throw new Error(
          `No auth profile selected. Set defaultProfile in authTest({ defaultProfile }) or use test.use({ auth: "<profile>" }).`,
        );
      }
      const statePath = resolveStatePath({ statesDir, profile: auth });
      assertStateFileReadable(statePath, auth);
      await use(statePath);
    },
    // Override Playwright's built-in `storageState` option fixture so role switching
    // composes with existing `test.use({ ...contextOptions })` patterns.
    storageState: async ({ _authStatePath }, use) => {
      await use(_authStatePath);
    },
  });

  const withAuth = (profile?: string): AuthWrappedTest => {
    const selectedProfile = profile ?? defaultProfile;
    const derived = testBase.extend({});
    derived.use({ auth: selectedProfile });
    return derived;
  };

  const auth: AuthTest["auth"] = (a: string, b: string | AuthTestBody, c?: AuthTestBody) => {
    if (typeof b === "function") {
      const title = a;
      const fn = b;
      testBase(title, fn);
      return;
    }

    const profile = a;
    const title = b;
    const fn = c;
    if (!fn) throw new Error(`test.auth(profile, title, fn) requires a test function.`);

    const derived = testBase.extend({});
    derived.use({ auth: profile });
    derived(title, fn);
  };

  return Object.assign(testBase, { withAuth, auth, expect: playwrightExpect });
}

export interface CreateAuthTestOptions {
  statesDir?: string;
  defaultProfile?: string;
}

export function createAuthTest(options: CreateAuthTestOptions = {}): {
  test: AuthTest;
  expect: DefaultExpect;
} {
  const defaultProfile = options.defaultProfile;
  if (!defaultProfile) {
    throw new Error(
      `createAuthTest() requires "defaultProfile" (pass { defaultProfile: "<profile>" }).`,
    );
  }

  const test = authTest({
    defaultProfile,
    statesDir: options.statesDir,
  });

  return { test, expect: test.expect };
}
