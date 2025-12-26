import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3017",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3017/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
