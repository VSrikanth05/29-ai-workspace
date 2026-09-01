/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { UnderstandController } from './understand/understand.controller';
import { UnderstandService } from './understand/understand.service';
import { LearnController } from './learn/learn.controller';
import { LearnService } from './learn/learn.service';
import { MindMapController } from './visualize/mind-map.controller';
import { MindMapService } from './visualize/mind-map.service';
import { TranslationController } from './language/translation.controller';
import { TranslationService } from './language/translation.service';
import { ReportController } from './create/report.controller';
import { ReportService } from './create/report.service';
import { PresentationService } from './create/presentation.service';
import { FlashcardService } from './learn/flashcard.service';
import { QuizService } from './learn/quiz.service';
import { StudyGuideService } from './learn/study-guide.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { AnalyticsService } from './analytics/analytics.service';
import { ChartService } from './analytics/chart.service';
import { ImageTranslationController } from './image-translation/image-translation.controller';
import { ImageTranslationService } from './image-translation/image-translation.service';

describe('AI Studio API integration', () => {
  let app: INestApplication;
  const learn = {
    summary: jest.fn().mockResolvedValue({ id: 'summary-1', type: 'SUMMARY' }),
    keyPoints: jest.fn(),
    glossary: jest.fn(),
  };
  const mindMap = {
    generate: jest.fn().mockResolvedValue({ id: 'map-1', type: 'MIND_MAP' }),
  };
  const flashcards = {
    generate: jest
      .fn()
      .mockResolvedValue({ id: 'cards-1', type: 'FLASHCARDS' }),
  };
  const quizzes = {
    generate: jest.fn().mockResolvedValue({ id: 'quiz-1', type: 'QUIZ' }),
  };
  const studyGuides = { generate: jest.fn() };
  const analytics = {
    generate: jest
      .fn()
      .mockResolvedValue({ id: 'analytics-1', type: 'ANALYTICS_REPORT' }),
  };
  const charts = {
    generate: jest.fn().mockResolvedValue({ id: 'chart-1', type: 'CHART' }),
  };
  const imageTranslation = {
    translate: jest.fn().mockResolvedValue({ id: 'image-translation-1', status: 'COMPLETED' }),
    get: jest.fn(),
    saveToOutputLibrary: jest.fn(),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        UnderstandController,
        LearnController,
        MindMapController,
        TranslationController,
        ReportController,
        AnalyticsController,
        ImageTranslationController,
      ],
      providers: [
        {
          provide: UnderstandService,
          useValue: {
            explain: jest.fn(),
            rewrite: jest.fn(),
            simplify: jest.fn(),
          },
        },
        { provide: LearnService, useValue: learn },
        { provide: MindMapService, useValue: mindMap },
        { provide: TranslationService, useValue: { translate: jest.fn() } },
        { provide: ReportService, useValue: { generate: jest.fn() } },
        { provide: PresentationService, useValue: { generate: jest.fn() } },
        { provide: FlashcardService, useValue: flashcards },
        { provide: QuizService, useValue: quizzes },
        { provide: StudyGuideService, useValue: studyGuides },
        { provide: AnalyticsService, useValue: analytics },
        { provide: ChartService, useValue: charts },
        { provide: ImageTranslationService, useValue: imageTranslation },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({
        canActivate(context: {
          switchToHttp(): { getRequest(): { user?: unknown } };
        }) {
          context.switchToHttp().getRequest().user = {
            userId: 'u1',
            email: 'u@example.com',
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

  it('validates and routes Summary generation', async () => {
    await request(app.getHttpServer())
      .post('/ai-studio/summary')
      .send({ workspaceId: 'w1', style: 'detailed' })
      .expect(201)
      .expect((response) => expect(response.body.type).toBe('SUMMARY'));
    expect(learn.summary).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ style: 'detailed' }),
    );
  });
  it('routes Mind Map generation and rejects invalid summary styles', async () => {
    await request(app.getHttpServer())
      .post('/ai-studio/mind-map')
      .send({ workspaceId: 'w1' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/ai-studio/summary')
      .send({ workspaceId: 'w1', style: 'flashcards' })
      .expect(400);
  });
  it('routes learning and analytics endpoints with validation', async () => {
    await request(app.getHttpServer())
      .post('/ai-studio/flashcards')
      .send({ workspaceId: 'w1', count: 20, difficulty: 'hard' })
      .expect(201);
    expect(flashcards.generate).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ count: 20, difficulty: 'hard' }),
    );
    await request(app.getHttpServer())
      .post('/ai-studio/quiz')
      .send({ workspaceId: 'w1', questionCount: 7 })
      .expect(400);
    await request(app.getHttpServer())
      .post('/ai-studio/analytics')
      .send({ workspaceId: 'w1', sourceId: 'd1' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/ai-studio/chart')
      .send({ workspaceId: 'w1', sourceId: 'd1', chartType: 'radar' })
      .expect(400);
  });

  it('accepts authenticated multipart image-translation requests and routes the file', async () => {
    await request(app.getHttpServer())
      .post('/ai-studio/image-translation')
      .field('workspaceId', '00000000-0000-4000-8000-000000000001')
      .field('targetLanguage', 'spa_Latn')
      .attach('file', Buffer.from([137,80,78,71,13,10,26,10]), { filename: 'sample.png', contentType: 'image/png' })
      .expect(201);
    expect(imageTranslation.translate).toHaveBeenCalledWith('u1', expect.objectContaining({ originalname: 'sample.png' }), expect.objectContaining({ targetLanguage: 'spa_Latn' }));
  });
});
