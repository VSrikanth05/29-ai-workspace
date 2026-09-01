import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AIOutputType, Prisma } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import type { ToolRequestDto } from './dto/tool-request.dto';
import { RedisCacheService } from '../infrastructure/redis-cache.service';

export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
}

type StructuredOutput = Prisma.InputJsonObject;

@Injectable()
export class AiStudioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
    private readonly access: WorkspaceAccessService,
    @Optional() private readonly cache?: RedisCacheService,
  ) {}

  async transient(userId: string, dto: ToolRequestDto, instruction: string) {
    const conversationId = await this.conversation(userId, dto, instruction);
    const material = await this.material(userId, dto);
    return this.ai.chat(userId, {
      message: `${instruction}\n\n${material}`,
      conversationId,
      selectedSourceIds: dto.sourceIds,
      provider: dto.provider,
      model: dto.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
    });
  }

  async persistent(
    userId: string,
    dto: ToolRequestDto,
    type: AIOutputType,
    title: string,
    instruction: string,
    metadata: Record<string, unknown> = {},
  ) {
    const conversationId = await this.conversation(userId, dto, title);
    const material = await this.material(userId, dto);
    const result = await this.ai.chat(userId, {
      message: `${instruction}\n\n${material}`,
      conversationId,
      selectedSourceIds: dto.sourceIds,
      provider: dto.provider,
      model: dto.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
    });
    const raw = result.message.content;
    const associatedSourceIds = dto.sourceIds?.length
      ? dto.sourceIds
      : [...new Set(result.sources.map((source) => source.documentId))];
    const content = this.parseGeneratedContent(type, raw);
    const output = await this.prisma.aIOutput.create({
      data: {
        type,
        title,
        content,
        provider: result.message.llmProvider ?? dto.provider ?? 'unknown',
        model: result.message.llmModel ?? dto.model ?? 'unknown',
        userId,
        workspaceId: dto.workspaceId,
        conversationId,
        metadata: this.jsonObject({
          instruction,
          request: {
            workspaceId: dto.workspaceId,
            conversationId,
            sourceIds: associatedSourceIds,
            text: dto.text,
            provider: dto.provider,
            model: dto.model,
            temperature: dto.temperature,
            maxTokens: dto.maxTokens,
          },
          ...metadata,
        }),
        sources: associatedSourceIds.length
          ? { create: associatedSourceIds.map((sourceId) => ({ sourceId })) }
          : undefined,
      },
      include: {
        sources: {
          include: { source: { select: { id: true, originalName: true } } },
        },
      },
    });
    await this.prisma.outputVersion?.create({
      data: {
        outputId: output.id,
        event: 'CREATED',
        title: output.title,
        content: output.content as Prisma.InputJsonValue,
        metadata: (output.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        provider: output.provider,
        model: output.model,
      },
    });
    await this.invalidateOutputs(userId, dto.workspaceId);
    return output;
  }

  async persistComputed(
    userId: string,
    dto: ToolRequestDto,
    type: AIOutputType,
    title: string,
    content: StructuredOutput,
    metadata: Record<string, unknown> = {},
  ) {
    const conversationId = await this.conversation(userId, dto, title);
    const sourceIds = dto.sourceIds ?? [];
    const output = await this.prisma.aIOutput.create({
      data: {
        type,
        title,
        content,
        provider: dto.provider ?? 'computed',
        model: dto.model ?? 'deterministic-v1',
        userId,
        workspaceId: dto.workspaceId,
        conversationId,
        metadata: this.jsonObject({
          regenerationMode: 'copy',
          request: { ...dto, sourceIds },
          ...metadata,
        }),
        sources: sourceIds.length
          ? { create: sourceIds.map((sourceId) => ({ sourceId })) }
          : undefined,
      },
      include: {
        sources: {
          include: { source: { select: { id: true, originalName: true } } },
        },
      },
    });
    await this.prisma.outputVersion?.create({
      data: {
        outputId: output.id,
        event: 'CREATED',
        title: output.title,
        content: output.content as Prisma.InputJsonValue,
        metadata: (output.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        provider: output.provider,
        model: output.model,
      },
    });
    await this.invalidateOutputs(userId, dto.workspaceId);
    return output;
  }

  async analyticsSource(userId: string, workspaceId: string, sourceId: string) {
    await this.access.requireRole(workspaceId, userId);
    const source = await this.prisma.document.findFirst({
      where: { id: sourceId, workspaceId },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        extractedText: true,
      },
    });
    if (!source) throw new NotFoundException('Analytics source not found');
    const extension = source.originalName.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx'].includes(extension ?? ''))
      throw new BadRequestException(
        'Analytics supports CSV and XLSX sources only.',
      );
    if (!source.extractedText?.trim())
      throw new BadRequestException(
        'The selected source has no extracted data.',
      );
    return source;
  }

  async list(
    userId: string,
    workspaceId: string,
    limit?: number,
    cursor?: string,
  ) {
    await this.access.requireRole(workspaceId, userId);
    const key = `outputs:${workspaceId}:${userId}`;
    if (!limit && !cursor) {
      const cached = await this.cache?.get(key);
      if (cached) return cached;
    }
    const take = limit ?? 0;
    const rows = await this.prisma.aIOutput.findMany({
      where: { userId, workspaceId },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: take + 1 } : {}),
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        sources: {
          include: { source: { select: { id: true, originalName: true } } },
        },
      },
    });
    if (limit) {
      const hasMore = rows.length > take;
      const items = hasMore ? rows.slice(0, take) : rows;
      return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
    }
    await this.cache?.set(key, rows);
    return rows;
  }

  async get(userId: string, id: string) {
    const output = await this.prisma.aIOutput.findFirst({
      where: { id, userId },
      include: {
        sources: {
          include: { source: { select: { id: true, originalName: true } } },
        },
      },
    });
    if (!output) throw new NotFoundException('AI output not found');
    await this.access.requireRole(output.workspaceId, userId);
    return output;
  }

  async regenerate(userId: string, id: string) {
    const output = await this.get(userId, id);
    await this.prisma.outputVersion?.create({
      data: {
        outputId: output.id,
        event: 'REGENERATED',
        title: output.title,
        content: output.content as Prisma.InputJsonValue,
        metadata: (output.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        provider: output.provider,
        model: output.model,
      },
    });
    const metadata = this.object(output.metadata);
    if (metadata.regenerationMode === 'copy') {
      const request = this.object(
        metadata.request,
      ) as unknown as ToolRequestDto;
      return this.persistComputed(
        userId,
        request,
        output.type,
        output.title,
        this.object(output.content) as StructuredOutput,
        { ...metadata, regeneratedFrom: output.id },
      );
    }
    const request = this.object(metadata.request) as unknown as ToolRequestDto;
    const instruction =
      typeof metadata.instruction === 'string' ? metadata.instruction : '';
    if (!instruction || !request.workspaceId)
      throw new BadRequestException('This output cannot be regenerated.');
    return this.persistent(
      userId,
      request,
      output.type,
      output.title,
      instruction,
      { ...metadata, regeneratedFrom: output.id },
    );
  }

  async export(
    userId: string,
    id: string,
    format: 'markdown' | 'json' | 'csv',
  ) {
    const output = await this.get(userId, id);
    const base =
      output.title
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'ai-output';
    if (format === 'json')
      return {
        filename: `${base}.json`,
        mimeType: 'application/json',
        content: JSON.stringify(output.content, null, 2),
      };
    const content = this.object(output.content);
    if (format === 'csv') {
      if (typeof content.csv !== 'string')
        throw new BadRequestException(
          'CSV export is not available for this output.',
        );
      return {
        filename: `${base}.csv`,
        mimeType: 'text/csv',
        content: content.csv,
      };
    }
    const markdown =
      typeof content.markdown === 'string'
        ? content.markdown
        : content.format === 'mind-map'
          ? this.mindMapMarkdown(content.root, 0)
          : this.structuredMarkdown(output.title, content);
    return {
      filename: `${base}.md`,
      mimeType: 'text/markdown',
      content: markdown,
    };
  }

  private parseGeneratedContent(
    type: AIOutputType,
    raw: string,
  ): StructuredOutput {
    if (type === AIOutputType.MIND_MAP)
      return {
        format: 'mind-map',
        root: this.parseMindMap(raw) as unknown as Prisma.InputJsonObject,
      };
    if (type === AIOutputType.FLASHCARDS) {
      const value = this.parseJson(raw, 'flashcards');
      const cards = Array.isArray(value.flashcards) ? value.flashcards : [];
      if (
        !cards.length ||
        cards.some((card) => {
          const item = this.object(card);
          return (
            typeof item.question !== 'string' || typeof item.answer !== 'string'
          );
        })
      )
        throw new BadGatewayException(
          'The AI provider returned invalid flashcard JSON.',
        );
      return this.jsonObject({ format: 'flashcards', flashcards: cards });
    }
    if (type === AIOutputType.QUIZ) {
      const value = this.parseJson(raw, 'quiz');
      const questions = Array.isArray(value.questions) ? value.questions : [];
      if (
        !questions.length ||
        questions.some((question) => {
          const item = this.object(question);
          return (
            typeof item.prompt !== 'string' ||
            typeof item.answer !== 'string' ||
            !['multiple-choice', 'true-false', 'short-answer'].includes(
              String(item.type),
            )
          );
        })
      )
        throw new BadGatewayException(
          'The AI provider returned invalid quiz JSON.',
        );
      return this.jsonObject({ format: 'quiz', questions });
    }
    return { format: 'markdown', markdown: raw };
  }

  private parseJson(raw: string, label: string): Record<string, unknown> {
    try {
      const clean = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      return this.object(JSON.parse(clean));
    } catch (error) {
      throw new BadGatewayException(
        `The AI provider returned invalid ${label} JSON.`,
        { cause: error },
      );
    }
  }

  private structuredMarkdown(title: string, content: Record<string, unknown>) {
    if (content.format === 'flashcards' && Array.isArray(content.flashcards))
      return (
        `# ${title}\n\n` +
        content.flashcards
          .map((card, index) => {
            const item = this.object(card);
            return `## ${index + 1}. ${this.text(item.question)}\n\n${this.text(item.answer)}`;
          })
          .join('\n\n')
      );
    if (content.format === 'quiz' && Array.isArray(content.questions))
      return (
        `# ${title}\n\n` +
        content.questions
          .map((question, index) => {
            const item = this.object(question);
            return `## ${index + 1}. ${this.text(item.prompt)}\n\n**Answer:** ${this.text(item.answer)}`;
          })
          .join('\n\n')
      );
    if (content.format === 'analytics')
      return `# ${title}\n\n${this.text(content.summary)}\n\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\``;
    if (content.format === 'chart')
      return `# ${title}\n\nChart type: ${this.text(content.chartType)}\n`;
    return `# ${title}\n\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\``;
  }

  private async conversation(
    userId: string,
    dto: ToolRequestDto,
    title: string,
  ) {
    await this.access.requireRole(dto.workspaceId, userId);
    if (dto.conversationId) {
      const conversation = await this.prisma.chatSession.findFirst({
        where: { id: dto.conversationId, userId, workspaceId: dto.workspaceId },
      });
      if (!conversation)
        throw new NotFoundException('Conversation not found in this workspace');
      return conversation.id;
    }
    const created = await this.ai.createConversation(userId, {
      workspaceId: dto.workspaceId,
      title,
      selectedSourceIds: dto.sourceIds,
      provider: dto.provider,
      model: dto.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
    });
    return created.id;
  }

  private async material(_userId: string, dto: ToolRequestDto) {
    if (dto.text?.trim()) return `SELECTED TEXT:\n${dto.text.trim()}`;
    if (!dto.sourceIds?.length)
      return 'Use the workspace sources supplied through grounded retrieval.';
    const sources = await this.prisma.document.findMany({
      where: {
        id: { in: dto.sourceIds },
        workspaceId: dto.workspaceId,
      },
      select: { id: true, originalName: true, extractedText: true },
    });
    if (sources.length !== dto.sourceIds.length)
      throw new NotFoundException('One or more sources were not found');
    const combined = sources
      .map(
        (source) =>
          `SOURCE: ${source.originalName}\n${source.extractedText ?? ''}`,
      )
      .join('\n\n');
    return `DOCUMENT MATERIAL:\n${combined.slice(0, 48000)}`;
  }

  private parseMindMap(value: string): MindMapNode {
    const raw = value
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new BadGatewayException(
        'The AI provider returned invalid Mind Map JSON.',
        { cause: error },
      );
    }
    let count = 0;
    const visit = (node: unknown, depth: number): MindMapNode => {
      if (!node || typeof node !== 'object' || depth > 8)
        throw new BadGatewayException(
          'The AI provider returned an invalid Mind Map hierarchy.',
        );
      const candidate = node as {
        id?: unknown;
        label?: unknown;
        children?: unknown;
      };
      if (
        typeof candidate.label !== 'string' ||
        !candidate.label.trim() ||
        ++count > 150
      )
        throw new BadGatewayException(
          'The AI provider returned an invalid Mind Map hierarchy.',
        );
      const children =
        candidate.children === undefined
          ? []
          : Array.isArray(candidate.children)
            ? candidate.children
            : (() => {
                throw new BadGatewayException(
                  'The AI provider returned an invalid Mind Map hierarchy.',
                );
              })();
      return {
        id:
          typeof candidate.id === 'string' && candidate.id
            ? candidate.id
            : `node-${count}`,
        label: candidate.label.trim().slice(0, 200),
        ...(children.length
          ? { children: children.map((child) => visit(child, depth + 1)) }
          : {}),
      };
    };
    return visit(parsed, 0);
  }

  private mindMapMarkdown(value: unknown, depth: number): string {
    if (!value || typeof value !== 'object') return '';
    const node = value as { label?: unknown; children?: unknown };
    const line =
      typeof node.label === 'string'
        ? `${'  '.repeat(depth)}- ${node.label}\n`
        : '';
    return (
      line +
      (Array.isArray(node.children)
        ? node.children
            .map((child) => this.mindMapMarkdown(child, depth + 1))
            .join('')
        : '')
    );
  }

  private object(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private jsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
  }

  private text(value: unknown): string {
    return typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
      ? String(value)
      : '';
  }
  private async invalidateOutputs(userId: string, workspaceId: string) {
    await Promise.all([
      this.cache?.del(`outputs:${workspaceId}:${userId}`),
      this.cache?.delByPrefix(`search:${workspaceId}:`),
    ]);
  }
}
