import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { ContextBuilderService } from './context/context-builder.service';
import { PromptEngineService } from './prompts/prompt-engine.service';
import { ProviderRouterService } from './router/provider-router.service';
import { StreamingService } from './streaming/streaming.service';
import { UsageService } from './usage/usage.service';
import type { AiChatDto, CreateConversationDto } from './dto/ai-chat.dto';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rag: RagService,
    private readonly access: WorkspaceAccessService,
    private readonly context: ContextBuilderService,
    private readonly prompts: PromptEngineService,
    private readonly router: ProviderRouterService,
    private readonly streaming: StreamingService,
    private readonly usage: UsageService,
    private readonly config: ConfigService,
  ) {}

  async createConversation(userId: string, dto: CreateConversationDto) {
    await this.access.requireRole(dto.workspaceId, userId);
    const provider = dto.provider ?? this.defaultProvider();
    const route = await this.router.resolve(provider, dto.model);
    if (dto.selectedSourceIds?.length) {
      const count = await this.prisma.document.count({
        where: {
          id: { in: dto.selectedSourceIds },
          workspaceId: dto.workspaceId,
        },
      });
      if (count !== dto.selectedSourceIds.length)
        throw new BadRequestException(
          'Selected sources must belong to the conversation workspace.',
        );
    }
    const conversation = await this.prisma.chatSession.create({
      data: {
        userId,
        workspaceId: dto.workspaceId,
        title: dto.title?.trim() || 'New conversation',
        provider: route.publicId,
        model: route.model,
        temperature: dto.temperature ?? 0.7,
        topP: dto.topP ?? 1,
        maxTokens: dto.maxTokens ?? 1024,
        metadata: {
          selectedSourceIds: dto.selectedSourceIds ?? [],
          promptVersion: this.prompts.version,
        },
      },
    });
    this.usage.conversation('created');
    return conversation;
  }

  async listConversations(userId: string, limit?: number, cursor?: string) {
    const rows = await this.prisma.chatSession.findMany({
      where: { userId },
      orderBy: { lastActivityAt: 'desc' },
      ...(limit ? { take: limit + 1 } : {}),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { _count: { select: { messages: true } } },
    });
    if (!limit) return rows;
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  }

  async getConversation(userId: string, id: string, messageLimit?: number) {
    const result = await this.prisma.chatSession.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          ...(messageLimit ? { take: messageLimit } : {}),
        },
      },
    });
    if (!result) throw new NotFoundException('Conversation not found.');
    return result;
  }

  async getConversationUsage(userId: string, id: string) {
    await this.getConversation(userId, id, 1);
    const items = await this.prisma.modelUsage.findMany({
      where: { conversationId: id, userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        provider: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        totalTokens: true,
        estimatedCostUsd: true,
        latencyMs: true,
        success: true,
        streamed: true,
        createdAt: true,
      },
    });
    return {
      items,
      totals: {
        inputTokens: items.reduce((sum, item) => sum + item.inputTokens, 0),
        outputTokens: items.reduce((sum, item) => sum + item.outputTokens, 0),
        totalTokens: items.reduce((sum, item) => sum + item.totalTokens, 0),
        estimatedCostUsd: items.reduce((sum, item) => sum + (item.estimatedCostUsd ?? 0), 0),
      },
    };
  }

  async deleteConversation(userId: string, id: string) {
    await this.getConversation(userId, id);
    await this.prisma.chatSession.delete({ where: { id } });
    this.usage.conversation('deleted');
    return { message: 'Conversation deleted' };
  }

  async renameConversation(userId: string, id: string, title: string) {
    await this.getConversation(userId, id, 1);
    return this.prisma.chatSession.update({
      where: { id },
      data: { title: title.trim() },
    });
  }

  providers() {
    return this.router.providers();
  }
  models() {
    return this.router.models();
  }

  async diagnostics() {
    const providers = await this.router.providers();
    return {
      status: providers.some((provider) => provider.configured)
        ? 'ready'
        : 'not_configured',
      promptVersion: this.prompts.version,
      providers: providers.map((provider) => ({
        id: provider.id,
        configured: provider.configured,
        models: provider.models.length,
      })),
    };
  }

  async providerHealth() {
    const providers = await this.router.providers();
    return {
      checkedAt: new Date().toISOString(),
      providers: providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        status: provider.configured ? 'ready' : 'not_configured',
        apiKeyConfigured: provider.configured,
        models: provider.models,
        defaultModel: provider.models[0] ?? null,
      })),
    };
  }

  async chat(userId: string, dto: AiChatDto, requestId?: string) {
    const conversationId = await this.ensureConversation(userId, dto);
    const prepared = await this.prepare(userId, conversationId, dto);
    const startedAt = Date.now();
    await this.persistUserMessage(
      conversationId,
      userId,
      dto,
      'PROCESSING',
      prepared.route.publicId,
      prepared.route.model,
      prepared.context.conversation.title,
    );
    try {
      const result = await this.rag.answerQuestion(userId, dto.message, {
        ...prepared.context.rag,
        workspaceId: prepared.context.conversation.workspaceId ?? undefined,
        providerKey: prepared.route.gatewayKey,
        generation: prepared.generation,
      });
      const message = await this.prisma.$transaction(async (transaction) => {
        const saved = await transaction.chatMessage.create({
          data: {
            sessionId: conversationId,
            userId,
            role: 'assistant',
            content: result.answer,
            llmProvider: prepared.route.publicId,
            llmModel: result.model,
            finishReason: 'stop',
          },
        });
        await transaction.chatSession.update({
          where: { id: conversationId },
          data: {
            streamStatus: 'COMPLETED',
            updatedAt: new Date(),
            lastActivityAt: new Date(),
          },
        });
        return saved;
      });
      await this.usage.record({
        conversationId,
        userId,
        workspaceId: prepared.context.conversation.workspaceId,
        provider: prepared.route.publicId,
        model: result.model,
        input: dto.message,
        output: result.answer,
        latencyMs: Date.now() - startedAt,
        success: true,
        requestId,
        streamed: false,
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
      });
      return {
        conversationId,
        message,
        sources: result.sources,
        finishReason: 'stop',
      };
    } catch (error) {
      await this.prisma.chatSession
        .update({
          where: { id: conversationId },
          data: { streamStatus: 'ERROR' },
        })
        .catch(() => undefined);
      await this.usage.record({
        conversationId,
        userId,
        workspaceId: prepared.context.conversation.workspaceId,
        provider: prepared.route.publicId,
        model: prepared.route.model,
        input: dto.message,
        output: '',
        latencyMs: Date.now() - startedAt,
        success: false,
        errorCode: error instanceof Error ? error.name : 'UNKNOWN',
        requestId,
        streamed: false,
      });
      throw error;
    }
  }

  async streamChat(
    userId: string,
    dto: AiChatDto,
    signal?: AbortSignal,
    requestId?: string,
  ) {
    const conversationId = await this.ensureConversation(userId, dto);
    const prepared = await this.prepare(userId, conversationId, dto, signal);
    const startedAt = Date.now();
    await this.persistUserMessage(
      conversationId,
      userId,
      dto,
      'STREAMING',
      prepared.route.publicId,
      prepared.route.model,
      prepared.context.conversation.title,
    );
    try {
      const result = await this.rag.streamQuestion(userId, dto.message, {
        ...prepared.context.rag,
        workspaceId: prepared.context.conversation.workspaceId ?? undefined,
        providerKey: prepared.route.gatewayKey,
        generation: prepared.generation,
      });
      return this.streaming.complete({
        chunks: result.chunks,
        conversationId,
        userId,
        workspaceId: prepared.context.conversation.workspaceId,
        provider: prepared.route.publicId,
        model: result.model,
        input: dto.message,
        sources: result.sources,
        startedAt,
        requestId,
      });
    } catch (error) {
      await this.prisma.chatSession
        .update({
          where: { id: conversationId },
          data: { streamStatus: 'ERROR' },
        })
        .catch(() => undefined);
      await this.usage.record({
        conversationId,
        userId,
        workspaceId: prepared.context.conversation.workspaceId,
        provider: prepared.route.publicId,
        model: prepared.route.model,
        input: dto.message,
        output: '',
        latencyMs: Date.now() - startedAt,
        success: false,
        errorCode: error instanceof Error ? error.name : 'UNKNOWN',
        requestId,
        streamed: true,
      });
      throw error;
    }
  }

  private async ensureConversation(userId: string, dto: AiChatDto) {
    if (dto.conversationId) return dto.conversationId;
    if (!dto.workspaceId)
      throw new BadRequestException(
        'workspaceId is required when starting a conversation.',
      );
    const created = await this.createConversation(userId, {
      workspaceId: dto.workspaceId,
      selectedSourceIds: dto.selectedSourceIds,
      provider: dto.provider,
      model: dto.model,
      temperature: dto.temperature,
      topP: dto.topP,
      maxTokens: dto.maxTokens,
    });
    return created.id;
  }

  private async prepare(
    userId: string,
    conversationId: string,
    dto: AiChatDto,
    signal?: AbortSignal,
  ) {
    const context = await this.context.build(
      userId,
      conversationId,
      dto.selectedSourceIds,
    );
    const provider =
      dto.provider ?? context.conversation.provider ?? this.defaultProvider();
    const route = await this.router.resolve(
      provider,
      dto.model ?? context.conversation.model ?? undefined,
    );
    return {
      context,
      route,
      generation: {
        model: route.model,
        temperature: dto.temperature ?? context.conversation.temperature,
        topP: dto.topP ?? context.conversation.topP,
        maxTokens: dto.maxTokens ?? context.conversation.maxTokens,
        signal,
      },
    };
  }

  private async persistUserMessage(
    conversationId: string,
    userId: string,
    dto: AiChatDto,
    streamStatus: string,
    provider: string,
    model: string,
    currentTitle: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.chatMessage.create({
        data: {
          sessionId: conversationId,
          userId,
          role: 'user',
          content: dto.message,
        },
      }),
      this.prisma.chatSession.update({
        where: { id: conversationId },
        data: {
          provider,
          model,
          temperature: dto.temperature,
          topP: dto.topP,
          maxTokens: dto.maxTokens,
          streamStatus,
          metadata: dto.selectedSourceIds
            ? ({
                selectedSourceIds: dto.selectedSourceIds,
                promptVersion: this.prompts.version,
              } satisfies Prisma.InputJsonObject)
            : undefined,
          title:
            currentTitle === 'New conversation' || currentTitle === 'New chat'
              ? this.prompts.conversationTitle(dto.message)
              : undefined,
          updatedAt: new Date(),
          lastActivityAt: new Date(),
        },
      }),
    ]);
  }

  private defaultProvider() {
    const configured = this.config.get<string>('LLM_PROVIDER') ?? 'nvidia';
    return configured === 'gpt'
      ? 'openai'
      : configured === 'claude'
        ? 'anthropic'
        : configured;
  }
}
