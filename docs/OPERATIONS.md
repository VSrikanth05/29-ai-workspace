# Production operations

## Routine checks

- Confirm `/health/live`, `/health/ready`, frontend `/healthz`, Prometheus scrape,
  OTLP export, Redis AOF, queue/DLQ depth, and most recent verified backups.
- Alert on readiness failure, 5xx above 1%, p95 API latency above 750 ms, search
  p95 above 300 ms, cache-error growth, Redis disconnects, DLQ entries, worker
  failures, database health latency, and AI provider error/latency changes.
- Review append-only audit events and authentication anomalies daily.

## Incident response checklist

1. Declare severity, incident lead, communications owner, and start time.
2. Preserve request IDs, trace IDs, audit events, metrics, and relevant logs.
3. Remove unhealthy replicas; disable risky writes or sharing if containment
   requires it. Rotate exposed credentials immediately.
4. Determine whether database, Redis, storage, worker, provider, or deployment
   is the failing dependency. Never flush Redis while jobs are pending.
5. Roll back immutable images or execute the disaster-recovery procedure.
6. Run `scripts/verify-health.sh`, Playwright smoke tests, and a read-only k6
   profile before restoring full traffic.
7. Document impact, timeline, root cause, remediation, and follow-up owners.

## Worker operations

Ingestion jobs use deterministic document IDs, exponential backoff, configurable
attempts, a terminal dead-letter queue, metrics, and graceful shutdown. Scale
workers by queue latency and provider quota. Investigate DLQ entries before
requeueing; validate the source still exists and is not already processed.
