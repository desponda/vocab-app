# Local E2E Testing Guide

Complete guide for running Playwright end-to-end tests locally with a full development environment.

## Quick Start

```bash
# One-time setup
pnpm setup:e2e

# Start the application (terminal 1)
pnpm dev

# Run e2e tests (terminal 2)
pnpm test:e2e:local:ui  # Recommended: Opens Playwright UI
```

## What is Local E2E Testing?

Local e2e testing runs Playwright tests against your local development environment (`http://localhost:3000`) instead of the staging server. This gives you:

- **Faster feedback loop** - No deployment wait time
- **Debugging capabilities** - Inspect browser, step through tests
- **Offline testing** - No internet dependency
- **Consistent test data** - Seeded database with known state
- **Cost savings** - No API usage on staging

## One-Time Setup

Run the automated setup script:

```bash
pnpm setup:e2e
```

This script will:
1. ✅ Check Docker is running
2. ✅ Start Docker services (Postgres, Redis, MinIO)
3. ✅ Run database migrations
4. ✅ Seed database with test data
5. ✅ Install Playwright browsers

**What gets created:**
- Teacher account: `teacher@test.com`
- Student accounts: `student1@test.com`, `student2@test.com`, `student3@test.com`
- Classroom: "Test Classroom - 5th Grade" (code: `TEST01`)
- Vocabulary sheet with 10 words
- Test with 10 questions (multiple choice, fill-in-blank, spelling)
- Completed test attempt for student 1 (70% score)
- In-progress test for student 2 (3/10 questions answered)
- Assigned test for student 3 (not started)

**All test accounts use the same password:** `Test1234!`

## Running Tests

### Recommended: Playwright UI Mode

```bash
pnpm test:e2e:local:ui
```

This opens the Playwright UI where you can:
- Pick which tests to run
- See live browser view
- Step through tests
- Inspect DOM and network requests
- Replay failed tests

### Command Line Mode

```bash
# Run all tests in headless mode
pnpm test:e2e:local

# Run in headed mode (see browser)
pnpm test:e2e:local:headed

# Run specific test file
cd apps/web
BASE_URL=http://localhost:3000 pnpm test:e2e tests/e2e/teacher-view-test-results.spec.ts
```

## Test Data Management

### Resetting the Database

After running tests, you may want to reset the database to its initial state:

```bash
pnpm db:reset
```

This will:
1. Drop all tables
2. Run migrations
3. Re-seed test data

### Manual Seeding

```bash
pnpm db:seed
```

### Inspecting Data

Use Prisma Studio to inspect the database:

```bash
cd apps/api
pnpm prisma:studio
```

Opens at: http://localhost:5555

## Available Test Accounts

After running `pnpm setup:e2e`, you can login with:

### Teacher Account
- **Email:** teacher@test.com
- **Password:** Test1234!
- **Has:** 1 classroom with 3 enrolled students

### Student Accounts
- **student1@test.com** - Has completed 1 test (70% score)
- **student2@test.com** - Has in-progress test (3/10 answered)
- **student3@test.com** - Has assigned test (not started)
- **Password:** Test1234! (all students)

### Classroom
- **Name:** Test Classroom - 5th Grade
- **Code:** TEST01
- **Grade Level:** 5

## Test Files

### Existing E2E Tests

- `user-flows.spec.ts` - Basic user authentication flows
- `vocabulary-upload.spec.ts` - Vocabulary upload and processing
- `classroom-navigation.spec.ts` - Classroom management UI
- `vocabulary-editing.spec.ts` - Editing vocabulary
- `test-progress-autosave.spec.ts` - Test autosave functionality
- `test-creation-wizard.spec.ts` - Test creation wizard
- `student-dashboard.spec.ts` - Student dashboard and test taking
- **`teacher-view-test-results.spec.ts`** - Teacher viewing student results (NEW)

### Creating New Tests

Follow the pattern in existing tests:

```typescript
import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto(`${BASE_URL}/some-page`);
    // ... test assertions
  });
});
```

## Local Development Workflow

### Typical Workflow

```bash
# Terminal 1: Start Docker services (if not already running)
docker-compose up -d

# Terminal 2: Start the application
pnpm dev

# Terminal 3: Run tests
pnpm test:e2e:local:ui
```

### Debugging Failed Tests

1. **Use Playwright UI** - Easiest way to debug
   ```bash
   pnpm test:e2e:local:ui
   ```

2. **Run in headed mode** - See the browser
   ```bash
   pnpm test:e2e:local:headed
   ```

3. **Use browser DevTools** - Add `await page.pause()` in your test
   ```typescript
   test('debug test', async ({ page }) => {
     await page.goto(`${BASE_URL}/login`);
     await page.pause();  // Opens Playwright Inspector
   });
   ```

4. **Check logs** - Backend logs appear in terminal running `pnpm dev`

5. **Inspect database** - Use Prisma Studio to see data state

## Environment Variables

Local e2e tests use these defaults:

- `BASE_URL=http://localhost:3000`
- `NEXT_PUBLIC_API_URL=http://localhost:3001`
- Database: `postgresql://postgres:postgres@localhost:5432/vocab_app_dev`
- Redis: `localhost:6379`
- MinIO: `localhost:9000` (console: `localhost:9001`)

## Troubleshooting

### Tests Fail with "Navigation Timeout"

**Cause:** Frontend or backend not running

**Solution:**
```bash
# Check services are running
docker-compose ps
pnpm dev  # Restart if needed
```

### Database Connection Errors

**Cause:** Postgres not running or migrations not applied

**Solution:**
```bash
docker-compose up -d postgres
cd apps/api && pnpm prisma migrate deploy
```

### "Port already in use" Errors

**Cause:** Previous processes still running

**Solution:**
```bash
lsof -ti:3000 | xargs kill  # Kill frontend
lsof -ti:3001 | xargs kill  # Kill backend
lsof -ti:5432 | xargs kill  # Kill postgres
```

### Tests Pass Locally but Fail on Staging

**Cause:** Different data state or environment

**Solution:**
- Check test data assumptions
- Verify environment variables
- Compare staging vs local data

### Playwright Browsers Not Found

**Cause:** Browsers not installed

**Solution:**
```bash
cd apps/web
npx playwright install chromium
```

## Best Practices

### 1. Reset Data Between Test Runs

```bash
pnpm db:reset  # Get clean state
```

### 2. Use Seed Data Instead of Creating Test Data

Leverage the seeded accounts instead of creating new users in tests:

```typescript
// ❌ BAD: Creates new data every run
test('my test', async ({ page }) => {
  // Register new teacher...
  // Create new classroom...
});

// ✅ GOOD: Uses seeded data
test('my test', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input#email', 'teacher@test.com');
  await page.fill('input#password', 'Test1234!');
  // ...
});
```

### 3. Run Against Staging Before Pushing

```bash
# Verify locally first
pnpm test:e2e:local

# Then verify against staging
cd apps/web
BASE_URL=https://vocab-staging.dresponda.com pnpm test:e2e
```

### 4. Use Descriptive Test Names

```typescript
// ✅ GOOD
test('teacher can view student test results in their classroom', async ({ page }) => {

// ❌ BAD
test('test 1', async ({ page }) => {
```

### 5. Clean Up After Tests

If your test creates data, clean it up:

```typescript
test.afterEach(async () => {
  // Clean up test data
  await prisma.classroom.deleteMany({
    where: { name: { contains: 'E2E Test' } }
  });
});
```

## Comparing Local vs Staging E2E

| Feature | Local E2E | Staging E2E |
|---------|-----------|-------------|
| **Speed** | Fast (no network) | Slower (network latency) |
| **Setup** | Requires local env | No setup needed |
| **Debugging** | Easy (browser + logs) | Harder (remote only) |
| **Data State** | Controlled (seeded) | Shared (unpredictable) |
| **Cost** | Free | Uses staging resources |
| **CI/CD** | Run on PR | Run post-deployment |
| **Isolation** | Fully isolated | Shared environment |
| **Best For** | Development, debugging | Final validation, demos |

## CI/CD Integration

**Local e2e tests are NOT run in CI** - they're for development only.

CI runs:
1. Unit tests
2. Integration tests (with test database)
3. E2E tests against staging (post-deployment)

## Scripts Reference

```bash
# Setup
pnpm setup:e2e              # One-time setup
pnpm db:seed                # Seed database
pnpm db:reset               # Reset + reseed database

# Running tests
pnpm test:e2e:local         # Run all tests (headless)
pnpm test:e2e:local:ui      # Run with Playwright UI
pnpm test:e2e:local:headed  # Run in headed mode

# Development
pnpm dev                    # Start frontend + backend
docker-compose up -d        # Start Docker services
docker-compose down         # Stop Docker services

# Debugging
cd apps/api && pnpm prisma:studio  # Inspect database
docker-compose logs -f api         # View API logs
```

## File Locations

- **Setup script:** `/workspace/scripts/setup-local-e2e.sh`
- **Seed script:** `/workspace/apps/api/prisma/seed.ts`
- **Test files:** `/workspace/apps/web/tests/e2e/*.spec.ts`
- **Playwright config:** `/workspace/apps/web/playwright.config.ts`
- **Docker compose:** `/workspace/docker-compose.yml`

## Next Steps

- Read the [Testing Strategy](../testing-strategy.md) guide
- Check out [Playwright Docs](https://playwright.dev) for advanced patterns
- Review existing test files for examples
- Add new test cases for your features

---

**Questions?** Check the troubleshooting section or ask in the team channel.
