import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { LlmModule } from './llm/llm.module';
import { RagModule } from './rag/rag.module';
import { SummaryModule } from './summary/summary.module';
import { DiagramModule } from './diagram/diagram.module';
import { ChatModule } from './chat/chat.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import Joi from 'joi';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { StorageModule } from './storage/storage.module';
import { AiModule } from './ai/ai.module';
import { AiStudioModule } from './ai-studio/ai-studio.module';
import { CollectionsModule } from './collections/collections.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { PreferencesModule } from './preferences/preferences.module';
import { SearchModule } from './search/search.module';
import { SharingModule } from './sharing/sharing.module';
import { TagsModule } from './tags/tags.module';
import { MediaModule } from './media/media.module';
import { EmailModule } from './email/email.module';
import { PaymentsModule } from './payments/payments.module';

export const configEnvFilePath = [
  resolve(__dirname, '..', '..', '.env'),
  resolve(process.cwd(), '.env'),
];

@Module({
  imports: [
    // The shared environment file is always two levels above both src/ and
    // dist/. Keeping this path independent of process.cwd() makes npm starts,
    // direct node starts, and debugger starts behave consistently.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: configEnvFilePath,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(5000),
        DATABASE_URL: Joi.string().optional().allow(''),
        DIRECT_URL: Joi.string().optional().allow(''),
        REDIS_URL: Joi.string().uri().optional().allow(''),
        INGESTION_ASYNC_ENABLED: Joi.boolean()
          .truthy('true')
          .falsy('false')
          .default(false),
        STORAGE_PROVIDER: Joi.string()
          .valid('r2', 'supabase')
          .default('supabase'),
        REQUEST_BODY_LIMIT: Joi.string()
          .pattern(/^\d+(kb|mb)$/i)
          .default('1mb'),
      }).unknown(true),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get('RATE_LIMIT_TTL_MS')) || 60_000,
          limit: Number(config.get('RATE_LIMIT_MAX')) || 120,
        },
      ],
    }),
    PrismaModule,
    InfrastructureModule,
    SupabaseModule,
    StorageModule,
    AuthModule,
    WorkspacesModule,
    DocumentsModule,
    LlmModule,
    RagModule,
    SummaryModule,
    DiagramModule,
    ChatModule,
    AiModule,
    AiStudioModule,
    KnowledgeModule,
    CollectionsModule,
    TagsModule,
    MediaModule,
    EmailModule,
    PaymentsModule,
    SearchModule,
    SharingModule,
    PreferencesModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
