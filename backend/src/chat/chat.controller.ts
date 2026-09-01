import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  normalizeException,
  sanitizeForLog,
} from '../common/errors/app.exception';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('chat/sessions')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({
    summary: 'Start a new chat session (optionally scoped to a document)',
  })
  create(@Body() dto: CreateSessionDto, @CurrentUser() user: RequestUser) {
    return this.chatService.createSession(
      user.userId,
      dto.documentId,
      dto.title,
    );
  }

  @Get()
  @ApiOperation({ summary: "List the current user's chat sessions" })
  list(@CurrentUser() user: RequestUser) {
    return this.chatService.listSessions(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a chat session with its full message history' })
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.chatService.getSession(user.userId, id);
  }

  @Post(':id/messages')
  @ApiOperation({
    summary: 'Ask a question in a chat session (RAG-grounded answer)',
  })
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.chatService.sendMessage(
      user.userId,
      id,
      dto.message,
      dto.provider,
      { metadataFilter: dto.filters, retrieval: dto.retrieval },
    );
  }

  @Post(':id/messages/stream')
  @ApiOperation({ summary: 'Stream a RAG-grounded chat answer using SSE' })
  async streamMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: RequestUser,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const stream = await this.chatService.streamMessage(
      user.userId,
      id,
      dto.message,
      dto.provider,
      { metadataFilter: dto.filters, retrieval: dto.retrieval },
    );
    const suppliedRequestId = request.headers['x-request-id'];
    const requestId =
      typeof suppliedRequestId === 'string' &&
      /^[A-Za-z0-9._-]{1,100}$/.test(suppliedRequestId)
        ? suppliedRequestId
        : randomUUID();
    let disconnected = false;
    response.on('close', () => {
      disconnected = !response.writableEnded;
    });
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.setHeader('X-Request-Id', requestId);
    response.flushHeaders();

    try {
      for await (const event of stream) {
        if (disconnected) return;
        response.write(
          `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
        );
      }
    } catch (exception) {
      const error = normalizeException(exception);
      const cause = exception instanceof Error ? exception.cause : undefined;
      this.logger.error(
        JSON.stringify({
          event: 'chat_stream_failed',
          requestId,
          path: sanitizeForLog(request.url),
          statusCode: error.statusCode,
          code: error.code,
          errorName:
            exception instanceof Error ? exception.name : 'UnknownError',
          errorMessage:
            exception instanceof Error
              ? sanitizeForLog(exception.message)
              : 'Unknown streaming error',
          stack:
            exception instanceof Error && exception.stack
              ? sanitizeForLog(exception.stack)
              : undefined,
          causeMessage:
            cause instanceof Error ? sanitizeForLog(cause.message) : undefined,
          causeStack:
            cause instanceof Error && cause.stack
              ? sanitizeForLog(cause.stack)
              : undefined,
        }),
      );

      if (!disconnected && !response.destroyed) {
        response.write(
          `event: error\ndata: ${JSON.stringify({
            type: 'error',
            code: error.code,
            message: error.message,
            requestId,
          })}\n\n`,
        );
      }
    } finally {
      if (!disconnected && !response.destroyed) response.end();
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a chat session and its message history' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.chatService.deleteSession(user.userId, id);
  }
}
