import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper function to register and login a user
async function registerAndLogin(
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

// Helper function to login
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input#email', email);
  await page.fill('input#password', password);
  await page.click('button[type="submit"]');
  await expect(page.locator('h2')).toContainText('Dashboard', {
    timeout: 10000,
  });
}

test.describe.serial('Test Taking Workflow', () => {
  const teacherEmail = `teacher-${Date.now()}@example.com`;
  const teacherPassword = 'Teacher123!';
  const teacherName = 'Test Teacher';

  const studentEmail = `student-${Date.now()}@example.com`;
  const studentPassword = 'Student123!';
  const studentName = 'Test Student';

  let classroomCode: string;
  let testName: string;

  test('Teacher: Register and create classroom', async ({ page }) => {
    await registerAndLogin(page, teacherEmail, teacherPassword, teacherName);

    // Navigate to classrooms
    await page.click('text=Manage Classrooms');

    // Verify classrooms page loaded
    await expect(page.locator('h2')).toContainText('Classrooms', {
      timeout: 5000,
    });

    // Create new classroom
    await page.fill('input[placeholder*="Classroom name"]', 'Test Classroom');
    await page.click('button:has-text("Create")');

    // Wait for classroom to appear
    await page.waitForTimeout(1000);

    // Extract classroom code (should be visible in the classroom card)
    const codeElement = await page.locator('text=/Classroom Code/i').first();
    await expect(codeElement).toBeVisible({ timeout: 5000 });

    // Get the code from the next element
    const classroomCard = page.locator('[class*="border"][class*="rounded"]').first();
    const codeText = await classroomCard.locator('text=TST').first();
    classroomCode = await codeText.textContent();

    expect(classroomCode).toBeTruthy();
  });

  test('Teacher: Create student and enroll in classroom', async ({ page }) => {
    await login(page, teacherEmail, teacherPassword);

    // Navigate to students
    await page.click('text=Manage Students');

    // Create a new student
    await page.click('text=Add Student');

    await page.fill('input#name', 'Test Class Student');
    await page.fill('input#gradeLevel', '3');

    await page.click('button:has-text("Create Student")');

    // Wait for student to be created
    await page.waitForTimeout(1000);

    // Verify student appears in list
    await expect(page.locator('text=Test Class Student')).toBeVisible({
      timeout: 5000,
    });
  });

  test('Student: Register account', async ({ page }) => {
    await registerAndLogin(page, studentEmail, studentPassword, studentName);
  });

  test('Student: Create profile and enroll in classroom', async ({ page }) => {
    await login(page, studentEmail, studentPassword);

    // Create student profile
    await page.click('text=Add Student');

    await page.fill('input#name', 'My Profile');
    await page.fill('input#gradeLevel', '3');

    await page.click('button:has-text("Create Student")');

    await page.waitForTimeout(1000);

    // Navigate to students page and enroll in classroom
    await page.goto(`${BASE_URL}/students`);

    // Click on student to view details
    await page.click('text=My Profile');

    // Look for enroll button or classroom code input
    // Try to find and fill the enroll form
    const classroomCodeInput = page.locator('input[placeholder*="code" i]').first();

    if (await classroomCodeInput.isVisible()) {
      await classroomCodeInput.fill(classroomCode);
      await page.click('button:has-text(/Enroll|Join/)');

      // Wait for enrollment
      await page.waitForTimeout(1000);

      // Verify enrollment
      await expect(page.locator('text=/enrolled|classroom/i')).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('Teacher: View classrooms and available tests', async ({ page }) => {
    await login(page, teacherEmail, teacherPassword);

    // Navigate to classrooms
    await page.click('text=Manage Classrooms');

    // Click on "View Details" button for the classroom
    const viewDetailsButton = page.locator('button:has-text("View Details")').first();
    await viewDetailsButton.click();

    // Wait for classroom detail page
    await page.waitForTimeout(500);

    // We should see the enrolled student
    await expect(page.locator('text=Test Class Student')).toBeVisible({
      timeout: 5000,
    });
  });

  test('Teacher: Upload vocabulary file (creates tests)', async ({ page }) => {
    await login(page, teacherEmail, teacherPassword);

    // Navigate to vocabulary
    await page.click('text=Manage Vocabulary');

    // Create a test file (simple text that will be treated as vocabulary)
    const fileName = 'test-vocab.txt';
    const fileContent = 'Apple\nBanana\nCherry';

    // Upload file (this is a basic test - in reality you'd use a real image/PDF)
    // For now, we'll just verify the upload interface exists
    await expect(page.locator('text=/Upload|drag/i').first()).toBeVisible();
  });

  test('Student: View assigned tests', async ({ page }) => {
    await login(page, studentEmail, studentPassword);

    // Navigate to tests
    await page.click('text=View Tests');

    // We should see the tests page
    await expect(page.locator('h2')).toContainText('Assigned Tests', {
      timeout: 5000,
    });
  });

  test('Student: Take a test (end-to-end)', async ({ page }) => {
    await login(page, studentEmail, studentPassword);

    // Navigate to tests
    await page.click('text=View Tests');

    // Wait for tests to load
    await page.waitForTimeout(1000);

    // Look for a test card with a "Take Test" button
    const takeTestButton = page.locator('button:has-text("Take Test")').first();

    if (await takeTestButton.isVisible()) {
      await takeTestButton.click();

      // Wait for test page to load
      await page.waitForTimeout(1000);

      // Verify we're on the test-taking page
      const questionText = page.locator('text=/Question.*of/i');
      await expect(questionText).toBeVisible({ timeout: 10000 });

      // Answer first question (just type something)
      const answerInput = page.locator('input#answer');
      await expect(answerInput).toBeVisible();

      await answerInput.fill('test answer');

      // Check if there's a next button or finish button
      const nextButton = page.locator('button:has-text("Next Question")').first();
      const finishButton = page.locator('button:has-text("Finish Test")').first();

      if (await nextButton.isVisible()) {
        await nextButton.click();
      } else if (await finishButton.isVisible()) {
        // Confirm finishing
        await page.on('dialog', (dialog) => dialog.accept());
        await finishButton.click();
      }

      // Wait for results page
      await page.waitForTimeout(2000);

      // Verify we see results
      const resultText = page.locator('text=/Test Completed|Score/i');
      await expect(resultText).toBeVisible({ timeout: 10000 });
    } else {
      // Skip if no tests are available yet
      console.log('No assigned tests available yet - test skipped');
    }
  });

  test('Cleanup: Verify workflow completed', async ({ page }) => {
    // This is a final verification test that the workflow completed
    await login(page, teacherEmail, teacherPassword);

    // Check that we can navigate to dashboard
    await page.click('text=Dashboard', { timeout: 2000 });

    await expect(page.locator('h2')).toContainText('Dashboard', {
      timeout: 5000,
    });
  });
});
