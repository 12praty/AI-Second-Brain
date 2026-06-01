import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";
import { buildItem } from "./fixtures/data";

test.describe("Quick Capture", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page, { items: [buildItem({ id: "item-1", title: "Existing", type: "NOTE" })] });
    await page.goto("/");
    await page.keyboard.press("Meta+k");
    await expect(page.locator("text=Quick Capture")).toBeVisible();
  });

  test("opens with Cmd+K and shows three tabs", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Note" })).toBeVisible();
    await expect(page.getByRole("button", { name: "URL" })).toBeVisible();
    await expect(page.getByRole("button", { name: "PDF" })).toBeVisible();
  });

  test("note tab allows creating a note", async ({ page }) => {
    await page.locator('textarea[placeholder*="Type your note"]').fill("This is a test note with some content.");
    await page.getByRole("button", { name: "Save" }).click();
  });

  test("note tab validates empty content", async ({ page }) => {
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator("text=Write something first")).toBeVisible();
  });

  test("url tab allows entering a URL", async ({ page }) => {
    await page.getByRole("button", { name: "URL" }).click();
    await page.locator('input[placeholder="example.com/article"]').fill("https://example.com/test");
    await page.getByRole("button", { name: "Save" }).click();
  });

  test("url tab validates empty URL", async ({ page }) => {
    await page.getByRole("button", { name: "URL" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.locator("text=Paste a URL first")).toBeVisible();
  });

  test("pdf tab shows upload area", async ({ page }) => {
    await page.getByRole("button", { name: "PDF" }).click();
    await expect(page.locator("text=Drop PDF here or click to browse")).toBeVisible();
  });

  test("closes with cancel button", async ({ page }) => {
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator("text=Quick Capture")).not.toBeVisible();
  });

  test("closes with X button", async ({ page }) => {
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.locator("text=Quick Capture")).not.toBeVisible();
  });
});
