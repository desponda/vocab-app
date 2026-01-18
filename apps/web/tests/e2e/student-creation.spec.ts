import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper function to ensure user is logged in
async function ensureUserLoggedIn(page: Page, email: string, password: string) {
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input#email', email);
    await page.fill('input#password', password);
    await page.click('button[type="submit"]');
    await expect(page.locator('h2')).toContainText('Dashboard', {
      timeout: 10000,
    });
  } catch {
    console.log('User may already be registered, attempting to login failed');
  }
}

test.describe.serial('Student Creation', () => {
  const testEmail = `student-create-test-${Date.now()}@example.com`;
  const testPassword = 'Test1234!';
  const testName = 'Student Creation Test Teacher';

  test('should register a new teacher account', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    await page.fill('input#name', testName);
    await page.fill('input#email', testEmail);
    await page.fill('input#password', testPassword);
    await page.fill('input#confirmPassword', testPassword);

    await page.click('button[type="submit"]');

    await expect(page.locator('h2')).toContainText('Dashboard', {
      timeout: 10000,
    });
  });

  test('should show empty state when no students exist', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);

    await expect(page.locator('text=No students yet')).toBeVisible();
    await expect(
      page.locator('text=Get started by adding your first student')
    ).toBeVisible();
  });

  test('should open student creation dialog', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);

    // Click "Add Student" button
    await page.click('text=Add Student');

    // Verify dialog opened
    await expect(page.locator('text=Create a new student profile')).toBeVisible();
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#gradeLevel')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);
    await page.click('text=Add Student');

    // Try to submit empty form
    await page.click('button[type="submit"]:has-text("Create Student")');

    // Should show validation errors
    await expect(page.locator('text=/name is required/i')).toBeVisible();
  });

  test('should validate grade level range', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);
    await page.click('text=Add Student');

    // Fill name but invalid grade
    await page.fill('input#name', 'Test Student');
    await page.fill('input#gradeLevel', '15');

    await page.click('button[type="submit"]:has-text("Create Student")');

    // Should show validation error
    await expect(page.locator('text=/Grade must be between 1 and 12/i')).toBeVisible();
  });

  test('should create a student successfully', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);
    await page.click('text=Add Student');

    // Fill in valid details
    await page.fill('input#name', 'Alice Johnson');
    await page.fill('input#gradeLevel', '5');

    await page.click('button[type="submit"]:has-text("Create Student")');

    // Dialog should close
    await expect(
      page.locator('text=Create a new student profile')
    ).not.toBeVisible({ timeout: 5000 });

    // Student should appear in list
    await expect(page.locator('text=Alice Johnson')).toBeVisible();
    await expect(page.locator('text=Grade 5')).toBeVisible();
  });

  test('should create multiple students', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);

    // Create second student
    await page.click('text=Add Student');
    await page.fill('input#name', 'Bob Smith');
    await page.fill('input#gradeLevel', '7');
    await page.click('button[type="submit"]:has-text("Create Student")');

    await expect(page.locator('text=Bob Smith')).toBeVisible({ timeout: 5000 });

    // Create third student
    await page.click('text=Add Student');
    await page.fill('input#name', 'Charlie Brown');
    await page.fill('input#gradeLevel', '9');
    await page.click('button[type="submit"]:has-text("Create Student")');

    await expect(page.locator('text=Charlie Brown')).toBeVisible({ timeout: 5000 });

    // All three students should be visible
    await expect(page.locator('text=Alice Johnson')).toBeVisible();
    await expect(page.locator('text=Bob Smith')).toBeVisible();
    await expect(page.locator('text=Charlie Brown')).toBeVisible();
  });

  test('should cancel student creation', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);
    await page.click('text=Add Student');

    // Fill in some details
    await page.fill('input#name', 'Diana Prince');
    await page.fill('input#gradeLevel', '10');

    // Click cancel
    await page.click('button:has-text("Cancel")');

    // Dialog should close
    await expect(
      page.locator('text=Create a new student profile')
    ).not.toBeVisible({ timeout: 5000 });

    // Student should NOT appear in list
    await expect(page.locator('text=Diana Prince')).not.toBeVisible();
  });
});
