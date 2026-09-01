# Production deployment

The production stack runs six roles without changing public API routes:

- a non-root Next.js standalone server renders the frontend and proxies `/api`;
- a stateless NestJS API handles authentication, chat, RAG, and uploads;
- a BullMQ worker parses, chunks, and embeds stored documents;
- Redis provides persistent jobs and short-lived response caching;
- a one-shot container applies Prisma migrations before startup;
- an optional PostgreSQL container performs scheduled logical backups.

Supabase remains the system of record for PostgreSQL, Auth, and object storage.

## Prerequisites and secrets

Use Docker Engine 25+ with Compose v2, a Supabase project with pgvector enabled,
a private `documents` bucket, and a TLS-terminating ingress/load balancer. The
default stack needs approximately 2 GB RAM.

The optional `local-db` Compose profile starts PostgreSQL 16 with pgvector for
self-hosted validation. Managed PostgreSQL remains recommended for production:

```sh
docker compose --profile local-db up -d postgres redis
```

Copy `.env.example` to `.env` and replace every placeholder. Never commit
`.env`. Required values are `DATABASE_URL`, `DIRECT_URL`, Supabase URL/keys,
and credentials for the selected LLM. Use the pooler URL for `DATABASE_URL` and
the direct database endpoint for `DIRECT_URL`, migrations, and backups.

Set `CORS_ORIGINS` to exact comma-separated origins, keep
`REDIS_REQUIRED=true`, `INGESTION_ASYNC_ENABLED=true`, and
`SWAGGER_ENABLED=false` in production. Store credentials in the deployment
platform's secret manager and rotate service-role/LLM keys regularly.

## Build and deploy

```sh
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
```

The migration role must finish successfully before API and worker startup.
Frontend defaults to port 8080. Put it behind HTTPS; avoid publicly exposing
backend port 5000. For registry deployments, replace build sections with the
immutable GHCR image digests published by `release.yml`.

Safe rollout order: create a backup, apply migrations, start one worker, roll
API replicas, then roll frontend. Roll containers back by digest. Database
migrations use forward fixes rather than automatic destructive rollback.

Set `FRONTEND_URL`, `REQUEST_BODY_LIMIT`, and every selected storage credential.
For tracing, set `OTEL_ENABLED=true` and an absolute
`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`. Startup fails in production when database,
Supabase Auth, selected storage, CORS, frontend URL, required Redis, or all LLM
credentials are missing.

### Environment variable reference

| Group | Variables | Requirement |
| --- | --- | --- |
| Runtime | `NODE_ENV`, `PORT`, `FRONTEND_PORT`, `BACKEND_PORT`, `BACKEND_INTERNAL_URL`, `FRONTEND_URL` | Set production URLs and ports; `FRONTEND_URL` is required in production. |
| Database | `DATABASE_URL`, `DIRECT_URL` | Both required; use pooled and direct URLs respectively. |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | Required for authentication and Supabase storage. |
| Storage | `STORAGE_PROVIDER`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | R2 values required only when `STORAGE_PROVIDER=r2`. |
| AI | `LLM_PROVIDER`, provider API key/model variables | At least one supported provider key is required; the selected provider must be configured. |
| Redis/jobs | `REDIS_URL`, `REDIS_REQUIRED`, `CACHE_PREFIX`, `CACHE_TTL_SECONDS`, `INGESTION_ASYNC_ENABLED`, `INGESTION_WORKER_CONCURRENCY`, `INGESTION_JOB_ATTEMPTS`, `WORKER_SHUTDOWN_TIMEOUT_MS` | Redis is required for production async jobs and caching. |
| HTTP/security | `CORS_ORIGINS`, `TRUST_PROXY_HOPS`, `RATE_LIMIT_TTL_MS`, `RATE_LIMIT_MAX`, `REQUEST_TIMEOUT_MS`, `HEADERS_TIMEOUT_MS`, `REQUEST_BODY_LIMIT`, `SWAGGER_ENABLED` | Use exact HTTPS origins; keep Swagger disabled publicly. |
| RAG | `RAG_RETRIEVAL_MODE`, `RAG_TOP_K`, candidate counts, weights, `RAG_MIN_SCORE`, `RAG_RERANK_ENABLED` | Optional tuning; defaults are validated at startup. |
| Tracing | `OTEL_ENABLED`, `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS` | OTLP endpoint is required when tracing is enabled. |
| Backup | `BACKUP_INTERVAL_SECONDS`, `BACKUP_RETENTION_DAYS`, `STORAGE_BACKUP_DIR`, `SUPABASE_STORAGE_RCLONE_REMOTE` | Needed only for the corresponding backup workflow. |

The canonical, copyable list with safe placeholders is `.env.example`.

## Health and observability

- `GET /health` retains the original response.
- `GET /health/live` checks process liveness.
- `GET /health/ready` checks PostgreSQL and required Redis connectivity.
- `GET /metrics` returns Prometheus process, HTTP, ingestion, AI request/provider
  latency, stream-event, cache, Redis, database-health, worker, and
  conversation-lifecycle metrics.
- Frontend `GET /healthz` checks the Next.js runtime.

Use readiness for load-balancer removal and restrict `/metrics` to monitoring
networks at the ingress/firewall. Scrape every 15-30 seconds. Logs are JSON on
stdout and include request IDs, routes, status, latency, and safe errors. Alert
on readiness, 5xx rate, p95 latency, failed ingestion, queue depth, Redis
memory, and database saturation.

## Jobs, caching, and scaling

API replicas are stateless and scale horizontally. Worker replicas scale
independently; BullMQ coordinates jobs. Tune
`INGESTION_WORKER_CONCURRENCY`, job attempts, and memory against parser cost and
embedding-provider quotas. Jobs retry with exponential backoff and terminal
failures set document status to `FAILED`.

```sh
docker compose logs -f worker
docker compose logs -f backend redis
```

Do not flush Redis while jobs are pending. Redis uses AOF in `redis_data`.
Document lists cache for 30 seconds and signed URLs for five minutes. Set
`INGESTION_ASYNC_ENABLED=false` and omit `REDIS_URL` to retain synchronous local
ingestion. Nest rate limits are per API replica, so also enforce distributed
limits at the WAF/ingress when scaling horizontally.

Next.js provides hashed immutable assets and server rendering; the API
compresses responses. Uploads are limited to 20 MB by the browser, ingress,
Multer, and content-signature validator.

## Backups and restoration

Supabase-managed backups should remain primary. Enable portable logical dumps:

```sh
docker compose --profile backup up -d backup
docker compose exec backup ls -lh /backups
```

The backup role writes custom-format dumps and SHA-256 files to the
`database_backups` volume every `BACKUP_INTERVAL_SECONDS`, pruning after
`BACKUP_RETENTION_DAYS`. Replicate them to encrypted off-site storage. Database
dumps do not include Supabase Storage; separately replicate/export the
`documents` bucket.

Test restore only against an isolated target first:

```sh
docker run --rm -v ai-document-assistant_database_backups:/backups \
  -e RESTORE_DATABASE_URL='postgresql://...' \
  -v "$PWD/scripts/restore.sh:/restore.sh:ro" postgres:16-alpine \
  /bin/sh /restore.sh /backups/aida-YYYYMMDDTHHMMSSZ.dump
```

Restore uses `--clean --if-exists` and is destructive. Verify the target URL,
checksum, staging smoke test, and recovery-time objective before production use.
Object storage backup and restoration are provided by
`scripts/backup-storage.sh` and `scripts/restore-storage.sh`; run
`scripts/verify-health.sh` after either database or object recovery.

## Rollback

Stop rollout, remove the failing revision from the load balancer, and redeploy
the last known-good immutable image digests. Do not reverse an applied additive
migration automatically. If data recovery is necessary, isolate traffic, take
a forensic backup, restore the last verified database and object snapshots into
a new environment, run migrations forward, execute health/smoke checks, then
switch traffic. Record the decision and timestamps in the incident log.

## Security checklist

- Terminate TLS 1.2+ and enable HSTS at the public edge.
- Never expose Redis, worker, migration, backup, or metrics publicly.
- Preserve `X-Request-Id`; restrict Supabase service-role scope.
- Keep strict CORS and CSP; update policies deliberately for new external hosts.
- Retain read-only containers and `no-new-privileges` from Compose.
- Scan dependencies/images, patch bases, and rotate secrets on schedule.
- Review rate limits, upload validation failures, and authentication anomalies.

## CI/CD

`ci.yml` validates Prisma, installs from locks, runs all lint/tests/builds,
builds both images, and validates Compose. `release.yml` publishes versioned and
SHA-tagged frontend/backend images to GHCR with SBOM, provenance, and GitHub
attestations. Deploy immutable digests, not mutable `latest`, to production.

## Troubleshooting

- Not ready: inspect `backend`, `migrate`, and `redis` logs, then call
  `/health/ready` directly.
- Stuck `UPLOADED`: confirm worker health and matching `REDIS_URL`.
- `FAILED`: correlate worker JSON logs by `documentId`.
- CORS: add the exact browser scheme/host to `CORS_ORIGINS`.
- CSP: proxy API through same-origin `/api`; avoid ad-hoc policy relaxation.
- Migration: verify `DIRECT_URL`, pgvector, and database privileges.
