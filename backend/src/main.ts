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
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(),
    bufferLogs: true,
    bodyParser: false,
  });
  const config = app.get(ConfigService);
  const production = config.get<string>('NODE_ENV') === 'production';
  const expressApp = app.getHttpAdapter().getInstance() as unknown as Express;
  const httpServer = app.getHttpServer() as Server;
  const bodyLimit = config.get<string>('REQUEST_BODY_LIMIT') ?? '1mb';
  app.use(json({ limit: bodyLimit, strict: true }));
  app.use(urlencoded({ extended: false, limit: bodyLimit }));
  expressApp.set('trust proxy', Number(config.get('TRUST_PROXY_HOPS')) || 1);
  httpServer.requestTimeout =
    Number(config.get('REQUEST_TIMEOUT_MS')) || 30_000;
  httpServer.headersTimeout =
    Number(config.get('HEADERS_TIMEOUT_MS')) || 35_000;

  app.use(
    helmet({
      contentSecurityPolicy: production
        ? {
            directives: {
              defaultSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'none'"],
              formAction: ["'none'"],
            },
          }
        : false,
      strictTransportSecurity: production
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(compression());
  app.use(requestLoggingMiddleware);

  const allowedOrigins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: production
      ? allowedOrigins
      : allowedOrigins.length
        ? allowedOrigins
        : true,
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

  if (config.get<string>('SWAGGER_ENABLED') !== 'false' && !production) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AI Document Assistant API')
      .setDescription('Backend API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  await app.listen(Number(config.get('PORT')) || 5000, '0.0.0.0');
}

void bootstrap();
