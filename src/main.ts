import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { Logger } from 'nestjs-pino';
import { setupMetrics } from './otel';

async function bootstrap() {
  // Start OpenTelemetry metrics push
  setupMetrics();

  // Catch unhandled exceptions & track perf
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    sendDefaultPii: true,
  });

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino globally
  app.useLogger(app.get(Logger));

  // Security headers (configured for cross-origin since frontend is on Vercel)
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('UNISON API')
    .setDescription('Alumni Network — CS Department, UET Faisalabad')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Allow PM2 intercepts
  app.enableShutdownHooks();

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`🚀 UNISON API running on http://localhost:${port}/api`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
