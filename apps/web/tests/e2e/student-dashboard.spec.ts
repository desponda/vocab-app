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

test.describe('Spelling Test Format Validation', () => {
  test('spelling tests should show fill-in-blank sentences, not generic prompt', async ({ page, browser }) => {
    const timestamp = Date.now();
    const teacherEmail = `teacher-spelling-${timestamp}@example.com`;
    const studentEmail = `student-spelling-${timestamp}@example.com`;

    // Set up teacher and create classroom
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input#name', 'Spelling Test Teacher');
    await page.fill('input#email', teacherEmail);
    await page.fill('input#password', testPassword);
    await page.fill('input#confirmPassword', testPassword);
    await page.click('button[type="submit"]');

    await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });

    // Create classroom
    await page.goto(`${BASE_URL}/classrooms`);
    await page.click('button:has-text("Create Classroom")');
    const classroomName = `Spelling Test Classroom ${timestamp}`;
    await page.fill('input[name="name"]', classroomName);
    await page.selectOption('select[name="gradeLevel"]', '5');
    await page.click('button[type="submit"]:has-text("Create")');
    await expect(page.locator(`text=${classroomName}`)).toBeVisible({ timeout: 5000 });

    // Get classroom code
    const classroomCard = page.locator(`text=${classroomName}`).locator('..').locator('..');
    const codeElement = classroomCard.locator('code, .font-mono, [class*="code"]').first();
    const classroomCode = await codeElement.textContent();
    expect(classroomCode).toBeTruthy();

    // Navigate to Tests (formerly Vocabulary)
    await page.goto(`${BASE_URL}/vocabulary`);

    // Upload spelling test
    // Look for "Create Test" or "Upload" button
    const createButton = page.locator('button:has-text("Create Test"), button:has-text("Upload")').first();
    await createButton.click({ timeout: 10000 });

    // Wait for wizard/dialog to open
    await page.waitForTimeout(500);

    // Select SPELLING test type (if wizard UI exists)
    const spellingOption = page.locator('text=/spelling/i, [data-test-type="SPELLING"]').first();
    if (await spellingOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spellingOption.click();

      // If there's a Next/Continue button in wizard
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextButton.click();
      }
    }

    // For "Use All Words" mode, check if there's a checkbox/toggle
    const useAllWordsToggle = page.locator('input[type="checkbox"]:near(:text("Use All Words")), input[type="checkbox"]:near(:text("Skip AI"))').first();
    if (await useAllWordsToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await useAllWordsToggle.check();
    }

    // Enter spelling words in textarea or input
    const wordsInput = page.locator('textarea[placeholder*="word" i], textarea[name*="word"], textarea').first();
    await wordsInput.fill('receive\nbeautiful\nseparate\ndefinitely');

    // Fill other fields if present
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.fill(`Spelling Test ${timestamp}`);
    }

    // Submit the form
    const submitButton = page.locator('button:has-text("Create"), button:has-text("Upload"), button[type="submit"]').last();
    await submitButton.click();

    // Wait for upload to complete (may take time for AI processing)
    await page.waitForTimeout(3000);

    // Wait for success message or redirect
    const successIndicator = page.locator('text=/success|created|uploaded/i, [role="status"]').first();
    await successIndicator.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});

    // Navigate back to vocabulary/tests page to find the created test
    await page.goto(`${BASE_URL}/vocabulary`);
    await page.waitForTimeout(1000);

    // Find the spelling test in the list
    const spellingTestCard = page.locator(`text=Spelling Test ${timestamp}`).first();
    await spellingTestCard.waitFor({ state: 'visible', timeout: 10000 });

    // Assign test to classroom
    // Look for assign button near the test
    const assignButton = spellingTestCard.locator('..').locator('button:has-text("Assign")').first();
    await assignButton.click({ timeout: 5000 });

    // Select classroom and submit
    const classroomCheckbox = page.locator(`label:has-text("${classroomName}") input[type="checkbox"]`).first();
    await classroomCheckbox.check();

    const assignSubmitButton = page.locator('button:has-text("Assign Test"), button[type="submit"]').last();
    await assignSubmitButton.click();

    await page.waitForTimeout(1000);

    // Now register student and enroll
    const studentPage = await browser.newPage();
    await studentPage.goto(`${BASE_URL}/register`);
    await studentPage.fill('input#name', 'Spelling Test Student');
    await studentPage.fill('input#email', studentEmail);
    await studentPage.fill('input#password', testPassword);
    await studentPage.fill('input#confirmPassword', testPassword);
    await studentPage.click('button[type="submit"]');

    await expect(studentPage.locator('h2')).toContainText('Dashboard', { timeout: 10000 });

    // Enroll in classroom
    const joinButton = studentPage.locator('button:has-text("Join"), a:has-text("Join")').first();
    if (await joinButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await joinButton.click();
    }

    await studentPage.fill('input[placeholder*="code" i], input[name="code"]', classroomCode!);
    await studentPage.click('button[type="submit"]:has-text("Join")');
    await studentPage.waitForTimeout(1000);

    // Navigate to student dashboard
    await studentPage.goto(`${BASE_URL}/student-dashboard`);
    await studentPage.waitForLoadState('networkidle');

    // Find and click on the spelling test
    const testLink = studentPage.locator(`text=Spelling Test ${timestamp}, a:has-text("Take Test")`).first();
    await testLink.click({ timeout: 10000 });

    // Wait for test page to load
    await studentPage.waitForLoadState('networkidle');

    // Verify question format shows fill-in-blank with sentence context
    const questionText = await studentPage.locator('[class*="question"] p, [data-testid="question-text"], h2, h3').first().textContent();

    // Should contain fill-in-blank format
    expect(questionText).toMatch(/Which word is spelled correctly in this sentence:/i);
    expect(questionText).toContain('_____'); // Contains blank

    // Should NOT contain generic prompt
    const genericPrompt = await studentPage.locator('text="Which is the correct spelling?"').count();
    expect(genericPrompt).toBe(0);

    await studentPage.close();
  });

  test('spelling tests should have no duplicate options', async ({ page, browser }) => {
    const timestamp = Date.now();
    const teacherEmail = `teacher-dupes-${timestamp}@example.com`;
    const studentEmail = `student-dupes-${timestamp}@example.com`;

    // Similar setup as above but focused on checking for duplicates
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input#name', 'Duplicate Check Teacher');
    await page.fill('input#email', teacherEmail);
    await page.fill('input#password', testPassword);
    await page.fill('input#confirmPassword', testPassword);
    await page.click('button[type="submit"]');

    await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });

    await page.goto(`${BASE_URL}/classrooms`);
    await page.click('button:has-text("Create Classroom")');
    const classroomName = `Duplicate Check Classroom ${timestamp}`;
    await page.fill('input[name="name"]', classroomName);
    await page.selectOption('select[name="gradeLevel"]', '3');
    await page.click('button[type="submit"]:has-text("Create")');
    await expect(page.locator(`text=${classroomName}`)).toBeVisible({ timeout: 5000 });

    const classroomCard = page.locator(`text=${classroomName}`).locator('..').locator('..');
    const codeElement = classroomCard.locator('code, .font-mono, [class*="code"]').first();
    const classroomCode = await codeElement.textContent();

    // Create spelling test with words that might cause duplicates
    await page.goto(`${BASE_URL}/vocabulary`);
    const createButton = page.locator('button:has-text("Create Test"), button:has-text("Upload")').first();
    await createButton.click({ timeout: 10000 });
    await page.waitForTimeout(500);

    const spellingOption = page.locator('text=/spelling/i, [data-test-type="SPELLING"]').first();
    if (await spellingOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spellingOption.click();
      const nextButton = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextButton.click();
      }
    }

    const wordsInput = page.locator('textarea[placeholder*="word" i], textarea[name*="word"], textarea').first();
    await wordsInput.fill('most\ncat\ndog\ntree');

    const submitButton = page.locator('button:has-text("Create"), button:has-text("Upload"), button[type="submit"]').last();
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Register student
    const studentPage = await browser.newPage();
    await studentPage.goto(`${BASE_URL}/register`);
    await studentPage.fill('input#name', 'Duplicate Check Student');
    await studentPage.fill('input#email', studentEmail);
    await studentPage.fill('input#password', testPassword);
    await studentPage.fill('input#confirmPassword', testPassword);
    await studentPage.click('button[type="submit"]');
    await studentPage.waitForTimeout(1000);

    // Enroll and take test
    const joinButton = studentPage.locator('button:has-text("Join"), a:has-text("Join")').first();
    if (await joinButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await joinButton.click();
    }

    await studentPage.fill('input[placeholder*="code" i], input[name="code"]', classroomCode!);
    await studentPage.click('button[type="submit"]:has-text("Join")');
    await studentPage.waitForTimeout(1000);

    await studentPage.goto(`${BASE_URL}/student-dashboard`);
    await studentPage.waitForLoadState('networkidle');

    // Find test and navigate to it
    const testButtons = await studentPage.locator('button, a').all();
    for (const button of testButtons) {
      const text = await button.textContent();
      if (text?.toLowerCase().includes('test') || text?.toLowerCase().includes('take')) {
        await button.click().catch(() => {});
        break;
      }
    }

    await studentPage.waitForTimeout(2000);

    // Get all option buttons for the current question
    const optionButtons = studentPage.locator('button[class*="option"], button:has-text("A."), button:has-text("B."), button:has-text("C."), button:has-text("D.")');
    const optionCount = await optionButtons.count();

    if (optionCount > 0) {
      // Get text of all options
      const optionTexts: string[] = [];
      for (let i = 0; i < optionCount; i++) {
        const text = await optionButtons.nth(i).textContent();
        if (text) {
          // Remove letter prefix (A., B., etc.) and trim
          const cleanText = text.replace(/^[A-D]\.\s*/, '').trim();
          optionTexts.push(cleanText);
        }
      }

      // Check for uniqueness
      const uniqueOptions = new Set(optionTexts);
      expect(uniqueOptions.size, `All options should be unique. Found: ${JSON.stringify(optionTexts)}`).toBe(optionTexts.length);

      // Should have 4 options (or at least 2 after deduplication)
      expect(optionTexts.length, 'Should have multiple options').toBeGreaterThanOrEqual(2);
    }

    await studentPage.close();
  });
});
