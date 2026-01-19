# MinIO Backup & Recovery Guide

## Overview

This guide covers backup and recovery procedures for the MinIO object storage system used for file uploads (vocabulary sheets, images, PDFs).

**Backup Strategy:**
- **Bucket Versioning**: Enabled by default for file recovery
- **Automated Daily Backups**: CronJob runs at 3:00 AM UTC daily
- **Retention Policy**: 30 days (configurable)
- **Backup Format**: Compressed tarball (`.tar.gz`)
- **Storage**: Kubernetes PersistentVolume (15Gi for ~1,000 users)

---

## Table of Contents

1. [Bucket Versioning](#bucket-versioning)
2. [Automated Backups](#automated-backups)
3. [Manual Backups](#manual-backups)
4. [Restore Procedures](#restore-procedures)
5. [File Recovery](#file-recovery)
6. [Troubleshooting](#troubleshooting)

---

## Bucket Versioning

### What is Versioning?

MinIO bucket versioning keeps multiple versions of an object in the same bucket. This allows you to recover from:
- Accidental deletions
- Unintended overwrites
- Application errors that corrupt files

### How It Works

- **Automatically enabled** when the API starts up (see `apps/api/src/lib/minio.ts`)
- Each file upload creates a new version
- Previous versions are retained until explicitly deleted
- Deleted files can be recovered from previous versions

### Checking Versioning Status

```bash
# Run MinIO client in temporary pod
kubectl run mc-check --image=minio/mc:latest --restart=Never --rm -i \
  -n vocab-app-staging --env="MC_INSECURE=true" -- /bin/sh -c "
    mc alias set myminio https://vocab-app-storage-hl:9000 \$(kubectl get secret vocab-app-minio-secret -n vocab-app-staging -o jsonpath='{.data.accessKey}' | base64 -d) \$(kubectl get secret vocab-app-minio-secret -n vocab-app-staging -o jsonpath='{.data.secretKey}' | base64 -d)
    mc version info myminio/vocab-documents
  "
```

---

## Automated Backups

### Configuration

Automated backups are configured in `k8s/helm/vocab-app/values.yaml`:

```yaml
minio:
  backup:
    enabled: true
    schedule: "0 3 * * *"  # Daily at 3:00 AM UTC
    retentionDays: 30      # Keep 30 days of backups
    storageSize: 15Gi      # PVC size for backups
```

### How It Works

1. **CronJob** runs daily at 3:00 AM UTC (1 hour after database backup)
2. **MinIO Client** (mc) mirrors entire bucket to temporary directory
3. **Compression** creates tarball of all files
4. **Cleanup** removes backups older than 30 days
5. **Logs** stored in `/backups/backup_TIMESTAMP.log`

### Monitoring Automated Backups

```bash
# Check CronJob status
kubectl get cronjob vocab-app-minio-backup -n vocab-app-staging

# View recent backup jobs
kubectl get jobs -n vocab-app-staging -l app=minio-backup

# Check latest backup logs
kubectl logs -n vocab-app-staging -l app=minio-backup --tail=100

# List backups in PVC
BACKUP_POD=$(kubectl get pod -n vocab-app-staging -l app=minio-backup -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -n "$BACKUP_POD" ]; then
  kubectl exec -n vocab-app-staging ${BACKUP_POD} -- ls -lh /backups/*.tar.gz
fi
```

### Storage Estimates (for ~1,000 users)

| Scenario | Est. Storage | Backup Size (compressed) |
|----------|--------------|--------------------------|
| 1,000 users × 5 files × 3MB avg | ~15GB | ~10GB (30-50% compression) |
| 30 days of daily backups | - | ~300GB (without cleanup) |
| With 30-day retention | - | ~10GB (incremental changes only) |

---

## Manual Backups

### When to Run Manual Backups

- Before major application upgrades
- Before MinIO version upgrades
- Before bulk file deletions
- On-demand for disaster recovery testing
- Before risky operations

### Running Manual Backup

```bash
# Navigate to scripts directory
cd /workspace/k8s/scripts

# Make script executable
chmod +x minio-backup-manual.sh

# Run backup (default: vocab-app-staging namespace)
./minio-backup-manual.sh

# Or specify custom namespace/release
./minio-backup-manual.sh my-namespace my-release
```

**Script Output:**
```
=== MinIO Manual Backup ===
Namespace: vocab-app-staging
Release: vocab-app
Bucket: vocab-documents
Timestamp: 20260119_120000

Found MinIO pod: vocab-app-storage-pool-0-0

MinIO Endpoint: https://vocab-app-storage-hl:9000

Starting backup...

=== Backup Completed ===
File: minio_backup_20260119_120000.tar.gz
Size: 8.2G
Files: 5432
Created: Sun Jan 19 12:00:00 UTC 2026

To restore this backup, run:
  ./minio-restore.sh vocab-app-staging vocab-app minio_backup_20260119_120000.tar.gz
```

### Backing Up to External Storage

```bash
# AWS S3
aws s3 cp minio_backup_20260119_120000.tar.gz \
  s3://vocab-app-backups/minio/2026/01/

# Google Cloud Storage
gsutil cp minio_backup_20260119_120000.tar.gz \
  gs://vocab-app-backups/minio/2026/01/

# Azure Blob Storage
az storage blob upload \
  --account-name vocabappbackups \
  --container-name minio \
  --name 2026/01/minio_backup_20260119_120000.tar.gz \
  --file minio_backup_20260119_120000.tar.gz
```

---

## Restore Procedures

### ⚠️ CRITICAL WARNINGS

**BEFORE RESTORING:**
1. **Restoring will overwrite existing files in the bucket**
2. **Files not in the backup will remain (not deleted)**
3. **Always create a fresh backup BEFORE restoring**
4. **Test restore in staging environment first**
5. **Application continues running during restore (may serve old files briefly)**

### Pre-Restore Checklist

- [ ] Backup current MinIO bucket (even if corrupted)
- [ ] Verify backup file integrity
- [ ] Notify team of maintenance (optional - no downtime required)
- [ ] Have rollback plan ready

### Running a Restore

```bash
# Navigate to scripts directory
cd /workspace/k8s/scripts

# Make script executable
chmod +x minio-restore.sh

# Run restore
./minio-restore.sh vocab-app-staging vocab-app minio_backup_20260119_120000.tar.gz
```

**Script will:**
1. Verify backup file integrity
2. Extract tarball
3. Upload files to MinIO bucket (overwrites existing)
4. No API downtime required

**Expected Output:**
```
=== MinIO Restore ===
Namespace: vocab-app-staging
Release: vocab-app
Bucket: vocab-documents
Backup File: minio_backup_20260119_120000.tar.gz

Verifying backup integrity...
✓ Backup integrity check passed

Backup contains 5432 files

Found MinIO pod: vocab-app-storage-pool-0-0

MinIO Endpoint: https://vocab-app-storage-hl:9000

WARNING: This will overwrite existing files in bucket 'vocab-documents'. Continue? (yes/no): yes

Restoring backup...
Restore completed

=== Restore Completed ===
Bucket: vocab-documents
Restored from: minio_backup_20260119_120000.tar.gz
Restored at: Sun Jan 19 13:00:00 UTC 2026
```

### Post-Restore Verification

```bash
# 1. Check file count in bucket
kubectl run mc-verify --image=minio/mc:latest --restart=Never --rm -i \
  -n vocab-app-staging --env="MC_INSECURE=true" -- /bin/sh -c "
    mc alias set myminio https://vocab-app-storage-hl:9000 <access-key> <secret-key>
    mc ls --recursive myminio/vocab-documents | wc -l
  "

# 2. Test file download through API
curl -I https://vocab-staging.dresponda.com/api/vocabulary-sheets/SHEET_ID/download

# 3. Test file upload
# (use application UI to upload a test file)

# 4. Check application logs for MinIO errors
kubectl logs -n vocab-app-staging -l app=vocab-api --tail=100 | grep -i minio
```

---

## File Recovery

### Recover Single Deleted File

If versioning is enabled, you can recover deleted files without a full restore:

```bash
# 1. List all versions of a file
kubectl run mc-versions --image=minio/mc:latest --restart=Never --rm -i \
  -n vocab-app-staging --env="MC_INSECURE=true" -- /bin/sh -c "
    mc alias set myminio https://vocab-app-storage-hl:9000 <access-key> <secret-key>
    mc ls --versions myminio/vocab-documents/user123/file.pdf
  "

# 2. Copy specific version to restore it
kubectl run mc-restore --image=minio/mc:latest --restart=Never --rm -i \
  -n vocab-app-staging --env="MC_INSECURE=true" -- /bin/sh -c "
    mc alias set myminio https://vocab-app-storage-hl:9000 <access-key> <secret-key>
    mc cp --version-id VERSION_ID \
      myminio/vocab-documents/user123/file.pdf \
      myminio/vocab-documents/user123/file.pdf
  "
```

### Recover All Files from Specific Date

Extract specific files from a backup without full restore:

```bash
# Extract backup to view contents
tar -xzf minio_backup_20260119_120000.tar.gz -C /tmp/minio-restore

# Copy specific files back to MinIO
# (use mc mirror with --newer-than flag)
```

---

## Troubleshooting

### Backup Failed - Disk Full

**Symptoms:**
- Backup job fails with "No space left on device"
- PVC at 100% capacity

**Resolution:**
```bash
# 1. Check PVC usage
kubectl get pvc vocab-app-minio-backup-pvc -n vocab-app-staging

# 2. Manually delete old backups
BACKUP_POD=$(kubectl get pod -n vocab-app-staging -l app=minio-backup -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n vocab-app-staging ${BACKUP_POD} -- \
  find /backups -name "minio_*.tar.gz" -mtime +30 -delete

# 3. Or increase PVC size
kubectl patch pvc vocab-app-minio-backup-pvc -n vocab-app-staging \
  -p '{"spec":{"resources":{"requests":{"storage":"30Gi"}}}}'
```

---

### Versioning Not Working

**Symptoms:**
- Deleted files cannot be recovered
- No previous versions visible

**Resolution:**
```bash
# 1. Check if versioning is enabled
kubectl logs -n vocab-app-staging -l app=vocab-api | grep "versioning"

# 2. Manually enable versioning
kubectl run mc-enable-versioning --image=minio/mc:latest --restart=Never --rm -i \
  -n vocab-app-staging --env="MC_INSECURE=true" -- /bin/sh -c "
    mc alias set myminio https://vocab-app-storage-hl:9000 <access-key> <secret-key>
    mc version enable myminio/vocab-documents
  "

# 3. Restart API pods to re-initialize
kubectl rollout restart deployment/vocab-app-api -n vocab-app-staging
```

---

### Backup Taking Too Long

**Symptoms:**
- Backup job times out
- Backup runs for hours

**Resolution:**
```bash
# 1. Check file count and size
kubectl run mc-stats --image=minio/mc:latest --restart=Never --rm -i \
  -n vocab-app-staging --env="MC_INSECURE=true" -- /bin/sh -c "
    mc alias set myminio https://vocab-app-storage-hl:9000 <access-key> <secret-key>
    mc du myminio/vocab-documents
  "

# 2. Increase job timeout in CronJob spec
kubectl edit cronjob vocab-app-minio-backup -n vocab-app-staging
# Add: spec.jobTemplate.spec.activeDeadlineSeconds: 7200

# 3. Consider incremental backups or external backup solution
```

---

## Best Practices

1. **Enable Versioning**: Always keep versioning enabled
2. **Regular Testing**: Test restore procedure monthly
3. **Off-Site Storage**: Upload critical backups to S3/GCS/Azure
4. **Monitoring**: Set up alerts for backup failures
5. **Lifecycle Policies**: Configure automatic deletion of old versions
6. **Encryption**: Enable server-side encryption for sensitive files
7. **Access Control**: Use bucket policies to restrict access

---

## Useful Commands

```bash
# List all files in bucket
kubectl run mc-ls --image=minio/mc:latest --restart=Never --rm -i \
  -n vocab-app-staging --env="MC_INSECURE=true" -- /bin/sh -c "
    mc alias set myminio https://vocab-app-storage-hl:9000 <access-key> <secret-key>
    mc ls --recursive myminio/vocab-documents
  "

# Check bucket size
kubectl run mc-du --image=minio/mc:latest --restart=Never --rm -i \
  -n vocab-app-staging --env="MC_INSECURE=true" -- /bin/sh -c "
    mc alias set myminio https://vocab-app-storage-hl:9000 <access-key> <secret-key>
    mc du myminio/vocab-documents
  "

# Copy backup from PVC to local
kubectl cp vocab-app-staging/BACKUP_POD:/backups/minio_*.tar.gz ./local-backup.tar.gz

# Force CronJob to run now
kubectl create job minio-backup-manual --from=cronjob/vocab-app-minio-backup -n vocab-app-staging
```

---

**Last Updated**: 2026-01-19
**Owner**: DevOps Team
**Reviewers**: Storage Team, SRE Team
