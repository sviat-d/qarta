import { test, expect } from "@playwright/test";

/**
 * Helper: enter demo mode with onboarding complete so we land on the dashboard.
 */
async function enterDemoMode(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.evaluate(() => {
    localStorage.setItem("qarta_demo", "true");
    localStorage.setItem("qarta_onboarding_complete", "true");
  });
  await page.goto("/");
  // Wait for the dashboard to render
  await expect(page.locator("nav")).toBeVisible({ timeout: 10_000 });
}

test.describe("Dashboard navigation", () => {
  test.beforeEach(async ({ page }) => {
    await enterDemoMode(page);
  });

  test("sidebar shows company name and plan", async ({ page }) => {
    // In demo mode the sidebar should show company info
    await expect(page.locator("aside")).toBeVisible();
    await expect(page.getByText(/Plan/i).first()).toBeVisible();
  });

  test("navigates to Alerts page", async ({ page }) => {
    await page.getByRole("link", { name: "Alerts" }).click();
    await expect(page).toHaveURL(/\/alerts/);
  });

  test("navigates to Policies page", async ({ page }) => {
    await page.getByRole("link", { name: "Policies" }).click();
    await expect(page).toHaveURL(/\/policies/);
  });

  test("navigates to Settings page", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test("navigates back to Dashboard", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/);
  });
});

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await enterDemoMode(page);
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/);
  });

  test("shows tab navigation", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Stripe Connection" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Notifications" })).toBeVisible();
    await expect(page.getByRole("button", { name: "API Keys" })).toBeVisible();
  });

  test("Stripe tab shows connection status", async ({ page }) => {
    // Stripe Connection is the default tab
    await expect(page.getByText("Stripe")).toBeVisible();
    await expect(page.getByText("Webhook Events")).toBeVisible();
  });

  test("can switch to Notifications tab", async ({ page }) => {
    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByText("Slack Notifications")).toBeVisible();
    await expect(page.getByText("Email Notifications")).toBeVisible();
  });

  test("can switch to API Keys tab", async ({ page }) => {
    await page.getByRole("button", { name: "API Keys" }).click();
    await expect(page.getByText("API Key")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("sign out button works", async ({ page }) => {
    await page.getByRole("button", { name: "API Keys" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

test.describe("Onboarding flow", () => {
  test("completes all 3 steps", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem("qarta_demo", "true");
    });
    await page.goto("/login");
    await page.getByRole("button", { name: "View Demo Dashboard" }).click();

    // Step 1: Select Products — products are pre-selected
    await expect(page.getByText("Select Your Qarta Products")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Continue/i }).click();

    // Step 2: Connect Integrations — click Stripe
    await expect(page.getByText("Connect Your Integrations")).toBeVisible();
    await page.getByText("Stripe").first().click();
    await page.getByRole("button", { name: /Continue/i }).click();

    // Step 3: Set Up Protection — recommended is pre-selected
    await expect(page.getByText("Set Up Your Protection Policy")).toBeVisible();
    await page.getByRole("button", { name: /Launch Protection/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 10_000 });
  });

  test("skip button goes to dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.setItem("qarta_demo", "true");
    });
    await page.goto("/login");
    await page.getByRole("button", { name: "View Demo Dashboard" }).click();

    await expect(page.getByText("Select Your Qarta Products")).toBeVisible({ timeout: 10_000 });
    await page.getByText("Skip").click();

    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/, { timeout: 10_000 });
  });
});

test.describe("Alerts page (demo mode)", () => {
  test("shows alert list with demo data", async ({ page }) => {
    await enterDemoMode(page);
    await page.getByRole("link", { name: "Alerts" }).click();

    // Should have alert entries from demo data
    await expect(page.getByText(/fraud|dispute|chargeback/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Policies page (demo mode)", () => {
  test("shows policy list with demo data", async ({ page }) => {
    await enterDemoMode(page);
    await page.getByRole("link", { name: "Policies" }).click();

    // Should show default policies
    await expect(page.getByText(/auto.refund|escalate|dismiss/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
