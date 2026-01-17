# Claude Code - AI Development Guide

## Project Overview

**Vocab App** - AI-powered vocabulary and spelling practice app for students

This is a production-ready educational application built with modern 2026 best practices, designed for AI-assisted development with Claude Code.

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, shadcn/ui, Tailwind CSS
- **Backend:** Fastify + TypeScript, PostgreSQL + Prisma ORM
- **AI:** Claude API with streaming
- **PDF Generation:** Puppeteer (background jobs)
- **Background Jobs:** BullMQ + Redis
- **Deployment:** Docker → Kubernetes → Helm + ArgoCD
- **Architecture:** Monorepo with pnpm workspaces + Turborepo

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
│   └── adr/              # Architecture Decision Records
├── .devcontainer/        # DevContainer configuration
├── pnpm-workspace.yaml
├── turbo.json
└── CLAUDE.md             # This file
```

## Implementation Phases

See `docs/plans/` for detailed phase-by-phase implementation plans.

**Current Phase:** Phase 1 - Foundation & Authentication

**Phases:**
1. Foundation & Authentication (Week 1-2)
2. File Upload & Storage (Week 3)
3. AI Parsing & Vocabulary Extraction (Week 4-5)
4. Vocabulary Practice Tests (Week 6-7)
5. Spelling Practice & Retry Logic (Week 8)
6. Progress Tracking & Analytics (Week 9-10)
7. PDF Generation & Downloads (Week 11)
8. Production Hardening & Polish (Week 12)

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
pnpm test             # Run all tests
pnpm test:e2e         # Run E2E tests

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

**Infrastructure:**
- `k8s/helm/vocab-app/values.yaml` - Kubernetes configuration
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

**Unit Tests (Vitest):**
- Business logic (auth, validation, calculations)
- Utility functions
- Target: >80% coverage

**Integration Tests (Supertest):**
- API endpoints
- Database operations
- Background jobs

**E2E Tests (Playwright):**
- Critical user flows
- Auth flows
- Test taking workflows

**Manual Testing:**
- AI parsing with real vocabulary sheets
- PDF generation quality
- TTS across browsers

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
lsof -ti:3000 | xargs kill  # Kill process on port 3000
lsof -ti:3001 | xargs kill  # Kill process on port 3001
```

**Prisma client out of sync:**
```bash
cd apps/api
pnpm prisma generate
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

### Staging/Production

Managed via ArgoCD with GitOps workflow.

1. Commit changes to `main` branch
2. GitHub Actions builds and pushes Docker images
3. ArgoCD auto-syncs from GitOps repository
4. Kubernetes rolls out updates

## Resources

- [Phase 1 Plan](docs/plans/phase-1-foundation.md)
- [Prisma Schema](apps/api/prisma/schema.prisma)
- [API Documentation](http://localhost:3001/docs) (when running)
- [Next.js Docs](https://nextjs.org/docs)
- [Fastify Docs](https://fastify.dev/)
- [Prisma Docs](https://www.prisma.io/docs)

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

---

**Last Updated:** 2026-01-17
**Current Phase:** Phase 1 - Foundation & Authentication
