import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { buildItem } from "./fixtures/data";

test.describe("Library", () => {
  test("shows all items", async ({ page }) => {
    await mockApi(page, {
      items: [
        buildItem({ id: "item-1", title: "React Notes", type: "NOTE", tags: ["react"] }),
        buildItem({ id: "item-2", title: "Article about AI", type: "URL" }),
        buildItem({ id: "item-3", title: "Research Paper", type: "PDF" }),
      ],
    });
    await page.goto("/library");
    await expect(page.locator("h1")).toContainText("Library");
    await expect(page.locator("text=React Notes")).toBeVisible();
    await expect(page.locator("text=Article about AI")).toBeVisible();
    await expect(page.locator("text=Research Paper")).toBeVisible();
  });

  test("filters items by type", async ({ page }) => {
    const items = [
      buildItem({ id: "item-1", title: "React Notes", type: "NOTE", tags: ["react"] }),
      buildItem({ id: "item-2", title: "Article about AI", type: "URL" }),
    ];
    await mockApi(page, { items });
    await page.goto("/library");

    await page.getByRole("button", { name: "Notes" }).click();
    await expect(page.locator("text=React Notes")).toBeVisible();
    await expect(page.locator("text=Article about AI")).not.toBeVisible();
  });

  test("shows empty state when no items match filter", async ({ page }) => {
    await mockApi(page, {
      items: [buildItem({ id: "item-1", title: "React Notes", type: "NOTE" })],
    });
    await page.goto("/library");
    await page.getByRole("button", { name: "PDFs" }).click();
    await expect(page.locator("text=Nothing here yet")).toBeVisible();
  });

  test("sort dropdown works", async ({ page }) => {
    await mockApi(page, {
      items: [
        buildItem({ id: "item-1", title: "A Note", type: "NOTE" }),
        buildItem({ id: "item-2", title: "B Article", type: "URL" }),
      ],
    });
    await page.goto("/library");
    const sortTrigger = page.locator("text=Newest first");
    await expect(sortTrigger).toBeVisible();
    await sortTrigger.click();
    await page.getByRole("button", { name: "A → Z" }).click();
  });

  test("capture button opens quick capture modal", async ({ page }) => {
    await mockApi(page, {
      items: [buildItem({ id: "item-1", title: "React Notes", type: "NOTE" })],
    });
    await page.goto("/library");
    await page.getByRole("button", { name: "+ Capture" }).click();
    await expect(page.locator("text=Quick Capture")).toBeVisible();
  });
});
