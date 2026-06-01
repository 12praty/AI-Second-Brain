import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { buildItem } from "./fixtures/data";

test.describe("Item Detail", () => {
  test("shows item details", async ({ page }) => {
    const item = buildItem({
      id: "item-1",
      title: "React Component Patterns",
      type: "NOTE",
      summary: "A summary about React components.",
      tags: ["react", "frontend"],
    });
    await mockApi(page, { items: [item] });
    await page.goto("/library/item-1");
    await expect(page.locator("h1")).toContainText("React Component Patterns");
    await expect(page.locator("text=AI Summary")).toBeVisible();
  });

  test("back button navigates to library", async ({ page }) => {
    const item = buildItem({ id: "item-1", title: "Test Item", type: "NOTE" });
    await mockApi(page, { items: [item] });
    await page.goto("/library");
    await page.getByRole("link", { name: /Test Item/ }).first().click();
    await page.waitForURL(/\/library\/item-1/);
    await page.locator("text=Back").click();
    await expect(page).toHaveURL(/\/library$/);
  });

  test("delete button confirms then redirects", async ({ page }) => {
    const item = buildItem({ id: "item-1", title: "To Delete", type: "NOTE" });
    await mockApi(page, { items: [item] });
    await page.goto("/library/item-1");
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL("/library");
  });

  test("shows processing state", async ({ page }) => {
    const item = buildItem({ id: "item-1", title: "Processing Item", type: "URL", status: "PROCESSING" });
    await mockApi(page, { items: [item] });
    await page.goto("/library/item-1");
    await expect(page.getByText("Processing", { exact: true })).toBeVisible();
  });

  test("shows error state", async ({ page }) => {
    const item = buildItem({ id: "item-1", title: "Error Item", type: "NOTE", status: "ERROR", summary: "Processing failed due to API error." });
    await mockApi(page, { items: [item] });
    await page.goto("/library/item-1");
    await expect(page.getByText("Error", { exact: true })).toBeVisible();
  });

  test("can add a tag", async ({ page }) => {
    const item = buildItem({ id: "item-1", title: "Tag Test", type: "NOTE", tags: [] });
    await mockApi(page, { items: [item] });
    await page.goto("/library/item-1", { waitUntil: "domcontentloaded" });
    const tagInput = page.locator('input[placeholder="add tag"]');
    await expect(tagInput).toBeVisible({ timeout: 15000 });
    await tagInput.fill("javascript");
    await tagInput.press("Enter");
    await expect(tagInput).toHaveValue("", { timeout: 5000 });
  });

  test("chat about this button navigates to chat", async ({ page }) => {
    const item = buildItem({ id: "item-1", title: "Chat About Me", type: "NOTE" });
    await mockApi(page, { items: [item] });
    await page.goto("/library/item-1");
    await page.locator("text=Chat about this").click();
    await expect(page).toHaveURL(/\/chat\//);
  });
});
