# Claude Code - AI Development Guide

## Project Overview

**Vocab App** - AI-powered vocabulary and spelling practice app for students

This is a production-ready educational application built with modern 2026 best practices, designed for AI-assisted development with Claude Code.

## Tech Stack

- **Frontend:** Next.js 16+ (App Router), TypeScript, shadcn/ui, Tailwind CSS v4
- **Backend:** Fastify + TypeScript, PostgreSQL + Prisma ORM
- **AI:** Claude API with streaming
- **PDF Generation:** Puppeteer (background jobs)
- **Background Jobs:** BullMQ + Redis
- **Testing:** Vitest (unit), Playwright (e2e)
- **CI/CD:** GitHub Actions → Docker → ArgoCD GitOps
- **Deployment:** Docker → Kubernetes → Helm + ArgoCD
- **Architecture:** Monorepo with pnpm workspaces + Turborepo
- **Node.js:** v20.20.0+ required

## Project Structure

```
vocab-app/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Fastify backend
├── packages/
│   ├── ui/               # Shared shadcn/ui components
│   ├── typescript-config/
│   └── eslint-config/
├── docker/
│   ├── web.Dockerfile
│   └── api.Dockerfile
├── k8s/
│   └── helm/
│       └── vocab-app/
├── docs/
│   ├── plans/            # Implementation plans and phases
│   ├── workflows/        # Development workflow guides
│   ├── adr/              # Architecture Decision Records
│   ├── testing-strategy.md
│   └── testing-guide.md
├── .devcontainer/        # DevContainer configuration
├── pnpm-workspace.yaml
├── turbo.json
└── CLAUDE.md             # This file
```

## Implementation Status

**Current Phase:** Phase 1 - Foundation & Authentication (In Progress)

**Completed:**
- ✅ Project structure and monorepo setup
- ✅ Frontend scaffolding (Next.js 16, Tailwind v4)
- ✅ Backend scaffolding (Fastify, Prisma)
- ✅ Authentication system (JWT, login/register)
- ✅ Student management UI
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ Docker build and push workflow
- ✅ ArgoCD GitOps deployment flow
- ✅ Playwright e2e test framework
- ✅ Staging environment (vocab-staging.dresponda.com)

**In Progress:**
- 🔄 E2E test suite (7/15 tests passing, needs refinement)
- 🔄 Auth context and protected routes
- 🔄 Student CRUD operations

**Next Steps:**
1. Complete Phase 1 authentication features
2. Set up file upload infrastructure (Phase 2)
3. Integrate Claude API for vocabulary extraction (Phase 3)

See `docs/plans/implementation-plan.md` for detailed roadmap.

## Development Workflow

### Getting Started

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up Environment:**
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   # Edit .env files with your local credentials
   ```

3. **Start Databases (Docker Compose):**
   ```bash
   docker-compose up -d postgres redis
   ```

4. **Run Migrations:**
   ```bash
   cd apps/api
   pnpm prisma migrate dev
   ```

5. **Start Development Servers:**
   ```bash
   # From root
   pnpm dev
   ```

### Working with Claude Code

**Best Practices for AI-Assisted Development:**

1. **Incremental Changes:**
   - Work on one feature at a time
   - Commit frequently with clear messages
   - Test after each change

2. **Type Safety:**
   - Leverage TypeScript for type inference
   - Share types between frontend/backend in `packages/shared`
   - Use Zod for runtime validation

3. **Testing:**
   - Write tests alongside implementation
   - Unit tests for business logic
   - Integration tests for API endpoints
   - E2E tests for critical user flows

4. **Documentation:**
   - Update `CLAUDE.md` when adding major features
   - Add comments for complex logic
   - Keep `docs/plans/` up to date

5. **Code Review:**
   - Review AI-generated code before committing
   - Ensure security best practices (no secrets, proper validation)
   - Check for performance issues

6. **Pre-Push Workflow:**
   - **ALWAYS** run pre-push checklist before committing (see `docs/workflows/pre-push-checklist.md`)
   - Quick check: `pnpm lint && pnpm build`
   - If K8s changes: `helm template` validation
   - Catch errors locally before CI/staging failures

### Key Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev              # Start all apps
pnpm dev --filter=web # Start frontend only
pnpm dev --filter=api # Start backend only

# Build
pnpm build            # Build all apps
pnpm build --filter=api # Build backend only

# Testing
pnpm test             # Run all unit tests (Vitest)
pnpm test:watch       # Run tests in watch mode

# E2E Testing (Playwright)
cd apps/web
pnpm test:e2e                    # Run all e2e tests
pnpm test:e2e:ui                 # Run with Playwright UI
pnpm test:e2e:headed             # Run in headed mode
BASE_URL=https://vocab-staging.dresponda.com pnpm test:e2e  # Test staging

# Database
cd apps/api
pnpm prisma migrate dev    # Create and apply migration
pnpm prisma studio         # Open Prisma Studio
pnpm prisma generate       # Generate Prisma client

# Linting & Formatting
pnpm lint             # Lint all packages
pnpm format           # Format with Prettier

# Docker
docker-compose up -d  # Start local services (Postgres, Redis)
docker-compose down   # Stop local services

# Deployment
cd k8s/helm/vocab-app
helm install vocab-app . -f values-dev.yaml
```

## Critical Files

### Phase 1 (Current)

**Backend:**
- `apps/api/prisma/schema.prisma` - Database schema
- `apps/api/src/routes/auth.ts` - Authentication endpoints
- `apps/api/src/middleware/auth.ts` - JWT middleware
- `apps/api/src/routes/students.ts` - Student management

**Frontend:**
- `apps/web/app/(auth)/login/page.tsx` - Login page
- `apps/web/app/(auth)/register/page.tsx` - Registration page
- `apps/web/app/(dashboard)/students/page.tsx` - Student management
- `apps/web/contexts/auth-context.tsx` - Authentication context
- `apps/web/tests/e2e/user-flows.spec.ts` - E2E tests

**Infrastructure:**
- `k8s/helm/vocab-app/values.yaml` - Kubernetes configuration (auto-updated by CI)
- `docker/api.Dockerfile` - Backend Docker image
- `docker/web.Dockerfile` - Frontend Docker image
- `.github/workflows/ci.yml` - CI pipeline (lint, test, build)
- `.github/workflows/docker-build.yml` - Docker build and GitOps update

**Testing:**
- `apps/web/vitest.config.ts` - Vitest configuration
- `apps/web/playwright.config.ts` - Playwright configuration
- `docs/testing-strategy.md` - Comprehensive testing guide
- `docs/testing-guide.md` - K8s and staging testing procedures

## Environment Variables

### Backend (`apps/api/.env`)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vocab_app_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# CORS
CORS_ORIGIN=http://localhost:3000

# Claude API
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Environment
NODE_ENV=development
```

### Frontend (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**⚠️ NEVER commit `.env` files to GitHub!**

## Security Checklist

- [ ] No secrets in code or committed files
- [ ] All secrets in Kubernetes Secrets (production)
- [ ] JWT tokens properly secured (HttpOnly cookies for refresh tokens)
- [ ] File uploads validated (magic bytes, not just extensions)
- [ ] Rate limiting on all endpoints
- [ ] SQL injection prevented (Prisma ORM)
- [ ] XSS prevented (React auto-escaping)
- [ ] CSRF protection for state-changing requests

## Testing Strategy

See `docs/testing-strategy.md` for comprehensive testing guidelines.

**Unit Tests (Vitest):**
- Business logic (auth, validation, calculations)
- Utility functions
- React components (with @testing-library/react)
- Target: >80% coverage
- Run with: `pnpm test`

**E2E Tests (Playwright):**
- ✅ **Configured and running** against staging environment
- User authentication flows (registration, login, logout)
- Protected route redirects
- Form validation
- Navigation flows
- API integration
- Responsive design testing
- Run with: `cd apps/web && pnpm test:e2e`
- Staging: `BASE_URL=https://vocab-staging.dresponda.com pnpm test:e2e`

**Integration Tests (Planned):**
- API endpoints with Supertest
- Database operations
- Background jobs

**CI/CD Testing:**
- All PRs must pass: lint, typecheck, unit tests, build
- E2E tests run against staging post-deployment
- See `.github/workflows/ci.yml` for pipeline details

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill  # Kill process on port 3000
lsof -ti:3001 | xargs kill  # Kill process on port 3001
```

**Node.js version mismatch:**
```bash
node --version  # Should be v20.20.0 or higher
# Install Node 20: curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
# Then: apt-get install -y nodejs
```

**Prisma client out of sync:**
```bash
cd apps/api
pnpm prisma generate
```

**pnpm-lock.yaml out of sync:**
```bash
pnpm install  # Regenerates lockfile
git add pnpm-lock.yaml
git commit -m "chore: update pnpm-lock.yaml"
```

**Docker containers not starting:**
```bash
docker-compose down -v  # Remove volumes
docker-compose up -d
```

**Type errors after schema change:**
```bash
cd apps/api
pnpm prisma generate
pnpm build
```

**Playwright browser dependencies missing:**
```bash
cd apps/web
npx playwright install --with-deps chromium
```

**CI failing with frozen-lockfile error:**
```bash
# Lockfile is out of sync with package.json
pnpm install  # Update lockfile locally
git add pnpm-lock.yaml && git commit -m "chore: update lockfile"
```

## Deployment

### Development (Local K8s)

```bash
# Build images
docker build -f docker/web.Dockerfile -t vocab-app-web:dev .
docker build -f docker/api.Dockerfile -t vocab-app-api:dev .

# Deploy with Helm
cd k8s/helm/vocab-app
helm upgrade --install vocab-app . -f values-dev.yaml
```

### Staging/Production - GitOps Workflow

**⚠️ IMPORTANT:** ArgoCD deployment is fully automated via GitOps.

**How it works:**
1. Push code to `main` branch
2. **CI Pipeline** (`.github/workflows/ci.yml`):
   - Runs lint, typecheck, unit tests, build
   - Must pass before Docker build proceeds
3. **Docker Build Pipeline** (`.github/workflows/docker-build.yml`):
   - Builds `web` and `api` Docker images
   - Tags images with commit SHA (e.g., `sha-62076ff`)
   - Pushes to GitHub Container Registry (ghcr.io)
   - **Automatically updates** `k8s/helm/vocab-app/values.yaml` with new image tags
   - Commits changes back to repo
4. **ArgoCD watches** the Git repository:
   - Detects Helm values.yaml changes
   - Auto-syncs to Kubernetes cluster
   - Rolls out new deployments

**Key Files:**
- `k8s/helm/vocab-app/values.yaml` - Updated automatically by CI
- `k8s/helm/vocab-app/values-staging.yaml` - Secrets (not in version control)

**Staging Environment:**
- URL: https://vocab-staging.dresponda.com
- Auto-deploys on every push to `main`
- Run e2e tests: `BASE_URL=https://vocab-staging.dresponda.com pnpm test:e2e`

**Never manually:**
- ❌ Update image tags in values.yaml (CI does this)
- ❌ Run `kubectl rollout restart` (ArgoCD handles deployments)
- ❌ Manually trigger ArgoCD sync (it auto-syncs on Git changes)

## Resources

**Project Documentation:**
- [Implementation Plan](docs/plans/implementation-plan.md) - Full project roadmap
- [Testing Strategy](docs/testing-strategy.md) - Comprehensive testing guide
- [Testing Guide](docs/testing-guide.md) - K8s and staging testing procedures
- [Prisma Schema](apps/api/prisma/schema.prisma) - Database schema

**CI/CD:**
- [CI Workflow](.github/workflows/ci.yml) - Lint, test, build pipeline
- [Docker Build](.github/workflows/docker-build.yml) - Image build and GitOps updates
- [GitHub Actions](https://github.com/desponda/vocab-app/actions) - View pipeline runs

**Environments:**
- Staging: https://vocab-staging.dresponda.com
- Local Dev: http://localhost:3000 (web), http://localhost:3001 (api)

**External Documentation:**
- [Next.js Docs](https://nextjs.org/docs) - Frontend framework
- [Fastify Docs](https://fastify.dev/) - Backend framework
- [Prisma Docs](https://www.prisma.io/docs) - Database ORM
- [Playwright Docs](https://playwright.dev) - E2E testing
- [Vitest Docs](https://vitest.dev) - Unit testing

## Contributing Guidelines

1. Create a feature branch from `main`
2. Make changes incrementally
3. Test thoroughly (unit + integration + E2E)
4. Update documentation if needed
5. Create PR with clear description
6. Wait for review and approval
7. Merge to `main`

## License

Private - Not for distribution

## Quick Start for New Environment

If you're switching environments or onboarding a new developer:

1. **Prerequisites:**
   - Node.js v20.20.0+ (`node --version`)
   - pnpm v8.15.1+ (`pnpm --version`)
   - Docker and Docker Compose

2. **Clone and Setup:**
   ```bash
   git clone https://github.com/desponda/vocab-app.git
   cd vocab-app
   pnpm install
   ```

3. **Environment Files:**
   ```bash
   # Backend
   cp apps/api/.env.example apps/api/.env
   # Edit with your local credentials

   # Frontend (optional for local dev)
   cp apps/web/.env.example apps/web/.env.local
   ```

4. **Start Services:**
   ```bash
   docker-compose up -d postgres redis
   cd apps/api && pnpm prisma migrate dev
   cd ../.. && pnpm dev
   ```

5. **Run Tests:**
   ```bash
   pnpm test              # Unit tests
   cd apps/web && pnpm test:e2e  # E2E tests
   ```

6. **Access:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001
   - Staging: https://vocab-staging.dresponda.com

---

**Last Updated:** 2026-01-18
**Current Phase:** Phase 1 - Foundation & Authentication (In Progress)
**CI Status:** ✅ Passing
**Staging:** ✅ Deployed (auto-deploys on `main` push)
