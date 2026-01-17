# Testing Guide for Vocab App

## Overview
This document outlines testing best practices for development and staging environments.

## Local Development Testing

### 1. Unit Tests
Run unit tests locally before committing:
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode for development
pnpm test:watch
```

### 2. Integration Tests
Test API endpoints with real database:
```bash
# Start local services
docker-compose up -d

# Run integration tests
pnpm test:integration

# Teardown
docker-compose down
```

### 3. E2E Tests (Playwright)
Test complete user flows:
```bash
# Install browsers
npx playwright install

# Run E2E tests
pnpm test:e2e

# Run in UI mode for debugging
pnpm test:e2e --ui
```

## Kubernetes Testing

### 1. Port-Forward Testing
Test services locally before full deployment:
```bash
# Forward API service
kubectl port-forward -n vocab-app-staging svc/vocab-app-staging-api 3001:3001

# Forward Web service
kubectl port-forward -n vocab-app-staging svc/vocab-app-staging-web 3000:3000

# Test locally
curl http://localhost:3001/api/auth/register -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234","name":"Test"}'
```

### 2. Staging Environment Testing
Automated smoke tests for staging:
```bash
#!/bin/bash
# scripts/test-staging.sh

set -e

API_URL="https://vocab-staging.dresponda.com"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test-${TIMESTAMP}@example.com"

echo "🧪 Running staging smoke tests..."

# Test 1: Registration
echo "Testing registration..."
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"Test1234\",\"name\":\"Test User\"}")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ Registration failed"
    exit 1
fi
echo "✅ Registration works"

# Extract token
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | head -n-1 | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Test 2: Auth check
echo "Testing /me endpoint..."
ME_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/api/auth/me" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

ME_CODE=$(echo "$ME_RESPONSE" | tail -n1)
if [ "$ME_CODE" != "200" ]; then
    echo "❌ Auth check failed"
    exit 1
fi
echo "✅ Auth check works"

# Test 3: Frontend loads
echo "Testing frontend..."
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/register")
if [ "$FRONTEND_CODE" != "200" ]; then
    echo "❌ Frontend not loading"
    exit 1
fi
echo "✅ Frontend loads"

echo ""
echo "✅ All smoke tests passed!"
```

Make executable and run:
```bash
chmod +x scripts/test-staging.sh
./scripts/test-staging.sh
```

### 3. Database Testing
Verify database state:
```bash
# Connect to staging database
kubectl exec -it -n vocab-app-staging vocab-app-staging-postgres-0 -- psql -U postgres -d vocab_app_staging

# Check tables
\dt

# Verify migrations
SELECT * FROM _prisma_migrations;

# Count users
SELECT COUNT(*) FROM "User";

# Exit
\q
```

### 4. Log Monitoring
Watch logs during testing:
```bash
# API logs
kubectl logs -f -n vocab-app-staging -l app=api

# Web logs
kubectl logs -f -n vocab-app-staging -l app=web

# All pods
kubectl logs -f -n vocab-app-staging --all-containers=true
```

## CI/CD Testing

### GitHub Actions Checks
All PRs must pass:
1. **Lint** - ESLint + Prettier
2. **Type Check** - TypeScript compilation
3. **Unit Tests** - Jest/Vitest
4. **Build** - Next.js + Fastify builds

### Pre-Deployment Checklist
Before merging to `main`:
- [ ] All tests passing locally
- [ ] TypeScript builds without errors
- [ ] Docker images build successfully
- [ ] Database migrations tested
- [ ] API endpoints tested manually
- [ ] Frontend tested in browser
- [ ] Environment variables verified

## Testing New Features

### Step-by-Step Process

1. **Write Tests First (TDD)**
   ```bash
   # Example: Adding new endpoint
   # 1. Write test
   cd apps/api
   touch src/routes/new-feature.test.ts

   # 2. Run test (it fails)
   pnpm test src/routes/new-feature.test.ts

   # 3. Implement feature
   touch src/routes/new-feature.ts

   # 4. Test passes
   pnpm test src/routes/new-feature.test.ts
   ```

2. **Test in Docker Locally**
   ```bash
   # Build images
   docker build -f docker/api.Dockerfile -t vocab-api:test .
   docker build -f docker/web.Dockerfile \
     --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 \
     -t vocab-web:test .

   # Run with docker-compose
   docker-compose up

   # Test endpoints
   curl http://localhost:3001/api/...

   # Cleanup
   docker-compose down
   ```

3. **Deploy to Staging**
   ```bash
   # Push to main (triggers CI/CD)
   git push origin main

   # Monitor build
   gh run watch

   # Check deployment
   kubectl get pods -n vocab-app-staging

   # Run smoke tests
   ./scripts/test-staging.sh
   ```

4. **Manual Testing**
   - Test in browser at https://vocab-staging.dresponda.com
   - Test all user flows
   - Check browser console for errors
   - Verify network requests are correct

## Common Issues & Debugging

### Issue: Environment Variables Not Applied
**Problem**: Frontend shows old API URL

**Solution**:
```bash
# Check build args were used
gh run view <run-id> --log | grep "NEXT_PUBLIC_API_URL"

# Rebuild if needed
gh workflow run docker-build.yml

# Force new deployment
kubectl rollout restart deployment -n vocab-app-staging
```

### Issue: Database Connection Errors
**Problem**: API can't connect to database

**Solution**:
```bash
# Check secret
kubectl get secret vocab-app-staging-secrets -n vocab-app-staging -o jsonpath='{.data.database-url}' | base64 -d

# Test connection from API pod
kubectl exec -n vocab-app-staging <api-pod> -- sh -c "echo 'SELECT 1' | psql \$DATABASE_URL"
```

### Issue: CORS Errors
**Problem**: Frontend can't call API

**Solution**:
```bash
# Check CORS config in API
kubectl logs -n vocab-app-staging -l app=api | grep -i cors

# Verify API_URL env var
kubectl get deployment vocab-app-staging-web -n vocab-app-staging -o jsonpath='{.spec.template.spec.containers[0].env}'
```

## Best Practices

1. **Test Every PR**
   - Don't merge without CI passing
   - Test manually in staging before production

2. **Use Feature Flags**
   - Add new features behind flags
   - Test in production without affecting users

3. **Monitor in Production**
   - Check logs after deployment
   - Watch error rates
   - Verify metrics

4. **Automate Everything**
   - Smoke tests in CI
   - Auto-deployment to staging
   - Manual approval for production

5. **Document Test Cases**
   - Add test cases to code comments
   - Update this guide with new scenarios

## Tools & Resources

- **Testing**: Vitest, Playwright, Supertest
- **K8s Testing**: kubectl, k9s, lens
- **Monitoring**: Grafana, Prometheus
- **Logs**: kubectl logs, stern
- **CI/CD**: GitHub Actions

## Future Improvements

- [ ] Add contract testing (Pact)
- [ ] Implement chaos engineering
- [ ] Add performance testing (k6)
- [ ] Set up staging data seeds
- [ ] Automate rollback on failure
