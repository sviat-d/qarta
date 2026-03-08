import { test, expect } from "@playwright/test";

test.describe("Login flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders credentials login form by default", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Sign in to Qarta" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("can switch to API key login mode", async ({ page }) => {
    await page.getByText("Sign in with API key instead").click();

    await expect(page.getByLabel("API Key")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in with API Key" })).toBeVisible();
  });

  test("can switch back to credentials mode", async ({ page }) => {
    await page.getByText("Sign in with API key instead").click();
    await page.getByText("Sign in with email & password").click();

    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("successful login redirects to onboarding", async ({ page }) => {
    await page.route("**/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            merchantId: "mer_test123",
            apiKey: "qk_live_testkey123456789012345678901234567890",
          },
        }),
      });
    });

    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("testpassword123");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.route("**/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { message: "Invalid email or password" },
        }),
      });
    });

    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText(/Invalid|Login failed/)).toBeVisible();
  });

  test("has link to create account", async ({ page }) => {
    const createLink = page.getByRole("link", { name: "Create account" });
    await expect(createLink).toBeVisible();
    await createLink.click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test("has forgot password link", async ({ page }) => {
    const forgotLink = page.getByRole("link", { name: "Forgot password?" });
    await expect(forgotLink).toBeVisible();
  });
});

test.describe("Demo mode", () => {
  test("demo button enters demo mode and redirects to onboarding", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "View Demo Dashboard" }).click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });
  });

  test("demo mode shows demo banner in dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "View Demo Dashboard" }).click();

    // Wait for onboarding, then skip to dashboard
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });

    // Skip onboarding
    await page.getByText("Skip").click();

    // Should see demo banner
    await expect(page.getByText(/demo mode/i)).toBeVisible({ timeout: 10_000 });
  });

  test("demo mode shows demo data on dashboard", async ({ page }) => {
    // Set demo mode directly via localStorage
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem("qarta_demo", "true");
      localStorage.setItem("qarta_onboarding_complete", "true");
    });
    await page.goto("/");

    // Dashboard should show metrics (demo data)
    await expect(page.getByText(/Disputes Deflected|Deflected/i)).toBeVisible({ timeout: 10_000 });
  });
});
