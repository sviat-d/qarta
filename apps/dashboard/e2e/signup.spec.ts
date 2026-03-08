import { test, expect } from "@playwright/test";

test.describe("Signup flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("renders the signup form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.getByLabel("Company name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("shows validation for short password", async ({ page }) => {
    await page.getByLabel("Company name").fill("Test Co");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
  });

  test("requires all fields", async ({ page }) => {
    // HTML required attribute prevents submission — button should still be enabled
    const button = page.getByRole("button", { name: "Create account" });
    await expect(button).toBeEnabled();

    // Try submitting empty form — browser validation prevents it
    await button.click();

    // Should still be on signup page
    await expect(page).toHaveURL(/\/signup/);
  });

  test("has link to sign in page", async ({ page }) => {
    const signInLink = page.getByRole("link", { name: "Sign in" });
    await expect(signInLink).toBeVisible();
    await signInLink.click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("successful signup redirects to onboarding", async ({ page, request }) => {
    const uniqueEmail = `e2e-${Date.now()}@test.com`;

    // Intercept the API call to mock successful registration
    await page.route("**/v1/auth/register", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            merchantId: "mer_test123",
            name: "E2E Test Co",
            email: uniqueEmail,
            apiKey: "qk_live_testkey123456789012345678901234567890",
          },
        }),
      });
    });

    await page.getByLabel("Company name").fill("E2E Test Co");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password").fill("testpassword123");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });
  });

  test("shows error on duplicate email", async ({ page }) => {
    await page.route("**/v1/auth/register", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { message: "Email already registered" },
        }),
      });
    });

    await page.getByLabel("Company name").fill("Dup Co");
    await page.getByLabel("Email").fill("existing@test.com");
    await page.getByLabel("Password").fill("testpassword123");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText(/already registered|Registration failed/)).toBeVisible();
  });
});
