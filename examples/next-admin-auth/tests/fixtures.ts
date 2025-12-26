import { authTest } from "@playwright-kit/auth";

export const test = authTest({
  defaultProfile: "user",
});

export const expect = test.expect;
