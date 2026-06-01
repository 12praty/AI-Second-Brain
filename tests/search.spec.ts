import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { buildItem, buildSearchResult } from "./fixtures/data";

test.describe("Search", () => {
  test("search page renders", async ({ page }) => {
    await mockApi(page);
    await page.goto("/search");
    await expect(page.locator("h1")).toContainText("Semantic search");
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test("shows placeholder before typing", async ({ page }) => {
    await mockApi(page);
    await page.goto("/search");
    await expect(page.locator("text=Type at least 2 characters")).toBeVisible();
  });

  test("shows results after searching", async ({ page }) => {
    await mockApi(page, {
      items: [buildItem({ id: "item-1", title: "React Hooks Guide", type: "NOTE" })],
    });
    await page.goto("/search");
    await page.locator('input[placeholder*="Search"]').fill("React");
    await expect(page.locator("text=React Hooks Guide")).toBeVisible({ timeout: 5000 });
  });

  test("shows no results state", async ({ page }) => {
    await mockApi(page, { items: [] });
    await page.goto("/search");
    await page.locator('input[placeholder*="Search"]').fill("xyznonexistent");
    await expect(page.locator("text=Nothing found")).toBeVisible({ timeout: 5000 });
  });

  test("no results has link to chat", async ({ page }) => {
    await mockApi(page, { items: [] });
    await page.goto("/search");
    await page.locator('input[placeholder*="Search"]').fill("xyznonexistent");
    await expect(page.locator("text=Ask in Chat")).toBeVisible({ timeout: 5000 });
  });

  test("shows similarity percentage", async ({ page }) => {
    await mockApi(page, {
      items: [buildItem({ id: "item-1", title: "React Hooks Guide", type: "NOTE" })],
    });
    await page.goto("/search");
    await page.locator('input[placeholder*="Search"]').fill("React");
    await expect(page.locator("text=% match")).toBeVisible({ timeout: 5000 });
  });
});
