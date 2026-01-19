# PostgreSQL Backup & Restore Guide

## Overview

This guide covers the automated and manual backup/restore procedures for the Vocab App PostgreSQL database.

**Backup Strategy:**
- **Automated Daily Backups**: CronJob runs at 2:00 AM UTC daily
- **Retention Policy**: 30 days (configurable)
- **Backup Format**: Compressed SQL dump (`.sql.gz`)
- **Storage**: Kubernetes PersistentVolume (30Gi)
- **Verification**: Automatic integrity checks after each backup

---

## Table of Contents

1. [Automated Backups](#automated-backups)
2. [Manual Backups](#manual-backups)
3. [Restore Procedures](#restore-procedures)
4. [Backup Verification](#backup-verification)
5. [Troubleshooting](#troubleshooting)
6. [Disaster Recovery](#disaster-recovery)

---

## Automated Backups

### Configuration

Automated backups are configured in `k8s/helm/vocab-app/values.yaml`:

```yaml
postgres:
  backup:
    enabled: true
    schedule: "0 2 * * *"  # Daily at 2:00 AM UTC
    retentionDays: 30      # Keep 30 days of backups
    storageSize: 30Gi      # PVC size for backups
```

### How It Works

1. **CronJob** runs daily at 2:00 AM UTC
2. **pg_dump** creates compressed SQL backup
3. **Integrity check** verifies backup is valid
4. **Cleanup** removes backups older than 30 days
5. **Logs** stored in `/backups/backup_TIMESTAMP.log`

### Monitoring Automated Backups

```bash
# Check CronJob status
kubectl get cronjob -n vocab-app-staging

# View recent backup jobs
kubectl get jobs -n vocab-app-staging -l app=postgres-backup

# Check latest backup logs
kubectl logs -n vocab-app-staging job/vocab-app-postgres-backup-XXXXXXXX

# List backups in PVC
kubectl exec -n vocab-app-staging deploy/vocab-app-postgres -- \
  ls -lh /backups/*.sql.gz
```

### Accessing Backup Files

```bash
# Copy backup file from PVC to local machine
BACKUP_POD=$(kubectl get pod -n vocab-app-staging -l app=postgres-backup -o jsonpath='{.items[0].metadata.name}')
kubectl cp vocab-app-staging/${BACKUP_POD}:/backups/postgres_vocab_app_staging_20260119_020000.sql.gz ./local-backup.sql.gz
```

---

## Manual Backups

### When to Run Manual Backups

- Before major application upgrades
- Before database schema migrations
- Before data migrations or bulk updates
- On-demand for disaster recovery testing
- Before risky operations (e.g., deleting large amounts of data)

### Running Manual Backup

```bash
# Navigate to scripts directory
cd /workspace/k8s/scripts

# Make script executable
chmod +x postgres-backup-manual.sh

# Run backup (default: vocab-app-staging namespace)
./postgres-backup-manual.sh

# Or specify custom namespace/release
./postgres-backup-manual.sh my-namespace my-release
```

**Script Output:**
```
=== PostgreSQL Manual Backup ===
Namespace: vocab-app-staging
Release: vocab-app
Timestamp: 20260119_120000

Found postgres pod: vocab-app-postgres-0

Database: vocab_app_staging
User: postgres

Starting backup...

=== Backup Completed ===
File: postgres_backup_20260119_120000.sql.gz
Size: 156M

Verifying backup integrity...
✓ Backup integrity check passed

=== Backup Summary ===
Backup file: postgres_backup_20260119_120000.sql.gz
Size: 156M
Created: Sun Jan 19 12:00:00 UTC 2026

To restore this backup, run:
  ./postgres-restore.sh vocab-app-staging vocab-app postgres_backup_20260119_120000.sql.gz
```

### Backing Up to External Storage

After creating a backup, upload to external storage:

```bash
# AWS S3
aws s3 cp postgres_backup_20260119_120000.sql.gz \
  s3://vocab-app-backups/postgres/2026/01/

# Google Cloud Storage
gsutil cp postgres_backup_20260119_120000.sql.gz \
  gs://vocab-app-backups/postgres/2026/01/

# Azure Blob Storage
az storage blob upload \
  --account-name vocabappbackups \
  --container-name postgres \
  --name 2026/01/postgres_backup_20260119_120000.sql.gz \
  --file postgres_backup_20260119_120000.sql.gz
```

---

## Restore Procedures

### ⚠️ CRITICAL WARNINGS

**BEFORE RESTORING:**
1. **Restoring will DROP and recreate the entire database**
2. **All current data will be LOST**
3. **Always create a fresh backup BEFORE restoring**
4. **Test restore in staging environment first**
5. **Coordinate with team - API will be unavailable during restore**

### Pre-Restore Checklist

- [ ] Backup current database (even if corrupted)
- [ ] Verify backup file integrity
- [ ] Notify team of maintenance window
- [ ] Update status page (if customer-facing)
- [ ] Have rollback plan ready

### Running a Restore

```bash
# Navigate to scripts directory
cd /workspace/k8s/scripts

# Make script executable
chmod +x postgres-restore.sh

# Run restore
./postgres-restore.sh vocab-app-staging vocab-app postgres_backup_20260119_120000.sql.gz
```

**Script will:**
1. Verify backup file integrity
2. Scale down API pods (prevents connections)
3. Terminate existing database connections
4. Drop and recreate database
5. Restore from backup
6. Scale API pods back up

**Expected Output:**
```
=== PostgreSQL Restore ===
Namespace: vocab-app-staging
Release: vocab-app
Backup File: postgres_backup_20260119_120000.sql.gz

Verifying backup integrity...
✓ Backup integrity check passed

Found postgres pod: vocab-app-postgres-0

Database: vocab_app_staging
User: postgres

WARNING: This will DROP and recreate the database 'vocab_app_staging'. Continue? (yes/no): yes

Scaling down API pods...
Terminating existing database connections...
Dropping and recreating database...
Restoring backup...
✓ Database restored successfully

Scaling API pods back up...

=== Restore Completed ===
Database: vocab_app_staging
Restored from: postgres_backup_20260119_120000.sql.gz
Restored at: Sun Jan 19 13:00:00 UTC 2026

API pods are scaling back up. Monitor with:
  kubectl get pods -n vocab-app-staging -l app=vocab-api -w
```

### Post-Restore Verification

```bash
# 1. Check API pods are running
kubectl get pods -n vocab-app-staging -l app=vocab-api

# 2. Check health endpoint
curl https://vocab-staging.dresponda.com/api/health/ready

# 3. Verify database connectivity
kubectl exec -n vocab-app-staging deploy/vocab-app-api -- \
  node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$queryRaw\`SELECT COUNT(*) FROM \"User\"\`.then(console.log)"

# 4. Check application logs for errors
kubectl logs -n vocab-app-staging -l app=vocab-api --tail=100

# 5. Test critical user flows (login, create test, etc.)
```

---

## Backup Verification

### Verify Backup Integrity

```bash
# Test gunzip extraction
gunzip -t postgres_backup_20260119_120000.sql.gz

# Extract and inspect first 100 lines
gunzip -c postgres_backup_20260119_120000.sql.gz | head -100

# Check backup size (should be reasonable)
du -h postgres_backup_20260119_120000.sql.gz
```

### Test Restore (Staging Environment)

**Best Practice**: Always test restore in staging before production

```bash
# 1. Create fresh backup of staging
./postgres-backup-manual.sh vocab-app-staging vocab-app

# 2. Restore production backup to staging
./postgres-restore.sh vocab-app-staging vocab-app production_backup_20260119_020000.sql.gz

# 3. Verify application works correctly
# 4. Restore staging from fresh backup
./postgres-restore.sh vocab-app-staging vocab-app postgres_backup_TIMESTAMP.sql.gz
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
kubectl exec -n vocab-app-staging -it \
  $(kubectl get pod -n vocab-app-staging -l app=postgres-backup -o jsonpath='{.items[0].metadata.name}') \
  -- df -h /backups

# 2. Manually delete old backups
kubectl exec -n vocab-app-staging -it \
  $(kubectl get pod -n vocab-app-staging -l app=postgres-backup -o jsonpath='{.items[0].metadata.name}') \
  -- find /backups -name "postgres_*.sql.gz" -mtime +30 -delete

# 3. Or increase PVC size (requires downtime)
kubectl patch pvc vocab-app-postgres-backup-pvc -n vocab-app-staging \
  -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
```

---

### Backup Job Not Running

**Symptoms:**
- No recent backup jobs
- CronJob exists but doesn't execute

**Troubleshooting:**
```bash
# 1. Check CronJob status
kubectl get cronjob vocab-app-postgres-backup -n vocab-app-staging -o yaml

# 2. Check if suspended
kubectl patch cronjob vocab-app-postgres-backup -n vocab-app-staging \
  -p '{"spec":{"suspend":false}}'

# 3. Manually trigger backup job
kubectl create job vocab-app-postgres-backup-manual \
  --from=cronjob/vocab-app-postgres-backup \
  -n vocab-app-staging

# 4. Check job logs
kubectl logs -n vocab-app-staging job/vocab-app-postgres-backup-manual
```

---

### Restore Failed - API Pods Won't Start

**Symptoms:**
- Restore completes but API pods crash
- API logs show database connection errors

**Resolution:**
```bash
# 1. Check API pod logs
kubectl logs -n vocab-app-staging -l app=vocab-api

# 2. Check database is accepting connections
kubectl exec -n vocab-app-staging deploy/vocab-app-postgres -- \
  psql -U postgres -d vocab_app_staging -c "SELECT 1;"

# 3. Run migrations (schema might be outdated)
kubectl delete job vocab-app-migrations -n vocab-app-staging || true
helm upgrade vocab-app ./k8s/helm/vocab-app -n vocab-app-staging

# 4. Restart API pods
kubectl rollout restart deployment/vocab-app-api -n vocab-app-staging
```

---

### Corrupted Backup File

**Symptoms:**
- Backup integrity check fails
- `gunzip -t` returns error

**Resolution:**
```bash
# 1. Try to recover partial data
gunzip -c postgres_backup_corrupted.sql.gz 2>/dev/null > partial_restore.sql || true

# 2. Use previous backup
ls -lt postgres_backup_*.sql.gz | head -5  # List recent backups
./postgres-restore.sh vocab-app-staging vocab-app postgres_backup_20260118_020000.sql.gz

# 3. If all backups corrupted, check automated backup PVC
kubectl exec -n vocab-app-staging deploy/vocab-app-postgres -- \
  ls -lh /backups/*.sql.gz
```

---

## Disaster Recovery

### RTO/RPO Targets

- **RTO (Recovery Time Objective)**: 1 hour
  - Maximum acceptable downtime for database restore

- **RPO (Recovery Point Objective)**: 24 hours
  - Maximum acceptable data loss (1 day of data)
  - For critical periods, run manual backups more frequently

### DR Scenarios

#### Scenario 1: Database Pod Deleted

**Impact**: Low (StatefulSet will recreate pod with persistent data)

**Recovery**:
```bash
# No action needed - StatefulSet automatically recreates pod
kubectl get pods -n vocab-app-staging -w
```

---

#### Scenario 2: Database Corrupted

**Impact**: High (requires restore from backup)

**Recovery**:
1. Identify last good backup:
   ```bash
   kubectl exec -n vocab-app-staging deploy/vocab-app-postgres -- \
     ls -lt /backups/*.sql.gz | head -5
   ```
2. Run restore procedure (see [Restore Procedures](#restore-procedures))
3. Data loss: up to 24 hours (since last automated backup)

---

#### Scenario 3: Entire Cluster Lost

**Impact**: Critical (requires full disaster recovery)

**Recovery**:
1. Provision new Kubernetes cluster
2. Deploy Helm chart:
   ```bash
   helm install vocab-app ./k8s/helm/vocab-app -n vocab-app-production
   ```
3. Retrieve latest backup from external storage (S3/GCS/Azure)
4. Restore backup (see [Restore Procedures](#restore-procedures))
5. Verify application functionality
6. Update DNS to point to new cluster

**Prerequisites**:
- Backups regularly uploaded to external storage
- Infrastructure as Code (Helm charts) in version control
- Secrets backed up securely

---

## Best Practices

### Backup Best Practices

1. **Regular Testing**: Test restore procedure monthly
2. **Off-Site Storage**: Upload critical backups to S3/GCS/Azure
3. **Monitoring**: Set up alerts for backup failures
4. **Versioning**: Keep multiple backup generations
5. **Encryption**: Encrypt backups at rest and in transit
6. **Documentation**: Keep runbooks up to date

### Restore Best Practices

1. **Test First**: Always test restore in staging
2. **Fresh Backup**: Create backup before restore
3. **Maintenance Window**: Schedule during low-traffic periods
4. **Communication**: Notify team and users
5. **Verification**: Thoroughly test after restore
6. **Post-Mortem**: Document incidents and lessons learned

---

## Useful Commands

```bash
# List all backups (automated)
kubectl exec -n vocab-app-staging deploy/vocab-app-postgres -- \
  ls -lh /backups/*.sql.gz

# Check backup PVC usage
kubectl exec -n vocab-app-staging deploy/vocab-app-postgres -- \
  df -h /backups

# Force CronJob to run now
kubectl create job backup-manual --from=cronjob/vocab-app-postgres-backup -n vocab-app-staging

# View backup script
kubectl get configmap vocab-app-postgres-backup-script -n vocab-app-staging -o yaml

# Copy backup from PVC to local
kubectl cp vocab-app-staging/vocab-app-postgres-0:/backups/postgres_*.sql.gz ./local-backup.sql.gz
```

---

**Last Updated**: 2026-01-19
**Owner**: DevOps Team
**Reviewers**: Database Administrator, SRE Team
