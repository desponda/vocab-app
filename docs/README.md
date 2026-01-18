# Documentation Index

This directory contains all project documentation organized by topic.

## Quick Links

### Development Workflows
- **[Pre-Push Checklist](workflows/pre-push-checklist.md)** - MUST READ before every commit
  - Lint, build, and Helm template validation
  - Prevents CI/staging failures

### Testing
- **[Testing Strategy](testing-strategy.md)** - Comprehensive testing guide
  - Unit tests (Vitest)
  - E2E tests (Playwright)
  - Integration tests
- **[Testing Guide](testing-guide.md)** - K8s and staging testing procedures

### CI/CD
- **[Workflow Documentation](../.github/workflows/README.md)** - CI/CD pipeline guide
  - Workflow overview and job descriptions
  - Cache strategy and troubleshooting
  - Quick reference for developers

### Project Planning
- **[Implementation Plan](plans/implementation-plan.md)** - Original project roadmap
  - Phase 1: Authentication (✅ Complete)
  - Phase 2-3: Original upload/extraction plan (superseded)
- **[Phase 2 Plan](../home/node/.claude/plans/flickering-wobbling-candy.md)** - Current implementation
  - Week 1: Classroom Management (✅ Complete)
  - Week 2: Vocabulary Upload (MinIO setup)
  - Week 3: Claude Vision API Integration
  - Week 4: Testing & Deployment

### Reference
- **[Architecture Decision Records](adr/)** - Design decisions and rationale

## Documentation Organization

```
docs/
├── README.md                    # This file
├── workflows/                   # Development workflow guides
│   └── pre-push-checklist.md   # Pre-commit validation steps
├── plans/                       # Implementation plans
│   └── implementation-plan.md  # Full project roadmap
├── adr/                         # Architecture Decision Records
├── testing-strategy.md          # Testing approach and best practices
└── testing-guide.md             # K8s and staging testing

.github/workflows/
└── README.md                    # CI/CD workflow documentation
```

## Contributing to Documentation

When adding new documentation:

1. **Place it in the appropriate subdirectory:**
   - `workflows/` - Developer workflow guides
   - `plans/` - Feature implementation plans
   - `adr/` - Architecture decisions

2. **Update this README** to include the new document

3. **Keep docs concise and actionable:**
   - Use examples and code snippets
   - Include "Why this matters" context
   - Add troubleshooting sections

4. **Link from CLAUDE.md** if it's a critical reference for AI-assisted development

---

**Last Updated:** 2026-01-18
