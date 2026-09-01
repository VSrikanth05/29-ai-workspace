import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceAccessService } from '../../workspaces/workspace-access.service';
import { PromptEngineService } from '../prompts/prompt-engine.service';
import type { ChatMessageInput } from '../providers/provider.interface';

@Injectable()
export class ContextBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly prompts: PromptEngineService,
  ) {}

  async build(
    userId: string,
    conversationId: string,
    selectedSourceIds?: string[],
  ) {
    const conversation = await this.prisma.chatSession.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, workspace: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.workspaceId)
      await this.access.requireRole(conversation.workspaceId, userId);

    const stored =
      conversation.metadata &&
      typeof conversation.metadata === 'object' &&
      !Array.isArray(conversation.metadata)
        ? ((conversation.metadata as { selectedSourceIds?: string[] })
            .selectedSourceIds ?? [])
        : [];
    const ids = selectedSourceIds ?? stored;
    const sources = ids.length
      ? await this.prisma.document.findMany({
          where: {
            id: { in: ids },
            workspaceId: conversation.workspaceId ?? undefined,
          },
          select: { id: true, originalName: true },
        })
      : [];
    if (sources.length !== ids.length)
      throw new NotFoundException(
        'One or more selected sources were not found',
      );

    const history: ChatMessageInput[] = conversation.messages.flatMap(
      (message) =>
        message.role === 'user' || message.role === 'assistant'
          ? [{ role: message.role, content: message.content }]
          : [],
    );
    return {
      conversation,
      rag: {
        conversationHistory: history,
        metadataFilter: ids.length ? { documentIds: ids } : undefined,
        systemInstructions: this.prompts.compose({
          workspaceName: conversation.workspace?.name ?? 'Personal workspace',
          sourceNames: sources.map((source) => source.originalName),
        }),
      },
    };
  }
}
