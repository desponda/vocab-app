# Secrets Management Guide

## Overview

This guide covers secrets management for the Vocab App, including generation, rotation, and best practices for handling sensitive credentials.

**Secrets Managed:**
- **Database Credentials**: PostgreSQL password and connection URL
- **JWT Secrets**: Access and refresh token signing keys
- **MinIO Credentials**: S3-compatible storage access keys
- **Anthropic API Key**: Claude API access (optional)

---

## Table of Contents

1. [Architecture](#architecture)
2. [Secret Generation](#secret-generation)
3. [Secret Rotation](#secret-rotation)
4. [Rotation Schedule](#rotation-schedule)
5. [Troubleshooting](#troubleshooting)
6. [Security Best Practices](#security-best-practices)

---

## Architecture

### Automated Secret Generation

Secrets are automatically generated using Kubernetes Jobs with Helm hooks on first installation:

```yaml
# Helm hook annotations
annotations:
  "helm.sh/hook": pre-install,pre-upgrade
  "helm.sh/hook-weight": "0"
  "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded"
```

**Generation Process:**
1. Helm pre-install hook triggers secret generator job
2. Job checks if secret already exists (idempotent)
3. If not exists: generates secure random values using `openssl rand`
4. Creates Kubernetes Secret
5. Job completes and is automatically cleaned up
6. Secret persists across Helm upgrades

**Generator Jobs:**
- `database-secret-generator-job.yaml` - PostgreSQL credentials
- `jwt-secret-generator-job.yaml` - JWT signing keys
- `minio-secret-generator-job.yaml` - MinIO access credentials

### Secret Storage

All secrets are stored as Kubernetes Secrets:

```bash
# List all secrets
kubectl get secrets -n vocab-app-staging

# Example secrets:
# vocab-app-database-secret    Opaque    2      10d
# vocab-app-jwt-secret         Opaque    2      10d
# vocab-app-minio-secret       Opaque    2      10dco
# vocab-app-anthropic-secret   Opaque    1      10d
```

### RBAC Configuration

Secret generator jobs use dedicated ServiceAccounts with minimal permissions:

```yaml
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "create", "patch"]  # Only what's needed
```

---

## Secret Generation

### On First Install

Secrets are automatically generated when deploying the Helm chart for the first time:

```bash
# Install chart (secrets auto-generated)
helm install vocab-app ./k8s/helm/vocab-app -n vocab-app-staging

# Check secret generator job logs
kubectl logs -n vocab-app-staging job/vocab-app-database-secret-generator-1
kubectl logs -n vocab-app-staging job/vocab-app-jwt-secret-generator-1
kubectl logs -n vocab-app-staging job/vocab-app-minio-secret-generator-1
```

### Manual Secret Creation (Local Dev)

For local development, you can create secrets manually:

**Database Secret:**
```bash
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
POSTGRES_PASSWORD_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$POSTGRES_PASSWORD', safe=''))")
DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD_ENCODED}@vocab-app-postgres:5432/vocab_app_staging"

kubectl create secret generic vocab-app-database-secret \
  --namespace=vocab-app-staging \
  --from-literal=postgres-password="$POSTGRES_PASSWORD" \
  --from-literal=database-url="$DATABASE_URL"
```

**JWT Secret:**
```bash
JWT_ACCESS_SECRET=$(openssl rand -base64 32 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 32 | tr -d '\n')

kubectl create secret generic vocab-app-jwt-secret \
  --namespace=vocab-app-staging \
  --from-literal=jwt-access-secret="$JWT_ACCESS_SECRET" \
  --from-literal=jwt-refresh-secret="$JWT_REFRESH_SECRET"
```

**MinIO Secret:**
```bash
MINIO_ACCESS_KEY=$(openssl rand -hex 16)
MINIO_SECRET_KEY=$(openssl rand -base64 32 | tr -d '\n')

kubectl create secret generic vocab-app-minio-secret \
  --namespace=vocab-app-staging \
  --from-literal=accessKey="$MINIO_ACCESS_KEY" \
  --from-literal=secretKey="$MINIO_SECRET_KEY"
```

### Viewing Secrets

**⚠️ IMPORTANT: Secrets contain sensitive data. Handle with care.**

```bash
# View secret keys (not values)
kubectl get secret vocab-app-database-secret -n vocab-app-staging -o json | jq '.data | keys'

# Decode secret value (use with caution)
kubectl get secret vocab-app-database-secret -n vocab-app-staging -o jsonpath='{.data.postgres-password}' | base64 -d

# View all secret metadata
kubectl describe secret vocab-app-database-secret -n vocab-app-staging
```

---

## Secret Rotation

### When to Rotate Secrets

**Routine Rotation:**
- **Database Password**: Every 90 days
- **JWT Secrets**: Every 90 days
- **MinIO Credentials**: Every 90 days

**Immediate Rotation Required:**
- Secret compromised or exposed
- Employee with access leaves organization
- Security audit findings
- After a security incident
- Compliance requirements (PCI-DSS, SOC 2, etc.)

### Zero-Downtime Rotation Scripts

We provide automated scripts for zero-downtime secret rotation:

**Database Secret Rotation:**
```bash
cd /workspace/k8s/scripts
NAMESPACE=vocab-app-staging ./rotate-database-secret.sh
```

**What it does:**
1. Generates new secure password
2. Updates PostgreSQL user password
3. Updates Kubernetes secret
4. Performs rolling restart of API pods
5. Verifies pod health

**JWT Secret Rotation:**
```bash
cd /workspace/k8s/scripts
NAMESPACE=vocab-app-staging ./rotate-jwt-secret.sh
```

**What it does:**
1. Generates new JWT signing keys
2. Updates Kubernetes secret
3. Performs rolling restart of API pods
4. Verifies pod health
5. **Note: All users will be logged out**

**MinIO Credential Rotation:**
```bash
cd /workspace/k8s/scripts
NAMESPACE=vocab-app-staging ./rotate-minio-secret.sh
```

**What it does:**
1. Generates new MinIO credentials
2. Updates Kubernetes secret
3. Updates MinIO Tenant configuration (if using MinIO Operator)
4. Performs rolling restart of API pods
5. Verifies pod health

### Manual Rotation Process

If the automated scripts fail or you need fine-grained control:

**Step 1: Generate new secret value**
```bash
NEW_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')
```

**Step 2: Update the secret**
```bash
kubectl create secret generic vocab-app-jwt-secret \
  --namespace=vocab-app-staging \
  --from-literal=jwt-access-secret="$NEW_PASSWORD" \
  --from-literal=jwt-refresh-secret="$(openssl rand -base64 32 | tr -d '\n')" \
  --dry-run=client -o yaml | kubectl apply -f -
```

**Step 3: Rolling restart of API pods**
```bash
kubectl rollout restart deployment/vocab-app-api -n vocab-app-staging
kubectl rollout status deployment/vocab-app-api -n vocab-app-staging
```

**Step 4: Verify health**
```bash
kubectl get pods -n vocab-app-staging -l app=api
kubectl logs -n vocab-app-staging -l app=api --tail=50
```

---

## Rotation Schedule

### Recommended Rotation Intervals

| Secret Type | Rotation Frequency | Impact | Automation |
|-------------|-------------------|---------|------------|
| Database Password | 90 days | Low (zero-downtime) | Script available |
| JWT Secrets | 90 days | Medium (users logged out) | Script available |
| MinIO Credentials | 90 days | Low (zero-downtime) | Script available |
| Anthropic API Key | As needed | Low (zero-downtime) | Manual only |

### Rotation Calendar

Track rotations in your operations calendar:

```bash
# Example rotation schedule for 2026
Database Password:  Jan 15, Apr 15, Jul 15, Oct 15
JWT Secrets:        Feb 1,  May 1,  Aug 1,  Nov 1
MinIO Credentials:  Mar 1,  Jun 1,  Sep 1,  Dec 1
```

### Rotation Checklist

Before rotating secrets:
- [ ] Notify team of planned rotation
- [ ] Choose low-traffic time window (if possible)
- [ ] Verify backup systems are working
- [ ] Have rollback plan ready
- [ ] Test rotation scripts in staging first

During rotation:
- [ ] Run rotation script
- [ ] Verify pod health
- [ ] Test application functionality
- [ ] Monitor logs for errors
- [ ] Check health endpoints

After rotation:
- [ ] Document rotation in change log
- [ ] Update password manager (if applicable)
- [ ] Update external systems (if needed)
- [ ] Verify no authentication errors
- [ ] Schedule next rotation

---

## Troubleshooting

### Secret Generator Job Failed

**Symptom:** Secret not created during Helm install

```bash
# Check job status
kubectl get jobs -n vocab-app-staging | grep secret-generator

# View job logs
kubectl logs -n vocab-app-staging job/vocab-app-database-secret-generator-1

# Common issues:
# 1. RBAC permissions missing
kubectl describe rolebinding vocab-app-database-secret-generator -n vocab-app-staging

# 2. Secret already exists (not an error, expected behavior)
kubectl get secret vocab-app-database-secret -n vocab-app-staging

# 3. Namespace not found
kubectl get namespace vocab-app-staging
```

**Fix:** Delete failed job and upgrade again
```bash
kubectl delete job vocab-app-database-secret-generator-1 -n vocab-app-staging
helm upgrade vocab-app ./k8s/helm/vocab-app -n vocab-app-staging
```

### Rotation Script Failed

**Symptom:** Rotation script exits with error

**Check pod status:**
```bash
kubectl get pods -n vocab-app-staging
kubectl describe pods -n vocab-app-staging -l app=api
kubectl logs -n vocab-app-staging -l app=api --tail=100
```

**Rollback to previous secret:**
If you backed up the old secret:
```bash
kubectl apply -f old-secret-backup.yaml
kubectl rollout restart deployment/vocab-app-api -n vocab-app-staging
```

**Common Issues:**

**Database password mismatch:**
```bash
# Symptom: API pods can't connect to database
# Check logs for: "password authentication failed"

# Fix: Verify password in secret matches PostgreSQL
kubectl exec -n vocab-app-staging vocab-app-postgres-0 -- psql -U postgres -c "\du"
```

**JWT signature verification failed:**
```bash
# Symptom: Users can't authenticate
# Check logs for: "invalid signature" or "jwt malformed"

# Fix: Verify JWT secret is correctly loaded
kubectl get secret vocab-app-jwt-secret -n vocab-app-staging -o jsonpath='{.data.jwt-access-secret}' | base64 -d | wc -c
# Should output: 44 (32 bytes base64-encoded)
```

**MinIO connection refused:**
```bash
# Symptom: File uploads fail
# Check logs for: "MinIO connection error"

# Fix: Verify MinIO credentials and tenant status
kubectl get tenant -n vocab-app-staging
kubectl logs -n vocab-app-staging -l v1.min.io/tenant=vocab-app-storage
```

### Pods Not Restarting After Secret Update

**Symptom:** Pods still using old secret values

```bash
# Force restart all API pods
kubectl delete pods -n vocab-app-staging -l app=api

# Or use rollout restart
kubectl rollout restart deployment/vocab-app-api -n vocab-app-staging

# Verify new pods are using updated secrets
kubectl get pods -n vocab-app-staging -l app=api -o wide
```

### All Users Logged Out Unexpectedly

**Symptom:** Mass logout after JWT rotation

This is **expected behavior** after JWT secret rotation. All existing tokens become invalid.

**User Communication Template:**
```
Subject: Scheduled Maintenance - Password Reset Required

We've completed scheduled security maintenance on the Vocab App.
As part of our security protocols, all users have been logged out.

Action Required:
- Sign in again at: https://vocab-app.example.com/auth/login
- Your username and password remain the same
- No data has been lost

This is a routine security measure to protect your account.

Thank you for your understanding.
```

---

## Security Best Practices

### 1. Secret Generation

**✅ DO:**
- Use `openssl rand -base64` for cryptographically secure random generation
- Generate secrets with sufficient entropy (≥32 bytes)
- URL-encode passwords for database connection strings
- Use different secrets for each environment (dev, staging, production)

**❌ DON'T:**
- Use weak passwords or predictable patterns
- Reuse secrets across environments
- Generate secrets with insufficient entropy
- Store secrets in Git repositories

### 2. Secret Storage

**✅ DO:**
- Store all secrets in Kubernetes Secrets
- Use RBAC to restrict secret access
- Encrypt secrets at rest (Kubernetes encryption provider)
- Use dedicated ServiceAccounts for secret access

**❌ DON'T:**
- Store secrets in ConfigMaps (not encrypted)
- Commit secrets to Git (even in `.env.example`)
- Log secret values in application logs
- Share secrets via email, Slack, or unsecured channels

### 3. Secret Access

**✅ DO:**
- Mount secrets as environment variables (not files when possible)
- Use least-privilege RBAC rules
- Audit secret access regularly
- Rotate secrets on schedule

**❌ DON'T:**
- Grant cluster-wide secret access
- Use default ServiceAccount for secret access
- Expose secrets in API responses
- Print secrets in debug logs

### 4. Secret Rotation

**✅ DO:**
- Rotate secrets every 90 days (or per compliance requirements)
- Rotate immediately if compromised
- Use zero-downtime rotation procedures
- Document all rotations
- Test rotation in staging first

**❌ DON'T:**
- Skip rotation due to complexity
- Rotate during peak traffic (if avoidable)
- Forget to update external systems
- Rotate multiple secrets simultaneously (reduces blast radius)

### 5. Incident Response

**If a secret is compromised:**

1. **Immediate Action** (< 5 minutes):
   - Rotate the compromised secret immediately
   - Invalidate all related sessions/tokens
   - Block suspicious access patterns

2. **Investigation** (< 1 hour):
   - Review audit logs for unauthorized access
   - Identify scope of compromise
   - Determine root cause

3. **Remediation** (< 24 hours):
   - Rotate all potentially affected secrets
   - Update security controls
   - Patch vulnerabilities

4. **Post-Mortem** (< 1 week):
   - Document incident timeline
   - Identify preventive measures
   - Update runbooks and procedures

---

## Compliance Considerations

### COPPA (Children's Online Privacy Protection Act)

Since this app serves students (potentially under 13), secrets protecting student data require:
- Regular rotation (every 90 days)
- Strong encryption at rest and in transit
- Audit logging of secret access
- Incident response procedures

### SOC 2 (if applicable)

For SOC 2 Type II compliance:
- Document secret rotation schedule
- Maintain audit trail of all rotations
- Implement automated rotation reminders
- Review access controls quarterly

---

## Additional Resources

**Related Documentation:**
- [Monitoring Guide](monitoring-guide.md) - Sentry, logging, alerts
- [Backup & Restore Guide](backup-restore-guide.md) - Database backups
- [Kubernetes Security Hardening](kubernetes-security-hardening.md) - Pod security

**External Resources:**
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [OWASP Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

**Last Updated:** 2026-01-19
**Owner:** DevOps Team
**Reviewers:** Security Team, Compliance Team
