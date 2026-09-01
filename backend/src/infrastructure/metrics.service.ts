import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  readonly httpRequests = new Counter({
    name: 'aida_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });
  readonly httpDuration = new Histogram({
    name: 'aida_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'] as const,
    buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });
  readonly ingestionJobs = new Counter({
    name: 'aida_ingestion_jobs_total',
    help: 'Document ingestion job outcomes',
    labelNames: ['outcome'] as const,
    registers: [this.registry],
  });
  readonly aiRequests = new Counter({
    name: 'aida_ai_requests_total',
    help: 'AI request outcomes',
    labelNames: ['provider', 'model', 'outcome', 'streamed'] as const,
    registers: [this.registry],
  });
  readonly aiProviderLatency = new Histogram({
    name: 'aida_ai_provider_latency_seconds',
    help: 'AI provider request latency',
    labelNames: ['provider', 'model'] as const,
    buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
    registers: [this.registry],
  });
  readonly aiStreamEvents = new Counter({
    name: 'aida_ai_stream_events_total',
    help: 'AI stream events emitted',
    labelNames: ['type'] as const,
    registers: [this.registry],
  });
  readonly aiConversationEvents = new Counter({
    name: 'aida_ai_conversation_events_total',
    help: 'Conversation lifecycle events',
    labelNames: ['action'] as const,
    registers: [this.registry],
  });
  readonly cacheOperations = new Counter({
    name: 'aida_cache_operations_total',
    help: 'Cache hits, misses, writes, invalidations, and errors',
    labelNames: ['operation'] as const,
    registers: [this.registry],
  });
  readonly redisOperations = new Counter({
    name: 'aida_redis_operations_total',
    help: 'Redis operation outcomes',
    labelNames: ['operation', 'outcome'] as const,
    registers: [this.registry],
  });
  readonly databaseDuration = new Histogram({
    name: 'aida_database_health_duration_seconds',
    help: 'Database readiness query duration',
    labelNames: ['outcome'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 1, 2.5],
    registers: [this.registry],
  });
  readonly workerJobs = new Counter({
    name: 'aida_worker_jobs_total',
    help: 'Worker job lifecycle outcomes',
    labelNames: ['queue', 'outcome'] as const,
    registers: [this.registry],
  });
  readonly workerJobDuration = new Histogram({
    name: 'aida_worker_job_duration_seconds',
    help: 'Background job execution duration',
    labelNames: ['queue', 'outcome'] as const,
    buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 300],
    registers: [this.registry],
  });

  constructor() {
    this.registry.setDefaultLabels({ service: 'ai-document-assistant' });
    collectDefaultMetrics({ register: this.registry, prefix: 'aida_' });
  }

  render(): Promise<string> {
    return this.registry.metrics();
  }
}
