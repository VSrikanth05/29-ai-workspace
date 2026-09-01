import '../infrastructure/tracing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Queue, Worker } from 'bullmq';
import { AppModule } from '../app.module';
import { JsonLogger } from '../common/logger/json.logger';
import { DocumentIngestionService } from './document-ingestion.service';
import {
  INGESTION_DLQ,
  INGESTION_QUEUE,
  IngestionJobData,
} from './ingestion-queue.service';
import { MetricsService } from '../infrastructure/metrics.service';
import { withSpan } from '../infrastructure/trace.util';
import { rm, writeFile } from 'node:fs/promises';

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: new JsonLogger(),
  });
  const config = app.get(ConfigService);
  const ingestion = app.get(DocumentIngestionService);
  const metrics = app.get(MetricsService);
  const redisUrl = config.get<string>('REDIS_URL');
  if (!redisUrl)
    throw new Error('REDIS_URL is required by the ingestion worker.');

  const concurrency = Number(config.get('INGESTION_WORKER_CONCURRENCY')) || 2;
  const dlq = new Queue<IngestionJobData>(INGESTION_DLQ, {
    connection: { url: redisUrl },
  });
  const worker = new Worker<IngestionJobData>(
    INGESTION_QUEUE,
    async (job) => {
      const started = process.hrtime.bigint();
      try {
        const result = await withSpan(
          'worker.document.ingest',
          {
            'job.id': String(job.id),
            'document.id': job.data.documentId,
            'job.attempt': job.attemptsMade + 1,
          },
          () => ingestion.process(job.data.documentId),
        );
        metrics.workerJobs.inc({
          queue: INGESTION_QUEUE,
          outcome: 'completed',
        });
        metrics.workerJobDuration.observe(
          { queue: INGESTION_QUEUE, outcome: 'completed' },
          Number(process.hrtime.bigint() - started) / 1e9,
        );
        return result;
      } catch (error) {
        metrics.workerJobs.inc({ queue: INGESTION_QUEUE, outcome: 'failed' });
        metrics.workerJobDuration.observe(
          { queue: INGESTION_QUEUE, outcome: 'failed' },
          Number(process.hrtime.bigint() - started) / 1e9,
        );
        throw error;
      }
    },
    { connection: { url: redisUrl }, concurrency },
  );
  const logger = new Logger('IngestionWorker');
  worker.on('completed', (job) =>
    logger.log(JSON.stringify({ event: 'job_completed', jobId: job.id })),
  );
  worker.on('failed', (job, error) => {
    logger.error(
      JSON.stringify({
        event: 'job_failed',
        jobId: job?.id,
        message: error.message,
      }),
    );
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1))
      void dlq.add('dead-letter', job.data, {
        jobId: `${job.id}-${Date.now()}`,
        removeOnComplete: 1000,
      });
  });

  const shutdown = async () => {
    await rm('/tmp/worker-ready', { force: true });
    const timeoutMs =
      Number(config.get('WORKER_SHUTDOWN_TIMEOUT_MS')) || 30_000;
    let closed = false;
    const graceful = worker.close().then(() => {
      closed = true;
    });
    await Promise.race([
      graceful,
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
    if (!closed) await worker.close(true);
    await dlq.close();
    await app.close();
  };
  process.once('SIGTERM', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
  await writeFile('/tmp/worker-ready', new Date().toISOString(), 'utf8');
  logger.log(JSON.stringify({ event: 'ingestion_worker_ready', concurrency }));
}

void bootstrapWorker();
