import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        shareLink: { findUnique: jest.fn().mockResolvedValue(null) },
        llmConfig: { upsert: jest.fn().mockResolvedValue({}) },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health/live (GET)', () => {
    return request(app.getHttpServer()).get('/health/live').expect(200);
  });

  it('/collections requires authentication', () => {
    return request(app.getHttpServer()).get('/collections').expect(401);
  });

  it('/share/:token does not expose an unknown link', () => {
    return request(app.getHttpServer()).get('/share/unknown').expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
