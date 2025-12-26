import { test, expect } from "./fixtures";

test.use({ auth: "user" });

test("user cannot access /admin", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login$/);
});

