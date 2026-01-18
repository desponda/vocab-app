import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://vocab-staging.dresponda.com';

// Shared test credentials
const timestamp = Date.now();
const testEmail = `e2e-test-${timestamp}@example.com`;
const testPassword = 'Test1234!';
const testName = 'E2E Test User';

// Helper function to ensure user is registered and logged in
async function ensureUserLoggedIn(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input#email', testEmail);
  await page.fill('input#password', testPassword);
  await page.click('button[type="submit"]');

  // Check if login succeeded or if we need to register
  try {
    await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 5000 });
  } catch {
    // Login failed, try to register
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input#name', testName);
    await page.fill('input#email', testEmail);
    await page.fill('input#password', testPassword);
    await page.fill('input#confirmPassword', testPassword);
    await page.click('button[type="submit"]');
    await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });
  }
}

test.describe.serial('User Authentication Flows', () => {
  test('should complete full registration flow', async ({ page }) => {
    // Navigate to registration page
    await page.goto(`${BASE_URL}/register`);
    await expect(page).toHaveTitle(/Vocab App/);

    // Fill registration form
    await page.fill('input#name', testName);
    await page.fill('input#email', testEmail);
    await page.fill('input#password', testPassword);
    await page.fill('input#confirmPassword', testPassword);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard - wait for dashboard content instead of URL
    await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });

    // Verify user is logged in (should see dashboard content)
    await expect(page.locator('text=Manage Students')).toBeVisible();
  });

  test('should navigate to students page from dashboard', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input#email', testEmail);
    await page.fill('input#password', testPassword);
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });

    // Navigate to students page using the header or link
    await page.goto(`${BASE_URL}/students`);

    // Should show students page
    await expect(page.locator('h2')).toContainText('Students');

    // Should show empty state initially
    await expect(page.locator('text=No students yet')).toBeVisible();
  });

  test('should handle login with existing user', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Fill login form
    await page.fill('input#email', testEmail);
    await page.fill('input#password', testPassword);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });
  });

  test('should handle login with wrong password', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Fill login form with wrong password
    await page.fill('input#email', testEmail);
    await page.fill('input#password', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/error|invalid|incorrect/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should logout successfully', async ({ page }) => {
    // Ensure user is logged in
    await ensureUserLoggedIn(page);

    // Logout (look for logout button/link)
    const logoutButton = page.locator('text=/logout|sign out/i').first();
    await expect(logoutButton).toBeVisible();

    // Click logout and wait for navigation
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }),
      logoutButton.click(),
    ]);

    // Should redirect to login page - check for login form
    await expect(page.locator('input#email')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h3')).toContainText(/welcome back/i);
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

    // Should show validation errors from react-hook-form
    await expect(page.locator('text=/name is required/i')).toBeVisible({
      timeout: 2000,
    });
  });

  test('should validate email format', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    // Enter invalid email
    await page.fill('input#name', 'Test User');
    await page.fill('input#password', 'Test1234!');
    await page.fill('input#confirmPassword', 'Test1234!');

    // Fill invalid email
    const emailInput = page.locator('input#email');
    await emailInput.fill('not-an-email');

    // Try to submit - HTML5 validation should prevent it
    await page.click('button[type="submit"]');

    // Check HTML5 validation message
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );
    expect(validationMessage).toBeTruthy();
    expect(validationMessage).toContain('@');
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
        response.url().includes('/auth/register') && response.status() === 200,
      { timeout: 10000 }
    );

    await page.fill('input#name', 'API Test');
    await page.fill('input#email', testEmail);
    await page.fill('input#password', 'Test1234!');
    await page.fill('input#confirmPassword', 'Test1234!');
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
    await page.fill('input#name', 'Duplicate Test');
    await page.fill('input#email', testEmail);
    await page.fill('input#password', 'Test1234!');
    await page.fill('input#confirmPassword', 'Test1234!');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(
      page.locator('text=/already exists|email.*use|error/i')
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size

    await page.goto(`${BASE_URL}/login`);

    // Form should still be usable
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size

    // Ensure user is logged in
    await ensureUserLoggedIn(page);

    // Should show dashboard heading
    await expect(page.locator('h2')).toContainText('Dashboard');
  });
});
