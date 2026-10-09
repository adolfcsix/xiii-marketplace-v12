import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const express = app.getHttpAdapter().getInstance();

  if (String(config.get('TRUST_PROXY', 'true')) === 'true') express.set('trust proxy', 1);
  app.setGlobalPrefix('api/v1');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }));
  app.use(json({ limit: config.get('HTTP_JSON_LIMIT', '1mb') }));
  app.use(urlencoded({ extended: true, limit: config.get('HTTP_FORM_LIMIT', '1mb') }));

  const allowedOrigins = String(config.get('CORS_ORIGINS', config.get('WEB_URL', 'http://localhost:3000')))
    .split(',').map(x => x.trim()).filter(Boolean);
  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin is not allowed'), false);
    },
    credentials: true,
    methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Request-Id','Idempotency-Key'],
    exposedHeaders: ['X-Request-Id','X-RateLimit-Limit','X-RateLimit-Remaining','Retry-After'],
    maxAge: 86400,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  const port = Number(config.get('API_PORT', 4000));
  const host = config.get('API_HOST', '0.0.0.0');
  await app.listen(port, host);
}
bootstrap();
