#!/bin/bash
#
# PostgreSQL Restore Script
# Usage: ./postgres-restore.sh [namespace] [release-name] [backup-file]
#
# Example: ./postgres-restore.sh vocab-app-staging vocab-app postgres_backup_20260119_120000.sql.gz
#
# WARNING: This will DROP and recreate the database!
#

set -euo pipefail

NAMESPACE="${1:-vocab-app-staging}"
RELEASE="${2:-vocab-app}"
BACKUP_FILE="${3:-}"

if [ -z "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not specified"
  echo "Usage: $0 [namespace] [release-name] [backup-file]"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "=== PostgreSQL Restore ==="
echo "Namespace: ${NAMESPACE}"
echo "Release: ${RELEASE}"
echo "Backup File: ${BACKUP_FILE}"
echo

# Verify backup integrity
echo "Verifying backup integrity..."
if ! gunzip -t "${BACKUP_FILE}"; then
  echo "ERROR: Backup file is corrupted!"
  exit 1
fi
echo "✓ Backup integrity check passed"
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

# Confirm restore
read -p "WARNING: This will DROP and recreate the database '${DB_NAME}'. Continue? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Scale down API pods to prevent connections during restore
echo
echo "Scaling down API pods..."
kubectl scale deployment -n "${NAMESPACE}" "${RELEASE}-api" --replicas=0
sleep 5

# Terminate existing connections
echo "Terminating existing database connections..."
kubectl exec -n "${NAMESPACE}" "${POSTGRES_POD}" -- \
  bash -c "PGPASSWORD='${DB_PASSWORD}' psql -U ${DB_USER} -d postgres -c \"
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
  \"" || true

# Drop and recreate database
echo "Dropping and recreating database..."
kubectl exec -n "${NAMESPACE}" "${POSTGRES_POD}" -- \
  bash -c "PGPASSWORD='${DB_PASSWORD}' psql -U ${DB_USER} -d postgres -c \"DROP DATABASE IF EXISTS ${DB_NAME};\""

kubectl exec -n "${NAMESPACE}" "${POSTGRES_POD}" -- \
  bash -c "PGPASSWORD='${DB_PASSWORD}' psql -U ${DB_USER} -d postgres -c \"CREATE DATABASE ${DB_NAME};\""

# Restore backup
echo "Restoring backup..."
gunzip -c "${BACKUP_FILE}" | kubectl exec -i -n "${NAMESPACE}" "${POSTGRES_POD}" -- \
  bash -c "PGPASSWORD='${DB_PASSWORD}' psql -U ${DB_USER} -d ${DB_NAME}"

echo "✓ Database restored successfully"
echo

# Scale API pods back up
echo "Scaling API pods back up..."
kubectl scale deployment -n "${NAMESPACE}" "${RELEASE}-api" --replicas=2

echo
echo "=== Restore Completed ==="
echo "Database: ${DB_NAME}"
echo "Restored from: ${BACKUP_FILE}"
echo "Restored at: $(date)"
echo
echo "API pods are scaling back up. Monitor with:"
echo "  kubectl get pods -n ${NAMESPACE} -l app=vocab-api -w"
