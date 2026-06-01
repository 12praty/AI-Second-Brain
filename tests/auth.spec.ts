import { test, expect } from "@playwright/test";
import { mockApi } from "./fixtures/mock-api";

test.describe("Authentication", () => {
  test("login page renders and shows form", async ({ page }) => {
    await mockApi(page);
    await page.goto("/login");
    await expect(page.locator("h2")).toContainText("Welcome back");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("register page renders and shows form", async ({ page }) => {
    await mockApi(page);
    await page.goto("/register");
    await expect(page.locator("h2")).toContainText("Create your account");
    await expect(page.getByText("Name")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await mockApi(page);
    await page.goto("/library");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.locator("h2")).toContainText("Welcome back");
  });

  test("login page has link to register", async ({ page }) => {
    await mockApi(page);
    await page.goto("/login");
    await page.getByRole("link", { name: "Create one" }).click();
    await expect(page).toHaveURL("/register");
  });

  test("register page has link to login", async ({ page }) => {
    await mockApi(page);
    await page.goto("/register");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/login");
  });

  test("can toggle password visibility", async ({ page }) => {
    await mockApi(page);
    await page.goto("/login");
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await page.locator('button[tabindex="-1"]').click();
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });
});
