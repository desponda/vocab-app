# Vocab App - Environment Handoff Guide

**Last Updated:** 2026-01-18  
**Environment:** Production-ready staging deployment

## 🎯 Current State

### ✅ What's Working
- **Build System:** Passing on all platforms (local + CI)
- **CI/CD Pipeline:** Fully automated GitHub Actions → Docker → ArgoCD
- **Staging Deployment:** Auto-deploys at https://vocab-staging.dresponda.com
- **E2E Tests:** 7/15 Playwright tests passing (needs refinement to match actual UI)
- **GitOps:** ArgoCD automatically deploys when image tags change in Helm values

### 🔄 What's In Progress
- E2E test suite needs updates to match actual UI implementation
- Student CRUD operations (UI exists, backend needs completion)
- Protected routes and auth context refinement

## 🚀 Quick Start (New Environment)

```bash
# 1. Clone and install
git clone https://github.com/desponda/vocab-app.git
cd vocab-app
pnpm install  # Requires Node.js v20.20.0+

# 2. Set up environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Edit .env files with your credentials

# 3. Start services
docker-compose up -d postgres redis
cd apps/api && pnpm prisma migrate dev
cd ../.. && pnpm dev

# 4. Run tests
pnpm test                    # Unit tests
cd apps/web && pnpm test:e2e # E2E tests
```

## 📋 Key Files to Know

### Documentation (READ FIRST)
- `CLAUDE.md` - Complete AI development guide
- `docs/testing-strategy.md` - Testing best practices
- `docs/testing-guide.md` - K8s and staging testing

### Infrastructure
- `.github/workflows/ci.yml` - CI pipeline (lint, test, build)
- `.github/workflows/docker-build.yml` - Docker build + GitOps automation
- `k8s/helm/vocab-app/values.yaml` - Auto-updated by CI (DON'T EDIT MANUALLY)

### Testing
- `apps/web/tests/e2e/user-flows.spec.ts` - E2E test suite
- `apps/web/playwright.config.ts` - Playwright config
- `apps/web/vitest.config.ts` - Vitest config (excludes e2e tests)

## 🔧 Common Commands

```bash
# Development
pnpm dev                              # Start all services
pnpm build                            # Build all packages

# Testing
pnpm test                             # Unit tests
cd apps/web && pnpm test:e2e         # E2E tests locally
BASE_URL=https://vocab-staging.dresponda.com pnpm test:e2e  # E2E against staging

# Database
cd apps/api
pnpm prisma migrate dev              # Create migration
pnpm prisma studio                   # Open Prisma Studio
pnpm prisma generate                 # Regenerate Prisma client

# CI/CD
git push origin main                 # Triggers CI → Docker build → ArgoCD deploy
gh run list                          # View GitHub Actions runs
gh run watch <run-id>                # Watch a specific run
```

## ⚠️ Important Notes

### GitOps Deployment
**NEVER manually update `k8s/helm/vocab-app/values.yaml` image tags!**

The automated flow is:
1. Push to `main` → CI runs
2. CI passes → Docker images built with SHA tags
3. GitHub Actions **automatically updates** values.yaml with new tags
4. ArgoCD detects values.yaml change → deploys to K8s

### Node.js Version
**Requires Node.js v20.20.0+**
```bash
node --version  # Must show v20.x.x
```

If you need to upgrade:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

### pnpm Lockfile
If CI fails with "frozen-lockfile" error:
```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: update pnpm-lock.yaml"
git push origin main
```

## 🧪 Testing Against Staging

```bash
# From apps/web directory
BASE_URL=https://vocab-staging.dresponda.com pnpm test:e2e --project=chromium

# Expected: 7/15 tests passing
# The 8 failing tests need selector/logic updates to match the actual UI
```

## 🐛 Troubleshooting

### Build fails with Node version error
```bash
node --version  # Check version
# If < 20.x.x, install Node 20 (see above)
```

### Playwright errors about missing dependencies
```bash
cd apps/web
npx playwright install --with-deps chromium
```

### Type errors after pulling latest
```bash
cd apps/api
pnpm prisma generate
cd ../..
pnpm build
```

### Docker containers won't start
```bash
docker-compose down -v  # Remove volumes
docker-compose up -d
```

## 📊 CI/CD Status

Check pipeline status:
- **GitHub Actions:** https://github.com/desponda/vocab-app/actions
- **Latest CI Run:** Should be ✅ passing
- **Latest Docker Build:** Should be ✅ passing
- **Staging:** https://vocab-staging.dresponda.com

## 🔐 Secrets & Environment Variables

### Local Development
Set in `apps/api/.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_ACCESS_SECRET` - Generate with `openssl rand -base64 32`
- `JWT_REFRESH_SECRET` - Generate with `openssl rand -base64 32`
- `ANTHROPIC_API_KEY` - Claude API key (optional for Phase 1)

### Staging/Production
Managed in Kubernetes Secrets (see `k8s/helm/vocab-app/values-staging.yaml`)

## 🎯 Next Steps

1. **Refine E2E tests** - Update selectors and expectations to match actual UI
2. **Complete student CRUD** - Finish backend endpoints for student management
3. **Auth refinement** - Improve protected routes and error handling
4. **Start Phase 2** - File upload infrastructure

## 📞 Getting Help

- **Project Docs:** Read `CLAUDE.md` thoroughly
- **Testing Docs:** See `docs/testing-strategy.md`
- **CI Logs:** `gh run view <run-id> --log`
- **Staging Logs:** Check ArgoCD or kubectl logs

---

**Environment Ready:** ✅ You can start developing immediately  
**CI/CD:** ✅ Fully automated  
**Staging:** ✅ Auto-deploys on push to main
