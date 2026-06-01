import { test as setup, expect } from "@playwright/test";
import { setAuthCookie, TEST_USER } from "./helpers/auth";
import { mockApi } from "./fixtures/mock-api";

setup("authenticate with mock session", async ({ page, context }) => {
  await mockApi(page);
  await setAuthCookie(context, TEST_USER);
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("text=Test User")).toBeVisible({ timeout: 15000 });
  await page.context().storageState({ path: "playwright/.auth/user.json" });
});
