import test from "node:test";
import assert from "node:assert/strict";

import { resolveProfileCredentials } from "../credentials/resolveCredentials";
import { isUserError } from "../internal/userError";

test("resolveProfileCredentials uses AUTH_<PROFILE>_EMAIL/PASSWORD", () => {
  const creds = resolveProfileCredentials({
    profileName: "qa-admin",
    profile: {} as any,
    config: { profiles: {} } as any,
    env: {
      AUTH_QA_ADMIN_EMAIL: "qa@example.com",
      AUTH_QA_ADMIN_PASSWORD: "secret",
    },
  });

  assert.equal(creds.email, "qa@example.com");
  assert.equal(creds.password, "secret");
});

test("resolveProfileCredentials throws a user error when missing env vars", () => {
  assert.throws(
    () =>
      resolveProfileCredentials({
        profileName: "admin",
        profile: {} as any,
        config: { profiles: {} } as any,
        env: {},
      }),
    (error) => isUserError(error),
  );
});

