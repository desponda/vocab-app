# Pre-Push Checklist

**ALWAYS run these commands locally BEFORE committing and pushing:**

## 1. Lint Check
```bash
pnpm lint
```
**What it catches:**
- Unused variables
- Type errors in code
- React hooks dependency issues
- ESLint violations

**Expected:** Warnings are OK (document them), but no errors.

---

## 2. TypeScript Build
```bash
pnpm build
```
**What it catches:**
- TypeScript compilation errors
- Type mismatches
- Missing imports
- Invalid configurations

**Expected:** Must complete successfully for both API and Web.

---

## 3. Unit Tests (when available)
```bash
pnpm test
```
**What it catches:**
- Broken business logic
- Regression bugs
- Component failures

**Expected:** All tests pass.

---

## 4. Quick Commit Checklist

Before `git push`:

- [ ] `pnpm lint` - passes (warnings OK if documented)
- [ ] `pnpm build` - completes successfully
- [ ] `pnpm test` - all tests pass (when tests exist)
- [ ] No `console.log` debugging left in code (unless intentional)
- [ ] No secrets or credentials in code
- [ ] `.env` files are NOT committed
- [ ] Only source files staged (no test artifacts, build outputs)

---

## 5. E2E Tests (After Deployment)

After pushing and ArgoCD deploys to staging:

```bash
cd apps/web
BASE_URL=https://vocab-staging.dresponda.com pnpm test:e2e
```

**What it catches:**
- Integration issues
- Deployment configuration problems
- Real-world user flow bugs

---

## Common Mistakes to Avoid

1. **Forgetting to build** - TypeScript errors won't show in lint
2. **Not checking all workspaces** - Both API and Web must build
3. **Skipping tests** - Broken tests = broken features
4. **Pushing test artifacts** - Check `git status` before commit
5. **Missing environment variables** - Verify `.env.example` is up to date

---

## Quick Reference

```bash
# Full pre-push check (run this every time)
pnpm lint && pnpm build && pnpm test

# If all pass, then:
git add <files>
git commit -m "message"
git push origin main
```

---

**Remember:** CI failures cost time waiting for builds. 2 minutes locally saves 10 minutes in CI.
