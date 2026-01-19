# Vocab App Documentation

Welcome to the Vocab App documentation! This guide will help you find what you need quickly.

## 📚 Documentation Structure

### [👨‍💻 Development](./development/)
Guides for developers working on the codebase
- [Testing Strategy](./development/testing-strategy.md) - Comprehensive testing approach
- [Testing Guide](./development/testing-guide.md) - How to run tests
- [Pre-Push Checklist](./development/workflows/pre-push-checklist.md) - **Must-follow before commits**

### [⚙️ Operations](./operations/)
Guides for DevOps/SRE and system administrators
- [Monitoring Guide](./operations/monitoring-guide.md) - Observability and alerting
- [Backup & Restore](./operations/backup-restore-guide.md) - Database and file backups
- [Disaster Recovery Plan](./operations/disaster-recovery-plan.md) - DR procedures and runbooks
- [Secrets Management](./operations/secrets-management-guide.md) - Secret rotation and security
- [Kubernetes Security](./operations/kubernetes-security-hardening.md) - Pod security and hardening
- [MinIO Backup Guide](./operations/minio-backup-guide.md) - Object storage backups

### [🏗️ Architecture](./architecture/)
Design decisions and technical specifications
- [Test Naming & Assignment UX](./architecture/designs/test-naming-and-assignment-ux.md)

### [📖 User Guides](./user-guides/)
Documentation for end users (teachers and students)
- [Test Taking Guide](./user-guides/test-taking-student-teacher-guide.md)

---

## 🚀 Quick Start

**New to the project?** Start here:
1. [Project Overview](../CLAUDE.md) - Tech stack, architecture, and current status
2. [Development Setup](../CLAUDE.md#getting-started) - Install dependencies and run locally
3. [Pre-Push Checklist](./development/workflows/pre-push-checklist.md) - Must-read before committing

**Deploying to production?** Read these:
1. [Disaster Recovery Plan](./operations/disaster-recovery-plan.md) - RTO/RPO objectives
2. [Monitoring Guide](./operations/monitoring-guide.md) - Set up alerts
3. [Backup & Restore](./operations/backup-restore-guide.md) - Verify backups work

**Contributing?** Follow this workflow:
1. [Testing Strategy](./development/testing-strategy.md) - Testing philosophy
2. [Pre-Push Checklist](./development/workflows/pre-push-checklist.md) - Run before every push
3. [Testing Guide](./development/testing-guide.md) - Run tests against staging

---

## 🎯 Common Tasks

### For Developers

| Task | Documentation |
|------|---------------|
| Run tests locally | [Testing Guide](./development/testing-guide.md#running-tests-locally) |
| Fix CI failures | [Pre-Push Checklist](./development/workflows/pre-push-checklist.md#troubleshooting) |
| Add new test | [Testing Strategy](./development/testing-strategy.md#test-categories) |
| Debug E2E test | [Testing Guide](./development/testing-guide.md#e2e-testing) |

### For Operations

| Task | Documentation |
|------|---------------|
| Restore database | [Backup & Restore](./operations/backup-restore-guide.md#database-restore) |
| Rotate secrets | [Secrets Management](./operations/secrets-management-guide.md#secret-rotation) |
| Handle incident | [Disaster Recovery Plan](./operations/disaster-recovery-plan.md#runbooks) |
| Check service health | [Monitoring Guide](./operations/monitoring-guide.md#health-checks) |
| Verify backups | [Backup & Restore](./operations/backup-restore-guide.md#backup-verification) |

### For Users

| Task | Documentation |
|------|---------------|
| Take a test (student) | [Test Taking Guide](./user-guides/test-taking-student-teacher-guide.md#student-guide) |
| Create tests (teacher) | [Test Taking Guide](./user-guides/test-taking-student-teacher-guide.md#teacher-guide) |

---

## 🆘 Emergency Procedures

**Service Down?**
1. Check [Monitoring Guide](./operations/monitoring-guide.md#troubleshooting-alerts) for triage steps
2. Follow [Disaster Recovery Plan](./operations/disaster-recovery-plan.md#runbooks) for recovery
3. See [Runbook Index](./operations/disaster-recovery-plan.md#runbooks) for specific scenarios

**Data Loss?**
1. [Database Restore](./operations/backup-restore-guide.md#database-restore) - Restore from backup
2. [MinIO Restore](./operations/minio-backup-guide.md#restore-procedures) - Restore files
3. [Disaster Recovery Plan](./operations/disaster-recovery-plan.md#runbook-2-selective-data-restore) - Selective restore

**Security Incident?**
1. [Secrets Management](./operations/secrets-management-guide.md#incident-response) - Rotate secrets
2. [Disaster Recovery Plan](./operations/disaster-recovery-plan.md#runbook-6-security-incident-response) - Full IR procedure

---

## 📊 Documentation Standards

### File Naming Conventions

- Use lowercase with hyphens: `backup-restore-guide.md`
- Prefix with category if in root: `ops-monitoring.md`
- Use descriptive names: `test-strategy.md` not `tests.md`

### Document Structure

Every guide should include:
1. **Overview** - What this document covers
2. **Table of Contents** - For documents >200 lines
3. **Prerequisites** - What you need before starting
4. **Step-by-Step Procedures** - Clear, actionable steps
5. **Troubleshooting** - Common issues and solutions
6. **Related Documentation** - Links to related guides

### Metadata Footer

Every document should end with:
```markdown
---

**Last Updated:** YYYY-MM-DD
**Owner:** [Team Name]
**Reviewers:** [Team Names]
```

### Code Blocks

Always specify language for syntax highlighting:
```markdown
\`\`\`bash
kubectl get pods
\`\`\`
```

### Links

- **Internal links**: Use relative paths: `[Testing Guide](./development/testing-guide.md)`
- **External links**: Use absolute URLs: `[Kubernetes Docs](https://kubernetes.io)`
- **Anchor links**: Use for long documents: `[Prerequisites](#prerequisites)`

---

## 🔄 Keeping Documentation Updated

### When to Update Documentation

Update documentation when:
- ✅ Adding new features or components
- ✅ Changing deployment procedures
- ✅ Modifying configuration or secrets
- ✅ Fixing bugs that affect documented procedures
- ✅ Learning from incidents or outages

### Documentation Review Schedule

| Document Type | Review Frequency | Owner |
|---------------|------------------|-------|
| Operations guides | Quarterly | DevOps Team |
| Development guides | On major changes | Dev Team |
| User guides | On UI changes | Product Team |
| Architecture docs | On design changes | Architects |

### Stale Documentation Indicators

Documentation is likely stale if:
- 🚩 Last updated >6 months ago
- 🚩 Referenced commands don't work
- 🚩 Screenshots show old UI
- 🚩 Multiple reports of confusion
- 🚩 Procedures reference deleted files

---

## 📝 Contributing to Documentation

### Making Changes

1. **Find the right location** - Use the structure above
2. **Update the document** - Follow our standards
3. **Update indexes** - Add links to relevant README files
4. **Test procedures** - Verify commands work
5. **Commit with clear message**: `docs: update backup restore procedure`

### Documentation PRs

When submitting documentation PRs:
- ✅ Update the "Last Updated" footer
- ✅ Add yourself to "Reviewers" if major changes
- ✅ Link to related code PRs (if applicable)
- ✅ Include before/after for major reorganizations
- ✅ Verify all links work

---

## 📞 Getting Help

**Documentation Issues:**
- Create an issue: [GitHub Issues](https://github.com/desponda/vocab-app/issues)
- Tag with `documentation` label

**Urgent Operational Issues:**
- See [Disaster Recovery Plan](./operations/disaster-recovery-plan.md#contact-information)
- Check [Monitoring Guide](./operations/monitoring-guide.md#incident-response)

---

## 📚 External Resources

**Technologies We Use:**
- [Next.js Documentation](https://nextjs.org/docs) - Frontend framework
- [Fastify Documentation](https://fastify.dev/) - Backend framework
- [Kubernetes Documentation](https://kubernetes.io/docs/) - Container orchestration
- [PostgreSQL Documentation](https://www.postgresql.org/docs/) - Database
- [Prisma Documentation](https://www.prisma.io/docs) - ORM
- [Claude API Documentation](https://docs.anthropic.com) - AI integration

**Best Practices:**
- [12 Factor App](https://12factor.net/) - Application design
- [SRE Book](https://sre.google/sre-book/table-of-contents/) - Operations and reliability
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Security

---

**Last Updated:** 2026-01-19
**Maintainers:** DevOps Team, Engineering Team
**Review Schedule:** Quarterly
