import type { PlaywrightTestOptions } from "@playwright/test";

import { authTest } from "../src/fixtures/createAuthTest";

const test = authTest({ defaultProfile: "user" });

test.use({ auth: "admin" });

const storageState: PlaywrightTestOptions["storageState"] = {
  cookies: [],
  origins: [],
};
test.use({ storageState });

test("options keep Playwright types", async ({ page, baseURL, storageState: state }) => {
  void page;
  void baseURL;
  void state;
});

