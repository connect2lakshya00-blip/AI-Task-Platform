# Architecture Document

## System Overview

The AI Task Processing Platform is a distributed system that processes user-submitted text transformation tasks asynchronously via a Redis-backed job queue.

```
User → React Frontend → Express API → Redis Queue → Python Worker → MongoDB
                              ↕                              ↕
                           MongoDB                       MongoDB
```

---

## Worker Scaling Strategy

### Horizontal Pod Autoscaler (HPA)
Workers are stateless consumers — they pull jobs from Redis and write results to MongoDB. This makes them ideal for horizontal scaling.

- HPA is configured to scale worker pods based on CPU utilization (target: 60%)
- Min replicas: 2, Max replicas: 20
- Each worker runs multiple RQ worker threads

### Queue-Based Scaling
- Redis queue depth can be monitored via a custom metric exporter
- KEDA (Kubernetes Event-Driven Autoscaling) can scale workers based on queue length
- Recommended: scale up when queue depth > 50 jobs, scale down when < 5

### Worker Concurrency
Each Python worker pod uses RQ with a configurable concurrency level. For CPU-bound tasks, set concurrency = number of vCPUs. For I/O-bound tasks, higher concurrency is safe.

---

## Handling 100k Tasks/Day

### Throughput Math
- 100,000 tasks/day = ~1.16 tasks/second average
- Peak load (assuming 10x spike) = ~12 tasks/second
- Each task takes ~50ms to process = 1 worker handles ~20 tasks/second
- Minimum workers needed at peak: 1 (with headroom, run 3-5)

### Optimizations
1. Redis pipeline batching for status updates
2. MongoDB bulk writes for logs
3. Worker pre-warming: keep minimum 2 workers always running
4. Task deduplication via Redis SET before enqueue
5. Dead letter queue for failed jobs (retry up to 3 times)

### Queue Architecture
```
tasks:default  → normal priority jobs
tasks:high     → premium/urgent jobs
tasks:failed   → dead letter queue
```

---

## MongoDB Indexing Strategy

### Tasks Collection Indexes
```js
// Query by user + status (most common query)
{ userId: 1, status: 1 }

// Query by status for worker polling fallback
{ status: 1, createdAt: 1 }

// Single task lookup
{ _id: 1 }  // default

// TTL index to auto-expire old tasks (optional, 90 days)
{ createdAt: 1 }, { expireAfterSeconds: 7776000 }
```

### Users Collection Indexes
```js
// Login lookup
{ email: 1 }, { unique: true }
```

### Query Patterns
- Dashboard: `{ userId, status }` — covered by compound index
- Worker result write: `{ _id }` — uses default _id index
- Admin monitoring: `{ status, createdAt }` — covered by status index

---

## Redis Failure Handling

### Failure Scenarios

| Scenario | Behavior |
|----------|----------|
| Redis restart | Workers reconnect with exponential backoff |
| Job lost mid-processing | Worker marks job as failed after timeout |
| Redis OOM | New jobs rejected with 503, existing jobs preserved |
| Network partition | Workers pause, retry connection, resume on reconnect |

### Resilience Patterns
1. Redis Sentinel or Redis Cluster for HA in production
2. RQ job timeout set to 300s — prevents zombie jobs
3. Job result TTL: 24 hours (results stored in MongoDB, not Redis)
4. Heartbeat monitoring: workers emit health pings every 30s
5. Fallback: if Redis is down, API returns 503 with `Retry-After` header

### Persistence
- Redis configured with `appendonly yes` (AOF persistence)
- RDB snapshots every 60 seconds
- In Kubernetes: Redis uses a PersistentVolumeClaim

---

## Staging vs Production Setup

### Staging
- Single replica for all services
- Shared MongoDB instance (separate database)
- No HPA (fixed replica count)
- Debug logging enabled
- Relaxed rate limits
- Self-signed TLS cert

### Production
- Multi-replica deployments (backend: 3, worker: 5+)
- MongoDB Atlas or dedicated replica set (3 nodes)
- Redis Sentinel or Elasticache
- HPA enabled for workers
- Structured JSON logging → shipped to CloudWatch/Datadog
- Strict rate limits (100 req/min per IP)
- Valid TLS via cert-manager + Let's Encrypt
- Network policies to restrict pod-to-pod traffic
- Pod Disruption Budgets to ensure availability during rollouts

### Environment Promotion
```
feature branch → PR → CI tests → merge to main → deploy to staging → manual approval → deploy to prod
```

Argo CD manages both staging and production as separate Application resources pointing to different overlay directories (Kustomize or Helm values).

---

## Security Architecture

- JWT tokens expire in 7 days, signed with RS256 in production
- Passwords hashed with bcrypt (cost factor 12)
- Helmet.js sets security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting: 100 requests/15min per IP on auth routes
- All secrets stored in Kubernetes Secrets (base64), ideally backed by AWS Secrets Manager or Vault
- MongoDB: auth enabled, TLS in transit
- Redis: requirepass set, TLS in production
- Non-root containers (UID 1001)
- Read-only root filesystem where possible
