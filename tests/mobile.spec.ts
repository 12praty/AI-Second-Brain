import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { buildItem, buildStats } from "./fixtures/data";

test.describe("Mobile Layout", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("shows mobile topbar and bottom nav", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await expect(page.locator("header a").first()).toBeVisible();
    const bottomNav = page.locator("nav.grid.grid-cols-4");
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.locator("text=Home")).toBeVisible();
    await expect(bottomNav.locator("text=Chat")).toBeVisible();
    await expect(bottomNav.locator("text=Library")).toBeVisible();
    await expect(bottomNav.locator("text=Search")).toBeVisible();
  });

  test("bottom nav navigates correctly", async ({ page }) => {
    await mockApi(page, {
      items: [buildItem({ id: "item-1", title: "Test", type: "NOTE" })],
      stats: buildStats({ total: 1 }),
    });
    await page.goto("/");
    await page.locator("nav.grid.grid-cols-4 a[href='/chat']").click();
    await expect(page).toHaveURL("/chat");
    await page.locator("nav.grid.grid-cols-4 a[href='/library']").click();
    await expect(page).toHaveURL("/library");
    await page.locator("nav.grid.grid-cols-4 a[href='/search']").click();
    await expect(page).toHaveURL("/search");
  });

  test("desktop sidebar is hidden on mobile", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await expect(page.locator("aside")).not.toBeVisible();
  });

  test("mobile capture button opens quick capture", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await page.locator("header button").click();
    await expect(page.locator("text=Quick Capture")).toBeVisible();
  });

  test("active nav item is highlighted", async ({ page }) => {
    await mockApi(page);
    await page.goto("/library");
    const nav = page.locator("nav.grid.grid-cols-4");
    const libraryLink = nav.locator("a[href='/library']");
    await expect(libraryLink).toHaveClass(/text-accent/);
  });
});
