# Vocab App

AI-powered vocabulary and spelling practice app for students

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose
- Kubernetes cluster (for deployment)

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/desponda/vocab-app.git
   cd vocab-app
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up environment variables:**
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   # Edit .env files with your credentials
   ```

4. **Start local services:**
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations:**
   ```bash
   cd apps/api
   pnpm prisma migrate dev
   ```

6. **Start development servers:**
   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Docs: http://localhost:3001/docs

### DevContainer (Recommended)

Open this project in VS Code and select **"Reopen in Container"** for a fully configured development environment with all dependencies pre-installed.

## Project Structure

```
vocab-app/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Fastify backend
├── packages/
│   ├── ui/               # Shared UI components
│   ├── typescript-config/
│   └── eslint-config/
├── docker/               # Dockerfiles
├── k8s/                  # Kubernetes manifests
├── docs/                 # Documentation
│   ├── plans/            # Implementation plans
│   └── adr/              # Architecture decisions
└── .devcontainer/        # DevContainer config
```

## Tech Stack

- **Frontend:** Next.js 14+, TypeScript, shadcn/ui, Tailwind CSS, TanStack Query
- **Backend:** Fastify, TypeScript, Prisma ORM, PostgreSQL
- **AI:** Claude API (Anthropic)
- **PDF Generation:** Puppeteer
- **Background Jobs:** BullMQ + Redis
- **Deployment:** Docker, Kubernetes, Helm, ArgoCD

## Documentation

- [Claude Code Guide](CLAUDE.md) - AI development best practices
- [Implementation Plan](docs/plans/implementation-plan.md) - Detailed phase-by-phase plan
- [Architecture Decisions](docs/adr/) - ADR records

## License

Private - Not for distribution

---

Built with modern 2026 best practices for AI-assisted development
