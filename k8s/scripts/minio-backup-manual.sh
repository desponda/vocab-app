#!/bin/bash
#
# Manual MinIO Backup Script
# Usage: ./minio-backup-manual.sh [namespace] [release-name]
#
# Example: ./minio-backup-manual.sh vocab-app-staging vocab-app
#

set -euo pipefail

NAMESPACE="${1:-vocab-app-staging}"
RELEASE="${2:-vocab-app}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="minio_backup_${TIMESTAMP}.tar.gz"
BUCKET="vocab-documents"

echo "=== MinIO Manual Backup ==="
echo "Namespace: ${NAMESPACE}"
echo "Release: ${RELEASE}"
echo "Bucket: ${BUCKET}"
echo "Timestamp: ${TIMESTAMP}"
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

# Create temp directory
TEMP_DIR="/tmp/minio-backup-${TIMESTAMP}"
mkdir -p "${TEMP_DIR}"

echo "Starting backup..."

# Set up MinIO client alias in a temporary pod
kubectl run minio-backup-temp-${TIMESTAMP} \
  --image=minio/mc:latest \
  --restart=Never \
  --rm -i -n "${NAMESPACE}" \
  --env="MC_INSECURE=true" \
  --command -- /bin/sh -c "
    mc alias set myminio ${MINIO_ENDPOINT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY}
    mc mirror --preserve myminio/${BUCKET} /backup/
    tar -czf /backup.tar.gz -C /backup .
    cat /backup.tar.gz
  " > "${BACKUP_FILE}"

# Verify backup was created
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file not created!"
  exit 1
fi

# Get backup size
BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

# Count files in backup
FILE_COUNT=$(tar -tzf "${BACKUP_FILE}" 2>/dev/null | wc -l)

echo
echo "=== Backup Completed ==="
echo "File: ${BACKUP_FILE}"
echo "Size: ${BACKUP_SIZE}"
echo "Files: ${FILE_COUNT}"
echo "Created: $(date)"
echo
echo "To restore this backup, run:"
echo "  ./minio-restore.sh ${NAMESPACE} ${RELEASE} ${BACKUP_FILE}"
