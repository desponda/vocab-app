# Kubernetes Security Hardening Guide

## Overview

This guide documents the security hardening measures implemented for the Vocab App Kubernetes deployment.

**Security Features:**
- **Security Contexts**: Run as non-root, drop capabilities, seccomp profiles
- **Pod Disruption Budgets**: Ensure availability during cluster maintenance
- **Health Probes**: Automatic pod restart on failures
- **Network Policies**: Restrict pod-to-pod communication (optional)
- **Resource Limits**: Prevent resource exhaustion

---

## Table of Contents

1. [Security Contexts](#security-contexts)
2. [Pod Disruption Budgets](#pod-disruption-budgets)
3. [Health Probes](#health-probes)
4. [Network Policies](#network-policies)
5. [Resource Management](#resource-management)
6. [Best Practices](#best-practices)

---

## Security Contexts

### Overview

Security contexts define privilege and access control settings for pods and containers, following the principle of least privilege.

### Pod-Level Security Context

Applied to all application pods (API and Web):

```yaml
securityContext:
  runAsNonRoot: true    # Prevent running as root
  runAsUser: 1000       # Run as UID 1000
  fsGroup: 1000         # File system group
  seccompProfile:
    type: RuntimeDefault  # Use default seccomp profile
```

**Benefits:**
- **runAsNonRoot**: Prevents container from running as root, reducing attack surface
- **runAsUser**: Explicit non-privileged user ID
- **fsGroup**: Ensures files created by container have correct group ownership
- **seccompProfile**: Restricts system calls available to the container

### Container-Level Security Context

Applied to each container:

```yaml
securityContext:
  allowPrivilegeEscalation: false  # Prevent privilege escalation
  capabilities:
    drop:
    - ALL                          # Drop all Linux capabilities
  readOnlyRootFilesystem: false    # Allow write (Node.js requires temp files)
```

**Capabilities Dropped:**
- Network admin, raw sockets, process management
- File system operations, kernel modules
- All privileged operations

**Why readOnlyRootFilesystem is false:**
- Node.js applications need write access for:
  - Temporary files during processing
  - Build cache (Next.js)
  - Session storage
- Future improvement: Use emptyDir volumes for writable paths

### Verification

```bash
# Check pod security context
kubectl get pod API_POD_NAME -n vocab-app-staging -o jsonpath='{.spec.securityContext}' | jq

# Check container security context
kubectl get pod API_POD_NAME -n vocab-app-staging -o jsonpath='{.spec.containers[0].securityContext}' | jq

# Verify pod is not running as root
kubectl exec -n vocab-app-staging API_POD_NAME -- id
# Expected: uid=1000 gid=1000
```

---

## Pod Disruption Budgets

### Overview

Pod Disruption Budgets (PDBs) ensure minimum availability during voluntary disruptions like:
- Node drains for maintenance
- Cluster upgrades
- Pod evictions

### Configuration

```yaml
# values.yaml
api:
  podDisruptionBudget:
    enabled: true
    minAvailable: 1  # At least 1 API pod must remain available

web:
  podDisruptionBudget:
    enabled: true
    minAvailable: 1  # At least 1 Web pod must remain available
```

### How It Works

**Scenario**: Cluster has 2 API pods running

1. Admin drains node for maintenance
2. Kubernetes checks PDB: "minAvailable: 1"
3. Kubernetes waits for new pod to start on another node
4. Only then does Kubernetes evict old pod
5. **Result**: Zero downtime

**Without PDB**:
- Both pods could be evicted simultaneously
- Service would be unavailable until new pods start

### Verification

```bash
# Check PDB status
kubectl get pdb -n vocab-app-staging

# Expected output:
# NAME              MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
# vocab-app-api-pdb 1               N/A               1                     5d
# vocab-app-web-pdb 1               N/A               1                     5d

# Test PDB during drain
kubectl drain NODE_NAME --ignore-daemonsets --delete-emptydir-data
# Watch pods reschedule gracefully
kubectl get pods -n vocab-app-staging -w
```

### Best Practices

| Replicas | minAvailable | Reasoning |
|----------|--------------|-----------|
| 1 | 0 | Cannot guarantee availability with 1 replica |
| 2 | 1 | Ensures 1 pod always available |
| 3+ | 2 | Ensures majority quorum during disruptions |

---

## Health Probes

### Overview

Health probes automatically detect and recover from application failures.

### Liveness Probe

**Purpose**: Is the application running?

**Configuration** (API):
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3001
  initialDelaySeconds: 30  # Wait for app to start
  periodSeconds: 10        # Check every 10 seconds
  timeoutSeconds: 3        # Timeout after 3 seconds
  failureThreshold: 3      # Restart after 3 consecutive failures
```

**Behavior:**
- Checks `/api/health` endpoint every 10 seconds
- If 3 consecutive checks fail → Kubernetes **restarts the pod**
- **Use case**: Detect deadlocks, memory leaks, unresponsive app

### Readiness Probe

**Purpose**: Is the application ready to receive traffic?

**Configuration** (API):
```yaml
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3001
  initialDelaySeconds: 10  # Quick startup check
  periodSeconds: 5         # Check every 5 seconds
  timeoutSeconds: 5        # Allow time for dependency checks
  failureThreshold: 3      # Mark unready after 3 failures
```

**Behavior:**
- Checks `/api/health/ready` (includes database, Redis, MinIO checks)
- If fails → Pod **removed from load balancer** (not restarted)
- **Use case**: Detect database unavailability, dependency failures

### Difference: Liveness vs Readiness

| Probe | Action on Failure | Use Case |
|-------|-------------------|----------|
| Liveness | **Restart pod** | App is broken, restart might fix it |
| Readiness | **Remove from load balancer** | App is healthy but dependencies are down |

### Example Scenario

**Database goes down:**
1. Readiness probe fails (database check fails)
2. Pod removed from load balancer (no traffic sent)
3. Liveness probe still passes (app is running)
4. Pod **not restarted** (restarting won't help)
5. Database comes back up
6. Readiness probe passes again
7. Pod added back to load balancer

### Verification

```bash
# Check probe configuration
kubectl describe pod API_POD_NAME -n vocab-app-staging | grep -A 10 "Liveness\|Readiness"

# Simulate liveness failure (pod restart)
kubectl exec -n vocab-app-staging API_POD_NAME -- killall node
# Watch pod restart
kubectl get pods -n vocab-app-staging -w

# Simulate readiness failure (remove from load balancer)
# Stop database temporarily
kubectl scale statefulset vocab-app-postgres --replicas=0 -n vocab-app-staging
# Watch pod become NotReady
kubectl get pods -n vocab-app-staging -w
# Restore database
kubectl scale statefulset vocab-app-postgres --replicas=1 -n vocab-app-staging
```

---

## Network Policies

### Overview

Network Policies restrict pod-to-pod communication using Kubernetes-native firewall rules.

**⚠️ Important**: Requires CNI plugin with NetworkPolicy support (Calico, Cilium, Weave Net). Not supported by default on all clusters.

### Configuration

```yaml
# values.yaml
networkPolicy:
  enabled: false  # Disabled by default
  # Enable only if your cluster supports NetworkPolicy
```

### Policy Rules

#### API Pod Network Policy

**Ingress (allowed incoming traffic):**
- From Web pods on port 3001
- From Ingress controller (for health checks and direct API access)

**Egress (allowed outgoing traffic):**
- To PostgreSQL pod on port 5432
- To Redis pod on port 6379
- To MinIO pod on port 9000
- To DNS (UDP port 53)
- To external services (HTTPS port 443, HTTP port 80)

#### Web Pod Network Policy

**Ingress:**
- From Ingress controller only

**Egress:**
- To API pods on port 3001
- To DNS (UDP port 53)

#### Database Pod Network Policies

**PostgreSQL:**
- Ingress only from API pods and backup CronJob pods

**Redis:**
- Ingress only from API pods

### Enabling Network Policies

```bash
# 1. Verify your cluster supports NetworkPolicy
kubectl api-versions | grep networking.k8s.io/v1

# 2. Enable in values.yaml
networkPolicy:
  enabled: true

# 3. Deploy with Helm
helm upgrade vocab-app ./k8s/helm/vocab-app -n vocab-app-staging

# 4. Verify policies are created
kubectl get networkpolicies -n vocab-app-staging

# 5. Test connectivity (should work)
kubectl exec -n vocab-app-staging API_POD -- curl -s http://vocab-app-postgres:5432 || echo "Connection allowed"

# 6. Test blocked connectivity (should fail)
kubectl run test-pod --image=curlimages/curl --rm -it --restart=Never -n vocab-app-staging -- \
  curl -s http://vocab-app-postgres:5432
# Expected: Connection timeout (blocked by NetworkPolicy)
```

### Troubleshooting Network Policies

**Symptom**: Application can't connect to database after enabling NetworkPolicy

```bash
# 1. Check if NetworkPolicy is applied
kubectl get networkpolicy -n vocab-app-staging

# 2. Describe NetworkPolicy to see rules
kubectl describe networkpolicy vocab-app-api-netpol -n vocab-app-staging

# 3. Check pod labels match policy selectors
kubectl get pods -n vocab-app-staging --show-labels

# 4. Temporarily disable NetworkPolicy
networkPolicy:
  enabled: false
helm upgrade vocab-app ./k8s/helm/vocab-app -n vocab-app-staging

# 5. If connectivity works without NetworkPolicy, review policy rules
```

---

## Resource Management

### Current Resource Configuration

```yaml
api:
  resources:
    requests:
      memory: "512Mi"  # Guaranteed allocation
      cpu: "250m"      # 0.25 CPU cores
    limits:
      memory: "1Gi"    # Hard limit (pod killed if exceeded)
      cpu: "1000m"     # 1 CPU core (throttled if exceeded)

web:
  resources:
    requests:
      memory: "256Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"
```

### Resource Concepts

**Requests** (guaranteed):
- Kubernetes schedules pod only if node has this much free
- Pod gets at least this much resources
- Used for scheduling decisions

**Limits** (maximum):
- Pod cannot exceed this amount
- **Memory**: Pod is killed (OOMKilled) if exceeded
- **CPU**: Pod is throttled (slowed down) if exceeded

### Monitoring Resource Usage

```bash
# Check current resource usage
kubectl top pods -n vocab-app-staging

# Example output:
# NAME                     CPU(cores)   MEMORY(bytes)
# vocab-app-api-xxx        150m         600Mi
# vocab-app-web-xxx        50m          200Mi

# Check if pods are being throttled (CPU) or OOMKilled (memory)
kubectl describe pod API_POD_NAME -n vocab-app-staging | grep -A 5 "Last State"

# Check resource requests vs limits vs actual usage
kubectl describe node NODE_NAME | grep -A 10 "Allocated resources"
```

### Tuning Resource Limits

**Signs you need to increase limits:**
- OOMKilled pods (check with `kubectl describe pod`)
- High CPU throttling (check with `kubectl top pods`)
- Slow response times under load

**Signs you can decrease limits:**
- Pods consistently use <50% of limits
- Over-provisioned cluster (wasted resources)

**Recommended approach:**
1. Monitor actual usage for 1-2 weeks
2. Set requests = average usage
3. Set limits = peak usage + 20% buffer
4. Adjust based on real-world behavior

---

## Best Practices

### Security Checklist

- [ ] All pods run as non-root (runAsNonRoot: true)
- [ ] All capabilities dropped (drop: ALL)
- [ ] Seccomp profile enabled (RuntimeDefault)
- [ ] Pod Disruption Budgets configured (minAvailable: 1)
- [ ] Liveness probes configured (automatic restart on failure)
- [ ] Readiness probes configured (remove from LB on failure)
- [ ] Resource limits set (prevent resource exhaustion)
- [ ] Network Policies enabled (if cluster supports)
- [ ] Secrets not in version control (use Kubernetes Secrets)
- [ ] Images from trusted registries (GitHub Container Registry)

### Deployment Best Practices

1. **Always run at least 2 replicas** for high availability
2. **Use PodDisruptionBudgets** to prevent downtime during maintenance
3. **Set resource requests and limits** to prevent noisy neighbor problems
4. **Use health probes** for automatic recovery from failures
5. **Enable Network Policies** if your cluster supports them
6. **Monitor resource usage** and adjust limits accordingly
7. **Test failover scenarios** regularly (simulate pod failures)
8. **Keep security contexts strict** (principle of least privilege)

### Testing Resilience

```bash
# 1. Test pod failure (liveness probe)
kubectl delete pod API_POD_NAME -n vocab-app-staging
# Watch new pod start automatically
kubectl get pods -n vocab-app-staging -w

# 2. Test node failure (PodDisruptionBudget)
kubectl drain NODE_NAME --ignore-daemonsets
# Verify service remains available
curl https://vocab-staging.dresponda.com/api/health

# 3. Test database failure (readiness probe)
kubectl scale statefulset vocab-app-postgres --replicas=0 -n vocab-app-staging
# Watch pods become NotReady but not restart
kubectl get pods -n vocab-app-staging -w

# 4. Test resource limits (OOMKilled)
# (Requires load testing tool to simulate memory exhaustion)
```

---

## Additional Resources

- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Pod Disruption Budgets](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
- [Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)

---

**Last Updated**: 2026-01-19
**Owner**: DevOps Team
**Reviewers**: Security Team, SRE Team
