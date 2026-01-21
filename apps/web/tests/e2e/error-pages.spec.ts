import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Error Pages', () => {
  test('displays 404 page for invalid route', async ({ page }) => {
    await page.goto(`${BASE_URL}/this-route-does-not-exist-12345`);

    // Should show 404 error page
    await expect(page.getByText('Page Not Found')).toBeVisible();
    await expect(
      page.getByText(/doesn't exist or has been moved/)
    ).toBeVisible();

    // Should have navigation buttons
    await expect(page.getByRole('button', { name: 'Go Back' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go Home' })).toBeVisible();
  });

  test('404 page "Go Home" button works', async ({ page }) => {
    await page.goto(`${BASE_URL}/invalid-route`);

    await expect(page.getByText('Page Not Found')).toBeVisible();

    const goHomeButton = page.getByRole('button', { name: 'Go Home' });
    await goHomeButton.click();

    // Should redirect to dashboard (or login if not authenticated)
    await page.waitForURL(/\/(dashboard|login)/);
  });

  test('preserves layout in dashboard 404', async ({ page, context }) => {
    // This test would require authentication setup
    // For now, we'll skip it in CI and test manually
    test.skip(!!process.env.CI, 'Requires manual auth setup');

    // Login flow would go here...
    // Then navigate to invalid dashboard route
    // Verify sidebar is still visible
  });
});
