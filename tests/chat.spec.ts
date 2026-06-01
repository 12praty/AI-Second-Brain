import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { buildItem } from "./fixtures/data";

test.describe("Chat", () => {
  test("shows empty chat state with example prompts", async ({ page }) => {
    await mockApi(page);
    await page.goto("/chat");
    await expect(page.locator("text=Ask your second brain")).toBeVisible();
    await expect(page.locator("text=What have I saved about productivity?")).toBeVisible();
    await expect(page.locator("text=Summarise my notes about React")).toBeVisible();
  });

  test("sidebar shows new chat button", async ({ page }) => {
    await mockApi(page);
    await page.goto("/chat");
    await expect(page.locator("text=New chat")).toBeVisible();
  });

  test("can send a message and see streaming response", async ({ page }) => {
    await mockApi(page, {
      items: [buildItem({ id: "item-1", title: "React Hooks", type: "NOTE" })],
    });
    await page.goto("/chat");
    const textarea = page.locator('textarea[placeholder*="Ask anything"]');
    await expect(textarea).toBeVisible({ timeout: 15000 });
    await textarea.fill("What do I know about React?");
    await page.getByLabel("Send").click();
    // The streaming response text should appear (combined from delta events)
    await expect(page.getByText(/Based on your saved/).first()).toBeVisible({ timeout: 8000 });
  });

  test("shows streaming response with answer text", async ({ page }) => {
    await mockApi(page, {
      items: [buildItem({ id: "item-1", title: "React Hooks", type: "NOTE" })],
    });
    await page.goto("/chat");
    const textarea = page.locator('textarea[placeholder*="Ask anything"]');
    await textarea.fill("What do I know about React?");
    await page.getByLabel("Send").click();
    await expect(page.getByText(/Based on your saved/).first()).toBeVisible({ timeout: 8000 });
  });

  test("input is disabled while streaming", async ({ page }) => {
    await mockApi(page);
    await page.goto("/chat");
    const textarea = page.locator('textarea[placeholder*="Ask anything"]');
    await textarea.fill("Test message");
    await page.getByLabel("Send").click();
  });

  test("example prompt fills the input", async ({ page }) => {
    await mockApi(page);
    await page.goto("/chat");
    await page.locator("text=What have I saved about productivity?").click();
    const textarea = page.locator('textarea[placeholder*="Ask anything"]');
    await expect(textarea).toHaveValue("What have I saved about productivity?");
  });
});
