import { test, expect } from "./fixtures";

test.use({ auth: "admin" });

test("switching role via test.use", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
  await expect(page.getByTestId("whoami")).toHaveText("admin");
});
