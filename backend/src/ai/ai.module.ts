import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { RagModule } from '../rag/rag.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import {
  AiCatalogController,
  AiController,
  ConversationsController,
} from './ai.controller';
import { AiService } from './ai.service';
import { ContextBuilderService } from './context/context-builder.service';
import { AiLoggerService } from './logging/ai-logger.service';
import { PromptEngineService } from './prompts/prompt-engine.service';
import { ProviderRouterService } from './router/provider-router.service';
import { StreamingService } from './streaming/streaming.service';
import { UsageService } from './usage/usage.service';

@Module({
  imports: [LlmModule, RagModule, WorkspacesModule],
  controllers: [AiController, ConversationsController, AiCatalogController],
  providers: [
    AiService,
    ProviderRouterService,
    PromptEngineService,
    ContextBuilderService,
    StreamingService,
    UsageService,
    AiLoggerService,
  ],
  exports: [
    AiService,
    ProviderRouterService,
    PromptEngineService,
    ContextBuilderService,
  ],
})
export class AiModule {}
