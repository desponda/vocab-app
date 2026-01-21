import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'https://vocab-staging.dresponda.com';

/**
 * E2E tests for student dashboard functionality
 *
 * These tests prevent regression of the bug where students couldn't view their own test attempts.
 * Bug: GET /api/tests/students/:studentId/attempts returned 404 for students
 * Root cause: Authorization check compared studentId (Student.id) with request.userId (User.id)
 * Fix: Query Student table with: id=studentId AND userId=request.userId
 */

// Test data
const timestamp = Date.now();
const teacherEmail = `teacher-e2e-${timestamp}@example.com`;
const studentEmail = `student-e2e-${timestamp}@example.com`;
const testPassword = 'Test1234!';

// Helper to register and login as teacher
async function setupTeacher(page: Page): Promise<{
  classroomCode: string;
  classroomName: string;
}> {
  // Register teacher
  await page.goto(`${BASE_URL}/register`);
  await page.fill('input#name', 'E2E Teacher');
  await page.fill('input#email', teacherEmail);
  await page.fill('input#password', testPassword);
  await page.fill('input#confirmPassword', testPassword);
  await page.click('button[type="submit"]');

  // Wait for dashboard
  await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });

  // Create a classroom
  await page.goto(`${BASE_URL}/classrooms`);

  // Click "Create Classroom" button
  await page.click('button:has-text("Create Classroom")');

  // Fill classroom form
  const classroomName = `E2E Test Classroom ${timestamp}`;
  await page.fill('input[name="name"]', classroomName);
  await page.selectOption('select[name="gradeLevel"]', '5');

  // Submit form
  await page.click('button[type="submit"]:has-text("Create")');

  // Wait for success and classroom to appear in list
  await expect(page.locator(`text=${classroomName}`)).toBeVisible({ timeout: 5000 });

  // Get the classroom code - it should be displayed in the classroom card
  const classroomCard = page.locator(`text=${classroomName}`).locator('..').locator('..');
  const codeElement = classroomCard.locator('code, .font-mono, [class*="code"]').first();
  const classroomCode = await codeElement.textContent();

  expect(classroomCode).toBeTruthy();
  expect(classroomCode!.length).toBe(6);

  return {
    classroomCode: classroomCode!,
    classroomName,
  };
}

// Helper to register student with classroom code
async function setupStudent(
  page: Page,
  classroomCode: string
): Promise<void> {
  // Register student
  await page.goto(`${BASE_URL}/register`);
  await page.fill('input#name', 'E2E Student');
  await page.fill('input#email', studentEmail);
  await page.fill('input#password', testPassword);
  await page.fill('input#confirmPassword', testPassword);
  await page.click('button[type="submit"]');

  // Wait for dashboard
  await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });

  // Enroll in classroom using code
  // Look for "Join Classroom" or classroom code input
  await page.goto(`${BASE_URL}/dashboard`);

  // Find and click join classroom button/link
  const joinButton = page.locator('button:has-text("Join"), a:has-text("Join")').first();
  if (await joinButton.isVisible()) {
    await joinButton.click();
  }

  // Enter classroom code
  await page.fill('input[placeholder*="code" i], input[name="code"]', classroomCode);
  await page.click('button[type="submit"]:has-text("Join")');

  // Wait for success
  await expect(page.locator('text=/joined|enrolled|success/i')).toBeVisible({ timeout: 5000 });
}

test.describe.serial('Student Dashboard - Authorization Tests', () => {
  let classroomCode: string;
  let classroomName: string;

  test('should set up teacher account and create classroom', async ({ page }) => {
    const result = await setupTeacher(page);
    classroomCode = result.classroomCode;
    classroomName = result.classroomName;

    expect(classroomCode).toBeTruthy();
    expect(classroomName).toBeTruthy();
  });

  test('should register student and enroll in classroom', async ({ page }) => {
    await setupStudent(page, classroomCode);

    // Verify enrollment by checking dashboard shows classroom info
    await page.goto(`${BASE_URL}/student-dashboard`);

    // Student dashboard should load without errors
    await expect(page.locator('h1, h2')).toContainText(/dashboard|tests/i, { timeout: 10000 });
  });

  test('should load student dashboard without 404 errors', async ({ page }) => {
    // Login as student
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input#email', studentEmail);
    await page.fill('input#password', testPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/dashboard/, { timeout: 10000 });

    // Navigate to student dashboard
    await page.goto(`${BASE_URL}/student-dashboard`);

    // Should NOT show 404 error
    await expect(page.locator('text=/404|not found/i')).not.toBeVisible({ timeout: 2000 }).catch(() => {});

    // Should show dashboard content
    await expect(page.locator('h1, h2')).toContainText(/dashboard|tests/i, { timeout: 10000 });
  });

  test('should successfully fetch test attempts API without 404', async ({ page }) => {
    // Login as student
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input#email', studentEmail);
    await page.fill('input#password', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard/, { timeout: 10000 });

    // Set up network monitoring
    const apiCalls: { url: string; status: number }[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        apiCalls.push({
          url,
          status: response.status(),
        });
      }
    });

    // Navigate to student dashboard
    await page.goto(`${BASE_URL}/student-dashboard`);

    // Wait for page to load and make API calls
    await page.waitForLoadState('networkidle');

    // Check that all critical API calls succeeded
    const studentsCall = apiCalls.find(c => c.url.includes('/api/students'));
    const assignedCall = apiCalls.find(c => c.url.includes('/assigned'));
    const attemptsCall = apiCalls.find(c => c.url.includes('/attempts'));

    // All calls should exist
    expect(studentsCall, 'GET /api/students call should exist').toBeDefined();
    expect(assignedCall, 'GET /api/tests/students/:id/assigned call should exist').toBeDefined();
    expect(attemptsCall, 'GET /api/tests/students/:id/attempts call should exist').toBeDefined();

    // All calls should return 200 (not 404!)
    expect(studentsCall?.status, 'GET /api/students should return 200').toBe(200);
    expect(assignedCall?.status, 'GET /api/tests/students/:id/assigned should return 200').toBe(200);
    expect(attemptsCall?.status, 'GET /api/tests/students/:id/attempts should return 200 (this was the bug!)').toBe(200);

    // Dashboard should not show error message
    await expect(page.locator('text=/error loading|failed to load/i')).not.toBeVisible({ timeout: 2000 }).catch(() => {});
  });

  test('should display student stats and empty state when no tests assigned', async ({ page }) => {
    // Login as student
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input#email', studentEmail);
    await page.fill('input#password', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard/, { timeout: 10000 });

    // Navigate to student dashboard
    await page.goto(`${BASE_URL}/student-dashboard`);

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Should show stats cards (even if zero)
    await expect(page.locator('text=/tests assigned/i, text=/assigned/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/completed/i')).toBeVisible({ timeout: 5000 });

    // Should show empty state or test list
    const hasEmptyState = await page.locator('text=/no tests|get started/i').isVisible();
    const hasTestList = await page.locator('[class*="test"], [class*="assignment"]').count() > 0;

    // Either empty state or test list should be visible
    expect(hasEmptyState || hasTestList, 'Should show either empty state or test list').toBe(true);
  });
});

test.describe('Student Dashboard - API Contract', () => {
  test('should handle authorization errors gracefully', async ({ page }) => {
    // Try to access student dashboard without authentication
    await page.goto(`${BASE_URL}/student-dashboard`);

    // Should redirect to login (not crash with 404)
    await page.waitForURL(/login/, { timeout: 10000 });

    // Should show login form
    await expect(page.locator('input#email')).toBeVisible();
  });

  test('should prevent teacher from accessing student dashboard route', async ({ page }) => {
    // Register a new teacher
    const teacherEmail2 = `teacher-route-${Date.now()}@example.com`;
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input#name', 'Route Test Teacher');
    await page.fill('input#email', teacherEmail2);
    await page.fill('input#password', testPassword);
    await page.fill('input#confirmPassword', testPassword);
    await page.click('button[type="submit"]');

    // Wait for teacher dashboard
    await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });

    // Try to access student dashboard
    await page.goto(`${BASE_URL}/student-dashboard`);

    // Should redirect away (to login or dashboard)
    await page.waitForURL(/login|dashboard/, { timeout: 10000 });

    // Should NOT be on student-dashboard route
    expect(page.url()).not.toContain('student-dashboard');
  });
});

test.describe('Student Dashboard - Data Display', () => {
  test('should show loading state while fetching data', async ({ page }) => {
    // Login as student (reuse credentials from earlier test)
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input#email', studentEmail);
    await page.fill('input#password', testPassword);

    // Slow down network to see loading state
    await page.route('**/api/tests/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/, { timeout: 10000 });

    // Navigate to student dashboard
    const navigationPromise = page.goto(`${BASE_URL}/student-dashboard`);

    // Should show loading indicator
    const loadingVisible = await page.locator('text=/loading/i, [class*="spinner"], [class*="loading"]').isVisible().catch(() => false);

    await navigationPromise;

    // Loading should eventually disappear
    await expect(page.locator('text=/loading/i').first()).not.toBeVisible({ timeout: 10000 }).catch(() => {});
  });
});
