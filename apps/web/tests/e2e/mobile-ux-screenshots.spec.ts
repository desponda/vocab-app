import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test credentials
const TEACHER_CREDENTIALS = {
  email: 'teacher@test.com',
  password: 'Test123!@#',
};

const STUDENT_CREDENTIALS = {
  email: 'student1@test.com',
  password: 'Test123!@#',
};

/**
 * Mobile UX Screenshot Test Suite
 *
 * This test systematically screenshots all pages in mobile viewport
 * to identify mobile UX issues that need fixing.
 *
 * Run with: pnpm test:e2e:headed tests/e2e/mobile-ux-screenshots.spec.ts
 */
test.describe('Mobile UX Screenshots', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE size
  });

  test.describe('Teacher Pages - Mobile', () => {
    test.beforeEach(async ({ page }) => {
      // Login as teacher
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', TEACHER_CREDENTIALS.email);
      await page.fill('input[type="password"]', TEACHER_CREDENTIALS.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/\/dashboard/);
    });

    test('should screenshot teacher dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');

      // Scroll to capture full page
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(__dirname, 'screenshots', 'mobile-teacher-dashboard.png'),
        fullPage: true
      });
    });

    test('should screenshot classrooms list', async ({ page }) => {
      await page.goto(`${BASE_URL}/classrooms`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(__dirname, 'screenshots', 'mobile-teacher-classrooms.png'),
        fullPage: true
      });
    });

    test('should screenshot classroom detail page', async ({ page }) => {
      await page.goto(`${BASE_URL}/classrooms`);
      await page.waitForLoadState('networkidle');

      // Click first classroom
      const firstClassroom = page.locator('[data-testid="classroom-card"]').first();
      if (await firstClassroom.count() > 0) {
        await firstClassroom.click();
        await page.waitForLoadState('networkidle');

        await page.screenshot({
          path: path.join(__dirname, 'screenshots', 'mobile-teacher-classroom-detail.png'),
          fullPage: true
        });
      }
    });

    test('should screenshot tests library (Content Library)', async ({ page }) => {
      await page.goto(`${BASE_URL}/tests`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(__dirname, 'screenshots', 'mobile-teacher-tests-library.png'),
        fullPage: true
      });
    });

    test('should screenshot test creation wizard', async ({ page }) => {
      await page.goto(`${BASE_URL}/tests`);
      await page.waitForLoadState('networkidle');

      // Open wizard
      const createButton = page.getByRole('button', { name: /create test/i });
      await createButton.click();
      await page.waitForTimeout(500); // Wait for dialog animation

      await page.screenshot({
        path: path.join(__dirname, 'screenshots', 'mobile-teacher-test-wizard-step1.png')
      });
    });

    test('should screenshot students list', async ({ page }) => {
      await page.goto(`${BASE_URL}/students`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(__dirname, 'screenshots', 'mobile-teacher-students.png'),
        fullPage: true
      });
    });

    test('should screenshot student detail page', async ({ page }) => {
      await page.goto(`${BASE_URL}/students`);
      await page.waitForLoadState('networkidle');

      // Click first student row
      const firstStudentRow = page.locator('table tbody tr').first();
      if (await firstStudentRow.count() > 0) {
        await firstStudentRow.click();
        await page.waitForLoadState('networkidle');

        await page.screenshot({
          path: path.join(__dirname, 'screenshots', 'mobile-teacher-student-detail.png'),
          fullPage: true
        });
      }
    });
  });

  test.describe('Student Pages - Mobile', () => {
    test.beforeEach(async ({ page }) => {
      // Login as student
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', STUDENT_CREDENTIALS.email);
      await page.fill('input[type="password"]', STUDENT_CREDENTIALS.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForURL(/\/student-dashboard/);
    });

    test('should screenshot student dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}/student-dashboard`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(__dirname, 'screenshots', 'mobile-student-dashboard.png'),
        fullPage: true
      });
    });

    test('should screenshot student results page', async ({ page }) => {
      await page.goto(`${BASE_URL}/student-dashboard/results`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(__dirname, 'screenshots', 'mobile-student-results.png'),
        fullPage: true
      });
    });
  });

  test.describe('Auth Pages - Mobile', () => {
    test('should screenshot login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(__dirname, 'screenshots', 'mobile-auth-login.png'),
        fullPage: true
      });
    });

    test('should screenshot register page', async ({ page }) => {
      await page.goto(`${BASE_URL}/register`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(__dirname, 'screenshots', 'mobile-auth-register.png'),
        fullPage: true
      });
    });
  });
});

test.describe('Mobile UX Analysis Report', () => {
  test('generate mobile UX analysis', async () => {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║               MOBILE UX SCREENSHOT TEST COMPLETE                   ║
╚════════════════════════════════════════════════════════════════════╝

Screenshots saved to: apps/web/tests/e2e/screenshots/

Next steps:
1. Review all mobile-*.png screenshots
2. Identify pages with:
   - Button overflow or crowding
   - Text too small to read
   - Touch targets < 44px
   - Excessive scrolling required
   - Tables that don't fit
   - Forms with poor mobile layout

3. Create fix plan for any remaining issues

Pages tested:
✅ Teacher Dashboard
✅ Classrooms List
✅ Classroom Detail
✅ Tests Library (Content Library)
✅ Test Creation Wizard
✅ Students List
✅ Student Detail
✅ Student Dashboard
✅ Student Results
✅ Login Page
✅ Register Page
    `);
  });
});
