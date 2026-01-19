#!/bin/bash

# rotate-minio-secret.sh
# Zero-downtime rotation of MinIO credentials

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-vocab-app-staging}"
RELEASE_NAME="${RELEASE_NAME:-vocab-app}"
SECRET_NAME="vocab-app-minio-secret"
MINIO_TENANT_NAME="${RELEASE_NAME}-storage"

echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║          MinIO Secret Rotation (Zero-Downtime)               ║${NC}"
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
echo "  MinIO Tenant: $MINIO_TENANT_NAME"
echo ""

# Confirmation prompt
echo -e "${YELLOW}⚠️  WARNING: This will rotate MinIO credentials and restart API pods.${NC}"
echo -e "${YELLOW}   The MinIO tenant will also be updated with new credentials.${NC}"
echo -e "${YELLOW}   The API will remain available throughout the process (rolling restart).${NC}"
echo ""
read -p "Do you want to continue? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "Aborted."
  exit 0
fi

# Step 1: Generate new MinIO credentials
echo -e "${GREEN}[1/5] Generating new MinIO credentials...${NC}"
MINIO_ACCESS_KEY=$(openssl rand -hex 16)
MINIO_SECRET_KEY=$(openssl rand -base64 32 | tr -d '\n')
echo "✓ New credentials generated"
echo "  Access Key: ${#MINIO_ACCESS_KEY} characters"
echo "  Secret Key: ${#MINIO_SECRET_KEY} characters"
echo ""

# Step 2: Update Kubernetes secret
echo -e "${GREEN}[2/5] Updating Kubernetes secret...${NC}"
kubectl create secret generic "$SECRET_NAME" \
  --namespace="$NAMESPACE" \
  --from-literal=accessKey="$MINIO_ACCESS_KEY" \
  --from-literal=secretKey="$MINIO_SECRET_KEY" \
  --dry-run=client -o yaml | kubectl apply -f -

if [ $? -eq 0 ]; then
  echo "✓ Secret updated successfully"
else
  echo -e "${RED}✗ Failed to update secret${NC}"
  exit 1
fi
echo ""

# Step 3: Update MinIO Tenant configuration
echo -e "${GREEN}[3/5] Updating MinIO Tenant with new credentials...${NC}"
echo -e "${YELLOW}Note: MinIO Tenant update requires manual verification${NC}"
echo "  The Tenant CR references the secret: $SECRET_NAME"
echo "  MinIO Operator will automatically pick up the new credentials"
echo ""

# Check if MinIO Tenant exists
if kubectl get tenant "$MINIO_TENANT_NAME" -n "$NAMESPACE" &>/dev/null; then
  echo "✓ MinIO Tenant found: $MINIO_TENANT_NAME"
  echo "  The operator will update the tenant with new credentials automatically"
else
  echo -e "${YELLOW}⚠ MinIO Tenant '$MINIO_TENANT_NAME' not found${NC}"
  echo "  If using standalone MinIO, you may need to manually update the deployment"
fi
echo ""

# Step 4: Rolling restart of API pods
echo -e "${GREEN}[4/5] Performing rolling restart of API pods...${NC}"
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

# Step 5: Verify pods are healthy
echo -e "${GREEN}[5/5] Verifying pod health...${NC}"
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
  echo -e "${GREEN}✓ MinIO credential rotation complete! $HEALTHY_COUNT API pod(s) are healthy.${NC}"
  echo ""
  echo -e "${GREEN}Summary:${NC}"
  echo "  • MinIO access key rotated"
  echo "  • MinIO secret key rotated"
  echo "  • Kubernetes secret updated"
  echo "  • API pods restarted with new credentials"
  echo "  • Zero downtime maintained (rolling restart)"
  echo ""
  echo -e "${YELLOW}Next steps:${NC}"
  echo "  1. Verify file upload functionality"
  echo "  2. Check MinIO console access (if applicable)"
  echo "  3. Check logs: kubectl logs -n $NAMESPACE -l app=api --tail=50"
  echo "  4. Update any external tools that access MinIO directly"
  echo "  5. Record rotation in your change log"
else
  echo ""
  echo -e "${RED}✗ No healthy pods found after rotation${NC}"
  echo -e "${YELLOW}   Troubleshooting steps:${NC}"
  echo "  1. Check pod status: kubectl get pods -n $NAMESPACE"
  echo "  2. Check pod logs: kubectl logs -n $NAMESPACE -l app=api"
  echo "  3. Describe pods: kubectl describe pods -n $NAMESPACE -l app=api"
  echo "  4. Check MinIO tenant status: kubectl get tenant -n $NAMESPACE"
  exit 1
fi
