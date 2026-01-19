# Development Documentation

Guides for developers working on the Vocab App codebase.

## 📚 Available Guides

### [🧪 Testing Strategy](./testing-strategy.md)
Comprehensive testing philosophy and best practices

**Contents:**
- Test categories (unit, integration, E2E)
- Test coverage targets (>80% for critical paths)
- Testing philosophy and when to test
- CI/CD integration
- Mocking strategies

**When to use:** Planning new features, writing tests, understanding test coverage

---

### [🔬 Testing Guide](./testing-guide.md)
Practical guide for running tests locally and against staging

**Contents:**
- Running tests locally (Vitest, Playwright)
- E2E testing against staging
- Kubernetes testing procedures
- Debugging test failures
- Test data management

**When to use:** Running tests, debugging failures, testing against staging

---

### [✅ Pre-Push Checklist](./workflows/pre-push-checklist.md)
**MUST READ** - Required validation before every commit

**Contents:**
- `pnpm pre-push` command (lint + typecheck + test)
- Troubleshooting common failures
- Workflow guide
- CI pipeline alignment

**When to use:** Before every `git push` (mandatory!)

---

## 🚀 Quick Start for Developers

**New to the project?**
1. [Project Overview](../../CLAUDE.md) - Read tech stack and architecture
2. [Development Setup](../../CLAUDE.md#getting-started) - Install dependencies
3. [Pre-Push Checklist](./workflows/pre-push-checklist.md) - **MUST FOLLOW**

**Adding a new feature?**
1. Read [Testing Strategy](./testing-strategy.md) - Plan your tests
2. Write code + tests together (TDD recommended)
3. Run [Pre-Push Checklist](./workflows/pre-push-checklist.md) - Before committing
4. Test against staging with [Testing Guide](./testing-guide.md)

**Fixing a bug?**
1. Write a failing test first (regression test)
2. Fix the bug
3. Verify test passes
4. Run [Pre-Push Checklist](./workflows/pre-push-checklist.md)

---

## 🎯 Common Development Tasks

### Running Tests

**All tests (fast):**
```bash
pnpm pre-push  # Lint + typecheck + unit tests (~15 seconds)
```

**Unit tests only:**
```bash
pnpm test              # Run once
pnpm test:watch        # Watch mode
```

**E2E tests:**
```bash
cd apps/web
pnpm test:e2e                    # Headless (production-like)
pnpm test:e2e:ui                 # With Playwright UI
pnpm test:e2e:headed             # In browser
```

**Staging tests:**
```bash
cd apps/web
BASE_URL=https://vocab-staging.dresponda.com pnpm test:e2e
```

### Fixing CI Failures

CI runs the **exact same checks** as `pnpm pre-push`:

1. **Lint failure:**
   ```bash
   pnpm lint          # See errors
   pnpm lint --fix    # Auto-fix if possible
   ```

2. **Type error:**
   ```bash
   pnpm typecheck     # See errors
   cd apps/api && pnpm prisma generate  # If Prisma types missing
   ```

3. **Test failure:**
   ```bash
   pnpm test          # Run locally
   pnpm test:watch    # Debug in watch mode
   ```

4. **Lockfile out of sync:**
   ```bash
   pnpm install       # Regenerate lockfile
   git add pnpm-lock.yaml && git commit -m "chore: update lockfile"
   ```

### Adding New Tests

**Unit test (Vitest):**
```typescript
// apps/api/src/lib/__tests__/example.test.ts
import { describe, it, expect } from 'vitest';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction(input)).toBe(expected);
  });
});
```

**E2E test (Playwright):**
```typescript
// apps/web/tests/example.spec.ts
import { test, expect } from '@playwright/test';

test('user can do something', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading')).toContainText('Expected');
});
```

---

## 🛠️ Development Workflow

### Standard Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Develop with tests
# Write code + tests together

# 3. Run pre-push validation (REQUIRED)
pnpm pre-push

# 4. Commit if passing
git add .
git commit -m "feat: add my feature"

# 5. Push to GitHub
git push origin feature/my-feature

# 6. Create PR
# CI will run same checks (pnpm pre-push)
```

### CI/CD Pipeline

**On every push to PR:**
1. Lint check (`pnpm lint`)
2. Type check (`pnpm typecheck`)
3. Unit tests (`pnpm test`)
4. Build check (`pnpm build`)

**On merge to main:**
1. All above checks
2. Docker image build
3. Deploy to staging (ArgoCD auto-sync)
4. E2E tests against staging (optional)

**Key Point:** If `pnpm pre-push` passes locally, CI will pass!

---

## 📊 Test Coverage Goals

| Component | Target Coverage | Current Status |
|-----------|----------------|----------------|
| API Routes | >80% | ✅ Good |
| Business Logic | >90% | ✅ Good |
| React Components | >70% | 🟡 In Progress |
| Critical User Flows | 100% (E2E) | ✅ Complete |

---

## 🐛 Debugging Tips

### Debugging Unit Tests

**Use watch mode:**
```bash
pnpm test:watch
```

**Use `.only` for focused testing:**
```typescript
it.only('should test this specific case', () => {
  // Only this test will run
});
```

**Use verbose output:**
```bash
pnpm test --reporter=verbose
```

### Debugging E2E Tests

**Run with Playwright UI:**
```bash
cd apps/web
pnpm test:e2e:ui
```

**Run in headed mode (see browser):**
```bash
pnpm test:e2e:headed
```

**Take screenshots on failure:**
```typescript
test('my test', async ({ page }) => {
  // ... test code
  await page.screenshot({ path: 'debug.png' });
});
```

**Use Playwright trace:**
```bash
pnpm test:e2e --trace on
npx playwright show-trace trace.zip
```

---

## 📝 Code Quality Standards

### TypeScript

- ✅ Use strict mode (enabled by default)
- ✅ No `any` types (use `unknown` if needed)
- ✅ Define interfaces for complex objects
- ✅ Use Zod for runtime validation

### Testing

- ✅ Test behavior, not implementation
- ✅ Write tests alongside code (TDD recommended)
- ✅ Use descriptive test names
- ✅ Mock external dependencies

### Git Commits

- ✅ Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
- ✅ Write clear, concise messages
- ✅ Reference issue numbers: `fix: resolve #123`
- ✅ Keep commits atomic (one logical change)

---

## 🔗 Related Documentation

- [Operations Guides](../operations/) - Deployment and monitoring
- [Architecture Docs](../architecture/) - Design decisions
- [Main Documentation Index](../README.md) - All documentation

---

## 🆘 Getting Help

**CI Failures:**
1. Check [Pre-Push Checklist](./workflows/pre-push-checklist.md#troubleshooting)
2. Run `pnpm pre-push` locally
3. Review CI logs in GitHub Actions

**Test Failures:**
1. Run tests locally in watch mode
2. Check [Testing Guide](./testing-guide.md#troubleshooting)
3. Review test logs and stack traces

**Questions:**
- Create an issue with `question` label
- Ask in team chat
- Review [CLAUDE.md](../../CLAUDE.md) for architecture details

---

**Last Updated:** 2026-01-19
**Owner:** Engineering Team
**Reviewers:** Tech Lead, QA Team
