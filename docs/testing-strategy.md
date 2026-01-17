# Comprehensive Testing Strategy for Full-Stack Applications

## Testing Pyramid Overview

```
           /\
          /E2E\ (10% - Slow, Expensive, Realistic)
         /------\
        /  API  \ (20% - Medium Speed, Integration)
       /--------\
      / Component\ (30% - Fast, Isolated UI)
     /----------\
    /    Unit    \ (40% - Fastest, Most Coverage)
   /--------------\
```

## 1. Unit Tests (40% of tests)

### What to Test
- Pure functions and utilities
- Business logic
- Data transformations
- Validation functions
- Helper functions

### Frontend Unit Tests (Vitest + React Testing Library)

```typescript
// Example: apps/web/src/lib/validators.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from './validators';

describe('validators', () => {
  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should enforce minimum length', () => {
      expect(validatePassword('short')).toBe(false);
      expect(validatePassword('longEnough123')).toBe(true);
    });
  });
});
```

### Backend Unit Tests (Vitest)

```typescript
// Example: apps/api/src/lib/password.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from './password';

describe('password utilities', () => {
  it('should hash and verify passwords correctly', async () => {
    const password = 'SecurePassword123!';
    const hashed = await hashPassword(password);

    expect(hashed).not.toBe(password);
    expect(await comparePassword(password, hashed)).toBe(true);
    expect(await comparePassword('wrong', hashed)).toBe(false);
  });
});
```

### Best Practices
- **Fast**: Run in milliseconds
- **Isolated**: No database, no network, no file system
- **Focused**: Test one thing at a time
- **Mocked**: Mock all dependencies
- **Coverage**: Aim for 80%+ on business logic

## 2. Component Tests (30% of tests)

### What to Test
- React component rendering
- User interactions (clicks, typing)
- Conditional rendering
- Props handling
- State management

### Frontend Component Tests

```typescript
// Example: apps/web/src/components/auth/LoginForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('should render login form fields', () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should call onSubmit with form data', async () => {
    const handleSubmit = vi.fn();
    render(<LoginForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('should show validation errors', async () => {
    render(<LoginForm onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });
});
```

### Best Practices
- **User-centric**: Test from user perspective
- **Accessibility**: Use semantic queries (getByRole, getByLabelText)
- **Avoid**: Testing implementation details
- **Mock**: External dependencies (API calls, context)

## 3. Integration/API Tests (20% of tests)

### What to Test
- API endpoints
- Database operations
- Authentication flows
- CRUD operations
- Error handling

### Backend Integration Tests (Supertest + Test Database)

```typescript
// Example: apps/api/src/routes/auth.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../lib/prisma';

describe('Auth API', () => {
  beforeAll(async () => {
    // Set up test database
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear data before each test
    await prisma.user.deleteMany();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          name: 'New User',
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe('newuser@example.com');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: 'newuser@example.com' },
      });
      expect(user).toBeTruthy();
    });

    it('should reject duplicate email', async () => {
      // Create user
      await request(app).post('/api/auth/register').send({
        email: 'existing@example.com',
        password: 'Pass123!',
        name: 'First User',
      });

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Pass456!',
          name: 'Second User',
        })
        .expect(400);

      expect(response.body.message).toContain('already exists');
    });

    it('should validate input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // too short
          name: '',
        })
        .expect(400);

      expect(response.body).toHaveProperty('details');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login existing user', async () => {
      // Register user first
      await request(app).post('/api/auth/register').send({
        email: 'logintest@example.com',
        password: 'Password123!',
        name: 'Login Test',
      });

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe('logintest@example.com');
    });

    it('should reject wrong password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });
  });
});
```

### Best Practices
- **Real Database**: Use test database (Docker)
- **Isolation**: Clean data between tests
- **Complete**: Test full request/response cycle
- **Error Cases**: Test all error scenarios
- **Transactions**: Use transactions for cleanup

## 4. E2E Tests (10% of tests)

### What to Test
- Critical user journeys
- Complete workflows
- Cross-component integration
- Real browser interactions
- Authentication flows

### E2E Tests (Playwright)

```typescript
// Already created in apps/web/tests/e2e/user-flows.spec.ts
// Tests complete user flows from registration to dashboard navigation
```

### Best Practices
- **Realistic**: Use real browser, real network
- **Selective**: Only critical paths
- **Stable**: Use reliable selectors
- **Fast**: Parallelize when possible
- **Retry**: Configure retries for flaky tests

## Testing Infrastructure

### 1. Test Databases

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: vocab_app_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - '5433:5432'

  redis-test:
    image: redis:7-alpine
    ports:
      - '6380:6379'
```

### 2. Test Scripts

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run src/**/*.test.ts",
    "test:integration": "vitest run src/**/*.integration.test.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "pnpm test && pnpm test:e2e"
  }
}
```

### 3. CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:coverage

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: vocab_app_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: npx playwright install --with-deps
      - run: pnpm test:e2e
```

## Testing Checklist

### Before Every Commit
- [ ] Run unit tests (`pnpm test`)
- [ ] Check coverage doesn't decrease
- [ ] Fix any failing tests

### Before Every PR
- [ ] All tests pass (`pnpm test:all`)
- [ ] New features have tests
- [ ] Coverage > 80%
- [ ] E2E tests for critical flows
- [ ] Manual testing completed

### Before Deployment to Staging
- [ ] All CI checks pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual smoke test

### Before Production Deploy
- [ ] Staging smoke tests pass
- [ ] Performance tests pass
- [ ] Security scan clean
- [ ] Rollback plan ready

## Test Data Management

### Fixtures

```typescript
// apps/api/tests/fixtures/users.ts
export const testUsers = {
  parent: {
    email: 'parent@test.com',
    password: 'Test1234!',
    name: 'Test Parent',
    role: 'PARENT',
  },
  teacher: {
    email: 'teacher@test.com',
    password: 'Test1234!',
    name: 'Test Teacher',
    role: 'TEACHER',
  },
};

export const testStudents = {
  gradeOne: {
    name: 'First Grader',
    gradeLevel: 1,
  },
  gradeFive: {
    name: 'Fifth Grader',
    gradeLevel: 5,
  },
};
```

### Factories

```typescript
// apps/api/tests/factories/user.factory.ts
import { faker } from '@faker-js/faker';

export const createTestUser = (overrides = {}) => ({
  email: faker.internet.email(),
  password: 'Test1234!',
  name: faker.person.fullName(),
  role: 'PARENT',
  ...overrides,
});

export const createTestStudent = (overrides = {}) => ({
  name: faker.person.firstName(),
  gradeLevel: faker.number.int({ min: 1, max: 12 }),
  ...overrides,
});
```

## Debugging Tests

### 1. Playwright Debug Mode

```bash
# Run with UI mode
pnpm test:e2e --ui

# Run with headed browser
pnpm test:e2e --headed

# Debug specific test
pnpm test:e2e --debug user-flows.spec.ts
```

### 2. Test Logs

```typescript
// Add detailed logging
test('should login', async ({ page }) => {
  console.log('Navigating to login page...');
  await page.goto('/login');

  console.log('Filling form...');
  await page.fill('input[name="email"]', 'test@example.com');

  // Take screenshot on failure
  try {
    await page.click('button[type="submit"]');
  } catch (error) {
    await page.screenshot({ path: 'test-failed.png' });
    throw error;
  }
});
```

### 3. Visual Debugging

```typescript
// Enable trace on failure
test.use({
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
});
```

## Performance Testing

### Load Testing (k6)

```javascript
// tests/load/auth.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up
    { duration: '1m', target: 20 }, // Stay at 20 users
    { duration: '30s', target: 0 }, // Ramp down
  ],
};

export default function () {
  const res = http.post('https://vocab-staging.dresponda.com/api/auth/login', {
    email: 'load-test@example.com',
    password: 'Test1234!',
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## Security Testing

### 1. Automated Security Scans

```bash
# Dependency vulnerabilities
pnpm audit

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://vocab-staging.dresponda.com

# SQL injection testing
sqlmap -u "https://vocab-staging.dresponda.com/api/auth/login" \
  --data="email=test&password=test"
```

### 2. Manual Security Tests

- [ ] SQL injection attempts
- [ ] XSS payload tests
- [ ] CSRF token validation
- [ ] Rate limiting verification
- [ ] Authentication bypass attempts
- [ ] Authorization checks

## Continuous Monitoring

### Production Health Checks

```typescript
// apps/api/src/routes/health.ts
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      disk: await checkDiskSpace(),
    },
  };

  const isHealthy = Object.values(health.checks).every((check) => check.ok);
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### Synthetic Monitoring

```bash
# Run E2E tests against production every 5 minutes
# using external monitoring service (Checkly, Datadog, etc.)
```

## Summary of Best Practices

1. **Write Tests First** - TDD helps design better APIs
2. **Fast Feedback** - Unit tests should run in seconds
3. **Realistic E2E** - Test critical user journeys
4. **Automate Everything** - CI/CD for all test types
5. **Clean Data** - Isolated, repeatable tests
6. **Mock Wisely** - Unit tests mock, integration tests don't
7. **Test Errors** - Test failure cases, not just happy paths
8. **Coverage Goals** - Aim for 80%+ coverage
9. **Performance** - Include load/stress testing
10. **Security** - Automated vulnerability scanning

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Vitest Guide](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Supertest](https://github.com/visionmedia/supertest)
- [k6 Load Testing](https://k6.io)
