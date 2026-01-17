# Kubernetes Deployment

## Prerequisites

- Kubernetes cluster with ArgoCD installed
- CloudFlare Tunnel configured with ingress controller
- `kubectl` and `helm` CLI tools

## Quick Start - Staging Deployment

### 1. Generate Secrets

```bash
# Generate JWT secrets
openssl rand -base64 32  # Use for jwtAccessSecret
openssl rand -base64 32  # Use for jwtRefreshSecret
openssl rand -base64 32  # Use for postgresPassword
```

### 2. Create Namespace

```bash
kubectl create namespace vocab-app-staging
```

### 3. Deploy with ArgoCD

```bash
kubectl apply -f k8s/argocd/vocab-app-staging.yaml
```

### 4. Update Secrets (Option 1: Direct)

```bash
kubectl -n vocab-app-staging create secret generic vocab-app-staging-secrets \
  --from-literal=postgres-password='YOUR_POSTGRES_PASSWORD' \
  --from-literal=jwt-access-secret='YOUR_JWT_ACCESS_SECRET' \
  --from-literal=jwt-refresh-secret='YOUR_JWT_REFRESH_SECRET' \
  --from-literal=database-url='postgresql://postgres:YOUR_POSTGRES_PASSWORD@vocab-app-staging-postgres:5432/vocab_app_staging' \
  --dry-run=client -o yaml | kubectl apply -f -
```

### 4. Update Secrets (Option 2: Helm Values)

Create `values-staging.yaml` (not committed):

```yaml
secrets:
  postgresPassword: "YOUR_POSTGRES_PASSWORD"
  jwtAccessSecret: "YOUR_JWT_ACCESS_SECRET"
  jwtRefreshSecret: "YOUR_JWT_REFRESH_SECRET"
  anthropicApiKey: "sk-ant-YOUR_CLAUDE_API_KEY"  # Optional
```

Then sync ArgoCD:

```bash
argocd app sync vocab-app-staging
```

## Verify Deployment

```bash
# Check pods
kubectl -n vocab-app-staging get pods

# Check ingress
kubectl -n vocab-app-staging get ingress

# View logs
kubectl -n vocab-app-staging logs -l app=api --tail=50
kubectl -n vocab-app-staging logs -l app=web --tail=50
```

## Access

Staging: https://vocab-staging.dresponda.com

## Manual Deployment (without ArgoCD)

```bash
helm install vocab-app-staging ./k8s/helm/vocab-app \
  --namespace vocab-app-staging \
  --create-namespace \
  --values k8s/helm/vocab-app/values-staging.yaml
```

## Upgrade

```bash
helm upgrade vocab-app-staging ./k8s/helm/vocab-app \
  --namespace vocab-app-staging \
  --values k8s/helm/vocab-app/values-staging.yaml
```

## Uninstall

```bash
helm uninstall vocab-app-staging --namespace vocab-app-staging
kubectl delete namespace vocab-app-staging
```

## Troubleshooting

### Pods not starting

```bash
kubectl -n vocab-app-staging describe pod <pod-name>
kubectl -n vocab-app-staging logs <pod-name>
```

### Database connection issues

```bash
# Check postgres pod
kubectl -n vocab-app-staging exec -it vocab-app-staging-postgres-0 -- psql -U postgres -d vocab_app_staging

# Check DATABASE_URL secret
kubectl -n vocab-app-staging get secret vocab-app-staging-secrets -o jsonpath='{.data.database-url}' | base64 -d
```

### Migrations not running

```bash
# Check migration job
kubectl -n vocab-app-staging get jobs
kubectl -n vocab-app-staging logs job/vocab-app-staging-migrations-<revision>

# Manually run migrations
kubectl -n vocab-app-staging run migrations --rm -it --image=ghcr.io/desponda/vocab-app-api:latest -- sh -c "cd /app/apps/api && npx prisma migrate deploy"
```
