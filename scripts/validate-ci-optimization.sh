#!/bin/bash
# Don't use set -e because arithmetic operations can return 0

echo "🔍 Validating CI/CD Pipeline Optimization"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "1. Checking workflow files..."
echo "------------------------------"

# Check if workflow files exist
if [ -f ".github/workflows/ci.yml" ]; then
    pass "ci.yml exists"
else
    fail "ci.yml not found"
fi

if [ -f ".github/workflows/docker-build.yml" ]; then
    pass "docker-build.yml exists"
else
    fail "docker-build.yml not found"
fi

echo ""
echo "2. Checking Dockerfile optimizations..."
echo "----------------------------------------"

# Check web Dockerfile
if [ -f "docker/web.Dockerfile" ]; then
    if grep -q "FROM.*AS deps" docker/web.Dockerfile; then
        pass "web.Dockerfile has multi-stage deps layer"
    else
        fail "web.Dockerfile missing multi-stage deps layer"
    fi

    if grep -q "\-\-mount=type=cache" docker/web.Dockerfile; then
        pass "web.Dockerfile uses BuildKit cache mounts"
    else
        warn "web.Dockerfile not using BuildKit cache mounts (optional)"
    fi

    if grep -q "HEALTHCHECK" docker/web.Dockerfile; then
        pass "web.Dockerfile has health check"
    else
        warn "web.Dockerfile missing health check (optional)"
    fi
else
    fail "web.Dockerfile not found"
fi

# Check API Dockerfile
if [ -f "docker/api.Dockerfile" ]; then
    if grep -q "FROM.*AS deps" docker/api.Dockerfile; then
        pass "api.Dockerfile has multi-stage deps layer"
    else
        fail "api.Dockerfile missing multi-stage deps layer"
    fi

    if grep -q "FROM.*AS prod-deps" docker/api.Dockerfile; then
        pass "api.Dockerfile has production dependencies stage"
    else
        warn "api.Dockerfile missing production dependencies stage (optional)"
    fi

    if grep -q "\-\-mount=type=cache" docker/api.Dockerfile; then
        pass "api.Dockerfile uses BuildKit cache mounts"
    else
        warn "api.Dockerfile not using BuildKit cache mounts (optional)"
    fi

    if grep -q "HEALTHCHECK" docker/api.Dockerfile; then
        pass "api.Dockerfile has health check"
    else
        warn "api.Dockerfile missing health check (optional)"
    fi
else
    fail "api.Dockerfile not found"
fi

echo ""
echo "3. Checking CI workflow optimizations..."
echo "-----------------------------------------"

if grep -q "setup:" .github/workflows/ci.yml; then
    pass "CI has setup job"
else
    fail "CI missing setup job"
fi

if grep -q "changes:" .github/workflows/ci.yml; then
    pass "CI has changed files detection"
else
    fail "CI missing changed files detection"
fi

if grep -q "actions/cache@v4" .github/workflows/ci.yml; then
    pass "CI uses cache action"
else
    fail "CI missing cache action"
fi

if grep -q "needs:.*\[.*setup.*changes.*\]" .github/workflows/ci.yml; then
    pass "CI jobs depend on setup and changes"
else
    warn "CI jobs might not have proper dependencies"
fi

if grep -q "matrix:" .github/workflows/ci.yml; then
    pass "CI uses matrix strategy"
else
    warn "CI not using matrix strategy (optional)"
fi

if grep -q "dorny/paths-filter" .github/workflows/ci.yml; then
    pass "CI uses paths-filter for change detection"
else
    fail "CI missing paths-filter action"
fi

# Check for Turbo cache
if grep -q "turbo" .github/workflows/ci.yml; then
    pass "CI includes Turbo cache"
else
    warn "CI missing Turbo cache (optional)"
fi

echo ""
echo "4. Checking Docker build workflow optimizations..."
echo "---------------------------------------------------"

if grep -q "changes:" .github/workflows/docker-build.yml; then
    pass "Docker build has changed files detection"
else
    fail "Docker build missing changed files detection"
fi

if grep -q "build-web:" .github/workflows/docker-build.yml; then
    pass "Docker build has separate web job"
else
    fail "Docker build missing separate web job"
fi

if grep -q "build-api:" .github/workflows/docker-build.yml; then
    pass "Docker build has separate API job"
else
    fail "Docker build missing separate API job"
fi

if grep -q "cache-from:.*type=gha" .github/workflows/docker-build.yml; then
    pass "Docker build uses GitHub Actions cache"
else
    fail "Docker build missing GitHub Actions cache"
fi

if grep -q "scope:" .github/workflows/docker-build.yml; then
    pass "Docker build uses scoped caches"
else
    warn "Docker build not using scoped caches (optional)"
fi

echo ""
echo "5. Checking documentation..."
echo "-----------------------------"

if [ -f "docs/ci-cd-optimization.md" ]; then
    pass "Comprehensive optimization guide exists"
else
    warn "Optimization guide missing (recommended)"
fi

if [ -f ".github/workflows/README.md" ]; then
    pass "Workflow README exists"
else
    warn "Workflow README missing (recommended)"
fi

if [ -f "OPTIMIZATION_SUMMARY.md" ]; then
    pass "Optimization summary exists"
else
    warn "Optimization summary missing (recommended)"
fi

echo ""
echo "6. Validating YAML syntax..."
echo "-----------------------------"

# Check if yamllint is available
if command -v yamllint &> /dev/null; then
    if yamllint -d relaxed .github/workflows/ci.yml 2>&1 | grep -q "error"; then
        fail "ci.yml has YAML syntax errors"
    else
        pass "ci.yml syntax is valid"
    fi

    if yamllint -d relaxed .github/workflows/docker-build.yml 2>&1 | grep -q "error"; then
        fail "docker-build.yml has YAML syntax errors"
    else
        pass "docker-build.yml syntax is valid"
    fi
else
    warn "yamllint not installed, skipping YAML validation"
    echo "   Install with: pip install yamllint"
fi

echo ""
echo "7. Checking Docker syntax..."
echo "-----------------------------"

# Check if docker is available
if command -v docker &> /dev/null; then
    # Check web Dockerfile
    if docker build --check -f docker/web.Dockerfile . &> /dev/null; then
        pass "web.Dockerfile syntax is valid"
    else
        warn "web.Dockerfile might have issues (run: docker build -f docker/web.Dockerfile .)"
    fi

    # Check API Dockerfile
    if docker build --check -f docker/api.Dockerfile . &> /dev/null; then
        pass "api.Dockerfile syntax is valid"
    else
        warn "api.Dockerfile might have issues (run: docker build -f docker/api.Dockerfile .)"
    fi
else
    warn "Docker not available, skipping Dockerfile validation"
fi

echo ""
echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC}   $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review the changes in .github/workflows/"
    echo "2. Review the changes in docker/"
    echo "3. Read docs/ci-cd-optimization.md for details"
    echo "4. Commit and push to test the optimizations"
    echo ""
    echo "Monitor the first few runs:"
    echo "  gh run list --workflow=ci.yml --limit 5"
    echo "  gh run list --workflow=docker-build.yml --limit 5"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some critical checks failed${NC}"
    echo ""
    echo "Please fix the failed checks before deploying."
    echo ""
    exit 1
fi
