import { test, expect } from "@playwright/test";

test("Next server exposes PLAYWRIGHT_KIT_EXAMPLE from env", async ({ request }) => {
  const res = await request.get("/api/env");
  expect(res.ok()).toBeTruthy();
  await expect(res.json()).resolves.toEqual({ PLAYWRIGHT_KIT_EXAMPLE: "next-admin-auth" });
});

