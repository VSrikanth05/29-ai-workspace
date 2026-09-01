import './infrastructure/tracing';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import type { Express } from 'express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import type { Server } from 'http';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JsonLogger } from './common/logger/json.logger';
import { requestLoggingMiddleware } from './common/logger/request-logging.middleware';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      bufferLogs: true,
      bodyParser: false,
    });
    const config = app.get(ConfigService);
    const expressApp = app.getHttpAdapter().getInstance() as unknown as Express;
    const httpServer = app.getHttpServer() as Server;
    const bodyLimit = config.get<string>('REQUEST_BODY_LIMIT') ?? '10mb';
    app.use(json({ limit: bodyLimit, strict: true }));
    app.use(urlencoded({ extended: false, limit: bodyLimit }));
    expressApp.set('trust proxy', Number(config.get('TRUST_PROXY_HOPS')) || 1);
    httpServer.requestTimeout =
      Number(config.get('REQUEST_TIMEOUT_MS')) || 30_000;
    httpServer.headersTimeout =
      Number(config.get('HEADERS_TIMEOUT_MS')) || 35_000;

    app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
      }),
    );
    app.use(compression());
    app.use(requestLoggingMiddleware);

    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 86_400,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.enableShutdownHooks();

    const port = Number(process.env.PORT) || Number(config.get('PORT')) || 5000;
    await app.listen(port, '0.0.0.0');
    console.log(`[Bootstrap] Backend API successfully running on port ${port}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.stack || err.message : String(err);
    console.error('[Bootstrap] Fatal startup error:', message);
    process.exit(1);
  }
}

void bootstrap();
