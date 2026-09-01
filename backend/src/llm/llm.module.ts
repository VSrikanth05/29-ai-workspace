import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmGatewayService } from './llm-gateway.service';
import { LlmController } from './llm.controller';
import { MockLlmProvider } from './providers/mock-llm.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { LlamaProvider } from './providers/llama.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { NvidiaProvider } from './providers/nvidia.provider';

@Module({
  imports: [PrismaModule],
  controllers: [LlmController],
  providers: [
    LlmGatewayService,
    MockLlmProvider,
    OpenAiProvider,
    GeminiProvider,
    AnthropicProvider,
    LlamaProvider,
    OpenRouterProvider,
    NvidiaProvider,
  ],
  exports: [LlmGatewayService],
})
export class LlmModule {}
