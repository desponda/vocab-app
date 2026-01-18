import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper function to register and login a teacher
async function registerAndLoginTeacher(
  page: Page,
  email: string,
  password: string,
  name: string
) {
  await page.goto(`${BASE_URL}/register`);

  await page.fill('input#name', name);
  await page.fill('input#email', email);
  await page.fill('input#password', password);
  await page.fill('input#confirmPassword', password);

  await page.click('button[type="submit"]');

  await expect(page.locator('h2')).toContainText('Dashboard', {
    timeout: 10000,
  });
}

test.describe('Classroom Detail Navigation', () => {
  const teacherEmail = `teacher-nav-${Date.now()}@example.com`;
  const teacherPassword = 'Teacher123!';
  const teacherName = 'Test Navigation Teacher';

  test('should navigate to classroom detail page when clicking "View Details"', async ({ page }) => {
    // Register and login as teacher
    await registerAndLoginTeacher(page, teacherEmail, teacherPassword, teacherName);

    // Navigate to classrooms page
    await page.click('text=/Classrooms/i');

    // Verify classrooms page loaded
    await expect(page.locator('h2')).toContainText('Classrooms', {
      timeout: 5000,
    });

    // Create a new classroom
    const classroomName = 'Test Navigation Classroom';
    await page.fill('input[placeholder*="Classroom name"]', classroomName);
    await page.click('button:has-text("Create")');

    // Wait for classroom to appear
    await expect(page.locator(`text=${classroomName}`)).toBeVisible({
      timeout: 5000,
    });

    // Click "View Details" button
    const viewDetailsButton = page.locator('button:has-text("View Details")').first();
    await expect(viewDetailsButton).toBeVisible({ timeout: 5000 });
    await viewDetailsButton.click();

    // Verify we're on the classroom detail page (not 404)
    // The page should show the classroom name as a heading
    await expect(page.locator(`h2:has-text("${classroomName}")`)).toBeVisible({
      timeout: 5000,
    });

    // Verify we can see the tabs
    await expect(page.locator('text=Students')).toBeVisible();
    await expect(page.locator('text=Assigned Tests')).toBeVisible();
    await expect(page.locator('text=Results')).toBeVisible();

    // Verify we can see the classroom code badge
    await expect(page.locator('text=/Classroom Code/i')).toBeVisible();

    // Verify the URL is correct (should be /classrooms/[id], not /dashboard/classrooms/[id])
    const url = page.url();
    expect(url).toMatch(/\/classrooms\/[a-zA-Z0-9-]+$/);
    expect(url).not.toContain('/dashboard/classrooms/');
  });

  test('should navigate between tabs on classroom detail page', async ({ page }) => {
    // Login (user should already exist from previous test in serial run)
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input#email', teacherEmail);
    await page.fill('input#password', teacherPassword);
    await page.click('button[type="submit"]');

    await expect(page.locator('h2')).toContainText('Dashboard', {
      timeout: 10000,
    });

    // Navigate to classrooms
    await page.click('text=/Classrooms/i');

    // Click "View Details" on the first classroom
    await page.click('button:has-text("View Details")');

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Click on "Assigned Tests" tab
    await page.click('button:has-text("Assigned Tests")');
    await expect(page.locator('text=/Assign Test/i')).toBeVisible({
      timeout: 5000,
    });

    // Click on "Results" tab
    await page.click('button:has-text("Results")');
    await expect(page.locator('text=/Student Results/i')).toBeVisible({
      timeout: 5000,
    });

    // Click back to "Students" tab
    await page.click('button[role="tab"]:has-text("Students")');
    await expect(page.locator('text=/Enrolled Students/i')).toBeVisible({
      timeout: 5000,
    });
  });
});
