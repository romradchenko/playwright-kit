import { defineAuthConfig } from "@playwright-kit/auth";
import type { Page } from "playwright";

const baseURL = "http://127.0.0.1:3017";

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export default defineAuthConfig({
  baseURL,
  profiles: {
    admin: {
      validateUrl: "/admin",
      async login(page, { credentials }) {
        await login(page, credentials.email, credentials.password);
      },
      async validate(page) {
        const isAdmin = await page.getByRole("heading", { name: "Admin" }).isVisible();
        if (!isAdmin) return { ok: false, reason: "Admin heading not visible" };
        const whoami = await page.getByTestId("whoami").textContent();
        if (whoami?.trim() !== "admin") {
          return { ok: false, reason: `Unexpected whoami: ${whoami ?? "<empty>"}` };
        }
        return { ok: true };
      },
    },
    user: {
      validateUrl: "/me",
      async login(page, { credentials }) {
        await login(page, credentials.email, credentials.password);
      },
      async validate(page) {
        const isMe = await page.getByRole("heading", { name: "Me" }).isVisible();
        if (!isMe) return { ok: false, reason: "Me heading not visible" };
        const whoami = await page.getByTestId("whoami").textContent();
        if (whoami?.trim() !== "user") {
          return { ok: false, reason: `Unexpected whoami: ${whoami ?? "<empty>"}` };
        }
        return { ok: true };
      },
    },
  },
  webServer: {
    command: "npx",
    args: ["next", "dev", "-p", "3017"],
    timeoutMs: 120_000,
    reuseExisting: true,
  },
});
