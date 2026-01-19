# Operations Documentation

Guides for DevOps, SRE, and system administrators managing the Vocab App infrastructure.

## 📚 Available Guides

### [🔍 Monitoring Guide](./monitoring-guide.md)
**485 lines** | Comprehensive observability and alerting setup

**Contents:**
- Sentry error tracking configuration
- Health check endpoints (liveness vs readiness)
- Pino structured logging
- Alert configuration and incident response
- Troubleshooting common issues

**When to use:** Setting up monitoring, investigating errors, configuring alerts

---

### [💾 Backup & Restore Guide](./backup-restore-guide.md)
**400+ lines** | Database backup and recovery procedures

**Contents:**
- Automated daily PostgreSQL backups (CronJob)
- Manual backup procedures
- Database restore procedures (RTO: 1 hour)
- Backup verification and testing
- Troubleshooting backup failures

**When to use:** Setting up backups, restoring data, verifying backup integrity

---

### [🚨 Disaster Recovery Plan](./disaster-recovery-plan.md)
**700+ lines** | Complete DR strategy with 6 detailed runbooks

**Contents:**
- RTO/RPO objectives (1 hour / 24 hours)
- 8 failure scenarios with recovery procedures
- 6 operational runbooks:
  1. Database restore from backup
  2. Selective data restore
  3. Persistent volume recovery
  4. Application deployment rollback
  5. Complete cluster rebuild
  6. Security incident response
- Testing procedures and schedules
- Contact information and escalation paths

**When to use:** Service outages, data loss, security incidents, DR testing

---

### [🔐 Secrets Management Guide](./secrets-management-guide.md)
**400+ lines** | Secret rotation and security procedures

**Contents:**
- Automated secret generation (existing system)
- Zero-downtime rotation scripts:
  - `rotate-database-secret.sh`
  - `rotate-jwt-secret.sh`
  - `rotate-minio-secret.sh`
- 90-day rotation schedule
- Security best practices
- Compliance considerations (COPPA, SOC 2)
- Incident response for compromised secrets

**When to use:** Rotating secrets, securing credentials, handling security incidents

---

### [🛡️ Kubernetes Security Hardening](./kubernetes-security-hardening.md)
**480+ lines** | Pod security and infrastructure hardening

**Contents:**
- Security contexts (runAsNonRoot, drop ALL capabilities)
- Pod Disruption Budgets for zero-downtime
- Health probes (liveness and readiness)
- Network Policies (optional firewall rules)
- Resource limits and management
- Security testing procedures

**When to use:** Hardening production, security audits, configuring pod security

---

### [📦 MinIO Backup Guide](./minio-backup-guide.md)
Object storage backup procedures

**Contents:**
- Bucket versioning for file recovery
- Daily backup CronJob
- Manual backup/restore scripts
- Restoration procedures

**When to use:** Backing up file storage, restoring uploaded files

---

## 🚀 Quick Start for Operations

**Setting up a new environment?**
1. Start with [Monitoring Guide](./monitoring-guide.md) - Set up observability first
2. Configure [Backup & Restore](./backup-restore-guide.md) - Automated backups
3. Review [Disaster Recovery Plan](./disaster-recovery-plan.md) - Know your runbooks
4. Implement [Secrets Management](./secrets-management-guide.md) - Secure credentials
5. Apply [Kubernetes Security](./kubernetes-security-hardening.md) - Harden infrastructure

**Daily operations:**
- Check monitoring dashboards (Sentry, health checks)
- Verify backup completion (daily at 2:00 AM UTC)
- Review alerts and errors
- Monitor resource utilization

**Quarterly maintenance:**
- Test database restore procedures
- Rotate secrets (90-day schedule)
- Review and update documentation
- Run DR tabletop exercises

---

## 🆘 Emergency Procedures

### Service Down
1. **Check health endpoints**: `/api/health` and `/api/health/ready`
2. **Review logs**: `kubectl logs -n vocab-app-staging -l app=api --tail=100`
3. **Check pod status**: `kubectl get pods -n vocab-app-staging`
4. **Follow runbook**: [Disaster Recovery Plan](./disaster-recovery-plan.md#runbooks)

### Data Loss
1. **Identify what was lost**: Database? Files? Both?
2. **Database**: [Backup & Restore Guide](./backup-restore-guide.md#database-restore)
3. **Files**: [MinIO Backup Guide](./minio-backup-guide.md#restore-procedures)
4. **Selective restore**: [Disaster Recovery Plan](./disaster-recovery-plan.md#runbook-2-selective-data-restore)

### Security Incident
1. **Containment**: Isolate affected systems immediately
2. **Rotate secrets**: [Secrets Management](./secrets-management-guide.md#secret-rotation)
3. **Full IR procedure**: [Disaster Recovery Plan](./disaster-recovery-plan.md#runbook-6-security-incident-response)

---

## 📊 Key Metrics

| Metric | Target | How to Check |
|--------|--------|--------------|
| Database Backup Success | 100% | Check CronJob logs daily |
| RTO (Recovery Time) | < 1 hour | Practice quarterly |
| RPO (Data Loss) | < 24 hours | Daily backups |
| Secret Rotation | Every 90 days | Track in values.yaml |
| Uptime SLA | 99.5% | Monitor health checks |

---

## 🔗 Related Documentation

- [Development Guides](../development/) - Testing and workflows
- [Architecture Docs](../architecture/) - Design decisions
- [Main Documentation Index](../README.md) - All documentation

---

**Last Updated:** 2026-01-19
**Owner:** DevOps Team
**Reviewers:** SRE Team, Security Team
