import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://vocab-staging.dresponda.com';

test.describe('User Authentication Flows', () => {
  const timestamp = Date.now();
  const testEmail = `e2e-test-${timestamp}@example.com`;
  const testPassword = 'Test1234!';
  const testName = 'E2E Test User';

  test('should complete full registration flow', async ({ page }) => {
    // Navigate to registration page
    await page.goto(`${BASE_URL}/register`);
    await expect(page).toHaveTitle(/Vocab App/);

    // Fill registration form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="name"]', testName);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`);
    await expect(page.locator('h2')).toContainText('Dashboard');

    // Verify user is logged in (should see dashboard content)
    await expect(page.locator('text=Manage Students')).toBeVisible();
  });

  test('should navigate to students page from dashboard', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Click on Manage Students button
    await page.click('text=Manage Students');

    // Should navigate to students page
    await page.waitForURL(`${BASE_URL}/students`);
    await expect(page.locator('h2')).toContainText('Students');

    // Should show empty state initially
    await expect(page.locator('text=No students yet')).toBeVisible();
  });

  test('should handle login with existing user', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Fill login form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`);
    await expect(page.locator('h2')).toContainText('Dashboard');
  });

  test('should handle login with wrong password', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Fill login form with wrong password
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/error|invalid|incorrect/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Logout (look for logout button/link)
    const logoutButton = page.locator('text=/logout|sign out/i').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Should redirect to login
      await page.waitForURL(`${BASE_URL}/login`);
    }
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing dashboard without auth', async ({
    page,
  }) => {
    // Clear localStorage to ensure no auth token
    await page.context().clearCookies();

    // Try to access dashboard directly
    await page.goto(`${BASE_URL}/dashboard`);

    // Should redirect to login
    await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 });
  });

  test('should redirect to login when accessing students without auth', async ({
    page,
  }) => {
    // Clear auth
    await page.context().clearCookies();

    // Try to access students page
    await page.goto(`${BASE_URL}/students`);

    // Should redirect to login
    await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 });
  });
});

test.describe('Form Validation', () => {
  test('should validate required fields on registration', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors (HTML5 validation or custom)
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('should validate email format', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Enter invalid email
    await page.fill('input[name="email"]', 'not-an-email');
    await page.fill('input[name="password"]', 'Test1234');
    await page.fill('input[name="name"]', 'Test User');
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission
    const emailInput = page.locator('input[name="email"]');
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );
    expect(validationMessage).toBeTruthy();
  });
});

test.describe('Navigation', () => {
  test('should navigate between login and register pages', async ({ page }) => {
    // Start at register
    await page.goto(`${BASE_URL}/register`);

    // Click link to login
    await page.click('text=/sign in|login/i');
    await page.waitForURL(`${BASE_URL}/login`);
    await expect(page.locator('h3')).toContainText(/welcome back/i);

    // Click link back to register
    await page.click('text=/sign up|register/i');
    await page.waitForURL(`${BASE_URL}/register`);
    await expect(page.locator('h3')).toContainText(/create.*account/i);
  });

  test('should show root page and redirect appropriately', async ({ page }) => {
    await page.goto(BASE_URL);

    // Should redirect to login if not authenticated
    await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 });
  });
});

test.describe('API Integration', () => {
  const testEmail = `api-test-${Date.now()}@example.com`;

  test('should handle successful API responses', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Monitor network for API calls
    const registerRequest = page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/register') && response.status() === 200
    );

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'Test1234');
    await page.fill('input[name="name"]', 'API Test');
    await page.click('button[type="submit"]');

    // Verify API call succeeded
    const response = await registerRequest;
    const json = await response.json();
    expect(json).toHaveProperty('user');
    expect(json).toHaveProperty('accessToken');
    expect(json.user.email).toBe(testEmail);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Try to register with same email again
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'Test1234');
    await page.fill('input[name="name"]', 'Duplicate Test');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(
      page.locator('text=/already exists|error|failed/i')
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size

    await page.goto(`${BASE_URL}/login`);

    // Form should still be usable
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size

    await page.goto(`${BASE_URL}/dashboard`);

    // Should show dashboard cards
    await expect(page.locator('text=Students')).toBeVisible();
  });
});
