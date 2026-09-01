/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  AiCatalogController,
  AiController,
  ConversationsController,
} from './ai.controller';
import { AiService } from './ai.service';
import { AiLoggerService } from './logging/ai-logger.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';

describe('AI Core API integration', () => {
  let app: INestApplication;
  const ai = {
    providers: jest.fn().mockResolvedValue([
      {
        id: 'openai',
        name: 'OpenAI',
        configured: true,
        models: ['gpt-test'],
      },
    ]),
    models: jest.fn().mockResolvedValue([
      {
        id: 'gpt-test',
        provider: 'openai',
        name: 'gpt-test',
        configured: true,
      },
    ]),
    createConversation: jest.fn().mockResolvedValue({
      id: 'c1',
      workspaceId: 'w1',
      title: 'New conversation',
    }),
    listConversations: jest.fn(),
    getConversation: jest.fn(),
    deleteConversation: jest.fn(),
    chat: jest.fn(),
    streamChat: jest.fn(),
    diagnostics: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AiController, ConversationsController, AiCatalogController],
      providers: [
        { provide: AiService, useValue: ai },
        { provide: AiLoggerService, useValue: { error: jest.fn() } },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({
        canActivate(context: {
          switchToHttp(): { getRequest(): { user?: unknown } };
        }) {
          context.switchToHttp().getRequest().user = {
            userId: 'u1',
            email: 'user@example.com',
          };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });
  afterAll(() => app.close());

  it('serves the dynamic provider catalog', async () => {
    await request(app.getHttpServer())
      .get('/providers')
      .expect(200)
      .expect((response) =>
        expect(response.body[0]).toMatchObject({
          id: 'openai',
          models: ['gpt-test'],
        }),
      );
  });

  it('validates and creates a workspace conversation', async () => {
    await request(app.getHttpServer())
      .post('/conversations')
      .send({ workspaceId: 'w1', provider: 'openai', model: 'gpt-test' })
      .expect(201)
      .expect((response) => expect(response.body.id).toBe('c1'));
    expect(ai.createConversation).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ workspaceId: 'w1' }),
    );
  });
});
