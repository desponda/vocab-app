#!/bin/bash
set -e

echo "🔍 Pre-Deployment Validation Script"
echo "=================================="

CHART_DIR="k8s/helm/vocab-app"
ERRORS=0

# 1. Validate Helm chart syntax
echo "✓ Validating Helm chart syntax..."
if ! helm lint "$CHART_DIR"; then
  echo "❌ Helm lint failed"
  ERRORS=$((ERRORS + 1))
fi

# 2. Test Helm template rendering
echo "✓ Testing Helm template rendering..."
if ! helm template test "$CHART_DIR" > /dev/null; then
  echo "❌ Helm template failed"
  ERRORS=$((ERRORS + 1))
fi

# 3. Validate health endpoint paths consistency
echo "✓ Validating health endpoint paths..."
API_HEALTH_ENDPOINT=$(grep -r "path: /api/health" "$CHART_DIR/templates/api-deployment.yaml" | wc -l)
if [ "$API_HEALTH_ENDPOINT" -lt 2 ]; then
  echo "❌ API health check endpoints not found in Deployment"
  ERRORS=$((ERRORS + 1))
fi

# 4. Check for StatefulSet changes (dangerous)
echo "✓ Checking for StatefulSet changes..."
if git diff --name-only HEAD~1 2>/dev/null | grep -q "statefulset"; then
  echo "⚠️  WARNING: StatefulSet changes detected - requires manual review!"
  echo "   StatefulSet changes can cause data loss. Review carefully."
fi

# 5. Validate required secrets exist in values files
echo "✓ Validating required secrets configuration..."
REQUIRED_SECRETS=("databaseUrl" "jwtAccessSecret" "jwtRefreshSecret" "anthropicApiKey")
VALUES_FILE="$CHART_DIR/values.yaml"

for secret in "${REQUIRED_SECRETS[@]}"; do
  if ! grep -q "$secret" "$VALUES_FILE"; then
    echo "⚠️  Secret '$secret' not found in values.yaml"
  fi
done

# Summary
echo ""
echo "=================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ All validations passed!"
  exit 0
else
  echo "❌ $ERRORS validation(s) failed"
  exit 1
fi
