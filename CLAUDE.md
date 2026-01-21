# Claude Code - AI Development Guide

## Project Overview

**Vocab App** - AI-powered vocabulary and spelling practice app for students

This is a production-ready educational application built with modern 2026 best practices, designed for AI-assisted development with Claude Code.

## Tech Stack

- **Frontend:** Next.js 16+ (App Router), TypeScript, shadcn/ui, Tailwind CSS v4, Recharts
- **Backend:** Fastify + TypeScript, PostgreSQL + Prisma ORM
- **AI:** Claude 3.5 Sonnet 4 with Vision API (vocabulary extraction from images)
- **File Storage:** MinIO (S3-compatible object storage)
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
│   ├── testing-strategy.md
│   ├── testing-guide.md
│   ├── user-guides/
│   └── workflows/
├── .devcontainer/        # DevContainer configuration
├── pnpm-workspace.yaml
├── turbo.json
└── CLAUDE.md             # This file
```

## Implementation Status

**Current Phase:** ✅ **Phase 8 (Test Creation Wizard)** - Phases 1-5.2 complete, wizard is functional!

### Core Features (✅ COMPLETE)

**Phase 1 - Foundation & Authentication:**
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

**Phase 2 - Classroom Management:**
- ✅ Database schema with 10 models (Classroom, VocabularySheet, Test, etc.)
- ✅ Classroom code generation (unique 6-char codes)
- ✅ Classroom backend API (CRUD + student enrollment)
- ✅ Classroom frontend UI (create, list, display codes)
- ✅ Student enrollment via classroom codes
- ✅ 5-tab classroom command center (Overview, Students, Tests, Results, Settings)
- ✅ Performance charts with Recharts

**Phase 3 - Vocabulary Upload & AI Processing:**
- ✅ MinIO S3-compatible storage with secure credentials
- ✅ Claude Vision API integration for vocabulary extraction
- ✅ Image compression (handles 25MB+ files, compresses to <4MB for Claude API)
- ✅ BullMQ job queue for background processing
- ✅ Background worker with rate limiting (2 concurrent, 10/min)
- ✅ Test generation (3-10 variants per sheet with varied question types)
- ✅ PDF to image conversion support
- ✅ Error handling and status updates
- ✅ Grade level tracking (1-12) for age-appropriate tests
- ✅ Test question option randomization (Fisher-Yates shuffle)

**Phase 4 - Test Assignment & Taking:**
- ✅ Bulk test assignment by vocabulary sheet
- ✅ Test preview dialog for teachers
- ✅ Student test-taking interface (one question at a time)
- ✅ Multiple choice, fill-in-blank, and spelling question types
- ✅ Test submission and auto-grading
- ✅ Results viewing with detailed answers

**Phase 5 - UI Redesign (6-Week Plan):**
- ✅ Week 1: Foundation & backend API enhancements
- ✅ Week 2: Dashboard layout redesign
- ✅ Week 3: Classrooms redesign (5-tab command center)
- ✅ Week 4: Vocabulary Library, Students, Student Dashboard
- ✅ Week 5: Visual polish, mobile optimization, accessibility
  - Typography & spacing system (8px grid)
  - Mobile-responsive tables (smart column hiding)
  - ARIA labels and keyboard navigation
- ✅ Student test grouping by vocabulary list with statistics
- ✅ Performance charts in Results tab
- ✅ Test preview functionality

**Phase 6 - Analytics & Reporting:**
- ✅ Teacher dashboard with stats (students, classrooms, vocabulary)
- ✅ Student dashboard with progress tracking
- ✅ Test results table with performance charts
- ✅ Vocabulary-based statistics for students
- ✅ Score-based color coding (green/yellow/red badges)
- ✅ Activity feed on classroom overview
- ✅ Student detail page with individual test results
- ✅ Clickable student rows for drill-down navigation
- ✅ Classroom editing (inline editing of name and grade level)
- ✅ Grade level selection for vocabulary uploads (affects test difficulty)

**Phase 7 - Multi-Type Test Generator (Phase 1 - Spelling Tests):**
- ✅ TestType enum (VOCABULARY, SPELLING, GENERAL_KNOWLEDGE)
- ✅ Database schema updates (nullable Test.sheetId and TestQuestion.wordId)
- ✅ Spelling test question generator with grade-level appropriate misspellings
- ✅ Test type selector in upload dialog
- ✅ Test type routing in background job processor
- ✅ Test type badges and filters in vocabulary library
- ✅ Backend API support for testType parameter
- ✅ Frontend API client integration
- ✅ Backward compatibility with existing vocabulary tests
- ✅ Multiple choice spelling format (4 options: 1 correct, 3 plausible misspellings)

**Phase 8 - Test Creation Wizard (Professional UX Transformation):**
- ✅ Phase 1: UI rebrand ("Vocabulary" → "Tests" throughout app)
- ✅ Phase 2: Sonner toast notification system integration
- ✅ Phase 3: Wizard infrastructure (context, state, progress, navigation)
- ✅ Phase 4: Complete 5-step wizard implementation
  - Step 1: Test Type Selection (card-based UI with help modal)
  - Step 2: File Upload (drag-drop with context-aware guidance)
  - Step 3: Configuration (auto-generated names, grade levels, variants slider, advanced options)
  - Step 4: Review & Confirm (summary with estimated time)
  - Step 5: Processing & Success (real-time progress, auto-close countdown)
- ✅ Phase 5: Backend integration and edge cases (Phases 5.1-5.2)
  - Real file upload with progress tracking (0-100%)
  - Status polling every 2 seconds during processing
  - "Use All Words" mode for spelling tests (skip AI extraction)
  - Browser protection during upload (beforeunload event)
  - Success/error toast notifications
  - Database schema: added `useAllWords` field
- ⏳ Phase 5.3: Enhanced error handling (optional polish)
  - Content mismatch detection
  - Empty extraction error messages
  - Network error recovery with exponential backoff
- ⏳ Phase 6: Enhanced user guidance (optional)
- ⏳ Phase 7: Testing & polish (optional)

### Tech Highlights

**AI & Image Processing:**
- Claude 3.5 Sonnet 4 Vision API for vocabulary extraction
- Multi-type test generation (Vocabulary, Spelling, General Knowledge)
- Grade-level appropriate spelling question generation with plausible misspellings
- Automatic image compression (quality reduction + resizing)
- Handles images up to 25MB+ (compresses to <4MB)
- PDF to image conversion with sharp
- Background job processing with BullMQ

**UI/UX:**
- Professional 5-step test creation wizard (modal on desktop, full-screen on mobile)
- Real-time upload progress tracking (0-100%)
- Context-aware guidance for each test type
- Auto-generated test names from filenames
- Fully responsive design (mobile-first)
- Dark mode support
- Accessibility (ARIA labels, keyboard navigation)
- Loading states and error handling
- Empty states with helpful CTAs
- Real-time progress indicators
- Toast notifications with Sonner

**Testing:**
- E2E tests with Playwright (vocab upload, user flows)
- Unit tests with Vitest
- Integration tests for APIs
- CI pipeline with lint, typecheck, build, test

**DevOps:**
- GitOps workflow (ArgoCD auto-syncs on git changes)
- Auto-deploy to staging on every push to main
- Docker multi-stage builds
- Kubernetes deployment with Helm
- GitHub Actions CI/CD

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
   docker-compose up -d postgres redis minio
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
   - Share types between frontend/backend via Zod schemas
   - Use Zod for runtime validation

3. **Testing:**
   - Write tests alongside implementation
   - Unit tests for business logic
   - Integration tests for API endpoints
   - E2E tests for critical user flows

4. **Documentation:**
   - Update `CLAUDE.md` when adding major features
   - Add comments for complex logic
   - Keep user guides up to date

5. **Code Review:**
   - Review AI-generated code before committing
   - Ensure security best practices (no secrets, proper validation)
   - Check for performance issues

6. **Pre-Push Checklist (MANDATORY):**

   **⚠️ Run this BEFORE every `git push`:**

   ```bash
   pnpm pre-push
   ```

   This single command runs:
   - ✅ Lint check (ESLint across all packages)
   - ✅ Type check (TypeScript compilation without emitting)
   - ✅ Unit tests (Vitest across all packages)

   These are the EXACT same checks that run in CI. If `pnpm pre-push` passes, CI will pass.

   **Note on tests:**
   - Unit tests run without external dependencies (always pass if code is correct)
   - Integration tests require database/Redis (will be skipped if not running)
   - To run integration tests: `docker-compose up -d postgres redis minio`
   - If integration tests fail due to missing services, unit tests still validate your changes

   **Special cases:**

   ```bash
   # If Prisma schema changed:
   cd apps/api && pnpm prisma generate

   # If dependencies added/updated:
   pnpm install
   git add pnpm-lock.yaml
   ```

   **📖 Full documentation:** See [Pre-Push Checklist](docs/workflows/pre-push-checklist.md) for detailed troubleshooting and workflow guide.

   **Why this is critical:**
   - Prevents CI failures that waste time (3-5 min per failure)
   - Catches issues locally in ~15 seconds
   - Ensures tests pass before code review
   - Validates lockfile is in sync with package.json

   **If `pnpm pre-push` fails:**
   - ❌ DO NOT push
   - ✅ Read the error message
   - ✅ Fix the issue
   - ✅ Run `pnpm pre-push` again
   - ✅ Repeat until it passes

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

# Pre-Push Validation (RUN BEFORE EVERY PUSH)
pnpm pre-push              # Run lint + typecheck + test (same as CI)
pnpm validate              # Alias for pre-push
pnpm lint                  # Lint only
pnpm typecheck             # Type check only
pnpm test                  # Tests only

# Docker
docker-compose up -d       # Start local services (Postgres, Redis, MinIO)
docker-compose down        # Stop local services

# Deployment
cd k8s/helm/vocab-app
helm upgrade --install vocab-app . -f values-staging.yaml
```

## Critical Files

### Frontend

**Pages:**
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` - Teacher dashboard
- `apps/web/src/app/(dashboard)/classrooms/[id]/page.tsx` - 5-tab classroom command center with inline editing
- `apps/web/src/app/(dashboard)/vocabulary/page.tsx` - Vocabulary library
- `apps/web/src/app/(dashboard)/students/page.tsx` - All students view with clickable rows
- `apps/web/src/app/(dashboard)/students/[studentId]/page.tsx` - Individual student detail page with test results
- `apps/web/src/app/student-dashboard/page.tsx` - Student dashboard with test grouping
- `apps/web/src/app/student-dashboard/tests/[testId]/page.tsx` - Test-taking interface

**Components:**
- `apps/web/src/components/classroom/performance-chart.tsx` - Recharts performance viz
- `apps/web/src/components/classroom/test-preview-dialog.tsx` - Test preview modal
- `apps/web/src/components/classroom/activity-feed.tsx` - Activity timeline
- `apps/web/src/components/dashboard/stat-card.tsx` - Stat display card
- `apps/web/src/components/vocabulary/upload-vocabulary-dialog.tsx` - Upload modal

**API Client:**
- `apps/web/src/lib/api.ts` - Centralized API client with Zod schemas

### Backend

**API Routes:**
- `apps/api/src/routes/auth.ts` - Authentication endpoints
- `apps/api/src/routes/classrooms.ts` - Classroom CRUD + test attempts
- `apps/api/src/routes/students.ts` - Student management + enriched data
- `apps/api/src/routes/tests.ts` - Test CRUD, assignment, submission
- `apps/api/src/routes/vocabulary-sheets.ts` - Upload + processing

**AI & Jobs:**
- `apps/api/src/lib/claude.ts` - Claude API integration with image compression
- `apps/api/src/jobs/process-vocabulary-sheet.ts` - Background job for vocabulary extraction
- `apps/api/src/lib/minio.ts` - MinIO S3 storage client

**Database:**
- `apps/api/prisma/schema.prisma` - Full database schema

### Infrastructure

**CI/CD:**
- `.github/workflows/ci.yml` - Lint, test, build pipeline
- `.github/workflows/docker-build.yml` - Docker build + GitOps update

**Deployment:**
- `k8s/helm/vocab-app/values.yaml` - Kubernetes config (auto-updated by CI)
- `docker/api.Dockerfile` - Backend Docker image
- `docker/web.Dockerfile` - Frontend Docker image

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

# MinIO S3 Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET_NAME=vocabulary-sheets

# Environment
NODE_ENV=development
```

### Frontend (`apps/web/.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**⚠️ NEVER commit `.env` files to GitHub!**

## Security Checklist

- [x] No secrets in code or committed files
- [x] All secrets in Kubernetes Secrets (production)
- [x] JWT tokens properly secured (HttpOnly cookies for refresh tokens)
- [x] File uploads validated (magic bytes, not just extensions)
- [x] Rate limiting on all endpoints
- [x] SQL injection prevented (Prisma ORM)
- [x] XSS prevented (React auto-escaping)
- [x] Image size limits with automatic compression
- [x] ARIA labels for accessibility
- [x] CORS configured properly

## Testing Strategy

See `docs/testing-strategy.md` for comprehensive testing guidelines.

**Unit Tests (Vitest):**
- Business logic (auth, validation, calculations)
- Utility functions
- React components
- Target: >80% coverage
- Run with: `pnpm test`

**E2E Tests (Playwright):**
- ✅ Configured and running against staging
- User authentication flows
- Vocabulary upload and processing
- Test-taking interface
- Classroom management
- Run with: `cd apps/web && pnpm test:e2e`
- Staging: `BASE_URL=https://vocab-staging.dresponda.com pnpm test:e2e`

**Integration Tests:**
- API endpoints
- Database operations
- Background jobs

**CI/CD Testing:**
- All PRs must pass: lint, typecheck, unit tests
- E2E tests run against staging post-deployment
- See `.github/workflows/ci.yml` for pipeline details

## Known Issues & Limitations

**Image Processing:**
- Claude API has 5MB limit for base64-encoded images
- We compress images automatically (quality + resize)
- Very large images (>25MB) may still fail if compression can't get below 4MB
- PDF conversion requires sharp (works for most PDFs, some may fail)

**Build Times:**
- Next.js production builds can timeout in CI (3min limit)
- Workaround: Builds run in Docker separately
- Local builds work fine

**Lint Warnings:**
- 9 pre-existing warnings (unused vars in old code)
- No errors, safe to ignore
- Fix when touching those files

**Recent Fixes:**
- ✅ Performance chart visibility in dark mode (CSS variables don't work in SVG - use explicit hex colors)
- ✅ Student data showing zero tests (status filter was checking 'GRADED' instead of 'SUBMITTED')
- ✅ Test attempts authorization (now checks classroom enrollment instead of user ID match)

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

**Image upload failing with 5MB error:**
- Images are automatically compressed to <4MB
- If still failing, the image might be corrupted
- Try converting to JPEG first: `convert input.png -quality 85 output.jpg`

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
   - Runs lint, typecheck, unit tests
   - Must pass before Docker build proceeds
3. **Docker Build Pipeline** (`.github/workflows/docker-build.yml`):
   - Builds `web` and `api` Docker images
   - Tags images with commit SHA (e.g., `sha-e8191b1`)
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

**📚 Project Documentation:**
- [Documentation Index](docs/README.md) - **Start here** for all documentation
- [Development Guides](docs/development/) - Testing, workflows, pre-push checklist
- [Operations Guides](docs/operations/) - Monitoring, backups, DR, secrets, security
- [Architecture Docs](docs/architecture/) - Design decisions and technical specs
- [User Guides](docs/user-guides/) - End-user documentation

**🔑 Critical Docs (Must Read):**
- [Pre-Push Checklist](docs/development/workflows/pre-push-checklist.md) - **REQUIRED** before commits
- [Testing Strategy](docs/development/testing-strategy.md) - Testing philosophy
- [Disaster Recovery Plan](docs/operations/disaster-recovery-plan.md) - Emergency procedures
- [Secrets Management](docs/operations/secrets-management-guide.md) - Security procedures
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
- [Recharts Docs](https://recharts.org) - Charts and graphs
- [Claude API Docs](https://docs.anthropic.com) - AI integration

## Contributing Guidelines

1. Create a feature branch from `main`
2. Make changes incrementally
3. Test thoroughly (unit + integration + E2E)
4. Run pre-push checklist
5. Update documentation if needed
6. Create PR with clear description
7. Wait for CI to pass
8. Merge to `main`

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
   # Edit with your local credentials (Postgres, Redis, MinIO, Claude API)

   # Frontend (optional for local dev)
   cp apps/web/.env.example apps/web/.env.local
   ```

4. **Start Services:**
   ```bash
   docker-compose up -d postgres redis minio
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
   - MinIO Console: http://localhost:9001
   - Staging: https://vocab-staging.dresponda.com

---

**Last Updated:** 2026-01-19
**Status:** ✅ Production Ready
**CI Status:** ✅ Passing
**Staging:** ✅ Deployed (auto-deploys on `main` push)
**Version:** Phase 7 (Multi-Type Test Generator) - Spelling Tests Support + Test Type Selection + Backward Compatible
