import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { buildItem, buildStats } from "./fixtures/data";

test.describe("Dashboard", () => {
  test("shows greeting and stats", async ({ page }) => {
    await mockApi(page, {
      stats: buildStats({ total: 12, notes: 5, urls: 4, pdfs: 3 }),
      items: [
        buildItem({ id: "item-1", title: "React Notes", type: "NOTE" }),
        buildItem({ id: "item-2", title: "Article about AI", type: "URL" }),
      ],
    });
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Test");
    await expect(page.getByText("12", { exact: true })).toBeVisible();
    await expect(page.getByText("All items")).toBeVisible();
    await expect(page.getByText("Notes", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("URLs", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("PDFs", { exact: true }).first()).toBeVisible();
  });

  test("shows recent items", async ({ page }) => {
    await mockApi(page, {
      items: [
        buildItem({ id: "item-1", title: "React Notes", type: "NOTE", tags: ["react"] }),
        buildItem({ id: "item-2", title: "Deep Work", type: "URL", sourceUrl: "https://example.com" }),
      ],
    });
    await page.goto("/");
    await expect(page.locator("h2:has-text('Recent')")).toBeVisible();
    await expect(page.locator("text=React Notes")).toBeVisible();
    await expect(page.locator("text=Deep Work")).toBeVisible();
  });

  test("shows empty state when no items", async ({ page }) => {
    await mockApi(page, { items: [], stats: buildStats({ total: 0, notes: 0, urls: 0, pdfs: 0 }) });
    await page.goto("/");
    await expect(page.locator("text=Your second brain is empty")).toBeVisible();
    await expect(page.getByRole("button", { name: "Write a note" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save a URL" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload PDF" })).toBeVisible();
  });

  test("quick action cards navigate to correct pages", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.locator("text=Chat with your knowledge").click();
    await expect(page).toHaveURL("/chat");
  });

  test("semantic search card navigates to search", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.locator("text=Semantic search").click();
    await expect(page).toHaveURL("/search");
  });

  test("view all link navigates to library", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.locator("text=View all").click();
    await expect(page).toHaveURL("/library");
  });
});
