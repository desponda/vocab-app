#!/bin/bash
#
# Manual PostgreSQL Backup Script
# Usage: ./postgres-backup-manual.sh [namespace] [release-name]
#
# Example: ./postgres-backup-manual.sh vocab-app-staging vocab-app
#

set -euo pipefail

NAMESPACE="${1:-vocab-app-staging}"
RELEASE="${2:-vocab-app}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="postgres_backup_${TIMESTAMP}.sql.gz"

echo "=== PostgreSQL Manual Backup ==="
echo "Namespace: ${NAMESPACE}"
echo "Release: ${RELEASE}"
echo "Timestamp: ${TIMESTAMP}"
echo

# Get postgres pod name
POSTGRES_POD=$(kubectl get pod -n "${NAMESPACE}" -l app=postgres -o jsonpath='{.items[0].metadata.name}')

if [ -z "${POSTGRES_POD}" ]; then
  echo "ERROR: No postgres pod found in namespace ${NAMESPACE}"
  exit 1
fi

echo "Found postgres pod: ${POSTGRES_POD}"
echo

# Get database credentials from secret
DB_PASSWORD=$(kubectl get secret -n "${NAMESPACE}" "${RELEASE}-database-secret" -o jsonpath='{.data.postgres-password}' | base64 -d)
DB_NAME=$(kubectl exec -n "${NAMESPACE}" "${POSTGRES_POD}" -- printenv POSTGRES_DB)
DB_USER=$(kubectl exec -n "${NAMESPACE}" "${POSTGRES_POD}" -- printenv POSTGRES_USER)

echo "Database: ${DB_NAME}"
echo "User: ${DB_USER}"
echo

# Perform backup
echo "Starting backup..."
kubectl exec -n "${NAMESPACE}" "${POSTGRES_POD}" -- \
  bash -c "PGPASSWORD='${DB_PASSWORD}' pg_dump \
    --host=localhost \
    --port=5432 \
    --username=${DB_USER} \
    --dbname=${DB_NAME} \
    --format=plain \
    --no-owner \
    --no-acl" | gzip > "${BACKUP_FILE}"

# Verify backup was created
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not created!"
  exit 1
fi

# Get backup size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo
echo "=== Backup Completed ==="
echo "File: ${BACKUP_FILE}"
echo "Size: ${BACKUP_SIZE}"
echo

# Verify integrity
echo "Verifying backup integrity..."
if gunzip -t "${BACKUP_FILE}"; then
  echo "✓ Backup integrity check passed"
else
  echo "✗ Backup integrity check failed!"
  exit 1
fi

echo
echo "=== Backup Summary ==="
echo "Backup file: ${BACKUP_FILE}"
echo "Size: ${BACKUP_SIZE}"
echo "Created: $(date)"
echo
echo "To restore this backup, run:"
echo "  ./postgres-restore.sh ${NAMESPACE} ${RELEASE} ${BACKUP_FILE}"
