# Documentation Organization Guide

## Overview

This document explains the documentation structure for the Vocab App, following industry best practices for technical documentation.

## 📁 Directory Structure

```
docs/
├── README.md                          # Main index (START HERE)
│
├── development/                       # For developers
│   ├── README.md                      # Development docs index
│   ├── testing-strategy.md            # Testing philosophy
│   ├── testing-guide.md               # How to run tests
│   └── workflows/
│       └── pre-push-checklist.md      # REQUIRED before commits
│
├── operations/                        # For DevOps/SRE
│   ├── README.md                      # Operations docs index
│   ├── monitoring-guide.md            # Observability (485 lines)
│   ├── backup-restore-guide.md        # Database backups (400+ lines)
│   ├── disaster-recovery-plan.md      # DR procedures (700+ lines)
│   ├── secrets-management-guide.md    # Secret rotation (400+ lines)
│   ├── kubernetes-security-hardening.md  # Pod security (480+ lines)
│   └── minio-backup-guide.md          # Object storage backups
│
├── architecture/                      # For architects
│   ├── README.md                      # Architecture docs index
│   └── designs/
│       └── test-naming-and-assignment-ux.md
│
├── user-guides/                       # For end users
│   └── test-taking-student-teacher-guide.md
│
└── runbooks/                          # Quick procedures (future)
```

## 🎯 Best Practices Applied

### 1. **Audience-Based Organization**

**Problem:** Mixed audience documentation is hard to navigate

**Solution:** Separate by audience
- `development/` - Developers (coding, testing, CI/CD)
- `operations/` - DevOps/SRE (deployment, monitoring, incidents)
- `architecture/` - Architects (design decisions, specs)
- `user-guides/` - End users (teachers, students)

**Benefit:** Users find relevant docs quickly without wading through unrelated content

---

### 2. **Hierarchical Navigation**

**Problem:** Flat structure overwhelms with too many files

**Solution:** Multi-level indexes
- Main `docs/README.md` - High-level navigation
- Category `README.md` files - Detailed guides within each area
- Cross-references between related docs

**Benefit:** Clear navigation path from general to specific

---

### 3. **Descriptive File Names**

**Problem:** Generic names like `guide.md` are ambiguous

**Solution:** Use descriptive names
- ✅ `backup-restore-guide.md`
- ❌ `backup.md`
- ✅ `kubernetes-security-hardening.md`
- ❌ `security.md`

**Benefit:** File purpose clear from name alone

---

### 4. **Comprehensive Indexes**

**Problem:** Users don't know what documentation exists

**Solution:** Each README includes:
- **Quick links** to all documents
- **Content summaries** (what's in each doc)
- **When to use** (context for each guide)
- **Quick start** (common workflows)
- **Emergency procedures** (what to do when things break)

**Benefit:** Users discover relevant docs they didn't know existed

---

### 5. **Task-Oriented Organization**

**Problem:** Documentation organized by feature, not user goals

**Solution:** Organize by task/problem
- "I need to restore data" → `backup-restore-guide.md`
- "Service is down" → `disaster-recovery-plan.md` → Runbooks
- "How do I test?" → `testing-guide.md`
- "Secrets compromised" → `secrets-management-guide.md` → Rotation

**Benefit:** Users find solutions to their immediate problems

---

### 6. **Progressive Disclosure**

**Problem:** Beginners overwhelmed, experts want quick reference

**Solution:** Layer information
- **README**: Quick start + common tasks
- **Guides**: Comprehensive procedures
- **Runbooks**: Step-by-step emergency procedures

**Benefit:** Serves both novices and experts

---

### 7. **Metadata and Standards**

**Problem:** Docs become stale and outdated

**Solution:** Every doc includes footer:
```markdown
---

**Last Updated:** YYYY-MM-DD
**Owner:** [Team Name]
**Reviewers:** [Team Names]
```

Plus standards for:
- File naming conventions
- Document structure (Overview, TOC, Prerequisites, etc.)
- Code block formatting
- Link conventions (internal vs external)

**Benefit:** Clear ownership, easy to identify stale docs

---

### 8. **Cross-Reference Network**

**Problem:** Isolated documents, users miss related info

**Solution:** Every doc links to related docs
- "Related Documentation" sections
- Inline references to other guides
- Main index with cross-category links

**Benefit:** Users discover related information organically

---

## 📊 Documentation Metrics

### Coverage

| Category | Documents | Total Lines | Average Length |
|----------|-----------|-------------|----------------|
| Operations | 6 guides | ~2,500 lines | 415 lines/doc |
| Development | 3 guides | ~500 lines | 165 lines/doc |
| Architecture | 1 guide + READMEs | ~200 lines | - |
| User Guides | 1 guide | ~100 lines | - |
| **Total** | **15 files** | **~3,300 lines** | **~220 lines/doc** |

### Audience Split

- **Operations**: 6 docs (40%) - Largest category for production readiness
- **Development**: 3 docs (20%) - Core developer workflows
- **Architecture**: 1 doc + future ADRs (7%)
- **User Guides**: 1 doc (7%)
- **Indexes**: 4 READMEs (26%) - Navigation layer

### Key Statistics

- **Longest guide**: Disaster Recovery Plan (700+ lines, 6 runbooks)
- **Most critical**: Pre-Push Checklist (REQUIRED before commits)
- **Most comprehensive**: Operations guides (2,500+ lines)
- **Review schedule**: Quarterly for operations, on-change for development

---

## 🚀 How to Use This Documentation

### For New Developers

1. Start with [Main Index](README.md)
2. Read [Pre-Push Checklist](development/workflows/pre-push-checklist.md) - **REQUIRED**
3. Review [Testing Strategy](development/testing-strategy.md)
4. Bookmark [Development Index](development/README.md) for quick reference

### For DevOps/SRE

1. Start with [Main Index](README.md)
2. Read [Operations Index](operations/README.md) - Overview of all ops docs
3. Set up [Monitoring](operations/monitoring-guide.md) first
4. Configure [Backups](operations/backup-restore-guide.md) immediately
5. Review [Disaster Recovery Plan](operations/disaster-recovery-plan.md) - Know your runbooks
6. Bookmark [Operations Index](operations/README.md) for emergencies

### For Architects

1. Review [Architecture Index](architecture/README.md)
2. Read existing design docs in `architecture/designs/`
3. Follow template for new architecture decisions
4. Link from main indexes when adding new docs

### For End Users

1. Go to [User Guides](user-guides/)
2. Find guide for your role (teacher or student)
3. Follow step-by-step instructions

---

## 📝 Contributing to Documentation

### Adding a New Document

**Step 1:** Determine the right location
- Developer? → `development/`
- Operations? → `operations/`
- Design decision? → `architecture/designs/`
- End user? → `user-guides/`
- Quick procedure? → `runbooks/` (future)

**Step 2:** Follow naming conventions
- Lowercase with hyphens: `my-new-guide.md`
- Descriptive, not generic: `jwt-rotation-guide.md` not `auth.md`

**Step 3:** Use the standard template
```markdown
# Guide Title

## Overview
[What this document covers]

## Table of Contents
[For docs >200 lines]

## Prerequisites
[What you need before starting]

## Step-by-Step Procedures
[Clear, actionable steps]

## Troubleshooting
[Common issues and solutions]

## Related Documentation
[Links to related guides]

---

**Last Updated:** YYYY-MM-DD
**Owner:** [Team Name]
**Reviewers:** [Team Names]
```

**Step 4:** Update indexes
- Add link to category README (e.g., `operations/README.md`)
- Add to main `docs/README.md` if critical
- Cross-reference from related docs

**Step 5:** Commit with clear message
```bash
git add docs/
git commit -m "docs: add JWT rotation guide"
```

### Updating Existing Documentation

**When to update:**
- ✅ Feature changes affect documented procedures
- ✅ Commands or paths change
- ✅ New troubleshooting discovered
- ✅ User reports confusion
- ✅ Quarterly review identifies staleness

**How to update:**
1. Make changes to document
2. Update "Last Updated" footer
3. Add yourself to "Reviewers" if major changes
4. Verify all commands still work
5. Update indexes if title/scope changed
6. Commit with descriptive message

### Documentation Review

**Quarterly review checklist:**
- [ ] Check "Last Updated" dates (>6 months = review needed)
- [ ] Verify commands still work
- [ ] Test procedures end-to-end
- [ ] Update screenshots if UI changed
- [ ] Check for broken links
- [ ] Update version numbers/references
- [ ] Review and close related GitHub issues

---

## 🔍 Finding Documentation

### Search Strategies

**By task/problem:**
1. Check [Main Index](README.md) → "Common Tasks" table
2. Scan category README → "When to use" sections
3. Use full-text search: `grep -r "keyword" docs/`

**By file name:**
```bash
find docs/ -name "*backup*"
find docs/ -name "*test*"
```

**By content:**
```bash
grep -r "restore database" docs/
grep -r "kubectl" docs/operations/
```

**By audience:**
- Developer → `docs/development/`
- Operations → `docs/operations/`
- Architect → `docs/architecture/`
- User → `docs/user-guides/`

---

## 📈 Documentation Maturity Model

### Current State: **Level 3 - Managed**

| Level | Description | Vocab App Status |
|-------|-------------|------------------|
| 1 - Initial | Ad-hoc docs, no structure | ❌ Past this |
| 2 - Repeatable | Some structure, inconsistent | ❌ Past this |
| **3 - Managed** | **Structured, organized, maintained** | **✅ Current** |
| 4 - Measured | Metrics, user feedback, analytics | 🎯 Goal |
| 5 - Optimized | Continuous improvement, automated | 🔮 Future |

**Next steps to Level 4:**
- [ ] Track documentation usage (views, searches)
- [ ] Collect user feedback on docs
- [ ] Measure time-to-resolution with docs
- [ ] A/B test different doc structures
- [ ] Monitor stale doc detection

---

## 🎯 Success Metrics

### Documentation Effectiveness

**Quantitative:**
- Time to find relevant doc: Target <2 minutes
- Successful task completion: Target >90%
- Doc staleness: Target <10% docs >6 months old
- Broken links: Target 0%

**Qualitative:**
- User feedback: "Easy to navigate"
- Developer feedback: "Always know where to look"
- Ops feedback: "Runbooks save hours during incidents"

---

## 🔗 External References

**Documentation Best Practices:**
- [Divio Documentation System](https://documentation.divio.com/) - 4 types of docs
- [Google Developer Docs Style Guide](https://developers.google.com/style) - Writing standards
- [Write the Docs](https://www.writethedocs.org/) - Community and resources

**Tools for Documentation:**
- [Vale](https://vale.sh/) - Prose linting
- [markdownlint](https://github.com/DavidAnson/markdownlint) - Markdown linting
- [doctoc](https://github.com/thlorenz/doctoc) - Generate TOCs automatically

---

**Last Updated:** 2026-01-19
**Owner:** Engineering Team, DevOps Team
**Reviewers:** Tech Lead, Documentation Maintainers
**Status:** Living document, updated as docs evolve
