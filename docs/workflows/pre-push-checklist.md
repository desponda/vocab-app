# Pre-Push Checklist

## TL;DR - Run This Before Every Push

```bash
pnpm pre-push
```

That's it! This single command runs all the checks that CI will run, ensuring your push will pass.

---

## What It Does

The `pnpm pre-push` command runs the following checks in parallel:

1. **Lint** - Code style and quality checks (ESLint)
2. **Type Check** - TypeScript compilation without emitting files
3. **Unit Tests** - All Vitest unit tests across packages

These are the exact same checks that run in CI, so if `pnpm pre-push` passes, CI will pass.

---

## Full Workflow

### 1. Make Your Changes

Write code, add features, fix bugs, etc.

### 2. Run Pre-Push Validation

```bash
pnpm pre-push
```

**Expected output:**
```bash
Tasks:    6 successful, 6 total
Cached:    3 cached, 6 total
  Time:    15.2s
```

### 3. If Pre-Push Fails

#### Lint Errors

```bash
# See detailed lint errors
pnpm lint

# Common fixes:
# - Remove unused imports/variables
# - Fix ESLint rule violations
# - Escape quotes in JSX ('apostrophes' → &apos;)
```

#### Type Errors

```bash
# Check web types
cd apps/web && pnpm typecheck

# Check API types
cd apps/api && pnpm typecheck

# Common fixes:
# - Fix type mismatches
# - Add missing imports
# - Regenerate Prisma client if schema changed:
cd apps/api && pnpm prisma generate
```

#### Test Failures

```bash
# Run tests with details
pnpm test

# Run tests in watch mode for debugging
cd apps/web && pnpm test:watch
cd apps/api && pnpm test:watch

# Common fixes:
# - Update test assertions
# - Fix broken logic
# - Mock external dependencies
```

### 4. Commit and Push

```bash
git add -A
git commit -m "Your commit message

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
git push
```

---

## Individual Commands

If you want to run checks individually:

```bash
# Lint only
pnpm lint

# Type check only
pnpm typecheck

# Tests only
pnpm test

# All three (same as pre-push)
pnpm validate
```

---

## Quick Reference

**Before EVERY push:**
```bash
pnpm pre-push
```

**If Prisma schema changed:**
```bash
cd apps/api && pnpm prisma generate
```

**If dependencies added:**
```bash
pnpm install
git add pnpm-lock.yaml
```

---

**Last Updated:** 2026-01-19
