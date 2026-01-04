import { defineAuthConfig } from "@playwright-kit/auth";
import type { Page } from "playwright";

const baseURL = "http://localhost:4173";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function assertExampleEnv(page: Page): Promise<void> {
  const res = await page.request.get(`${baseURL}/api/env`);
  if (!res.ok()) {
    throw new Error(`env check failed: GET /api/env -> ${res.status()}`);
  }
  const data: unknown = await res.json();
  if (!isObject(data) || data.PLAYWRIGHT_KIT_EXAMPLE !== "vite-react-auth") {
    throw new Error(
      `env check failed: expected PLAYWRIGHT_KIT_EXAMPLE=vite-react-auth, got ${JSON.stringify(data)}`,
    );
  }
}

export default defineAuthConfig({
  baseURL,
  webServer: {
    command: "npm",
    args: ["run", "dev"],
    url: "http://localhost:4173/login",
    timeoutMs: 60_000,
    reuseExisting: true,
    env: {
      PLAYWRIGHT_KIT_EXAMPLE: "vite-react-auth",
    },
  },
  profiles: {
    admin: {
      validateUrl: "/admin",
      async login(page, { credentials }) {
        await page.goto("/login");
        await page.getByLabel("Email").fill(credentials.email);
        await page.getByLabel("Password").fill(credentials.password);
        await page.getByRole("button", { name: "Sign in" }).click();
      },
      async validate(page) {
        await assertExampleEnv(page);
        const ok = await page.getByTestId("whoami").isVisible();
        if (!ok) return { ok: false, reason: "whoami not visible" };
        const role = await page.getByTestId("whoami").textContent();
        return role === "admin"
          ? { ok: true }
          : { ok: false, reason: `expected role "admin", got "${role ?? ""}"` };
      },
    },
    user: {
      validateUrl: "/me",
      async login(page, { credentials }) {
        await page.goto("/login");
        await page.getByLabel("Email").fill(credentials.email);
        await page.getByLabel("Password").fill(credentials.password);
        await page.getByRole("button", { name: "Sign in" }).click();
      },
      async validate(page) {
        await assertExampleEnv(page);
        const ok = await page.getByTestId("whoami").isVisible();
        if (!ok) return { ok: false, reason: "whoami not visible" };
        const role = await page.getByTestId("whoami").textContent();
        return role === "user"
          ? { ok: true }
          : { ok: false, reason: `expected role "user", got "${role ?? ""}"` };
      },
    },
  },
});
