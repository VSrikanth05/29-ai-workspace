import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../../infrastructure/metrics.service';
import { ConfigService } from '@nestjs/config';

export interface UsageRecord {
  conversationId: string;
  userId: string;
  workspaceId?: string | null;
  provider: string;
  model: string;
  input: string;
  output: string;
  latencyMs: number;
  success: boolean;
  errorCode?: string;
  requestId?: string;
  streamed: boolean;
  inputTokens?: number;
  outputTokens?: number;
}

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}
  estimateTokens(text: string) {
    return text ? Math.max(1, Math.ceil(text.length / 4)) : 0;
  }
  conversation(action: 'created' | 'deleted') {
    this.metrics.aiConversationEvents.inc({ action });
  }
  async record(record: UsageRecord) {
    const inputTokens = record.inputTokens ?? this.estimateTokens(record.input);
    const outputTokens = record.outputTokens ?? this.estimateTokens(record.output);
    const estimatedCostUsd = this.estimateCost(record.provider, record.model, inputTokens, outputTokens);
    this.metrics.aiRequests.inc({
      provider: record.provider,
      model: record.model,
      outcome: record.success ? 'success' : 'failure',
      streamed: String(record.streamed),
    });
    this.metrics.aiProviderLatency.observe(
      { provider: record.provider, model: record.model },
      record.latencyMs / 1000,
    );
    try {
      await this.prisma.modelUsage.create({
        data: {
          conversationId: record.conversationId,
          userId: record.userId,
          workspaceId: record.workspaceId,
          provider: record.provider,
          model: record.model,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          estimatedCostUsd,
          latencyMs: record.latencyMs,
          success: record.success,
          errorCode: record.errorCode,
          requestId: record.requestId,
          streamed: record.streamed,
        },
      });
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'ai_usage_record_failed',
          conversationId: record.conversationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  private estimateCost(provider: string, model: string, inputTokens: number, outputTokens: number) {
    const raw = this.config.get<string>('AI_MODEL_PRICING_JSON');
    if (!raw) return undefined;
    try {
      const pricing = JSON.parse(raw) as Record<string, { inputPerMillion?: number; outputPerMillion?: number }>;
      const rate = pricing[`${provider}:${model}`] ?? pricing[model];
      if (!rate || !Number.isFinite(rate.inputPerMillion) || !Number.isFinite(rate.outputPerMillion)) return undefined;
      const inputPerMillion = rate.inputPerMillion;
      const outputPerMillion = rate.outputPerMillion;
      if (inputPerMillion === undefined || outputPerMillion === undefined) return undefined;
      return (inputTokens * inputPerMillion + outputTokens * outputPerMillion) / 1_000_000;
    } catch {
      return undefined;
    }
  }
}
