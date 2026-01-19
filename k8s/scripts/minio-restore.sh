#!/bin/bash
#
# MinIO Restore Script
# Usage: ./minio-restore.sh [namespace] [release-name] [backup-file]
#
# Example: ./minio-restore.sh vocab-app-staging vocab-app minio_backup_20260119_120000.tar.gz
#
# WARNING: This will overwrite existing files in the bucket!
#

set -euo pipefail

NAMESPACE="${1:-vocab-app-staging}"
RELEASE="${2:-vocab-app}"
BACKUP_FILE="${3:-}"
BUCKET="vocab-documents"

if [ -z "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not specified"
  echo "Usage: $0 [namespace] [release-name] [backup-file]"
  exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "=== MinIO Restore ==="
echo "Namespace: ${NAMESPACE}"
echo "Release: ${RELEASE}"
echo "Bucket: ${BUCKET}"
echo "Backup File: ${BACKUP_FILE}"
echo

# Verify backup integrity
echo "Verifying backup integrity..."
if ! tar -tzf "${BACKUP_FILE}" > /dev/null 2>&1; then
  echo "ERROR: Backup file is corrupted!"
  exit 1
fi
echo "✓ Backup integrity check passed"
echo

# Count files in backup
FILE_COUNT=$(tar -tzf "${BACKUP_FILE}" 2>/dev/null | wc -l)
echo "Backup contains ${FILE_COUNT} files"
echo

# Get MinIO pod name
MINIO_POD=$(kubectl get pod -n "${NAMESPACE}" -l v1.min.io/tenant="${RELEASE}-storage" -o jsonpath='{.items[0].metadata.name}')

if [ -z "${MINIO_POD}" ]; then
  echo "ERROR: No MinIO pod found in namespace ${NAMESPACE}"
  exit 1
fi

echo "Found MinIO pod: ${MINIO_POD}"
echo

# Get MinIO credentials from secret
MINIO_ACCESS_KEY=$(kubectl get secret -n "${NAMESPACE}" "${RELEASE}-minio-secret" -o jsonpath='{.data.accessKey}' | base64 -d)
MINIO_SECRET_KEY=$(kubectl get secret -n "${NAMESPACE}" "${RELEASE}-minio-secret" -o jsonpath='{.data.secretKey}' | base64 -d)
MINIO_ENDPOINT="https://${RELEASE}-storage-hl:9000"

echo "MinIO Endpoint: ${MINIO_ENDPOINT}"
echo

# Confirm restore
read -p "WARNING: This will overwrite existing files in bucket '${BUCKET}'. Continue? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

echo
echo "Restoring backup..."

# Extract backup and upload to MinIO using temporary pod
cat "${BACKUP_FILE}" | kubectl run minio-restore-temp-$(date +%s) \
  --image=minio/mc:latest \
  --restart=Never \
  --rm -i -n "${NAMESPACE}" \
  --env="MC_INSECURE=true" \
  --command -- /bin/sh -c "
    # Save backup to temp file
    cat > /backup.tar.gz

    # Extract backup
    mkdir -p /restore
    tar -xzf /backup.tar.gz -C /restore

    # Configure MinIO client
    mc alias set myminio ${MINIO_ENDPOINT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY}

    # Mirror files to bucket (this will overwrite existing files)
    mc mirror --preserve --overwrite /restore/ myminio/${BUCKET}/

    echo 'Restore completed'
  "

echo
echo "=== Restore Completed ==="
echo "Bucket: ${BUCKET}"
echo "Restored from: ${BACKUP_FILE}"
echo "Restored at: $(date)"
echo
echo "Verify files with:"
echo "  kubectl run mc-verify --image=minio/mc:latest --restart=Never --rm -i -n ${NAMESPACE} --env='MC_INSECURE=true' -- /bin/sh -c 'mc alias set myminio ${MINIO_ENDPOINT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY} && mc ls myminio/${BUCKET}/'"
