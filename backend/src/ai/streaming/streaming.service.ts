import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../../infrastructure/metrics.service';
import { UsageService } from '../usage/usage.service';
import type { RagCitation } from '../../rag/rag.service';

export type AiStreamEvent =
  | { type: 'delta'; content: string }
  | {
      type: 'done';
      conversationId: string;
      message: unknown;
      sources: RagCitation[];
      finishReason: string;
    };

@Injectable()
export class StreamingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
    private readonly metrics: MetricsService,
  ) {}

  complete(args: {
    chunks: AsyncIterable<string>;
    conversationId: string;
    userId: string;
    workspaceId?: string | null;
    provider: string;
    model: string;
    input: string;
    sources: RagCitation[];
    startedAt: number;
    requestId?: string;
  }): AsyncIterable<AiStreamEvent> {
    return this.run(args);
  }

  private async *run(args: {
    chunks: AsyncIterable<string>;
    conversationId: string;
    userId: string;
    workspaceId?: string | null;
    provider: string;
    model: string;
    input: string;
    sources: RagCitation[];
    startedAt: number;
    requestId?: string;
  }): AsyncGenerator<AiStreamEvent> {
    let output = '';
    let terminal = false;
    try {
      for await (const content of args.chunks) {
        output += content;
        this.metrics.aiStreamEvents.inc({ type: 'delta' });
        yield { type: 'delta', content };
      }
      const message = await this.prisma.$transaction(async (transaction) => {
        const saved = await transaction.chatMessage.create({
          data: {
            sessionId: args.conversationId,
            userId: args.userId,
            role: 'assistant',
            content: output,
            llmProvider: args.provider,
            llmModel: args.model,
            finishReason: 'stop',
          },
        });
        await transaction.chatSession.update({
          where: { id: args.conversationId },
          data: {
            streamStatus: 'COMPLETED',
            updatedAt: new Date(),
            lastActivityAt: new Date(),
          },
        });
        return saved;
      });
      terminal = true;
      await this.usage.record({
        ...args,
        input: args.input,
        output,
        latencyMs: Date.now() - args.startedAt,
        success: true,
        streamed: true,
      });
      this.metrics.aiStreamEvents.inc({ type: 'done' });
      yield {
        type: 'done',
        conversationId: args.conversationId,
        message,
        sources: args.sources,
        finishReason: 'stop',
      };
    } catch (error) {
      terminal = true;
      await this.prisma.chatSession
        .update({
          where: { id: args.conversationId },
          data: { streamStatus: 'ERROR' },
        })
        .catch(() => undefined);
      await this.usage.record({
        ...args,
        input: args.input,
        output,
        latencyMs: Date.now() - args.startedAt,
        success: false,
        errorCode: error instanceof Error ? error.name : 'UNKNOWN',
        streamed: true,
      });
      this.metrics.aiStreamEvents.inc({ type: 'error' });
      throw error;
    } finally {
      if (!terminal) {
        await this.prisma.chatSession
          .update({
            where: { id: args.conversationId },
            data: { streamStatus: 'CANCELLED' },
          })
          .catch(() => undefined);
        await this.usage.record({
          ...args,
          input: args.input,
          output,
          latencyMs: Date.now() - args.startedAt,
          success: false,
          errorCode: 'CANCELLED',
          streamed: true,
        });
        this.metrics.aiStreamEvents.inc({ type: 'cancelled' });
      }
    }
  }
}
