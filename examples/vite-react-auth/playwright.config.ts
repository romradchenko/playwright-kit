import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:4173/login",
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:4173",
  },
});
