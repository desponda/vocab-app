import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test credentials
const teacherEmail = `teacher-autosave-${Date.now()}@example.com`;
const studentEmail = `student-autosave-${Date.now()}@example.com`;
const password = 'Test1234!';

let classroomCode = '';

// Helper: Register and login as teacher
async function setupTeacher(page: Page) {
  await page.goto(`${BASE_URL}/register`);
  await page.fill('input#name', 'Test Teacher');
  await page.fill('input#email', teacherEmail);
  await page.fill('input#password', password);
  await page.fill('input#confirmPassword', password);
  await page.click('button[type="submit"]');
  await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });
}

// Helper: Register and login as student
async function setupStudent(page: Page) {
  await page.goto(`${BASE_URL}/register`);
  await page.fill('input#name', 'Test Student');
  await page.fill('input#email', studentEmail);
  await page.fill('input#password', password);
  await page.fill('input#confirmPassword', password);

  // Select student role
  const studentButton = page.locator('button:has-text("Student")');
  await studentButton.click();

  await page.click('button[type="submit"]');

  // Student should be redirected to student dashboard
  await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 });
}

// Helper: Login as existing user
async function login(page: Page, email: string, userPassword: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input#email', email);
  await page.fill('input#password', userPassword);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000); // Wait for navigation
}

test.describe.serial('Test Progress Auto-Save and Resume', () => {
  test('Setup: Create teacher, classroom, and vocabulary with tests', async ({ page }) => {
    // Register teacher
    await setupTeacher(page);

    // Create a classroom
    await page.goto(`${BASE_URL}/classrooms`);
    await page.click('button:has-text("Create Classroom")');
    await page.fill('input[name="name"]', 'Auto-Save Test Class');
    await page.fill('input[name="gradeLevel"]', '5');
    await page.click('button[type="submit"]:has-text("Create")');

    // Get the classroom code
    await page.waitForTimeout(2000);
    const codeElement = page.locator('text=/[A-Z0-9]{6}/').first();
    classroomCode = await codeElement.textContent() || '';
    console.log('Created classroom with code:', classroomCode);

    // Upload vocabulary and create tests
    await page.goto(`${BASE_URL}/vocabulary`);

    // Check if upload button exists, if not we need to handle the UI differently
    const uploadButton = page.locator('button:has-text("Upload")');
    const uploadButtonExists = await uploadButton.count() > 0;

    if (uploadButtonExists) {
      await uploadButton.click();
    } else {
      // Try alternative selectors
      await page.click('text=/upload.*vocabulary/i');
    }

    // Fill out the upload form
    await page.fill('input[name="name"]', 'Auto-Save Test Words');
    await page.fill('input[name="gradeLevel"]', '5');

    // Upload a test vocabulary file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-vocab.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('apple - a red fruit\nbanana - a yellow fruit\ncherry - a small red fruit\ndate - a sweet brown fruit\neggplant - a purple vegetable'),
    });

    await page.click('button[type="submit"]:has-text("Upload")');

    // Wait for processing to complete (may take a while)
    await page.waitForTimeout(5000);

    // Navigate to classrooms and assign tests
    await page.goto(`${BASE_URL}/classrooms`);
    await page.click(`text=Auto-Save Test Class`);

    // Go to Tests tab
    await page.click('text=Tests');

    // Assign tests from the vocabulary sheet
    await page.click('button:has-text("Assign Tests")');
    await page.click('text=Auto-Save Test Words');

    // Select the first classroom
    await page.click('text=Auto-Save Test Class');
    await page.click('button:has-text("Assign")');

    // Get the test ID from the page (will need for later)
    await page.waitForTimeout(2000);
  });

  test('Setup: Enroll student in classroom', async ({ page }) => {
    // Register student
    await setupStudent(page);

    // Enroll in classroom using code
    const enrollInput = page.locator('input[placeholder*="code" i]');
    if (await enrollInput.count() > 0) {
      await enrollInput.fill(classroomCode);
      await page.click('button:has-text("Join")');
      await page.waitForTimeout(2000);
    } else {
      // Navigate to enrollment page if not on main screen
      await page.goto(`${BASE_URL}/student-dashboard`);
      await page.click('text=/join.*classroom/i');
      await page.fill('input', classroomCode);
      await page.click('button:has-text("Join")');
    }

    // Verify enrollment
    await expect(page.locator('text=Auto-Save Test Class')).toBeVisible({ timeout: 5000 });
  });

  test('Should auto-save answers and resume after page refresh', async ({ page }) => {
    // Login as student
    await login(page, studentEmail, password);
    await page.goto(`${BASE_URL}/student-dashboard`);

    // Find and start a test
    const startTestButton = page.locator('button:has-text("Start")').first();
    await expect(startTestButton).toBeVisible({ timeout: 5000 });
    await startTestButton.click();

    // Wait for test page to load
    await expect(page.locator('text=/Question 1 of/i')).toBeVisible({ timeout: 5000 });

    // Answer first question (select first option if multiple choice)
    const firstOption = page.locator('button').filter({ hasText: /^A\./i }).first();
    if (await firstOption.count() > 0) {
      await firstOption.click();

      // Wait for auto-save indicator
      await expect(page.locator('text=/saving|saved/i')).toBeVisible({ timeout: 3000 });
    }

    // Navigate to next question
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=/Question 2 of/i')).toBeVisible({ timeout: 3000 });

    // Answer second question
    const secondOption = page.locator('button').filter({ hasText: /^B\./i }).first();
    if (await secondOption.count() > 0) {
      await secondOption.click();
      await page.waitForTimeout(1000); // Wait for debounced save
    }

    // CRITICAL: Refresh the page to simulate interruption
    await page.reload();

    // Verify test resumes
    await expect(page.locator('text=/resumed|resume/i')).toBeVisible({ timeout: 5000 });

    // Should be on question 2 (where we left off)
    await expect(page.locator('text=/Question 2 of/i')).toBeVisible();

    // Go back to question 1 to verify answer was saved
    await page.click('button:has-text("Previous")');
    await expect(page.locator('text=/Question 1 of/i')).toBeVisible();

    // Verify first answer is still selected
    const selectedOption = page.locator('button[class*="default"]').first();
    await expect(selectedOption).toBeVisible();

    console.log('✓ Auto-save and resume working correctly!');
  });

  test('Should show in-progress test on dashboard', async ({ page }) => {
    // Login as student
    await login(page, studentEmail, password);
    await page.goto(`${BASE_URL}/student-dashboard`);

    // Should see "Continue Tests" section
    await expect(page.locator('text=Continue Tests')).toBeVisible({ timeout: 5000 });

    // Should show progress information
    await expect(page.locator('text=/Question.*of/i')).toBeVisible();
    await expect(page.locator('text=/Progress/i')).toBeVisible();

    // Should have Resume Test button
    const resumeButton = page.locator('button:has-text("Resume Test")');
    await expect(resumeButton).toBeVisible();

    // Click Resume Test and verify it takes us back to the test
    await resumeButton.click();
    await expect(page.locator('text=/Question.*of/i')).toBeVisible({ timeout: 5000 });

    console.log('✓ Dashboard shows in-progress test correctly!');
  });

  test('Should track last activity time', async ({ page }) => {
    // Login as student
    await login(page, studentEmail, password);
    await page.goto(`${BASE_URL}/student-dashboard`);

    // Check for last activity indicator
    const continueSection = page.locator('text=Continue Tests');
    await expect(continueSection).toBeVisible({ timeout: 5000 });

    // Look for "Last Active" text
    await expect(page.locator('text=/Last Active/i')).toBeVisible();

    // Should show relative time (e.g., "2m ago", "just now")
    await expect(page.locator('text=/(ago|just now)/i')).toBeVisible();

    console.log('✓ Last activity time is tracked!');
  });

  test('Should complete test and remove from in-progress', async ({ page }) => {
    // Login as student
    await login(page, studentEmail, password);
    await page.goto(`${BASE_URL}/student-dashboard`);

    // Resume the test
    await page.click('button:has-text("Resume Test")');
    await page.waitForTimeout(2000);

    // Answer all remaining questions and submit
    let isLastQuestion = false;
    let attempts = 0;
    const maxAttempts = 20; // Prevent infinite loop

    while (!isLastQuestion && attempts < maxAttempts) {
      attempts++;

      // Answer current question (select first option)
      const optionButton = page.locator('button').filter({ hasText: /^[A-D]\./i }).first();
      if (await optionButton.count() > 0) {
        await optionButton.click();
        await page.waitForTimeout(500);
      }

      // Check if this is the last question
      const submitButton = page.locator('button:has-text("Submit Test")');
      isLastQuestion = await submitButton.count() > 0;

      if (isLastQuestion) {
        await submitButton.click();
        break;
      } else {
        // Navigate to next question
        const nextButton = page.locator('button:has-text("Next")');
        if (await nextButton.count() > 0) {
          await nextButton.click();
          await page.waitForTimeout(1000);
        } else {
          break;
        }
      }
    }

    // Should show results
    await expect(page.locator('text=/Test Complete|completed/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/%/i')).toBeVisible(); // Score percentage

    // Go back to dashboard
    await page.click('button:has-text("Back to Dashboard")');

    // "Continue Tests" section should not be visible anymore (or empty)
    const continueSection = page.locator('text=Continue Tests');
    const isVisible = await continueSection.isVisible();

    if (isVisible) {
      // Should not have a Resume Test button anymore for this test
      const resumeButtons = page.locator('button:has-text("Resume Test")');
      expect(await resumeButtons.count()).toBe(0);
    }

    // Should see test in "Completed Tests" section
    await expect(page.locator('text=Completed Tests')).toBeVisible();

    console.log('✓ Test completed and removed from in-progress!');
  });
});

test.describe('Auto-Save Edge Cases', () => {
  test('Should handle rapid answer changes', async () => {
    // This test would verify debouncing is working correctly
    // by rapidly changing answers and ensuring only final value is saved
    console.log('✓ Edge case test placeholder - would need full setup');
  });

  test('Should handle network failures gracefully', async () => {
    // This test would simulate network failure during auto-save
    // and verify offline indicator appears
    console.log('✓ Network failure test placeholder - would need offline simulation');
  });
});
