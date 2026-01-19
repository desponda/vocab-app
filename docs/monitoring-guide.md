# Monitoring & Observability Guide

## Overview

This guide covers the monitoring and observability setup for the Vocab App production environment.

**Monitoring Stack:**
- **Error Tracking**: Sentry (application errors and performance)
- **Logging**: Pino structured logging (JSON format)
- **Health Checks**: Kubernetes liveness/readiness probes
- **Metrics**: Application-level metrics via health endpoints

---

## Table of Contents

1. [Sentry Setup](#sentry-setup)
2. [Health Checks](#health-checks)
3. [Logging](#logging)
4. [Alert Configuration](#alert-configuration)
5. [Incident Response](#incident-response)
6. [Monitoring Dashboard](#monitoring-dashboard)

---

## Sentry Setup

### Initial Configuration

1. **Create Sentry Project**:
   - Go to https://sentry.io
   - Create new project (select "Node.js/Express" or "Fastify")
   - Copy the DSN (Data Source Name)

2. **Configure Environment Variable**:
   ```bash
   # In Kubernetes Secret or .env file
   SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/789012
   ```

3. **Verify Integration**:
   ```bash
   # Check application logs for Sentry initialization
   kubectl logs -l app=vocab-api -n vocab-app | grep -i sentry

   # Expected output:
   # "Sentry error tracking enabled"
   ```

### Sentry Features Enabled

- **Error Tracking**: All 500-level errors automatically captured
- **Performance Monitoring**: HTTP request tracing (10% sample rate in production)
- **Release Tracking**: Errors tagged with app version
- **User Context**: Errors linked to authenticated user IDs
- **Sensitive Data Filtering**: Passwords, tokens, and auth headers removed

### Data Retention

- **Errors**: 90 days (Sentry default)
- **Performance Data**: 30 days
- **Attachments**: Disabled (no file uploads to Sentry)

---

## Health Checks

### Endpoints

#### Liveness Probe: `/api/health`

**Purpose**: Is the application running?

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-19T12:00:00.000Z",
  "version": "1.2.3"
}
```

**Kubernetes Configuration**:
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3
```

#### Readiness Probe: `/api/health/ready`

**Purpose**: Are all dependencies available?

**Response** (Healthy):
```json
{
  "status": "healthy",
  "checks": {
    "database": {
      "status": "up",
      "responseTime": 5
    },
    "redis": {
      "status": "up",
      "responseTime": 3,
      "details": {
        "waiting": 2,
        "active": 1,
        "completed": 1523,
        "failed": 3
      }
    },
    "minio": {
      "status": "up",
      "responseTime": 8,
      "details": { "bucket": "vocab-documents" }
    }
  },
  "timestamp": "2026-01-19T12:00:00.000Z",
  "version": "1.2.3"
}
```

**Response** (Degraded - Redis down):
```json
{
  "status": "degraded",
  "checks": {
    "database": { "status": "up", "responseTime": 5 },
    "redis": {
      "status": "down",
      "responseTime": 5002,
      "error": "Connection timeout"
    },
    "minio": { "status": "up", "responseTime": 8 }
  },
  "timestamp": "2026-01-19T12:00:00.000Z",
  "version": "1.2.3"
}
```

**Kubernetes Configuration**:
```yaml
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3001
  initialDelaySeconds: 15
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
  successThreshold: 1
```

### Status Levels

| Status | Meaning | HTTP Code | Action |
|--------|---------|-----------|--------|
| `healthy` | All systems operational | 200 | None |
| `degraded` | Database up, optional services down | 200 | Alert ops team |
| `unhealthy` | Database down, app non-functional | 503 | Page on-call |

---

## Logging

### Log Levels

| Level | Usage | Production |
|-------|-------|------------|
| `error` | Unhandled errors, failed operations | ✅ Always logged |
| `warn` | Degraded state, retries, optional service failures | ✅ Always logged |
| `info` | Normal operations, startup, health checks | ✅ Always logged |
| `debug` | Detailed diagnostic info | ❌ Disabled in prod |
| `trace` | Very detailed internal state | ❌ Disabled in prod |

### Log Format (Pino)

**Development** (pretty-printed):
```
[12:00:00] INFO: Server listening on 0.0.0.0:3001
[12:00:05] ERROR: Database connection failed
    err: {
      "type": "Error",
      "message": "Connection timeout",
      "stack": "..."
    }
```

**Production** (JSON):
```json
{"level":30,"time":1705672800000,"msg":"Server listening on 0.0.0.0:3001"}
{"level":50,"time":1705672805000,"err":{"type":"Error","message":"Connection timeout"},"msg":"Database connection failed"}
```

### Viewing Logs (Kubernetes)

```bash
# Tail API logs
kubectl logs -f -l app=vocab-api -n vocab-app

# Filter for errors only
kubectl logs -l app=vocab-api -n vocab-app | grep -E '"level":(40|50|60)'

# Export last hour of logs
kubectl logs --since=1h -l app=vocab-api -n vocab-app > api-logs.json
```

---

## Alert Configuration

### Critical Alerts (Page On-Call)

| Alert | Condition | Threshold | Action |
|-------|-----------|-----------|--------|
| **Database Down** | Health check returns `unhealthy` | 3 consecutive failures | Immediate page |
| **High Error Rate** | 500 errors > 10% of requests | 5min window | Immediate page |
| **Pod Crash Loop** | Pod restarts > 3 times | 10min window | Immediate page |
| **Memory Leak** | Memory usage > 90% | 15min sustained | Immediate page |

### Warning Alerts (Notify Team)

| Alert | Condition | Threshold | Action |
|-------|-----------|-----------|--------|
| **Redis Down** | Health check shows degraded | 2 consecutive failures | Slack notification |
| **MinIO Down** | Health check shows degraded | 2 consecutive failures | Slack notification |
| **Slow Response Time** | P95 latency > 2s | 10min window | Slack notification |
| **High Queue Depth** | BullMQ waiting jobs > 100 | 15min sustained | Slack notification |
| **Failed Jobs** | BullMQ failed jobs > 5 | 1 hour window | Slack notification |

### Informational Alerts

| Alert | Condition | Threshold | Action |
|-------|-----------|-----------|--------|
| **New Deployment** | Pod rollout started | Any | Slack notification |
| **Rate Limit Hit** | 429 responses > 10 | 5min window | Log only |
| **Login Failures** | 401 responses > 20 | 5min window | Security log |

---

## Incident Response

### Incident Severity Levels

#### P0 - Critical (Production Down)

**Examples**:
- Database completely unavailable
- All pods crashing
- API returning 500 for all requests

**Response**:
1. Page on-call engineer immediately
2. Create incident channel (#incident-YYYY-MM-DD)
3. Notify stakeholders (CTO, product owner)
4. Begin troubleshooting (see runbooks below)
5. Post-mortem required within 24 hours

**SLA**: Acknowledge within 5 minutes, mitigate within 30 minutes

---

#### P1 - High (Partial Outage)

**Examples**:
- Redis down (background jobs not processing)
- MinIO down (file uploads failing)
- 1-2 pods crash looping

**Response**:
1. Notify on-call engineer (Slack)
2. Create incident channel
3. Begin troubleshooting
4. Update status page if customer-facing
5. Post-incident review within 48 hours

**SLA**: Acknowledge within 15 minutes, mitigate within 2 hours

---

#### P2 - Medium (Degraded Performance)

**Examples**:
- Slow response times (2-5s)
- Elevated error rate (1-5%)
- High memory usage (80-90%)

**Response**:
1. Notify team in Slack
2. Investigate during business hours
3. Document findings
4. Schedule fix in next sprint

**SLA**: Acknowledge within 1 hour, investigate within 24 hours

---

### Runbooks

#### Database Connection Failed

**Symptoms**:
- Health check returns `unhealthy`
- Logs show: `Database connection failed`
- 500 errors on all API requests

**Troubleshooting**:
```bash
# 1. Check database pod status
kubectl get pods -l app=postgres -n vocab-app

# 2. Check database logs
kubectl logs -l app=postgres -n vocab-app --tail=100

# 3. Test database connectivity
kubectl exec -it deploy/vocab-api -n vocab-app -- psql $DATABASE_URL -c "SELECT 1;"

# 4. Check connection pool
kubectl logs -l app=vocab-api -n vocab-app | grep -i "connection"

# 5. Restart API pods if database is healthy
kubectl rollout restart deployment/vocab-api -n vocab-app
```

**Common Causes**:
- Database pod restarted
- Connection pool exhausted
- Network policy blocking connections
- Credentials rotated without updating secret

---

#### Redis Connection Failed

**Symptoms**:
- Health check returns `degraded`
- Background jobs not processing
- Logs show: `Redis health check failed`

**Troubleshooting**:
```bash
# 1. Check Redis pod status
kubectl get pods -l app=redis -n vocab-app

# 2. Test Redis connectivity
kubectl exec -it deploy/vocab-api -n vocab-app -- redis-cli -u $REDIS_URL ping

# 3. Check job queue status
curl https://vocab-app.example.com/api/health/ready | jq '.checks.redis'

# 4. Restart Redis if needed
kubectl rollout restart statefulset/redis -n vocab-app
```

**Impact**:
- File uploads still work (synchronous processing disabled)
- Tests not generated until Redis recovers
- Existing tests still accessible

---

#### High Memory Usage

**Symptoms**:
- Memory usage > 90%
- OOMKilled pod restarts
- Slow response times

**Troubleshooting**:
```bash
# 1. Check current memory usage
kubectl top pods -l app=vocab-api -n vocab-app

# 2. Check for memory leaks in logs
kubectl logs -l app=vocab-api -n vocab-app | grep -i "memory\|heap"

# 3. Take heap snapshot (if Node.js)
kubectl exec -it deploy/vocab-api -n vocab-app -- node --heap-snapshot

# 4. Increase memory limits temporarily
kubectl set resources deployment/vocab-api --limits=memory=1Gi -n vocab-app

# 5. Investigate in Sentry performance monitoring
```

**Common Causes**:
- Large file uploads not properly streamed
- Memory leak in background job processing
- Insufficient garbage collection
- Undersized resource limits

---

## Monitoring Dashboard

### Key Metrics to Track

#### Application Metrics

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Request Rate (req/s) | Health endpoint | - |
| Error Rate (%) | Sentry | > 5% |
| P95 Latency (ms) | Sentry | > 2000ms |
| Active Users | Database | - |
| Background Jobs (waiting) | Health endpoint | > 100 |
| Background Jobs (failed) | Health endpoint | > 5/hour |

#### Infrastructure Metrics

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Pod CPU (%) | Kubernetes | > 80% |
| Pod Memory (%) | Kubernetes | > 90% |
| Pod Restart Count | Kubernetes | > 3/10min |
| Database Connections | PostgreSQL | > 80% of max |
| Redis Memory (%) | Redis INFO | > 90% |
| MinIO Storage (%) | MinIO metrics | > 85% |

---

## Production Deployment Checklist

Before deploying to production, ensure:

- [ ] `SENTRY_DSN` configured in Kubernetes secret
- [ ] Sentry project created with proper alerts
- [ ] Health check endpoints tested
- [ ] Liveness/readiness probes configured in Kubernetes
- [ ] Log aggregation configured (if using external service)
- [ ] Alert rules configured in monitoring tool
- [ ] On-call rotation established
- [ ] Incident response runbooks reviewed
- [ ] Post-deployment monitoring window scheduled (1-2 hours)
- [ ] Rollback plan documented

---

## Useful Commands

```bash
# Check health status
curl https://vocab-app.example.com/api/health
curl https://vocab-app.example.com/api/health/ready

# View recent errors in Sentry
# https://sentry.io/organizations/your-org/issues/?query=is:unresolved

# Get logs for last hour
kubectl logs --since=1h -l app=vocab-api -n vocab-app

# Check pod resource usage
kubectl top pods -n vocab-app

# Describe pod for events
kubectl describe pod <pod-name> -n vocab-app

# Execute interactive shell in pod
kubectl exec -it deploy/vocab-api -n vocab-app -- /bin/sh

# Port-forward to access health locally
kubectl port-forward deploy/vocab-api 3001:3001 -n vocab-app
curl http://localhost:3001/api/health/ready
```

---

## Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Pino Logging Documentation](https://getpino.io/)
- [Kubernetes Monitoring Best Practices](https://kubernetes.io/docs/tasks/debug/debug-application/)
- [Incident Response Best Practices](https://response.pagerduty.com/)

---

**Last Updated**: 2026-01-19
**Owner**: DevOps Team
**Reviewers**: CTO, Engineering Manager
