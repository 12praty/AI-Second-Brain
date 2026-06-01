import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "auth-tests",
      testMatch: /auth\.spec\.ts/,
    },
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      teardown: "cleanup",
    },
    {
      name: "authenticated",
      testMatch: /(dashboard|library|item-detail|quick-capture|search|tags|chat|mobile)\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        storageState: path.join(process.cwd(), "playwright/.auth/user.json"),
      },
    },
    {
      name: "cleanup",
      testMatch: /global\.teardown\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: {
      AUTH_SECRET: "test-secret-at-least-32-chars-long-for-jwt-signing!",
      AUTH_URL: "http://localhost:3000",
      NEXTAUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgres://mock:mock@localhost:5432/mock",
    },
  },
});
