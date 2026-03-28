import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Neo4jModule } from './neo4j/neo4j.module';
import { MailModule } from './common/mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AlumniModule } from './alumni/alumni.module';
import { StudentModule } from './student/student.module';
import { OpportunityModule } from './opportunity/opportunity.module';
import { SearchModule } from './search/search.module';
import { SkillModule } from './skill/skill.module';
import { NetworkModule } from './network/network.module';
import { NotificationModule } from './notification/notification.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ActivityModule } from './common/activity/activity.module';
import { ConstraintsSeed } from './seed/constraints.seed';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(5000),
        NEO4J_URI: Joi.string().required(),
        NEO4J_USERNAME: Joi.string().required(),
        NEO4J_PASSWORD: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        VERIFIED_TOKEN_SECRET: Joi.string().required(),
        VERIFIED_TOKEN_EXPIRES_IN: Joi.string().required(),
        RESEND_API_KEY: Joi.string().required(),
        CLOUDINARY_CLOUD_NAME: Joi.string().required(),
        CLOUDINARY_API_KEY: Joi.string().required(),
        CLOUDINARY_API_SECRET: Joi.string().required(),
        SENTRY_DSN: Joi.string().required(),
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      },
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    Neo4jModule,
    MailModule,
    AuthModule,
    AdminModule,
    AlumniModule,
    StudentModule,
    OpportunityModule,
    SearchModule,
    SkillModule,
    NetworkModule,
    NotificationModule,
    CloudinaryModule,
    ActivityModule,
    HealthModule,
  ],
  providers: [
    ConstraintsSeed,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Other global middleware can go here
  }
}
