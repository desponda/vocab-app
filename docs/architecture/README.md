# Architecture Documentation

Design decisions, technical specifications, and architectural patterns for the Vocab App.

## 📚 Available Documentation

### [🎨 Design Documents](./designs/)

#### [Test Naming & Assignment UX](./designs/test-naming-and-assignment-ux.md)
Design specification for test creation and assignment user experience

**Contents:**
- Test naming conventions
- Assignment workflow design
- UX patterns and best practices
- User journey mapping

**When to use:** Understanding test creation UX, planning related features

---

## 🏗️ Architecture Overview

### Tech Stack

**Frontend:**
- Next.js 16+ (App Router)
- TypeScript
- shadcn/ui components
- Tailwind CSS v4
- Recharts for data visualization

**Backend:**
- Fastify + TypeScript
- PostgreSQL + Prisma ORM
- Redis + BullMQ (background jobs)
- MinIO (S3-compatible storage)

**AI:**
- Claude 3.5 Sonnet 4 Vision API
- Vocabulary extraction from images
- Multi-type test generation

**Infrastructure:**
- Docker containers
- Kubernetes (Azure)
- Helm charts
- ArgoCD GitOps

### Key Architectural Decisions

#### Monorepo Structure
**Decision:** Use pnpm workspaces + Turborepo for monorepo management

**Rationale:**
- Shared dependencies and configuration
- Parallel build and test execution
- Better code reuse between apps
- Single version control for all components

#### Background Job Processing
**Decision:** Use BullMQ + Redis for asynchronous processing

**Rationale:**
- AI processing can take 30+ seconds
- Rate limiting (2 concurrent, 10/min)
- Retry logic for transient failures
- Job queue persistence

#### Image Compression
**Decision:** Client-side compression before upload + server-side validation

**Rationale:**
- Claude API has 5MB limit for images
- Users may upload 25MB+ images
- Compression reduces processing time
- Quality/resize balances file size and readability

#### Multi-Type Test Generator
**Decision:** Single vocabulary sheet can generate multiple test types

**Rationale:**
- Teachers want variety (vocabulary, spelling, general knowledge)
- Single upload can create multiple assessments
- Enum-based type system for extensibility
- Nullable foreign keys for flexibility

---

## 🎯 Design Principles

### 1. Security First
- No secrets in code or committed files
- JWT tokens with HttpOnly cookies
- File upload validation (magic bytes)
- Rate limiting on all endpoints
- Kubernetes pod security contexts

### 2. Observability
- Structured logging (Pino)
- Error tracking (Sentry)
- Health checks (liveness + readiness)
- Performance monitoring
- Audit trails for sensitive operations

### 3. Reliability
- Automated backups (daily PostgreSQL + MinIO)
- Pod Disruption Budgets for zero-downtime
- Database connection pooling
- Retry logic for transient failures
- Circuit breakers for external APIs

### 4. Developer Experience
- TypeScript strict mode
- Pre-push validation (`pnpm pre-push`)
- Comprehensive testing (unit + E2E)
- Clear documentation
- AI-assisted development (CLAUDE.md)

### 5. User Experience
- Responsive design (mobile-first)
- Loading states and error handling
- Accessibility (ARIA labels, keyboard nav)
- Clear feedback and error messages
- Professional UI with shadcn/ui

---

## 🔄 Data Flow Diagrams

### Vocabulary Upload & Test Generation Flow

```
┌──────────┐
│ Teacher  │
│ Uploads  │
│ Image    │
└────┬─────┘
     │
     ▼
┌──────────────────┐
│ Image Compression│ (Client)
│ Quality: 85%     │
│ Max: 2000x2000   │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Upload to MinIO  │ (API)
│ Generate Job ID  │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ BullMQ Queue     │
│ Background Job   │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Claude Vision API│ (Worker)
│ Extract Words    │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Test Generation  │
│ 3-10 Variants    │
│ Multiple Types   │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Save to Database │
│ Update Status    │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Notify Teacher   │
│ Tests Ready      │
└──────────────────┘
```

### Test Assignment & Taking Flow

```
┌──────────┐
│ Teacher  │
│ Assigns  │
│ Tests    │
└────┬─────┘
     │
     ▼
┌──────────────────┐
│ Bulk Assignment  │
│ By Classroom     │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Student Dashboard│
│ Shows Assigned   │
│ Tests            │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Student Takes    │
│ Test (1Q at time)│
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Auto-Grading     │
│ Immediate Results│
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│ Teacher Views    │
│ Results & Stats  │
└──────────────────┘
```

---

## 📊 Database Schema Highlights

### Core Models

- **User** - Teachers and students with role-based access
- **Classroom** - 6-character unique codes for enrollment
- **VocabularySheet** - Uploaded worksheets with processing status
- **Word** - Extracted vocabulary with definitions and examples
- **Test** - Generated tests (3-10 variants per sheet)
- **TestQuestion** - Individual questions with correct answers
- **TestAttempt** - Student submissions with auto-grading
- **StudentAnswer** - Individual question responses

### Key Relationships

- One VocabularySheet → Many Words (extracted from image)
- One VocabularySheet → Many Tests (3-10 variants)
- One Test → Many TestQuestions (5-10 questions)
- One Test → Many TestAttempts (one per student)
- One TestAttempt → Many StudentAnswers (one per question)

---

## 🔐 Security Architecture

### Authentication
- JWT access tokens (15 min expiry)
- JWT refresh tokens (7 days expiry, HttpOnly cookie)
- Password hashing (bcrypt)
- Rate limiting on auth endpoints

### Authorization
- Role-based access control (TEACHER, STUDENT)
- Resource ownership checks
- Classroom enrollment verification

### Data Protection
- Kubernetes Secrets for sensitive data
- TLS/HTTPS everywhere
- Database connection encryption
- MinIO bucket policies

---

## 🚀 Deployment Architecture

### GitOps Workflow

```
┌──────────────┐
│ Git Push     │
│ to main      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ GitHub       │
│ Actions CI   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Docker Build │
│ Push to GHCR │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Update       │
│ values.yaml  │
│ with new tag │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ ArgoCD       │
│ Auto-Sync    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Rolling      │
│ Deployment   │
│ (Zero-Down)  │
└──────────────┘
```

### Kubernetes Resources

- **Deployments**: API, Web (2 replicas each)
- **StatefulSets**: PostgreSQL, Redis
- **MinIO Tenant**: Object storage (managed by operator)
- **Services**: ClusterIP for internal communication
- **Ingress**: Cloudflare Tunnel for external access
- **CronJobs**: Daily backups (database + MinIO)
- **Jobs**: Secret generators (Helm hooks)

---

## 🔗 Related Documentation

- [Operations Guides](../operations/) - Deployment and monitoring
- [Development Guides](../development/) - Testing and workflows
- [Main Documentation Index](../README.md) - All documentation

---

## 📝 Contributing to Architecture Docs

### When to Create Architecture Docs

Create architecture documentation for:
- ✅ Major design decisions (ADRs)
- ✅ System-wide changes (data model, API design)
- ✅ Complex feature specifications
- ✅ Integration patterns
- ✅ Performance optimizations

### Architecture Document Template

```markdown
# [Feature Name] Architecture

## Problem Statement
[What problem are we solving?]

## Proposed Solution
[High-level solution approach]

## Design Details
[Technical implementation details]

## Alternatives Considered
[What other options were evaluated?]

## Decision
[Final decision and rationale]

## Consequences
[Trade-offs and implications]

## Related Documentation
[Links to relevant docs]

---

**Author:** [Name]
**Reviewers:** [Names]
**Status:** [Draft/Approved/Implemented]
**Last Updated:** YYYY-MM-DD
```

---

**Last Updated:** 2026-01-19
**Owner:** Engineering Team, Architecture Team
**Reviewers:** Tech Lead, CTO
