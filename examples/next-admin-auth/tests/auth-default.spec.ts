import { test, expect } from "./fixtures";

test("user by default", async ({ page }) => {
  await page.goto("/me", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("whoami")).toHaveText("user");
});
