# End-to-End Tests

This directory contains Playwright end-to-end tests for the Vocab App.

## Test Files

### `user-flows.spec.ts`
Tests core user authentication and navigation flows:
- User registration and login
- Protected route redirects
- Form validation
- Navigation between pages
- API integration
- Responsive design

### `student-creation.spec.ts`
Tests student management functionality:
- Creating students
- Listing students
- Viewing student details
- Updating student information
- Deleting students

### `file-upload.spec.ts`
Tests document upload functionality (deprecated):
- File upload with progress tracking
- File validation
- Document listing
- Download functionality
- Delete functionality

### `vocabulary-upload.spec.ts`
Tests vocabulary upload and processing workflow (Claude AI integration):
- Upload vocabulary sheets (images and PDFs)
- Monitor upload progress
- Wait for Claude AI processing to complete
- Verify vocabulary word extraction
- Verify test generation
- Download and delete vocabulary sheets
- Error handling (file size, file type, network errors)

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   cd apps/web
   pnpm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install --with-deps chromium
   ```

### Local Development

Run tests against local development server (http://localhost:3000):

```bash
# Start dev server first (in separate terminal)
cd apps/web
pnpm dev

# Run all tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e vocabulary-upload.spec.ts

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Run with Playwright UI (interactive)
pnpm test:e2e:ui

# Run in debug mode
pnpm test:e2e --debug
```

### Staging Environment

Run tests against staging environment (https://vocab-staging.dresponda.com):

```bash
BASE_URL=https://vocab-staging.dresponda.com pnpm test:e2e

# Run specific test file against staging
BASE_URL=https://vocab-staging.dresponda.com pnpm test:e2e vocabulary-upload.spec.ts
```

### CI/CD

Tests run automatically in GitHub Actions:
- All tests run against local dev server on every PR
- Vocabulary upload tests run against staging after deployment

## Test Structure

### Shared Helpers

Tests use shared helper functions for common operations:

**Authentication:**
- `registerAndLogin(page)` - Register new user and login
- `login(page)` - Login with existing credentials
- `ensureLoggedIn(page)` - Reuse existing session or login

**Vocabulary Upload:**
- `uploadFile(page, filePath)` - Upload a file using dropzone
- `waitForProcessingComplete(page, fileName, timeout)` - Poll for Claude processing to complete

### Test Fixtures

Test fixtures are located in `tests/fixtures/`:
- `test-vocab-image.png` - Small PNG image with vocabulary words
- `test-vocab-sheet.pdf` - PDF document with vocabulary content

## Vocabulary Upload Test Flow

The `vocabulary-upload.spec.ts` test suite covers the complete workflow:

1. **Authentication**
   - Register new teacher account
   - Login to application

2. **Navigation**
   - Navigate to vocabulary page
   - Verify empty state

3. **Upload**
   - Upload vocabulary sheet (image or PDF)
   - Monitor upload progress
   - Verify sheet appears in list with "Pending" status

4. **Processing** (Background job with Claude AI)
   - Wait for status to change from "Pending" → "Processing" → "Completed"
   - Polls every 5 seconds for up to 2 minutes
   - Handles Claude API delays gracefully

5. **Verification**
   - Verify word count is populated
   - Verify test count is populated
   - Navigate to detail page
   - Verify vocabulary words were extracted
   - Verify tests were generated

6. **Actions**
   - Test download functionality
   - Test delete functionality

7. **Error Handling**
   - File too large (>10MB)
   - Invalid file type
   - Network errors
   - Unauthorized access

## Timeouts and Polling

**Upload timeout:** 30 seconds
**Processing timeout:** 2 minutes (120 seconds)
**Polling interval:** 5 seconds

Claude API processing can be slow, especially for PDFs. The tests are designed to wait patiently and provide helpful error messages if processing fails.

## Test Data Isolation

Each test run creates a unique user account using timestamps:
```typescript
const testEmail = `vocab-e2e-${Date.now()}@example.com`;
```

This ensures tests don't interfere with each other and can run in parallel.

## Debugging Failed Tests

### View test report
```bash
npx playwright show-report
```

### Run specific test with trace
```bash
pnpm test:e2e vocabulary-upload.spec.ts --trace on
```

### View screenshots
Failed tests automatically capture screenshots in `test-results/`

### Check logs
- Browser console logs are captured in test output
- API requests/responses are visible in trace viewer

## Common Issues

### Processing timeout
If Claude API is slow or unavailable:
- Tests wait up to 2 minutes for processing to complete
- Increase timeout by setting `PROCESSING_TIMEOUT` in test file
- Check backend logs for Claude API errors

### File upload fails
- Ensure MinIO is running and accessible
- Check backend logs for S3 upload errors
- Verify environment variables (MINIO_*)

### Staging tests fail
- Verify staging environment is deployed and healthy
- Check ArgoCD deployment status
- Ensure staging database is accessible

### Browser crashes
- Reinstall Playwright browsers: `npx playwright install --with-deps chromium`
- Check system resources (memory, disk space)

## Best Practices

1. **Use data-testid attributes** for stable element selection
2. **Wait for network responses** before assertions
3. **Handle dialogs** (confirm, alert) with event listeners
4. **Clean up test data** after tests (delete uploaded files)
5. **Use descriptive test names** that explain what is being tested
6. **Add helpful console logs** for long-running operations (processing)

## Adding New Tests

When adding new E2E tests:

1. Follow existing patterns from `vocabulary-upload.spec.ts`
2. Use shared helper functions for authentication
3. Create fixtures in `tests/fixtures/` if needed
4. Add data-testid attributes to UI components for stable selection
5. Handle timeouts gracefully (Claude API, file uploads)
6. Clean up test data to avoid polluting the database
7. Document the test flow in this README

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing Strategy](../../docs/testing-strategy.md)
- [Testing Guide](../../docs/testing-guide.md)
