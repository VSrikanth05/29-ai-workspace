import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';
import { normalizeException } from '../common/errors/app.exception';
import { AiService } from './ai.service';
import {
  AiChatDto,
  ConversationDetailQueryDto,
  ConversationListQueryDto,
  CreateConversationDto,
} from './dto/ai-chat.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { AiLoggerService } from './logging/ai-logger.service';

@ApiTags('AI Core')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly logger: AiLoggerService,
  ) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Generate a workspace-grounded conversational response',
  })
  chat(
    @Body() dto: AiChatDto,
    @CurrentUser() user: RequestUser,
    @Req() request: Request,
  ) {
    return this.ai.chat(user.userId, dto, this.requestId(request));
  }

  @Get('health')
  @ApiOperation({ summary: 'Return AI Core provider and prompt diagnostics' })
  diagnostics() {
    return this.ai.diagnostics();
  }

  @Get('provider-health')
  @ApiOperation({ summary: 'Return provider configuration and model health status' })
  providerHealth() {
    return this.ai.providerHealth();
  }

  @Post('chat/stream')
  @ApiOperation({ summary: 'Stream a workspace-grounded response over SSE' })
  async stream(
    @Body() dto: AiChatDto,
    @CurrentUser() user: RequestUser,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const requestId = this.requestId(request);
    const abort = new AbortController();
    let disconnected = false;
    response.on('close', () => {
      disconnected = !response.writableEnded;
      if (disconnected) abort.abort();
    });
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('Content-Encoding', 'identity');
    response.flushHeaders();
    response.write('retry: 3000\n\n');
    try {
      const events = await this.ai.streamChat(
        user.userId,
        dto,
        abort.signal,
        requestId,
      );
      for await (const event of events) {
        if (disconnected) break;
        response.write(
          `id: ${requestId}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
        );
      }
    } catch (error) {
      const normalized = normalizeException(error);
      this.logger.error('ai_stream_failed', {
        requestId,
        code: normalized.code,
        statusCode: normalized.statusCode,
      });
      if (!disconnected && !response.destroyed)
        response.write(
          `event: error\ndata: ${JSON.stringify({ type: 'error', ...normalized, requestId })}\n\n`,
        );
    } finally {
      if (!disconnected && !response.destroyed) response.end();
    }
  }

  private requestId(request: Request) {
    const value = request.headers['x-request-id'];
    return typeof value === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(value)
      ? value
      : randomUUID();
  }
}

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly ai: AiService) {}
  @Get() list(
    @CurrentUser() user: RequestUser,
    @Query() query: ConversationListQueryDto,
  ) {
    return this.ai.listConversations(user.userId, query.limit, query.cursor);
  }
  @Get(':id') get(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Query() query: ConversationDetailQueryDto,
  ) {
    return this.ai.getConversation(user.userId, id, query.messageLimit);
  }
  @Get(':id/usage') usage(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ai.getConversationUsage(user.userId, id);
  }
  @Post() create(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ai.createConversation(user.userId, dto);
  }
  @Patch(':id') rename(
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ai.renameConversation(user.userId, id, dto.title);
  }
  @Delete(':id') remove(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.ai.deleteConversation(user.userId, id);
  }
}

@ApiTags('AI Catalog')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller()
export class AiCatalogController {
  constructor(private readonly ai: AiService) {}
  @Get('models') models() {
    return this.ai.models();
  }
  @Get('providers') providers() {
    return this.ai.providers();
  }
}
