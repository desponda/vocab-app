# GitHub Actions Workflows

## Quick Reference

### Workflows

| Workflow | Trigger | Purpose | Duration |
|----------|---------|---------|----------|
| `ci.yml` | Push/PR to main, develop | Lint, typecheck, test, build | ~4-6 min |
| `docker-build.yml` | Push to main, tags | Build and push Docker images | ~3-5 min |

### CI Pipeline (`ci.yml`)

**Jobs:**
1. **setup** - Install dependencies and cache everything (1 min)
2. **changes** - Detect what files changed (15 sec)
3. **lint** - Run ESLint (45 sec, parallel)
4. **typecheck** - Type check API and web (1.5 min, parallel matrix)
5. **test** - Run Vitest tests (2 min, parallel)
6. **build** - Build all packages (1 min, conditional)

**Total: ~4.5 minutes** (on cache hit with changes detected)

**Optimizations:**
- ✅ Shared dependency cache across jobs
- ✅ Parallel execution (lint/typecheck/test run simultaneously)
- ✅ Changed files detection (skip unnecessary work)
- ✅ Turbo cache integration
- ✅ Prisma client caching
- ✅ Matrix strategy for typecheck

### Docker Build Pipeline (`docker-build.yml`)

**Jobs:**
1. **changes** - Detect what files changed (15 sec)
2. **build-web** - Build web Docker image (2 min, parallel)
3. **build-api** - Build API Docker image (2 min, parallel)
4. **update-gitops** - Update Helm values.yaml (30 sec)

**Total: ~3.5 minutes** (on cache hit, both images changed)

**Optimizations:**
- ✅ Parallel Docker builds (web and API simultaneously)
- ✅ GitHub Actions cache for Docker layers
- ✅ Conditional builds (skip unchanged images)
- ✅ Scoped caches (separate for web/api)
- ✅ BuildKit cache mounts in Dockerfiles

## Cache Strategy

### CI Caches

```yaml
# pnpm store cache
Key: linux-pnpm-store-{lockfile-hash}
Invalidates: When pnpm-lock.yaml changes

# node_modules cache
Key: linux-node-modules-{lockfile-hash}
Invalidates: When pnpm-lock.yaml changes

# Prisma client cache
Key: linux-prisma-{schema-hash}
Invalidates: When schema.prisma changes

# Turbo cache
Key: linux-turbo-{task}-{workspace}-{sha}
Restore: linux-turbo-{task}-{workspace}-
```

### Docker Caches

```yaml
# Docker layer cache
Type: gha (GitHub Actions)
Scope: web or api
Mode: max (cache all layers)

# BuildKit cache mounts
- /root/.local/share/pnpm/store (pnpm)
- /app/apps/api/node_modules/.prisma (Prisma)
```

## When Jobs Run

### CI Jobs

| Job | Condition |
|-----|-----------|
| setup | Always |
| changes | Always |
| lint | If any code changed |
| typecheck (api) | If API or shared code changed |
| typecheck (web) | If web or shared code changed |
| test | If any code changed |
| build | If all checks pass AND code changed |

### Docker Jobs

| Job | Condition |
|-----|-----------|
| changes | Always |
| build-web | If web code changed OR tag push |
| build-api | If API code changed OR tag push |
| update-gitops | If at least one image built |

## Troubleshooting

### Cache Issues

**Clear all caches:**
```bash
gh cache delete --all
```

**Clear specific cache:**
```bash
gh cache list
gh cache delete <cache-key>
```

**Cache not restoring:**
- Check if pnpm-lock.yaml changed (invalidates cache)
- Check cache size limit (10GB max per repo)
- Old caches auto-expire after 7 days

### Failed Jobs

**Dependencies installation fails:**
```bash
# Locally verify lockfile is valid
pnpm install --frozen-lockfile

# If different, update lockfile
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: update lockfile"
```

**Type check fails but works locally:**
```bash
# Ensure Prisma client is generated
cd apps/api && pnpm prisma generate

# Check if schema changed
git diff apps/api/prisma/schema.prisma
```

**Docker build fails:**
```bash
# Test locally with BuildKit
DOCKER_BUILDKIT=1 docker build -f docker/web.Dockerfile .

# Check cache scope conflicts
# Ensure web and api use different scopes
```

### Performance Issues

**Pipeline slower than expected:**
1. Check cache hit rate in logs ("Cache restored from key: ...")
2. First run on branch = cache miss (expected slow)
3. Verify Turbo is detecting unchanged packages
4. Check if all jobs running in parallel

**Docker build slow:**
1. Check layer cache restore in logs
2. Verify BuildKit cache mounts working
3. Check if dependencies changed (invalidates cache)
4. Ensure separate scopes for web/api

## Manual Workflow Runs

**Trigger CI manually:**
```bash
gh workflow run ci.yml
```

**Trigger Docker build manually:**
```bash
gh workflow run docker-build.yml
```

**With specific branch:**
```bash
gh workflow run ci.yml --ref feature/my-branch
```

## Monitoring

**View recent runs:**
```bash
# CI workflow
gh run list --workflow=ci.yml --limit 10

# Docker build workflow
gh run list --workflow=docker-build.yml --limit 10
```

**View specific run:**
```bash
gh run view <run-id>
gh run view <run-id> --log
```

**Watch live run:**
```bash
gh run watch
```

**Cache usage:**
```bash
gh cache list
```

## Best Practices

### For Developers

1. **Keep pnpm-lock.yaml in sync:**
   - Always commit lockfile changes
   - Never use `--no-frozen-lockfile` in CI

2. **Test locally before pushing:**
   ```bash
   pnpm lint
   pnpm typecheck  # Or: pnpm build
   pnpm test
   ```

3. **Small, focused PRs:**
   - Fewer changes = faster CI (changed files detection)
   - Separate refactoring from features

4. **Monitor CI status:**
   - Fix broken builds immediately
   - Don't pile commits on failing builds

### For CI Optimization

1. **Cache invalidation:**
   - Use hash-based keys
   - Separate scopes for different purposes
   - Include restore-keys for fallback

2. **Parallel execution:**
   - Independent jobs should run in parallel
   - Use `needs:` to express dependencies
   - Don't over-parallelize (diminishing returns)

3. **Conditional execution:**
   - Skip unnecessary work
   - Use changed files detection
   - Combine with matrix strategies

4. **Docker layer optimization:**
   - Order layers from least to most frequently changed
   - Use multi-stage builds
   - Leverage BuildKit features

## Performance Metrics

### Target Benchmarks

| Metric | Target | Measured |
|--------|--------|----------|
| CI total time | <6 min | ~4.5 min |
| Docker build (web) | <3 min | ~2 min |
| Docker build (API) | <3 min | ~2 min |
| Cache hit rate | >80% | ~85% |
| Total pipeline | <10 min | ~8 min |

### Historical Performance

**Before Optimization (Jan 2026):**
- CI: ~11 minutes
- Docker: ~12 minutes
- Total: ~23 minutes

**After Optimization (Jan 2026):**
- CI: ~4.5 minutes (59% faster)
- Docker: ~3.5 minutes (71% faster)
- Total: ~8 minutes (65% faster)

## Additional Resources

- [Full Optimization Documentation](../docs/ci-cd-optimization.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [pnpm CI Guide](https://pnpm.io/continuous-integration)
- [Turborepo CI Guide](https://turbo.build/repo/docs/ci)
- [Docker BuildKit Documentation](https://docs.docker.com/build/buildkit/)

---

**Last Updated:** 2026-01-18
**Maintained By:** DevOps Team
