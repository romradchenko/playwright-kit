import fs from "node:fs";
import path from "node:path";

import type { Expect, TestType } from "@playwright/test";

export interface CreateAuthTestOptions {
  statesDir?: string;
  defaultProfile?: string;
  baseTest?: TestType<any, any>;
  baseExpect?: Expect<any>;
}

export type AuthTest = TestType<any, any> & {
  withAuth(profile?: string): TestType<any, any>;
};

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

export function createAuthTest(options: CreateAuthTestOptions = {}): {
  test: AuthTest;
  expect: Expect<any>;
} {
  let baseTest = options.baseTest;
  let baseExpect = options.baseExpect;

  if (!baseTest || !baseExpect) {
    try {
      const loaded = require("@playwright/test") as typeof import("@playwright/test");
      baseTest = baseTest ?? loaded.test;
      baseExpect = baseExpect ?? loaded.expect;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `createAuthTest() requires @playwright/test to be installed (peer dependency). ${message}`,
      );
    }
  }

  const statesDir = options.statesDir ?? ".auth";
  const defaultProfile = options.defaultProfile;

  const withAuth = (profile?: string): TestType<any, any> => {
    const selectedProfile = profile ?? defaultProfile;
    if (!selectedProfile) {
      throw new Error(
        `No auth profile selected. Pass test.withAuth("<profile>") or set defaultProfile in createAuthTest({ defaultProfile }).`,
      );
    }

    const statePath = resolveStatePath({ statesDir, profile: selectedProfile });
    assertStateFileReadable(statePath, selectedProfile);

    const testWithAuth = baseTest!.extend({});
    testWithAuth.use({ storageState: statePath });
    (testWithAuth as AuthTest).withAuth = withAuth;
    return testWithAuth;
  };

  const test = baseTest.extend({}) as AuthTest;
  test.withAuth = withAuth;

  return { test, expect: baseExpect };
}

