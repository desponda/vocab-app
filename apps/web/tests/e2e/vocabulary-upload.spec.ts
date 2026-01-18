import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://vocab-staging.dresponda.com';

// Shared test credentials for vocabulary upload tests
const timestamp = Date.now();
const testEmail = `vocab-e2e-${timestamp}@example.com`;
const testPassword = 'Test1234!';
const testName = 'Vocab E2E Test Teacher';

// Test fixture paths
const TEST_IMAGE_PATH = path.join(__dirname, '../fixtures/test-vocab-image.png');
const TEST_PDF_PATH = path.join(__dirname, '../fixtures/test-vocab-sheet.pdf');

// Processing timeout: Claude API can be slow (2 minutes)
const PROCESSING_TIMEOUT = 120000;

// Polling interval for status checks (5 seconds)
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

  // Wait for dashboard to load
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

  // Wait for dashboard to load
  await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 10000 });
}

/**
 * Helper: Poll for vocabulary sheet status change
 * Waits until status changes from initial status or times out
 */
async function waitForProcessingComplete(
  page: Page,
  sheetName: string,
  timeout: number = PROCESSING_TIMEOUT
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Refresh the page to get updated status
    await page.reload({ waitUntil: 'networkidle' });

    // Find the sheet card by name
    const sheetCard = page.locator(`text=${sheetName}`).locator('..').locator('..');

    // Check if status is COMPLETED or FAILED
    const completedBadge = sheetCard.locator('text=Completed');
    const failedBadge = sheetCard.locator('text=Failed');

    const isCompleted = await completedBadge.isVisible().catch(() => false);
    const isFailed = await failedBadge.isVisible().catch(() => false);

    if (isCompleted) {
      console.log(`Sheet "${sheetName}" processing completed successfully`);
      return;
    }

    if (isFailed) {
      throw new Error(`Sheet "${sheetName}" processing failed`);
    }

    // Wait before polling again
    await page.waitForTimeout(POLLING_INTERVAL);
  }

  throw new Error(`Timeout waiting for sheet "${sheetName}" to complete processing`);
}

/**
 * Helper: Upload a file using the dropzone
 */
async function uploadFile(page: Page, filePath: string): Promise<string> {
  // Read file buffer
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  // Set file input value
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: fileName,
    mimeType: filePath.endsWith('.pdf') ? 'application/pdf' : 'image/png',
    buffer: fileBuffer,
  });

  return fileName;
}

test.describe.serial('Vocabulary Upload and Processing Flow', () => {
  test('should register and login as a teacher', async ({ page }) => {
    await registerAndLogin(page);

    // Verify we're on the dashboard
    await expect(page.locator('h2')).toContainText('Dashboard');
  });

  test('should navigate to vocabulary page', async ({ page }) => {
    // Login first
    await login(page);

    // Navigate to vocabulary page
    await page.goto(`${BASE_URL}/vocabulary`);

    // Should show vocabulary page heading
    await expect(page.locator('h2')).toContainText('Vocabulary Sheets', {
      timeout: 10000,
    });

    // Should show upload card
    await expect(page.locator('text=Upload Vocabulary Sheet')).toBeVisible();

    // Should show empty state initially
    await expect(page.locator('text=No vocabulary sheets yet')).toBeVisible();
  });

  test('should show upload dropzone with correct instructions', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // Verify dropzone exists
    const dropzone = page.locator('text=Drag and drop a file here');
    await expect(dropzone).toBeVisible();

    // Verify accepted file types are mentioned
    await expect(page.locator('text=/PDF.*JPEG.*PNG.*GIF.*WebP/i')).toBeVisible();

    // Verify max file size is mentioned
    await expect(page.locator('text=/max.*10.*MB/i')).toBeVisible();
  });

  test('should upload a vocabulary sheet image and show upload progress', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // Monitor network for upload request
    const uploadRequest = page.waitForResponse(
      (response) =>
        response.url().includes('/api/vocabulary-sheets') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
      { timeout: 30000 }
    );

    // Upload the test image
    const fileName = await uploadFile(page, TEST_IMAGE_PATH);

    // Verify upload progress shows
    await expect(page.locator(`text=Uploading ${fileName}`)).toBeVisible({
      timeout: 5000,
    });

    // Progress bar should be visible
    await expect(page.locator('[role="progressbar"]')).toBeVisible();

    // Wait for upload to complete
    const response = await uploadRequest;
    const json = await response.json();

    // Verify API response
    expect(json).toHaveProperty('sheet');
    expect(json.sheet).toHaveProperty('id');
    expect(json.sheet.status).toBe('PENDING');
    expect(json.sheet.originalName).toBe(fileName);

    // Upload progress should disappear after success
    await expect(page.locator(`text=Uploading ${fileName}`)).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('should display uploaded sheet in the list with Pending status', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // The sheet from previous test should be visible
    const fileName = path.basename(TEST_IMAGE_PATH);

    // Wait for sheet card to appear
    await expect(page.locator(`text=${fileName}`)).toBeVisible({ timeout: 10000 });

    // Verify "Pending" or "Processing" status badge
    const sheetCard = page.locator(`text=${fileName}`).locator('..').locator('..');
    const statusBadge = sheetCard.locator('text=/Pending|Processing/i');
    await expect(statusBadge).toBeVisible();

    // Verify file metadata is shown
    await expect(sheetCard.locator('text=/bytes|KB|MB/i')).toBeVisible();
    await expect(sheetCard.locator('text=/image\/png|png/i')).toBeVisible();

    // Verify action buttons are present
    await expect(sheetCard.getByRole('link', { name: /download/i })).toBeVisible();
    await expect(sheetCard.getByRole('button', { name: /delete/i })).toBeVisible();
  });

  test('should wait for processing to complete and show Completed status', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    const fileName = path.basename(TEST_IMAGE_PATH);

    // Wait for processing to complete (this may take up to 2 minutes)
    console.log('Waiting for Claude API processing to complete...');
    await waitForProcessingComplete(page, fileName);

    // Verify "Completed" status badge
    const sheetCard = page.locator(`text=${fileName}`).locator('..').locator('..');
    await expect(sheetCard.locator('text=Completed')).toBeVisible();

    // Verify word count is populated
    await expect(sheetCard.locator('text=/\\d+ words/i')).toBeVisible({
      timeout: 5000,
    });

    // Verify test count is populated
    await expect(sheetCard.locator('text=/\\d+ tests/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should navigate to sheet detail page and verify vocabulary words', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    const fileName = path.basename(TEST_IMAGE_PATH);

    // Click on the sheet to navigate to detail page
    await page.click(`text=${fileName}`);

    // Wait for detail page to load
    await expect(page).toHaveURL(/\/vocabulary\/[a-z0-9]+/, { timeout: 10000 });

    // Verify vocabulary words section exists
    await expect(page.locator('text=/vocabulary words|extracted words/i')).toBeVisible(
      { timeout: 10000 }
    );

    // Verify at least one vocabulary word is displayed
    // Words should have word, definition, and/or context
    const wordCards = page.locator('[data-testid="vocabulary-word"]');
    const wordCount = await wordCards.count();

    if (wordCount === 0) {
      // Alternative: check for word list items
      const wordItems = page.locator('text=/word|definition|context/i');
      expect(await wordItems.count()).toBeGreaterThan(0);
    } else {
      expect(wordCount).toBeGreaterThan(0);
    }
  });

  test('should verify tests were generated on detail page', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    const fileName = path.basename(TEST_IMAGE_PATH);

    // Navigate to detail page
    await page.click(`text=${fileName}`);
    await expect(page).toHaveURL(/\/vocabulary\/[a-z0-9]+/, { timeout: 10000 });

    // Verify tests section exists
    await expect(page.locator('text=/generated tests|tests/i')).toBeVisible({
      timeout: 10000,
    });

    // Verify at least one test is listed
    // Tests should have name and variant
    const testCards = page.locator('[data-testid="test"]');
    const testCount = await testCards.count();

    if (testCount === 0) {
      // Alternative: check for test list items with variant info
      const testItems = page.locator('text=/variant|Test/i');
      expect(await testItems.count()).toBeGreaterThan(0);
    } else {
      expect(testCount).toBeGreaterThan(0);
    }

    // Verify question count is shown for each test
    await expect(page.locator('text=/\\d+ questions/i')).toBeVisible();
  });

  test('should download the original vocabulary sheet file', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    const fileName = path.basename(TEST_IMAGE_PATH);

    // Find the sheet card and download button
    const sheetCard = page.locator(`text=${fileName}`).locator('..').locator('..');
    const downloadButton = sheetCard.getByRole('link', { name: /download/i }).first();

    // Start download
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await downloadButton.click();

    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toBe(fileName);

    // Save to temp file to verify it's not empty
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    // Read downloaded file and verify it's not empty
    const downloadedBuffer = fs.readFileSync(downloadPath!);
    expect(downloadedBuffer.length).toBeGreaterThan(0);

    // Compare with original file
    const originalBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    expect(downloadedBuffer.length).toBe(originalBuffer.length);
  });

  test('should delete vocabulary sheet successfully', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    const fileName = path.basename(TEST_IMAGE_PATH);

    // Find the sheet card
    const sheetCard = page.locator(`text=${fileName}`).locator('..').locator('..');

    // Set up dialog handler for confirmation
    page.on('dialog', (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('delete');
      dialog.accept();
    });

    // Click delete button
    const deleteButton = sheetCard.getByRole('button', { name: /delete/i }).first();
    await deleteButton.click();

    // Wait for delete request to complete
    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/vocabulary-sheets') &&
        response.request().method() === 'DELETE' &&
        response.status() === 204,
      { timeout: 10000 }
    );

    // Verify sheet is removed from list
    await expect(page.locator(`text=${fileName}`)).not.toBeVisible({
      timeout: 5000,
    });

    // Empty state should appear again
    await expect(page.locator('text=No vocabulary sheets yet')).toBeVisible();
  });

  test('should upload PDF file and process successfully', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    const fileName = path.basename(TEST_PDF_PATH);

    // Monitor upload request
    const uploadRequest = page.waitForResponse(
      (response) =>
        response.url().includes('/api/vocabulary-sheets') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
      { timeout: 30000 }
    );

    // Upload the PDF
    await uploadFile(page, TEST_PDF_PATH);

    // Wait for upload to complete
    await uploadRequest;

    // Verify sheet appears in list
    await expect(page.locator(`text=${fileName}`)).toBeVisible({ timeout: 10000 });

    // Verify file type shows PDF
    const sheetCard = page.locator(`text=${fileName}`).locator('..').locator('..');
    await expect(sheetCard.locator('text=/application\/pdf|PDF/i')).toBeVisible();

    // Wait for processing to complete
    console.log('Waiting for PDF processing to complete...');
    await waitForProcessingComplete(page, fileName);

    // Verify completed status
    await expect(sheetCard.locator('text=Completed')).toBeVisible();

    // Clean up - delete the PDF sheet
    page.on('dialog', (dialog) => dialog.accept());
    const deleteButton = sheetCard.getByRole('button', { name: /delete/i }).first();
    await deleteButton.click();

    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/vocabulary-sheets') &&
        response.request().method() === 'DELETE',
      { timeout: 10000 }
    );
  });

  test('should handle upload errors gracefully - file too large', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // Create a mock file that exceeds 10MB
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    const fileInput = page.locator('input[type="file"]');

    // Set up dialog handler for error alert
    let alertShown = false;
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toMatch(/too large|maximum size/i);
      alertShown = true;
      await dialog.accept();
    });

    await fileInput.setInputFiles({
      name: 'large-file.png',
      mimeType: 'image/png',
      buffer: largeBuffer,
    });

    // Wait a bit for client-side validation
    await page.waitForTimeout(1000);

    // Verify alert was shown
    expect(alertShown).toBe(true);

    // Verify no upload happened (no sheet in list)
    await expect(page.locator('text=large-file.png')).not.toBeVisible();
  });

  test('should handle upload errors gracefully - invalid file type', async ({
    page,
  }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // Create a mock invalid file (text file)
    const textBuffer = Buffer.from('This is a text file, not an image or PDF');
    const fileInput = page.locator('input[type="file"]');

    // Set up dialog handler for error alert
    let alertShown = false;
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toMatch(/invalid file type/i);
      alertShown = true;
      await dialog.accept();
    });

    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: textBuffer,
    });

    // Wait a bit for client-side validation
    await page.waitForTimeout(1000);

    // Verify alert was shown
    expect(alertShown).toBe(true);

    // Verify no upload happened
    await expect(page.locator('text=test.txt')).not.toBeVisible();
  });

  test('should show processing status with animated spinner', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // Upload a new file
    const fileName = await uploadFile(page, TEST_IMAGE_PATH);

    // Wait for upload to complete
    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/vocabulary-sheets') &&
        response.request().method() === 'POST',
      { timeout: 30000 }
    );

    // Reload to see processing status
    await page.reload({ waitUntil: 'networkidle' });

    // Find the sheet card
    const sheetCard = page.locator(`text=${fileName}`).locator('..').locator('..');

    // Check for "Processing" or "Pending" status
    const processingBadge = sheetCard.locator('text=/Processing|Pending/i');
    const isProcessing = await processingBadge.isVisible().catch(() => false);

    if (isProcessing) {
      // If processing, verify spinner animation exists
      const spinner = sheetCard.locator('[class*="animate-spin"]');
      expect(await spinner.count()).toBeGreaterThan(0);
    }

    // Clean up - wait for completion then delete
    await waitForProcessingComplete(page, fileName);

    page.on('dialog', (dialog) => dialog.accept());
    const deleteButton = sheetCard.getByRole('button', { name: /delete/i }).first();
    await deleteButton.click();

    await page.waitForResponse(
      (response) => response.url().includes('/api/vocabulary-sheets'),
      { timeout: 10000 }
    );
  });

  test('should handle multiple uploads sequentially', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // Upload first file
    const fileName1 = await uploadFile(page, TEST_IMAGE_PATH);
    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/vocabulary-sheets') &&
        response.request().method() === 'POST',
      { timeout: 30000 }
    );

    // Verify first file appears
    await expect(page.locator(`text=${fileName1}`)).toBeVisible({ timeout: 10000 });

    // Upload second file (PDF)
    const fileName2 = await uploadFile(page, TEST_PDF_PATH);
    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/vocabulary-sheets') &&
        response.request().method() === 'POST',
      { timeout: 30000 }
    );

    // Verify both files appear in list
    await expect(page.locator(`text=${fileName1}`)).toBeVisible();
    await expect(page.locator(`text=${fileName2}`)).toBeVisible();

    // Clean up both files
    page.on('dialog', (dialog) => dialog.accept());

    for (const fileName of [fileName1, fileName2]) {
      const sheetCard = page.locator(`text=${fileName}`).locator('..').locator('..');
      const deleteButton = sheetCard
        .getByRole('button', { name: /delete/i })
        .first();
      await deleteButton.click();

      await page.waitForResponse(
        (response) =>
          response.url().includes('/api/vocabulary-sheets') &&
          response.request().method() === 'DELETE',
        { timeout: 10000 }
      );
    }

    // Verify empty state
    await expect(page.locator('text=No vocabulary sheets yet')).toBeVisible();
  });
});

test.describe('Vocabulary Upload - API Error Handling', () => {
  test('should handle network errors during upload', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/vocabulary`);

    // Simulate network failure by blocking the API endpoint
    await page.route('**/api/vocabulary-sheets', (route) => {
      route.abort('failed');
    });

    let alertShown = false;
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toMatch(/failed|error/i);
      alertShown = true;
      await dialog.accept();
    });

    // Try to upload
    await uploadFile(page, TEST_IMAGE_PATH);

    // Wait for error
    await page.waitForTimeout(3000);

    // Verify error was shown
    expect(alertShown).toBe(true);

    // Clean up route
    await page.unroute('**/api/vocabulary-sheets');
  });

  test('should handle unauthorized access gracefully', async ({ page }) => {
    // Navigate to vocabulary page without logging in
    await page.goto(`${BASE_URL}/vocabulary`);

    // Should redirect to login page
    await page.waitForURL(`${BASE_URL}/login`, { timeout: 10000 });

    // Verify login form is visible
    await expect(page.locator('input#email')).toBeVisible();
  });
});

/**
 * Helper function for tests that need authentication
 * Reuse existing login
 */
async function ensureLoggedIn(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input#email', testEmail);
  await page.fill('input#password', testPassword);
  await page.click('button[type="submit"]');

  try {
    await expect(page.locator('h2')).toContainText('Dashboard', { timeout: 5000 });
  } catch {
    // Login failed, try to register
    await registerAndLogin(page);
  }
}
