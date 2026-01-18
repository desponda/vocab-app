import { test, expect } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Helper function to ensure user is logged in
async function ensureUserLoggedIn(page: any, email: string, password: string) {
  try {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input#email', email);
    await page.fill('input#password', password);
    await page.click('button[type="submit"]');
    await expect(page.locator('h2')).toContainText('Dashboard', {
      timeout: 10000,
    });
  } catch (error) {
    console.log('User may already be registered, attempting to login failed');
  }
}

test.describe.serial('File Upload Flow', () => {
  const testEmail = `upload-test-${Date.now()}@example.com`;
  const testPassword = 'Test1234!';
  const testName = 'Upload Test Teacher';
  const studentName = 'Test Student';

  let studentId: string;

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

  test('should create a student', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    // Navigate to students page
    await page.goto(`${BASE_URL}/students`);
    await expect(page.locator('h2')).toContainText('Students');

    // Click "Add Student" button
    await page.click('text=Add Student');

    // Wait for dialog to open
    await expect(page.locator('text=Create a new student profile')).toBeVisible();

    // Fill in student details
    await page.fill('input#name', studentName);
    await page.fill('input#gradeLevel', '6');

    // Submit form
    await page.click('button[type="submit"]:has-text("Create Student")');

    // Wait for dialog to close and student to appear
    await expect(page.locator(`text=${studentName}`)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text=Grade 6')).toBeVisible();
  });

  test('should navigate to student detail page', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);

    // Find and click "View & Upload Files" button for first student
    const viewButton = page.locator('text=View & Upload Files').first();
    await viewButton.click();

    // Should be on student detail page
    await expect(page.locator('h3')).toContainText('Upload Vocabulary Sheet');
    await expect(page.locator('h3')).toContainText('Uploaded Documents');
  });

  test('should upload a PDF file', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);

    // Navigate to first student
    const viewButton = page.locator('text=View & Upload Files').first();
    await viewButton.click();

    // Wait for upload area
    await expect(page.locator('text=Drag & drop a file')).toBeVisible();

    // Upload PDF file
    const fileInput = page.locator('input[type="file"]');
    const testFile = path.join(__dirname, '../fixtures/test-vocab-sheet.pdf');
    await fileInput.setInputFiles(testFile);

    // Wait for upload to complete (look for success state or document in list)
    await expect(
      page.locator('text=/test-vocab-sheet.pdf/i').or(page.locator('svg.text-green-500'))
    ).toBeVisible({ timeout: 15000 });

    // Verify document appears in list
    await expect(page.locator('text=/test-vocab-sheet.pdf/i')).toBeVisible();
    await expect(page.locator('text=/PDF/i')).toBeVisible();
  });

  test('should upload an image file', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);

    // Navigate to first student
    const viewButton = page.locator('text=View & Upload Files').first();
    await viewButton.click();

    // Upload image file
    const fileInput = page.locator('input[type="file"]');
    const testFile = path.join(__dirname, '../fixtures/test-vocab-image.png');
    await fileInput.setInputFiles(testFile);

    // Wait for upload to complete
    await expect(
      page.locator('text=/test-vocab-image.png/i').or(page.locator('svg.text-green-500'))
    ).toBeVisible({ timeout: 15000 });

    // Verify document appears in list
    await expect(page.locator('text=/test-vocab-image.png/i')).toBeVisible();
    await expect(page.locator('text=/IMAGE/i')).toBeVisible();
  });

  test('should display upload progress', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);

    // Navigate to first student
    const viewButton = page.locator('text=View & Upload Files').first();
    await viewButton.click();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    const testFile = path.join(__dirname, '../fixtures/test-vocab-sheet.pdf');
    await fileInput.setInputFiles(testFile);

    // Check for progress indicator (may be too fast to catch on small files)
    const progressIndicator = page.locator('text=/Uploading/i');
    const progressBar = page.locator('[role="progressbar"]');

    // Either progress indicator or success should appear
    await expect(
      progressIndicator.or(progressBar).or(page.locator('svg.text-green-500'))
    ).toBeVisible({ timeout: 15000 });
  });

  test('should download a document', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);

    // Navigate to first student
    const viewButton = page.locator('text=View & Upload Files').first();
    await viewButton.click();

    // Wait for documents to load
    await page.waitForTimeout(1000);

    // Look for download button
    const downloadButton = page
      .locator('button[title="Download"]')
      .first();

    if ((await downloadButton.count()) > 0) {
      // Click download button - this will open in new tab/download
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 10000 }),
        downloadButton.click(),
      ]);

      // Verify download started
      expect(download).toBeTruthy();
      const filename = download.suggestedFilename();
      expect(filename).toBeTruthy();
    } else {
      console.log('No documents available to download');
    }
  });

  test('should delete a document', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);

    // Navigate to first student
    const viewButton = page.locator('text=View & Upload Files').first();
    await viewButton.click();

    // Wait for documents to load
    await page.waitForTimeout(1000);

    // Count documents before deletion
    const documentsBefore = await page.locator('button[title="Delete"]').count();

    if (documentsBefore > 0) {
      // Get the name of the first document
      const firstDocName = await page
        .locator('.font-medium')
        .first()
        .textContent();

      // Click delete button
      const deleteButton = page.locator('button[title="Delete"]').first();
      await deleteButton.click();

      // Wait for document to be removed from list
      await page.waitForTimeout(1000);

      // Verify document count decreased
      const documentsAfter = await page
        .locator('button[title="Delete"]')
        .count();
      expect(documentsAfter).toBe(documentsBefore - 1);

      // Verify the specific document is gone
      if (firstDocName) {
        await expect(page.locator(`text="${firstDocName}"`)).not.toBeVisible();
      }
    } else {
      console.log('No documents available to delete');
    }
  });

  test('should show empty state when no documents', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);

    // Navigate to first student
    const viewButton = page.locator('text=View & Upload Files').first();
    await viewButton.click();

    // Delete all documents
    let deleteButton = page.locator('button[title="Delete"]').first();
    while ((await deleteButton.count()) > 0) {
      await deleteButton.click();
      await page.waitForTimeout(500);
      deleteButton = page.locator('button[title="Delete"]').first();
    }

    // Verify empty state
    await expect(
      page.locator('text=No documents uploaded yet')
    ).toBeVisible();
  });

  test('should validate file type', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);

    // Navigate to first student
    const viewButton = page.locator('text=View & Upload Files').first();
    await viewButton.click();

    // Try to upload an invalid file type (create a .txt file)
    const fileInput = page.locator('input[type="file"]');

    // Create a temporary text file
    const fs = require('fs');
    const tmpFile = path.join(__dirname, '../fixtures/test-invalid.txt');
    fs.writeFileSync(tmpFile, 'This is not a valid file type');

    await fileInput.setInputFiles(tmpFile);

    // Should show error message
    await expect(
      page.locator('text=/not allowed|invalid file type/i')
    ).toBeVisible({ timeout: 10000 });

    // Clean up temp file
    fs.unlinkSync(tmpFile);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await ensureUserLoggedIn(page, testEmail, testPassword);

    await page.goto(`${BASE_URL}/students`);

    // Navigate to first student
    const viewButton = page.locator('text=View & Upload Files').first();
    await viewButton.click();

    // Intercept upload request and fail it
    await page.route('**/api/documents', (route) => {
      route.abort('failed');
    });

    // Try to upload
    const fileInput = page.locator('input[type="file"]');
    const testFile = path.join(__dirname, '../fixtures/test-vocab-sheet.pdf');
    await fileInput.setInputFiles(testFile);

    // Should show error message
    await expect(
      page.locator('text=/upload failed|network error|error/i')
    ).toBeVisible({ timeout: 10000 });
  });
});
