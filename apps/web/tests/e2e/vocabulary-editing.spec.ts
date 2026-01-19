import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://vocab-staging.dresponda.com';

// Shared test credentials
const timestamp = Date.now();
const testEmail = `vocab-edit-e2e-${timestamp}@example.com`;
const testPassword = 'Test1234!';
const testName = 'Vocab Editing E2E Teacher';
const classroomName = `Test Classroom ${timestamp}`;

// Test fixture path
const TEST_IMAGE_PATH = path.join(__dirname, '../fixtures/test-vocab-image.png');

// Processing timeout: Claude API can be slow (2 minutes)
const PROCESSING_TIMEOUT = 120000;
const POLLING_INTERVAL = 5000;

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

  await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });
}

/**
 * Helper: Login with existing credentials
 */
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input#email', testEmail);
  await page.fill('input#password', testPassword);
  await page.click('button[type="submit"]');

  await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });
}

/**
 * Helper: Upload a vocabulary sheet
 */
async function uploadVocabularySheet(page: Page, filePath: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  await page.goto(`${BASE_URL}/vocabulary`);

  // Click "Upload Vocabulary" button to open dialog
  await page.click('button:has-text("Upload Vocabulary")');

  // Wait for dialog to open
  await expect(page.locator('text=Upload Vocabulary Sheet')).toBeVisible({ timeout: 5000 });

  // Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: fileName,
    mimeType: 'image/png',
    buffer: fileBuffer,
  });

  // Wait for upload to complete
  await expect(page.locator(`text=Uploading ${fileName}`)).not.toBeVisible({ timeout: 30000 });

  return fileName;
}

/**
 * Helper: Wait for vocabulary sheet processing to complete
 */
async function waitForProcessingComplete(
  page: Page,
  sheetName: string,
  timeout: number = PROCESSING_TIMEOUT
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    await page.reload({ waitUntil: 'networkidle' });

    // Find the sheet by name and check status
    const completedBadge = page.locator(`text=${sheetName}`).locator('..').locator('..').locator('text=Completed');
    const failedBadge = page.locator(`text=${sheetName}`).locator('..').locator('..').locator('text=Failed');

    const isCompleted = await completedBadge.isVisible().catch(() => false);
    const isFailed = await failedBadge.isVisible().catch(() => false);

    if (isCompleted) {
      console.log(`Sheet "${sheetName}" processing completed`);
      return;
    }

    if (isFailed) {
      throw new Error(`Sheet "${sheetName}" processing failed`);
    }

    await page.waitForTimeout(POLLING_INTERVAL);
  }

  throw new Error(`Timeout waiting for sheet "${sheetName}" to complete`);
}

/**
 * Helper: Create a classroom
 */
async function createClassroom(page: Page, name: string): Promise<void> {
  await page.goto(`${BASE_URL}/classrooms`);

  // Click "Create Classroom" button
  await page.click('button:has-text("Create Classroom")');

  // Wait for dialog
  await expect(page.locator('text=Create New Classroom')).toBeVisible({ timeout: 5000 });

  // Fill form
  await page.fill('input#classroom-name', name);
  await page.selectOption('select#grade-level', '5');

  // Submit
  await page.click('button[type="submit"]:has-text("Create")');

  // Wait for classroom to appear
  await expect(page.locator(`text=${name}`)).toBeVisible({ timeout: 5000 });
}

test.describe.serial('Vocabulary Editing Features', () => {
  let uploadedSheetName: string;

  test('should register, login, and create a classroom', async ({ page }) => {
    await registerAndLogin(page);
    await createClassroom(page, classroomName);

    // Verify classroom was created
    await page.goto(`${BASE_URL}/classrooms`);
    await expect(page.locator(`text=${classroomName}`)).toBeVisible();
  });

  test('should upload and process a vocabulary sheet', async ({ page }) => {
    await login(page);

    uploadedSheetName = await uploadVocabularySheet(page, TEST_IMAGE_PATH);

    // Verify sheet appears in list
    await expect(page.locator(`text=${uploadedSheetName}`)).toBeVisible({ timeout: 5000 });

    // Wait for processing to complete
    await waitForProcessingComplete(page, uploadedSheetName);

    // Verify sheet has Completed status
    const sheetCard = page.locator(`text=${uploadedSheetName}`).locator('..').locator('..');
    await expect(sheetCard.locator('text=Completed')).toBeVisible();
  });

  test('should view extracted vocabulary words', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // Find the completed sheet
    const sheetCard = page.locator(`text=${uploadedSheetName}`).locator('..').locator('..');

    // Verify "View Words" button is visible
    const viewWordsButton = sheetCard.locator('button:has-text("View Words")');
    await expect(viewWordsButton).toBeVisible({ timeout: 5000 });

    // Click to expand words section
    await viewWordsButton.click();

    // Wait for words to load
    await expect(page.locator('text=Vocabulary Words')).toBeVisible({ timeout: 10000 });

    // Verify words table/list is visible
    // Desktop: table with headers
    const wordHeader = page.locator('th:has-text("Word")');
    const definitionHeader = page.locator('th:has-text("Definition")');
    const contextHeader = page.locator('th:has-text("Context")');

    // At least one of these should be visible (desktop shows table, mobile shows cards)
    const hasTable = await wordHeader.isVisible().catch(() => false);

    if (hasTable) {
      await expect(definitionHeader).toBeVisible();
      await expect(contextHeader).toBeVisible();
    }

    // Verify at least one word is displayed
    const editButtons = page.locator('button[aria-label*="Edit word"]');
    const editButtonCount = await editButtons.count();
    expect(editButtonCount).toBeGreaterThan(0);

    console.log(`Found ${editButtonCount} vocabulary words`);
  });

  test('should edit a vocabulary word', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // Expand words section
    const sheetCard = page.locator(`text=${uploadedSheetName}`).locator('..').locator('..');
    await sheetCard.locator('button:has-text("View Words")').click();

    // Wait for words to load
    await expect(page.locator('text=Vocabulary Words')).toBeVisible({ timeout: 10000 });

    // Click the first edit button
    const firstEditButton = page.locator('button[aria-label*="Edit word"]').first();
    await firstEditButton.click();

    // Verify edit dialog opened
    await expect(page.locator('text=Edit Vocabulary Word')).toBeVisible({ timeout: 5000 });

    // Modify the definition
    const definitionTextarea = page.locator('textarea#definition');
    await definitionTextarea.clear();
    await definitionTextarea.fill('This is an updated definition for E2E testing');

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Verify dialog closed
    await expect(page.locator('text=Edit Vocabulary Word')).not.toBeVisible({ timeout: 5000 });

    // Verify the updated definition appears in the list
    await expect(page.locator('text=This is an updated definition for E2E testing')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should validate edit word form', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // Expand words section
    const sheetCard = page.locator(`text=${uploadedSheetName}`).locator('..').locator('..');
    await sheetCard.locator('button:has-text("View Words")').click();
    await expect(page.locator('text=Vocabulary Words')).toBeVisible({ timeout: 10000 });

    // Click edit button
    await page.locator('button[aria-label*="Edit word"]').first().click();
    await expect(page.locator('text=Edit Vocabulary Word')).toBeVisible({ timeout: 5000 });

    // Try to clear the word field (should show validation error)
    const wordInput = page.locator('input#word');
    const originalWord = await wordInput.inputValue();
    await wordInput.clear();

    // Try to save with empty word
    await page.click('button:has-text("Save Changes")');

    // Should show error
    await expect(page.locator('text=/Word cannot be empty/i')).toBeVisible({ timeout: 3000 });

    // Restore original word
    await wordInput.fill(originalWord);

    // Cancel
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('text=Edit Vocabulary Word')).not.toBeVisible({ timeout: 5000 });
  });

  test('should regenerate tests', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // Find the sheet card
    const sheetCard = page.locator(`text=${uploadedSheetName}`).locator('..').locator('..');

    // Click "Regenerate" button
    const regenerateButton = sheetCard.locator('button:has-text("Regenerate")');
    await expect(regenerateButton).toBeVisible({ timeout: 5000 });
    await regenerateButton.click();

    // Verify confirmation dialog opened
    await expect(page.locator('text=/Regenerate Tests/i')).toBeVisible({ timeout: 5000 });

    // Verify warning is shown
    await expect(page.locator('text=/This will delete all existing tests/i')).toBeVisible();

    // Verify word/test counts are shown
    await expect(page.locator('text=/vocabulary words will be used/i')).toBeVisible();

    // Click "Regenerate Tests" button in dialog
    await page.click('button:has-text("Regenerate Tests")');

    // Dialog should close
    await expect(page.locator('text=/Regenerate Tests for/i')).not.toBeVisible({ timeout: 5000 });

    // Status should change to PROCESSING
    await expect(sheetCard.locator('text=Processing')).toBeVisible({ timeout: 10000 });

    // Wait for regeneration to complete (this may take time)
    await waitForProcessingComplete(page, uploadedSheetName);

    // Verify status is back to COMPLETED
    await expect(sheetCard.locator('text=Completed')).toBeVisible({ timeout: 5000 });

    // Expand tests section to verify new tests were generated
    const showTestsButton = sheetCard.locator('button:has-text("Show Tests")');
    await showTestsButton.click();

    // Verify tests are displayed
    await expect(page.locator('text=Generated Tests')).toBeVisible({ timeout: 5000 });
  });

  test('should cancel test regeneration', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // Find sheet and click Regenerate
    const sheetCard = page.locator(`text=${uploadedSheetName}`).locator('..').locator('..');
    await sheetCard.locator('button:has-text("Regenerate")').click();

    // Dialog should open
    await expect(page.locator('text=/Regenerate Tests/i')).toBeVisible({ timeout: 5000 });

    // Click Cancel
    await page.click('button:has-text("Cancel")');

    // Dialog should close
    await expect(page.locator('text=/Regenerate Tests for/i')).not.toBeVisible({ timeout: 5000 });

    // Status should still be COMPLETED (not PROCESSING)
    await expect(sheetCard.locator('text=Completed')).toBeVisible();
  });

  test('should assign tests to classroom from vocabulary page', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // Find the sheet card
    const sheetCard = page.locator(`text=${uploadedSheetName}`).locator('..').locator('..');

    // Click "Assign" button
    const assignButton = sheetCard.locator('button:has-text("Assign")');
    await expect(assignButton).toBeVisible({ timeout: 5000 });
    await assignButton.click();

    // Verify assignment dialog opened
    await expect(page.locator(`text=/Assign.*to Classroom/i`)).toBeVisible({ timeout: 5000 });

    // Select the classroom from dropdown
    await page.click('button[role="combobox"]'); // Open Select dropdown
    await page.click(`text=${classroomName}`); // Click classroom option

    // Verify info text is shown
    await expect(page.locator('text=/test variant.*will be assigned/i')).toBeVisible();

    // Click "Assign Tests" button
    await page.click('button:has-text("Assign Tests")');

    // Dialog should close
    await expect(page.locator(`text=/Assign.*to Classroom/i`)).not.toBeVisible({ timeout: 10000 });

    // Navigate to classroom to verify tests were assigned
    await page.goto(`${BASE_URL}/classrooms`);

    // Click on the classroom
    const classroomCard = page.locator(`text=${classroomName}`).locator('..').locator('..');
    await classroomCard.locator('button:has-text("View Details")').click();

    // Navigate to Tests tab
    await page.click('button[role="tab"]:has-text("Tests")');

    // Verify tests appear in the classroom (may take a moment to load)
    await expect(page.locator('text=/Test.*Variant/i')).toBeVisible({ timeout: 10000 });
  });

  test('should handle assign with no classrooms gracefully', async ({ page }) => {
    // Create a new teacher account with no classrooms
    const newTeacherEmail = `no-classroom-${timestamp}@example.com`;
    const newTeacherPassword = 'Test1234!';

    await page.goto(`${BASE_URL}/register`);
    await page.fill('input#name', 'No Classroom Teacher');
    await page.fill('input#email', newTeacherEmail);
    await page.fill('input#password', newTeacherPassword);
    await page.fill('input#confirmPassword', newTeacherPassword);
    await page.click('button[type="submit"]');

    await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });

    // Upload a vocabulary sheet
    const fileName = await uploadVocabularySheet(page, TEST_IMAGE_PATH);
    await waitForProcessingComplete(page, fileName);

    // Try to assign
    await page.goto(`${BASE_URL}/vocabulary`);
    const sheetCard = page.locator(`text=${fileName}`).locator('..').locator('..');
    await sheetCard.locator('button:has-text("Assign")').click();

    // Should show message about creating a classroom first
    await expect(page.locator('text=/Create a classroom first/i')).toBeVisible({ timeout: 5000 });
  });

  test('should toggle words section visibility', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    const sheetCard = page.locator(`text=${uploadedSheetName}`).locator('..').locator('..');

    // Click "View Words" to expand
    await sheetCard.locator('button:has-text("View Words")').click();
    await expect(page.locator('text=Vocabulary Words')).toBeVisible({ timeout: 10000 });

    // Click "Hide Words" to collapse
    await sheetCard.locator('button:has-text("Hide Words")').click();
    await expect(page.locator('text=Vocabulary Words')).not.toBeVisible({ timeout: 5000 });
  });

  test('should show loading state when fetching words', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    const sheetCard = page.locator(`text=${uploadedSheetName}`).locator('..').locator('..');

    // Click "View Words" and immediately check for loading state
    await sheetCard.locator('button:has-text("View Words")').click();

    // Should show loading indicator (may be very fast, so we check if it appears)
    const loadingText = page.locator('text=Loading words');
    const isLoadingVisible = await loadingText.isVisible().catch(() => false);

    // Either loading was shown or words loaded immediately
    if (!isLoadingVisible) {
      // Words loaded immediately
      await expect(page.locator('text=Vocabulary Words')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Vocabulary Editing - Mobile Responsive', () => {
  test('should display words in card layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/login`);
    await page.fill('input#email', testEmail);
    await page.fill('input#password', testPassword);
    await page.click('button[type="submit"]');

    await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });

    await page.goto(`${BASE_URL}/vocabulary`);

    // Find and expand words section
    const viewWordsButton = page.locator('button:has-text("View Words")').first();
    if (await viewWordsButton.isVisible()) {
      await viewWordsButton.click();

      // On mobile, words should be in card layout (not table)
      // Table should be hidden, cards should be visible
      const tableVisible = await page.locator('table th:has-text("Word")').isVisible().catch(() => false);
      expect(tableVisible).toBe(false);

      // Edit buttons should still be present in card layout
      const editButtons = page.locator('button[aria-label*="Edit word"]');
      const count = await editButtons.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
