import { test, expect } from "./fixtures";

test.use({
  auth: "user",
  locale: "fr-FR",
  timezoneId: "Europe/Paris",
  extraHTTPHeaders: { "x-test-header": "ok" },
});

test("authTest does not override normal test.use options", async ({ page }) => {
  await page.goto("/me");
  await expect(page.getByTestId("whoami")).toHaveText("user");
  await expect(page.getByTestId("tz")).toHaveText("Europe/Paris");
  await expect(page.getByTestId("lang")).toContainText("fr");
  await expect(page.getByTestId("x-test-header")).toHaveText("ok");
});

