import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export const INGESTION_QUEUE = 'document-ingestion';
export const INGESTION_DLQ = 'document-ingestion-dlq';
export interface IngestionJobData {
  documentId: string;
}

@Injectable()
export class IngestionQueueService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(IngestionQueueService.name);
  private queue: Queue<IngestionJobData> | null = null;

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return (
      this.config.get<string>('INGESTION_ASYNC_ENABLED') === 'true' &&
      Boolean(this.config.get<string>('REDIS_URL'))
    );
  }

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!this.enabled || !url) return;
    this.queue = new Queue<IngestionJobData>(INGESTION_QUEUE, {
      connection: { url },
      defaultJobOptions: {
        attempts: Number(this.config.get('INGESTION_JOB_ATTEMPTS')) || 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 500,
        removeOnFail: 1_000,
      },
    });
    this.logger.log(JSON.stringify({ event: 'ingestion_queue_ready' }));
  }

  async enqueue(documentId: string): Promise<void> {
    if (!this.queue)
      throw new Error('Document ingestion queue is unavailable.');
    const existing = await this.queue.getJob(documentId);
    if (existing) {
      const state = await existing.getState();
      if (['active', 'waiting', 'delayed', 'prioritized'].includes(state))
        return;
      await existing.remove();
    }
    await this.queue.add('ingest', { documentId }, { jobId: documentId });
  }

  async cancel(documentId: string): Promise<boolean> {
    const job = await this.queue?.getJob(documentId);
    if (!job) return false;
    const state = await job.getState();
    if (state === 'active') return false;
    await job.remove();
    return true;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.queue?.close();
  }
}
