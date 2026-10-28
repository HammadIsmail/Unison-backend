import 'dotenv/config';
import * as dns from 'node:dns';

// Ensure reliable DNS resolution for MongoDB Atlas SRV lookups on Windows
dns.setDefaultResultOrder?.('ipv4first');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // fallback if environment restricts DNS overrides
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { ObserveInstrument } from './observe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    instrument: ObserveInstrument,
  });

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
    origin: true,
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
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 UNISON API running on http://0.0.0.0:${port}/api`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
