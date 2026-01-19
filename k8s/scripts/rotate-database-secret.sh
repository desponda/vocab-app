#!/bin/bash

# rotate-database-secret.sh
# Zero-downtime rotation of database credentials

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-vocab-app-staging}"
RELEASE_NAME="${RELEASE_NAME:-vocab-app}"
SECRET_NAME="vocab-app-database-secret"

echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║         Database Secret Rotation (Zero-Downtime)             ║${NC}"
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

# Get database name from current secret
DB_NAME=$(kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" -o jsonpath='{.data.database-url}' | base64 -d | sed -n 's|.*@[^/]*/\([^?]*\).*|\1|p')
DB_HOST="${RELEASE_NAME}-postgres"
DB_PORT="5432"
DB_USER="postgres"

echo -e "${GREEN}Current Configuration:${NC}"
echo "  Namespace: $NAMESPACE"
echo "  Secret: $SECRET_NAME"
echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST:$DB_PORT"
echo ""

# Confirmation prompt
echo -e "${YELLOW}⚠️  WARNING: This will rotate database credentials and restart all API pods.${NC}"
echo -e "${YELLOW}   The API will remain available throughout the process (rolling restart).${NC}"
echo ""
read -p "Do you want to continue? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "Aborted."
  exit 0
fi

# Step 1: Generate new password
echo -e "${GREEN}[1/6] Generating new secure password...${NC}"
NEW_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
NEW_PASSWORD_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$NEW_PASSWORD', safe=''))")
NEW_DATABASE_URL="postgresql://${DB_USER}:${NEW_PASSWORD_ENCODED}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "✓ New password generated (${#NEW_PASSWORD} characters)"
echo ""

# Step 2: Update PostgreSQL user password
echo -e "${GREEN}[2/6] Updating PostgreSQL user password...${NC}"
POSTGRES_POD=$(kubectl get pods -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}')
if [ -z "$POSTGRES_POD" ]; then
  echo -e "${RED}✗ PostgreSQL pod not found${NC}"
  exit 1
fi

# Change password in PostgreSQL
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -- psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$NEW_PASSWORD';" &>/dev/null
if [ $? -eq 0 ]; then
  echo "✓ PostgreSQL password updated successfully"
else
  echo -e "${RED}✗ Failed to update PostgreSQL password${NC}"
  exit 1
fi
echo ""

# Step 3: Update Kubernetes secret
echo -e "${GREEN}[3/6] Updating Kubernetes secret...${NC}"
kubectl create secret generic "$SECRET_NAME" \
  --namespace="$NAMESPACE" \
  --from-literal=postgres-password="$NEW_PASSWORD" \
  --from-literal=database-url="$NEW_DATABASE_URL" \
  --dry-run=client -o yaml | kubectl apply -f -

if [ $? -eq 0 ]; then
  echo "✓ Secret updated successfully"
else
  echo -e "${RED}✗ Failed to update secret${NC}"
  echo -e "${YELLOW}⚠️  WARNING: PostgreSQL password was changed but secret update failed!${NC}"
  echo -e "${YELLOW}   You may need to manually update the secret or restore the old password.${NC}"
  exit 1
fi
echo ""

# Step 4: Rolling restart of API pods
echo -e "${GREEN}[4/6] Performing rolling restart of API pods...${NC}"
kubectl rollout restart deployment/${RELEASE_NAME}-api -n "$NAMESPACE"
echo "✓ Rolling restart initiated"
echo ""

# Step 5: Wait for rollout to complete
echo -e "${GREEN}[5/6] Waiting for rollout to complete...${NC}"
kubectl rollout status deployment/${RELEASE_NAME}-api -n "$NAMESPACE" --timeout=5m
if [ $? -eq 0 ]; then
  echo "✓ All API pods updated successfully"
else
  echo -e "${RED}✗ Rollout failed or timed out${NC}"
  echo -e "${YELLOW}   Check pod status: kubectl get pods -n $NAMESPACE${NC}"
  exit 1
fi
echo ""

# Step 6: Verify pods are healthy
echo -e "${GREEN}[6/6] Verifying pod health...${NC}"
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
  echo -e "${GREEN}✓ Rotation complete! $HEALTHY_COUNT API pod(s) are healthy.${NC}"
  echo ""
  echo -e "${GREEN}Summary:${NC}"
  echo "  • Database password rotated"
  echo "  • Kubernetes secret updated"
  echo "  • API pods restarted with new credentials"
  echo "  • Zero downtime maintained (rolling restart)"
  echo ""
  echo -e "${YELLOW}Next steps:${NC}"
  echo "  1. Verify application functionality"
  echo "  2. Check logs: kubectl logs -n $NAMESPACE -l app=api --tail=50"
  echo "  3. Update any external tools that use direct database access"
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
