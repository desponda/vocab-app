#!/bin/bash

# rotate-jwt-secret.sh
# Zero-downtime rotation of JWT secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-vocab-app-staging}"
RELEASE_NAME="${RELEASE_NAME:-vocab-app}"
SECRET_NAME="vocab-app-jwt-secret"

echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║           JWT Secret Rotation (Zero-Downtime)                ║${NC}"
echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verify namespace exists
if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
  echo -e "${RED}✗ Namespace '$NAMESPACE' not found${NC}"
  exit 1
fi

# Verify secret exists
if ! kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" &>/dev/null; then
  echo -e "${RED}✗ Secret '$SECRET_NAME' not found in namespace '$NAMESPACE'${NC}"
  exit 1
fi

echo -e "${GREEN}Current Configuration:${NC}"
echo "  Namespace: $NAMESPACE"
echo "  Secret: $SECRET_NAME"
echo ""

# Confirmation prompt
echo -e "${YELLOW}⚠️  WARNING: This will rotate JWT secrets and restart all API pods.${NC}"
echo -e "${YELLOW}   All users will be logged out and need to sign in again.${NC}"
echo -e "${YELLOW}   The API will remain available throughout the process (rolling restart).${NC}"
echo ""
read -p "Do you want to continue? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "Aborted."
  exit 0
fi

# Step 1: Generate new JWT secrets
echo -e "${GREEN}[1/4] Generating new JWT secrets...${NC}"
JWT_ACCESS_SECRET=$(openssl rand -base64 32 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 32 | tr -d '\n')
echo "✓ New JWT secrets generated"
echo "  Access Secret: ${#JWT_ACCESS_SECRET} characters"
echo "  Refresh Secret: ${#JWT_REFRESH_SECRET} characters"
echo ""

# Step 2: Update Kubernetes secret
echo -e "${GREEN}[2/4] Updating Kubernetes secret...${NC}"
kubectl create secret generic "$SECRET_NAME" \
  --namespace="$NAMESPACE" \
  --from-literal=jwt-access-secret="$JWT_ACCESS_SECRET" \
  --from-literal=jwt-refresh-secret="$JWT_REFRESH_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

if [ $? -eq 0 ]; then
  echo "✓ Secret updated successfully"
else
  echo -e "${RED}✗ Failed to update secret${NC}"
  exit 1
fi
echo ""

# Step 3: Rolling restart of API pods
echo -e "${GREEN}[3/4] Performing rolling restart of API pods...${NC}"
kubectl rollout restart deployment/${RELEASE_NAME}-api -n "$NAMESPACE"
echo "✓ Rolling restart initiated"
echo ""

# Wait for rollout to complete
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/${RELEASE_NAME}-api -n "$NAMESPACE" --timeout=5m
if [ $? -eq 0 ]; then
  echo "✓ All API pods updated successfully"
else
  echo -e "${RED}✗ Rollout failed or timed out${NC}"
  echo -e "${YELLOW}   Check pod status: kubectl get pods -n $NAMESPACE${NC}"
  exit 1
fi
echo ""

# Step 4: Verify pods are healthy
echo -e "${GREEN}[4/4] Verifying pod health...${NC}"
sleep 10  # Give pods time to start serving requests

API_PODS=$(kubectl get pods -n "$NAMESPACE" -l app=api --field-selector=status.phase=Running -o jsonpath='{.items[*].metadata.name}')
if [ -z "$API_PODS" ]; then
  echo -e "${RED}✗ No running API pods found${NC}"
  exit 1
fi

HEALTHY_COUNT=0
for pod in $API_PODS; do
  # Check readiness probe
  READY=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
  if [ "$READY" = "True" ]; then
    echo "  ✓ Pod $pod is healthy"
    ((HEALTHY_COUNT++))
  else
    echo -e "  ${YELLOW}⚠ Pod $pod is not ready yet${NC}"
  fi
done

if [ $HEALTHY_COUNT -gt 0 ]; then
  echo ""
  echo -e "${GREEN}✓ JWT rotation complete! $HEALTHY_COUNT API pod(s) are healthy.${NC}"
  echo ""
  echo -e "${GREEN}Summary:${NC}"
  echo "  • JWT access secret rotated"
  echo "  • JWT refresh secret rotated"
  echo "  • Kubernetes secret updated"
  echo "  • API pods restarted with new secrets"
  echo "  • Zero downtime maintained (rolling restart)"
  echo ""
  echo -e "${YELLOW}Important:${NC}"
  echo "  • All users have been logged out automatically"
  echo "  • Users must sign in again to continue using the app"
  echo "  • Existing refresh tokens are now invalid"
  echo ""
  echo -e "${YELLOW}Next steps:${NC}"
  echo "  1. Verify application functionality (test login)"
  echo "  2. Check logs: kubectl logs -n $NAMESPACE -l app=api --tail=50"
  echo "  3. Monitor for authentication errors"
  echo "  4. Record rotation in your change log"
else
  echo ""
  echo -e "${RED}✗ No healthy pods found after rotation${NC}"
  echo -e "${YELLOW}   Troubleshooting steps:${NC}"
  echo "  1. Check pod status: kubectl get pods -n $NAMESPACE"
  echo "  2. Check pod logs: kubectl logs -n $NAMESPACE -l app=api"
  echo "  3. Describe pods: kubectl describe pods -n $NAMESPACE -l app=api"
  exit 1
fi
