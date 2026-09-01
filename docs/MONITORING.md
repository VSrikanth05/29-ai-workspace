# Monitoring and distributed tracing

Prometheus metrics include process/runtime defaults plus:

- `aida_http_requests_total`, `aida_http_request_duration_seconds`
- `aida_ai_requests_total`, `aida_ai_provider_latency_seconds`
- `aida_ai_stream_events_total`, `aida_ai_conversation_events_total`
- `aida_cache_operations_total`, `aida_redis_operations_total`
- `aida_database_health_duration_seconds`
- `aida_ingestion_jobs_total`, `aida_worker_jobs_total`,
  `aida_worker_job_duration_seconds`

Scrape `/metrics` only from a private monitoring network. Use p50/p95/p99
latency, error rate, saturation, cache hit ratio, queue throughput, DLQ count,
and provider latency dashboards.

Set `OTEL_ENABLED=true`, `OTEL_SERVICE_NAME`, and
`OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` to export OTLP/HTTP traces. Auto-
instrumentation covers HTTP, database, Redis, and BullMQ. Domain spans cover AI
chat/embed/stream, RAG retrieval, and document ingestion. Preserve W3C
`traceparent` through ingress and do not sample away errors. Start with 5–10%
head sampling for successful traffic and retain all error traces at the
collector.
