import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://vocab-staging.dresponda.com';

// Shared test credentials
const timestamp = Date.now();
const testEmail = `wizard-e2e-${timestamp}@example.com`;
const testPassword = 'Test1234!';
const testName = 'Wizard E2E Test Teacher';

// Test fixture paths
const TEST_IMAGE_PATH = path.join(__dirname, '../fixtures/test-vocab-image.png');
const TEST_PDF_PATH = path.join(__dirname, '../fixtures/test-vocab-sheet.pdf');

// Timeouts
const PROCESSING_TIMEOUT = 120000; // 2 minutes for AI processing
const POLLING_INTERVAL = 5000; // 5 seconds between polls

/**
 * Helper: Register and login as a teacher
 */
async function registerAndLogin(page: Page) {
  await page.goto(`${BASE_URL}/register`);
  await page.fill('input#name', testName);
  await page.fill('input#email', testEmail);
  await page.fill('input#password', testPassword);
  await page.fill('input#confirmPassword', testPassword);
  await page.click('button[type="submit"]');

  // Wait for dashboard to load
  await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });
}

/**
 * Helper: Navigate to tests page and open wizard
 */
async function openWizard(page: Page) {
  // Navigate to tests page
  await page.click('a[href="/tests"]');
  await expect(page.locator('h2')).toContainText('Content Library', { timeout: 10000 });

  // Click "Create Test" button
  await page.click('button:has-text("Create Test")');

  // Wait for wizard to open
  await expect(page.locator('text=What kind of test do you want to create?')).toBeVisible({ timeout: 5000 });
}

/**
 * Helper: Wait for processing to complete
 */
async function waitForProcessingComplete(page: Page, testName: string): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < PROCESSING_TIMEOUT) {
    // Refresh to get updated status
    await page.reload({ waitUntil: 'networkidle' });

    // Look for the test name in a card
    const testCard = page.locator(`h3:has-text("${testName}")`).locator('..').locator('..');

    // Check for Completed status
    const completedBadge = testCard.locator('text=Completed');
    const isCompleted = await completedBadge.isVisible().catch(() => false);

    if (isCompleted) {
      console.log(`Test "${testName}" processing completed`);
      return;
    }

    // Check for Failed status
    const failedBadge = testCard.locator('text=Failed');
    const isFailed = await failedBadge.isVisible().catch(() => false);

    if (isFailed) {
      throw new Error(`Test "${testName}" processing failed`);
    }

    await page.waitForTimeout(POLLING_INTERVAL);
  }

  throw new Error(`Timeout waiting for "${testName}" to complete`);
}

test.describe('Test Creation Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login fresh for each test
    await registerAndLogin(page);
  });

  test('Happy path: Complete wizard flow for Vocabulary test', async ({ page }) => {
    await openWizard(page);

    // Step 1: Select test type (Vocabulary)
    await expect(page.locator('text=Vocabulary Test')).toBeVisible();
    await page.click('text=Vocabulary Test');

    // Verify selection is highlighted
    await expect(page.locator('text=Vocabulary Test').locator('..')).toHaveClass(/ring-2/);

    // Click Next
    await page.click('button:has-text("Next")');

    // Step 2: Upload file
    await expect(page.locator('text=Upload Vocabulary Content')).toBeVisible();

    // Upload test image
    const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    const dataTransfer = await page.evaluateHandle((buffer) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(buffer)], 'test-vocab.png', { type: 'image/png' });
      dt.items.add(file);
      return dt;
    }, Array.from(fileBuffer));

    const input = await page.locator('input[type="file"]');
    await input.evaluateHandle((input, dt: DataTransfer) => {
      const fileInput = input as HTMLInputElement;
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, dataTransfer);

    // Verify file is uploaded
    await expect(page.locator('text=test-vocab.png')).toBeVisible();

    // Click Next
    await page.click('button:has-text("Next")');

    // Step 3: Configuration
    await expect(page.locator('text=Configure Your Test')).toBeVisible();

    // Test name should be auto-generated
    const nameInput = page.locator('input#name');
    await expect(nameInput).toHaveValue(/Test Vocab/i);

    // Modify test name
    const uniqueTestName = `Wizard E2E Vocab Test ${timestamp}`;
    await nameInput.fill(uniqueTestName);

    // Select grade level
    await page.click('button[id="gradeLevel"]');
    await page.click('text=Grade 5');

    // Adjust variants (optional)
    // Default is 3, let's keep it

    // Click Next
    await page.click('button:has-text("Next")');

    // Step 4: Review
    await expect(page.locator('text=Review & Confirm')).toBeVisible();

    // Verify selections are shown
    await expect(page.locator('text=Vocabulary Test')).toBeVisible();
    await expect(page.locator(`text=${uniqueTestName}`)).toBeVisible();
    await expect(page.locator('text=Grade 5')).toBeVisible();
    await expect(page.locator('text=3 versions')).toBeVisible();

    // Click "Create Test"
    await page.click('button:has-text("Create Test")');

    // Step 5: Processing
    await expect(page.locator('text=Creating Your Tests')).toBeVisible();
    await expect(page.locator('text=Uploading file')).toBeVisible({ timeout: 10000 });

    // Wait for completion (or timeout)
    await expect(page.locator('text=Tests created successfully!')).toBeVisible({ timeout: PROCESSING_TIMEOUT });

    // Verify "View Tests" button appears
    await expect(page.locator('button:has-text("View Tests")')).toBeVisible();

    // Click "View Tests" to go to library
    await page.click('button:has-text("View Tests")');

    // Verify we're back on tests page
    await expect(page.locator('h2')).toContainText('Content Library');

    // Wait for processing to fully complete
    await waitForProcessingComplete(page, uniqueTestName);

    // Verify test appears in library with Completed status
    await expect(page.locator(`text=${uniqueTestName}`)).toBeVisible();
    await expect(page.locator(`text=${uniqueTestName}`).locator('..').locator('text=Completed')).toBeVisible();
  });

  test('Happy path: Complete wizard flow for Spelling test', async ({ page }) => {
    await openWizard(page);

    // Step 1: Select Spelling test
    await page.click('text=Spelling Test');
    await page.click('button:has-text("Next")');

    // Step 2: Upload file
    const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    const dataTransfer = await page.evaluateHandle((buffer) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(buffer)], 'spelling-words.png', { type: 'image/png' });
      dt.items.add(file);
      return dt;
    }, Array.from(fileBuffer));

    const input = await page.locator('input[type="file"]');
    await input.evaluateHandle((input, dt: DataTransfer) => {
      const fileInput = input as HTMLInputElement;
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, dataTransfer);

    await expect(page.locator('text=spelling-words.png')).toBeVisible();
    await page.click('button:has-text("Next")');

    // Step 3: Configuration with "Use all words" option
    const uniqueTestName = `Wizard E2E Spelling ${timestamp}`;
    await page.locator('input#name').fill(uniqueTestName);

    // Expand advanced options
    await page.click('button:has-text("Advanced Options")');

    // Enable "Use all words" for faster processing
    await page.click('input#useAllWords');
    await expect(page.locator('text=Fast processing mode')).toBeVisible();

    await page.click('button:has-text("Next")');

    // Step 4: Review and create
    await expect(page.locator('text=Use all words')).toBeVisible(); // Verify badge
    await page.click('button:has-text("Create Test")');

    // Step 5: Wait for completion
    await expect(page.locator('text=Tests created successfully!')).toBeVisible({ timeout: PROCESSING_TIMEOUT });
    await page.click('button:has-text("View Tests")');

    // Verify in library
    await waitForProcessingComplete(page, uniqueTestName);
    await expect(page.locator(`text=${uniqueTestName}`)).toBeVisible();
  });

  test('Navigation: Back button preserves data', async ({ page }) => {
    await openWizard(page);

    // Step 1: Select test type
    await page.click('text=Vocabulary Test');
    await page.click('button:has-text("Next")');

    // Step 2: Upload file
    const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    const dataTransfer = await page.evaluateHandle((buffer) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(buffer)], 'test.png', { type: 'image/png' });
      dt.items.add(file);
      return dt;
    }, Array.from(fileBuffer));

    const input = await page.locator('input[type="file"]');
    await input.evaluateHandle((input, dt: DataTransfer) => {
      const fileInput = input as HTMLInputElement;
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, dataTransfer);

    await expect(page.locator('text=test.png')).toBeVisible();
    await page.click('button:has-text("Next")');

    // Step 3: Configuration
    await page.locator('input#name').fill('My Custom Name');
    await page.click('button[id="gradeLevel"]');
    await page.click('text=Grade 8');

    // Click Back
    await page.click('button:has-text("Back")');

    // Verify we're on Step 2 and file is still there
    await expect(page.locator('text=test.png')).toBeVisible();

    // Click Back again
    await page.click('button:has-text("Back")');

    // Verify we're on Step 1 and selection is preserved
    await expect(page.locator('text=Vocabulary Test').locator('..')).toHaveClass(/ring-2/);

    // Go forward again
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');

    // Verify configuration is preserved
    await expect(page.locator('input#name')).toHaveValue('My Custom Name');
    await expect(page.locator('button[id="gradeLevel"]')).toContainText('Grade 8');
  });

  test('Validation: Cannot proceed without selecting test type', async ({ page }) => {
    await openWizard(page);

    // Try to click Next without selecting test type
    const nextButton = page.locator('button:has-text("Next")');

    // Next button should be disabled
    await expect(nextButton).toBeDisabled();
  });

  test('Validation: Cannot proceed without uploading file', async ({ page }) => {
    await openWizard(page);

    // Step 1: Select test type
    await page.click('text=Spelling Test');
    await page.click('button:has-text("Next")');

    // Step 2: Try to proceed without file
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeDisabled();
  });

  test('Validation: Cannot create test without test name', async ({ page }) => {
    await openWizard(page);

    // Complete steps 1-2
    await page.click('text=Vocabulary Test');
    await page.click('button:has-text("Next")');

    const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    const dataTransfer = await page.evaluateHandle((buffer) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(buffer)], 'test.png', { type: 'image/png' });
      dt.items.add(file);
      return dt;
    }, Array.from(fileBuffer));

    const input = await page.locator('input[type="file"]');
    await input.evaluateHandle((input, dt: DataTransfer) => {
      const fileInput = input as HTMLInputElement;
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, dataTransfer);

    await page.click('button:has-text("Next")');

    // Step 3: Clear test name
    await page.locator('input#name').fill('');

    // Next button should be disabled
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeDisabled();
  });

  test('Help content: Comparison modal works', async ({ page }) => {
    await openWizard(page);

    // Click "Need help choosing?"
    await page.click('button:has-text("Need help choosing?")');

    // Verify comparison modal opens
    await expect(page.locator('text=How to Choose a Test Type')).toBeVisible();

    // Verify comparison table is visible
    await expect(page.locator('text=Question Types')).toBeVisible();
    await expect(page.locator('text=Definition matching')).toBeVisible();
    await expect(page.locator('text=Multiple choice')).toBeVisible();

    // Verify Pro Tips section
    await expect(page.locator('text=💡 Pro Tips')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(page.locator('text=How to Choose a Test Type')).not.toBeVisible();
  });

  test('Help content: Upload guidelines modal works', async ({ page }) => {
    await openWizard(page);

    // Step 1: Select test type
    await page.click('text=Spelling Test');
    await page.click('button:has-text("Next")');

    // Step 2: Click "What should I upload?"
    await page.click('button:has-text("What should I upload?")');

    // Verify modal opens
    await expect(page.locator('text=Upload Guidelines for Spelling Tests')).toBeVisible();

    // Verify troubleshooting section
    await expect(page.locator('text=🔧 Troubleshooting Common Issues')).toBeVisible();
    await expect(page.locator('text=AI can\'t extract any words')).toBeVisible();
    await expect(page.locator('text=File is too large')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('Wizard can be cancelled and reopened', async ({ page }) => {
    await openWizard(page);

    // Select test type
    await page.click('text=Vocabulary Test');
    await page.click('button:has-text("Next")');

    // Upload file
    const fileBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    const dataTransfer = await page.evaluateHandle((buffer) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(buffer)], 'test.png', { type: 'image/png' });
      dt.items.add(file);
      return dt;
    }, Array.from(fileBuffer));

    const input = await page.locator('input[type="file"]');
    await input.evaluateHandle((input, dt: DataTransfer) => {
      const fileInput = input as HTMLInputElement;
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, dataTransfer);

    // Cancel wizard
    await page.click('button:has-text("Cancel")');

    // Wizard should close
    await expect(page.locator('text=What kind of test do you want to create?')).not.toBeVisible();

    // Reopen wizard
    await page.click('button:has-text("Create Test")');

    // Wizard should start fresh (no test type selected)
    await expect(page.locator('text=What kind of test do you want to create?')).toBeVisible();
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeDisabled();
  });
});
