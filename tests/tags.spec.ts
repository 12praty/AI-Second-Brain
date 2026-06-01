import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { buildItem } from "./fixtures/data";

test.describe("Tags", () => {
  test("shows tags page with AI-generated tags", async ({ page }) => {
    await mockApi(page, {
      items: [
        buildItem({ id: "item-1", title: "React Notes", type: "NOTE", tags: ["react", "frontend"] }),
        buildItem({ id: "item-2", title: "JS Guide", type: "URL", tags: ["javascript", "frontend"] }),
      ],
      tags: ["react", "frontend", "javascript"],
    });
    await page.goto("/tags");
    await expect(page.locator("h1")).toContainText("Tags");
    await expect(page.getByRole("link", { name: /# react/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /# frontend/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /# javascript/ })).toBeVisible();
  });

  test("shows empty state when no tags", async ({ page }) => {
    await mockApi(page, { items: [], tags: [] });
    await page.goto("/tags");
    await expect(page.locator("text=No tags yet")).toBeVisible();
  });

  test("clicking tag navigates to library filtered by tag", async ({ page }) => {
    await mockApi(page, {
      items: [buildItem({ id: "item-1", title: "React Notes", type: "NOTE", tags: ["react"] })],
      tags: ["react"],
    });
    await page.goto("/tags");
    await page.getByRole("link", { name: /# react/ }).click();
    await expect(page).toHaveURL(/\/library\?tag=react/);
  });

  test("tag shows item count", async ({ page }) => {
    await mockApi(page, {
      items: [
        buildItem({ id: "item-1", title: "React Notes", type: "NOTE", tags: ["react"] }),
        buildItem({ id: "item-2", title: "React Advanced", type: "URL", tags: ["react"] }),
      ],
      tags: ["react"],
    });
    await page.goto("/tags");
    await expect(page.getByRole("link", { name: /# react/ })).toContainText("2");
  });
});
