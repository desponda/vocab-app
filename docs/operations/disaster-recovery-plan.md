# Disaster Recovery Plan

## Executive Summary

This document outlines the disaster recovery (DR) strategy for the Vocab App, a production educational application serving ~1,000 users. The plan defines recovery procedures, objectives, and responsibilities for various failure scenarios.

**Key Metrics:**
- **RTO (Recovery Time Objective)**: 1 hour - Maximum acceptable downtime
- **RPO (Recovery Point Objective)**: 24 hours - Maximum acceptable data loss
- **Backup Frequency**: Daily automated backups
- **Backup Retention**: 30 days

**Deployment:**
- **Environment**: Kubernetes on Azure (staging: vocab-staging.dresponda.com)
- **Architecture**: Containerized microservices with PostgreSQL, Redis, MinIO storage
- **GitOps**: ArgoCD auto-deploys from Git repository

---

## Table of Contents

1. [Recovery Objectives](#recovery-objectives)
2. [Failure Scenarios](#failure-scenarios)
3. [Recovery Procedures](#recovery-procedures)
4. [Runbooks](#runbooks)
5. [Testing Procedures](#testing-procedures)
6. [Contact Information](#contact-information)

---

## Recovery Objectives

### RTO/RPO Definitions

**Recovery Time Objective (RTO): 1 hour**
- Time from disaster detection to service restoration
- Includes: assessment, decision-making, execution, verification
- Target: 95% of incidents resolved within 1 hour

**Recovery Point Objective (RPO): 24 hours**
- Maximum acceptable data loss
- Daily backups ensure at most 24 hours of data loss
- Critical: No student test data loss acceptable

### Service Level Objectives (SLOs)

| Service | Target Uptime | Max Monthly Downtime |
|---------|--------------|---------------------|
| Web Application | 99.5% | 3.6 hours |
| API | 99.5% | 3.6 hours |
| Database | 99.9% | 43 minutes |
| File Storage | 99.5% | 3.6 hours |

### Data Classification

**Critical Data (Must Not Lose):**
- User accounts (teachers, students)
- Classroom configurations
- Vocabulary sheets and tests
- Test submissions and grades
- Uploaded files (worksheets, images)

**Non-Critical Data (Acceptable Loss):**
- Session tokens (regenerate on restart)
- Background job queue (reprocess failed jobs)
- Temporary cache data (Redis)

---

## Failure Scenarios

### 1. Single Pod Failure

**Likelihood:** High (expected during normal operations)
**Impact:** None (automatic recovery via Kubernetes)
**RTO:** < 1 minute (automatic)
**RPO:** 0 (no data loss)

**Recovery:** Automatic via Kubernetes:
- Liveness probes detect failure
- Kubernetes restarts pod automatically
- Pod Disruption Budget ensures availability

### 2. Node Failure

**Likelihood:** Medium
**Impact:** Temporary service degradation
**RTO:** < 5 minutes (automatic)
**RPO:** 0 (no data loss)

**Recovery:** Automatic via Kubernetes:
- Kubernetes reschedules pods to healthy nodes
- Pod Disruption Budget maintains service availability
- Load balancer removes failed node from rotation

### 3. Database Corruption or Failure

**Likelihood:** Low
**Impact:** Complete service outage
**RTO:** 1 hour
**RPO:** 24 hours (last daily backup)

**Recovery:** Manual database restore (see Runbook #1)

### 4. Complete Cluster Failure

**Likelihood:** Very Low
**Impact:** Complete service outage
**RTO:** 4 hours (manual cluster rebuild)
**RPO:** 24 hours (last daily backup)

**Recovery:** Manual cluster rebuild + restore (see Runbook #5)

### 5. Data Center Outage

**Likelihood:** Very Low
**Impact:** Complete service outage
**RTO:** Not applicable (single data center deployment)
**RPO:** 24 hours

**Recovery:** Requires multi-region deployment (future enhancement)

### 6. Accidental Data Deletion

**Likelihood:** Low
**Impact:** Partial data loss
**RTO:** 2 hours
**RPO:** 24 hours (last daily backup)

**Recovery:** Selective restore from backup (see Runbook #2)

### 7. Security Breach or Ransomware

**Likelihood:** Low
**Impact:** Variable (data integrity compromise)
**RTO:** 8 hours (investigation + remediation)
**RPO:** 24 hours

**Recovery:** Incident response + restore from backup (see Runbook #6)

### 8. Persistent Volume (Storage) Failure

**Likelihood:** Low
**Impact:** Database or file storage outage
**RTO:** 2 hours
**RPO:** 24 hours (last daily backup)

**Recovery:** Restore to new PVC (see Runbook #3)

---

## Recovery Procedures

### General Recovery Workflow

```
1. DETECTION
   ├─> Automated alerts (Sentry, health checks)
   ├─> User reports
   └─> Manual monitoring

2. ASSESSMENT (Target: 5 minutes)
   ├─> Identify failure type
   ├─> Determine severity
   ├─> Estimate impact
   └─> Choose recovery runbook

3. COMMUNICATION (Target: 10 minutes)
   ├─> Notify stakeholders
   ├─> Update status page (if applicable)
   └─> Document incident timeline

4. EXECUTION (Target: 30-45 minutes)
   ├─> Follow runbook procedures
   ├─> Monitor recovery progress
   └─> Adjust plan if needed

5. VERIFICATION (Target: 10 minutes)
   ├─> Test critical user flows
   ├─> Verify data integrity
   ├─> Check all services healthy
   └─> Monitor for errors

6. POST-MORTEM (Within 48 hours)
   ├─> Document root cause
   ├─> Identify preventive measures
   ├─> Update runbooks
   └─> Share learnings with team
```

### Pre-Recovery Checklist

Before starting any recovery procedure:
- [ ] Assess severity and impact
- [ ] Notify stakeholders of planned recovery
- [ ] Verify backup availability and integrity
- [ ] Document current system state
- [ ] Have rollback plan ready
- [ ] Establish communication channel
- [ ] Start incident timeline log

### Post-Recovery Checklist

After completing recovery:
- [ ] Verify all services are healthy
- [ ] Test critical user flows (login, test-taking, upload)
- [ ] Check logs for errors or warnings
- [ ] Monitor resource utilization
- [ ] Verify data integrity (run spot checks)
- [ ] Update status page / notify users
- [ ] Document recovery steps taken
- [ ] Schedule post-mortem meeting

---

## Runbooks

### Runbook #1: Database Restore from Backup

**When to use:** Database corruption, accidental data deletion, data integrity issues

**Prerequisites:**
- Access to Kubernetes cluster
- Latest backup file available
- Database pod running (or ability to start one)

**Estimated Time:** 1 hour

**Procedure:**

1. **Identify backup to restore** (5 minutes)
   ```bash
   # List available backups
   kubectl exec -n vocab-app-staging vocab-app-postgres-backup-pvc-pod -- ls -lh /backups

   # Find most recent backup
   BACKUP_FILE=$(kubectl exec -n vocab-app-staging vocab-app-postgres-backup-pvc-pod -- \
     ls -1t /backups/*.sql.gz | head -1)
   ```

2. **Scale down API pods** (2 minutes)
   ```bash
   # Prevent API from writing to database during restore
   kubectl scale deployment vocab-app-api --replicas=0 -n vocab-app-staging

   # Verify pods are down
   kubectl get pods -n vocab-app-staging -l app=api
   ```

3. **Run restore script** (30 minutes)
   ```bash
   cd /workspace/k8s/scripts
   NAMESPACE=vocab-app-staging \
   BACKUP_FILE="vocab_app_staging_2026-01-19_02-00-00.sql.gz" \
   ./postgres-restore.sh
   ```

   The script will:
   - Stop connections to database
   - Drop and recreate database
   - Restore from backup file
   - Verify data integrity

4. **Scale up API pods** (5 minutes)
   ```bash
   kubectl scale deployment vocab-app-api --replicas=2 -n vocab-app-staging

   # Wait for pods to be ready
   kubectl rollout status deployment vocab-app-api -n vocab-app-staging
   ```

5. **Verify functionality** (10 minutes)
   ```bash
   # Check API health
   kubectl exec -n vocab-app-staging -it $(kubectl get pod -n vocab-app-staging -l app=api -o jsonpath='{.items[0].metadata.name}') -- curl -s http://localhost:3001/api/health/ready | jq

   # Check logs for errors
   kubectl logs -n vocab-app-staging -l app=api --tail=50
   ```

6. **Test critical user flows** (10 minutes)
   - Test teacher login
   - Test student login
   - View existing classroom
   - View existing test results
   - Attempt test submission (if safe)

**Rollback Plan:**
If restore fails, restore from previous backup:
```bash
# Use second-most-recent backup
BACKUP_FILE=$(kubectl exec -n vocab-app-staging vocab-app-postgres-backup-pvc-pod -- \
  ls -1t /backups/*.sql.gz | sed -n 2p)
```

---

### Runbook #2: Selective Data Restore

**When to use:** Restore specific classroom or test data without full database restore

**Prerequisites:**
- Database backup file
- Knowledge of what data to restore
- PostgreSQL client tools

**Estimated Time:** 2 hours

**Procedure:**

1. **Extract backup to temporary location**
   ```bash
   kubectl exec -n vocab-app-staging vocab-app-postgres-backup-pvc-pod -- \
     gzip -cd /backups/vocab_app_staging_2026-01-19_02-00-00.sql.gz > /tmp/backup.sql
   ```

2. **Identify tables/rows to restore**
   ```bash
   # Find classroom ID to restore
   grep "COPY public.classrooms" /tmp/backup.sql

   # Find related test data
   grep "COPY public.tests" /tmp/backup.sql | grep "classroom-id-here"
   ```

3. **Extract specific data to new SQL file**
   ```bash
   # Manual extraction of specific INSERT/COPY statements
   # OR use pg_restore with --table option
   ```

4. **Apply selective restore**
   ```bash
   kubectl exec -n vocab-app-staging vocab-app-postgres-0 -- \
     psql -U postgres -d vocab_app_staging -f /tmp/selective-restore.sql
   ```

**Note:** This is an advanced procedure. Consider full restore if unsure.

---

### Runbook #3: Persistent Volume Recovery

**When to use:** PVC corrupted, storage node failure, disk full

**Prerequisites:**
- Backup available (database or MinIO)
- Ability to create new PVCs

**Estimated Time:** 2 hours

**Procedure:**

**For Database PVC:**

1. **Create new PVC**
   ```bash
   # Modify PVC name in StatefulSet
   kubectl edit statefulset vocab-app-postgres -n vocab-app-staging
   # Change volumeClaimTemplates.metadata.name
   ```

2. **Delete old StatefulSet pod**
   ```bash
   kubectl delete pod vocab-app-postgres-0 -n vocab-app-staging
   ```

3. **Wait for new pod with new PVC**
   ```bash
   kubectl get pods -n vocab-app-staging -l app=postgres -w
   ```

4. **Restore database from backup** (see Runbook #1)

**For MinIO PVC:**

1. **Create new PVC**
   ```bash
   # Update MinIO Tenant CR
   kubectl edit tenant vocab-app-storage -n vocab-app-staging
   ```

2. **Restore files from backup**
   ```bash
   cd /workspace/k8s/scripts
   NAMESPACE=vocab-app-staging \
   BACKUP_FILE="minio_backup_2026-01-19.tar.gz" \
   ./minio-restore.sh
   ```

---

### Runbook #4: Application Deployment Rollback

**When to use:** Bad deployment causes service outage

**Prerequisites:**
- Previous working deployment exists
- ArgoCD access or kubectl access

**Estimated Time:** 15 minutes

**Procedure:**

**Using ArgoCD (Preferred):**

1. **Identify previous good deployment**
   ```bash
   argocd app history vocab-app-staging
   ```

2. **Rollback to previous revision**
   ```bash
   argocd app rollback vocab-app-staging <REVISION_NUMBER>
   ```

**Using kubectl (Manual):**

1. **Rollback deployment**
   ```bash
   kubectl rollout undo deployment/vocab-app-api -n vocab-app-staging
   kubectl rollout undo deployment/vocab-app-web -n vocab-app-staging
   ```

2. **Verify rollout**
   ```bash
   kubectl rollout status deployment/vocab-app-api -n vocab-app-staging
   kubectl rollout status deployment/vocab-app-web -n vocab-app-staging
   ```

**Using Git (Full Rollback):**

1. **Revert Git commit**
   ```bash
   cd /workspace
   git revert HEAD
   git push
   ```

2. **ArgoCD will auto-sync** (if enabled)
   ```bash
   argocd app wait vocab-app-staging --sync
   ```

---

### Runbook #5: Complete Cluster Rebuild

**When to use:** Catastrophic cluster failure, complete data center outage

**Prerequisites:**
- Kubernetes cluster provisioning access
- All backup files available
- Infrastructure as Code (IaC) scripts (if available)
- DNS/networking access

**Estimated Time:** 4-8 hours

**Procedure:**

**Phase 1: Infrastructure Setup** (2 hours)

1. **Provision new Kubernetes cluster**
   - Follow cloud provider documentation
   - Ensure same version as original cluster
   - Configure networking and storage classes

2. **Install required operators**
   ```bash
   # MinIO Operator
   kubectl apply -f https://github.com/minio/operator/releases/latest/download/operator.yaml

   # Cert Manager (if needed)
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

3. **Configure cluster networking**
   - Set up ingress controller
   - Configure DNS records
   - Set up TLS certificates

**Phase 2: Application Deployment** (1 hour)

1. **Clone Git repository**
   ```bash
   git clone https://github.com/desponda/vocab-app.git
   cd vocab-app
   ```

2. **Deploy using Helm**
   ```bash
   helm install vocab-app ./k8s/helm/vocab-app \
     -n vocab-app-staging \
     --create-namespace \
     -f k8s/helm/vocab-app/values.yaml
   ```

3. **Wait for pods to be ready**
   ```bash
   kubectl get pods -n vocab-app-staging -w
   ```

**Phase 3: Data Restoration** (2 hours)

1. **Restore database** (see Runbook #1)

2. **Restore MinIO files**
   ```bash
   cd /workspace/k8s/scripts
   ./minio-restore.sh
   ```

3. **Verify data integrity**
   - Check user counts
   - Verify classroom data
   - Spot-check test results

**Phase 4: Verification** (1 hour)

1. **Run health checks**
   ```bash
   kubectl exec -n vocab-app-staging -it $(kubectl get pod -n vocab-app-staging -l app=api -o jsonpath='{.items[0].metadata.name}') -- curl -s http://localhost:3001/api/health/ready
   ```

2. **Run E2E tests**
   ```bash
   cd apps/web
   BASE_URL=https://vocab-staging.dresponda.com pnpm test:e2e
   ```

3. **Test critical user flows**

**Phase 5: Cutover** (30 minutes)

1. **Update DNS to point to new cluster**
2. **Monitor for errors**
3. **Notify users of service restoration**

---

### Runbook #6: Security Incident Response

**When to use:** Suspected breach, unauthorized access, data exfiltration

**Prerequisites:**
- Incident response team assembled
- Communication channels established
- Legal/compliance team notified (if applicable)

**Estimated Time:** 8-24 hours

**Procedure:**

**Phase 1: Containment** (< 1 hour)

1. **Isolate affected systems**
   ```bash
   # Scale down compromised pods
   kubectl scale deployment vocab-app-api --replicas=0 -n vocab-app-staging

   # OR block network access
   kubectl apply -f - <<EOF
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: deny-all-ingress
     namespace: vocab-app-staging
   spec:
     podSelector: {}
     policyTypes:
     - Ingress
   EOF
   ```

2. **Rotate all secrets immediately**
   ```bash
   cd /workspace/k8s/scripts
   ./rotate-database-secret.sh
   ./rotate-jwt-secret.sh
   ./rotate-minio-secret.sh
   ```

3. **Capture forensic evidence**
   ```bash
   # Collect logs
   kubectl logs -n vocab-app-staging -l app=api --since=24h > incident-logs.txt

   # Collect pod events
   kubectl get events -n vocab-app-staging --sort-by='.lastTimestamp' > incident-events.txt
   ```

**Phase 2: Investigation** (2-4 hours)

1. **Review audit logs**
   - Kubernetes audit logs
   - Application logs (Pino + Sentry)
   - Database audit logs
   - Network traffic logs

2. **Identify attack vector**
   - Compromised credentials?
   - Vulnerable dependency?
   - Misconfigured security policy?

3. **Determine scope of breach**
   - What data was accessed?
   - What systems were compromised?
   - Duration of unauthorized access?

**Phase 3: Remediation** (2-4 hours)

1. **Patch vulnerabilities**
   - Update dependencies
   - Fix security misconfigurations
   - Apply security patches

2. **Restore from known-good backup**
   ```bash
   # Restore database from backup BEFORE breach
   cd /workspace/k8s/scripts
   BACKUP_FILE="<pre-breach-backup>" ./postgres-restore.sh
   ```

3. **Harden security controls**
   - Enable NetworkPolicy (if not enabled)
   - Tighten RBAC permissions
   - Enable Pod Security Standards

**Phase 4: Recovery** (1-2 hours)

1. **Deploy patched version**
   ```bash
   kubectl scale deployment vocab-app-api --replicas=2 -n vocab-app-staging
   ```

2. **Verify security posture**
   ```bash
   # Run security scan
   trivy image ghcr.io/desponda/vocab-app-api:latest
   ```

3. **Monitor for suspicious activity**

**Phase 5: Communication** (Ongoing)

1. **Notify affected users** (if PII compromised)
2. **Update stakeholders**
3. **Comply with breach notification laws** (if applicable)

**Phase 6: Post-Incident** (Within 1 week)

1. **Conduct post-mortem**
2. **Update security policies**
3. **Implement preventive measures**
4. **Update incident response plan**

---

## Testing Procedures

### DR Testing Schedule

| Test Type | Frequency | Duration | Participants |
|-----------|-----------|----------|--------------|
| Database Restore | Quarterly | 2 hours | DevOps, Backend |
| Application Rollback | Monthly | 30 min | DevOps |
| Secret Rotation | Quarterly | 1 hour | DevOps, Security |
| Full Cluster Rebuild | Annually | 1 day | Full team |
| Tabletop Exercise | Semi-annually | 2 hours | Full team |

### Test #1: Database Restore Drill

**Objective:** Verify database backup and restore procedures

**Steps:**
1. Identify most recent backup
2. Create test namespace
3. Deploy clean database instance
4. Restore backup to test database
5. Verify data integrity
6. Measure restore time (target: < 1 hour)
7. Document any issues

**Success Criteria:**
- Restore completes without errors
- Data integrity verified (row counts match)
- RTO < 1 hour achieved

### Test #2: Application Rollback Drill

**Objective:** Verify deployment rollback procedures

**Steps:**
1. Deploy intentionally broken version
2. Detect failure via monitoring
3. Execute rollback procedure
4. Verify service restoration
5. Measure rollback time (target: < 15 minutes)

**Success Criteria:**
- Rollback completes successfully
- Service restored to working state
- RTO < 15 minutes achieved

### Test #3: Secrets Rotation Drill

**Objective:** Verify zero-downtime secret rotation

**Steps:**
1. Run rotation script for each secret type
2. Verify zero downtime during rotation
3. Verify application functionality post-rotation
4. Measure rotation time

**Success Criteria:**
- No service interruption
- All secrets rotated successfully
- Application functions correctly

### Test #4: Tabletop Exercise

**Objective:** Practice incident response without actual outage

**Format:** Team discusses response to hypothetical scenarios

**Sample Scenarios:**
1. Database corruption detected at 2 AM
2. Security breach reported by user
3. Complete cluster failure during business hours
4. Accidental deletion of critical data

**Outcomes:**
- Identify gaps in procedures
- Clarify roles and responsibilities
- Update runbooks based on discussion

---

## Contact Information

### Incident Response Team

**On-Call Rotation:**
- Primary: [Name] - [Phone] - [Email]
- Secondary: [Name] - [Phone] - [Email]
- Manager: [Name] - [Phone] - [Email]

**Escalation Path:**
1. On-call engineer (0-15 min)
2. Team lead (15-30 min)
3. Manager (30-60 min)
4. CTO/Executive (> 60 min or data breach)

### External Contacts

**Cloud Provider Support:**
- Azure Support: [Support Portal URL]
- Priority: Severity A (production down)

**Security Incident:**
- Security Team: [Email]
- Legal: [Email]
- PR/Communications: [Email]

---

## Appendix

### Backup Verification Checklist

Monthly backup verification:
- [ ] List all backups (database, MinIO)
- [ ] Verify backup file sizes (reasonable growth)
- [ ] Check backup timestamps (daily cadence)
- [ ] Test restore of latest backup (quarterly)
- [ ] Verify backup retention (30 days)
- [ ] Check backup storage utilization

### Monitoring and Alerting

**Critical Alerts** (immediate response):
- Database down
- API deployment failed
- Storage PVC full
- Security breach detected

**Warning Alerts** (response within 1 hour):
- High error rate
- Slow response times
- Backup job failed
- Approaching storage limits

---

**Last Updated:** 2026-01-19
**Next Review:** 2026-04-19 (Quarterly)
**Owner:** DevOps Team
**Approved By:** CTO, Security Team
