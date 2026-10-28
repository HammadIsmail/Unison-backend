import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ClsModule, ClsService } from 'nestjs-cls';
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
import { ConnectionsModule } from './connections/connections.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ActivityModule } from './common/activity/activity.module';
import { ConstraintsSeed } from './seed/constraints.seed';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { ProfilesModule } from './profiles/profiles.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from './chat/chat.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { FeedModule } from './feed/feed.module';
import { PartnerModule } from './partner/partner.module';
import { ProfileManagementModule } from './profile-management/profile-management.module';
import { ObserveModule } from './observe';
import { TenantsModule } from './tenants/tenants.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { AppGraphqlModule } from './graphql/app-graphql.module';
import { createTenantScopePlugin } from './common/plugins/tenant-scope.plugin';
import { TenantContextGuard } from './common/guards/tenant-context.guard';

@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY,
      appSecret: process.env.OBSERVE_APP_SECRET,
      serviceId: 'unsion',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(5000),
        MONGODB_URI: Joi.string().required(),
        NEO4J_URI: Joi.string().required(),
        NEO4J_USERNAME: Joi.string().required(),
        NEO4J_PASSWORD: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().required(),
        VERIFIED_TOKEN_SECRET: Joi.string().required(),
        VERIFIED_TOKEN_EXPIRES_IN: Joi.string().required(),
        MAIL_SERVER: Joi.string().default('smtp.gmail.com'),
        MAIL_PORT: Joi.number().default(587),
        MAIL_USERNAME: Joi.string().required(),
        MAIL_PASSWORD: Joi.string().required(),
        MAIL_FROM: Joi.string().default('ranahammadismail@gmail.com'),
        MAIL_STARTTLS: Joi.string().optional(),
        MAIL_SSL_TLS: Joi.string().optional(),
        RESEND_API_KEY: Joi.string().optional(),
        REDIS_URL: Joi.string().optional(),
        OBSERVE_APP_KEY: Joi.string().optional(),
        OBSERVE_APP_SECRET: Joi.string().optional(),
        CLOUDINARY_CLOUD_NAME: Joi.string().required(),
        CLOUDINARY_API_KEY: Joi.string().required(),
        CLOUDINARY_API_SECRET: Joi.string().required(),
        DEFAULT_TENANT_SLUG: Joi.string().default('uet-lahore'),
        DEFAULT_TENANT_NAME: Joi.string().default('University of Engineering and Technology, Lahore'),
        SUPER_ADMIN_EMAIL: Joi.string().default('superadmin@unison.local'),
        SUPER_ADMIN_PASSWORD: Joi.string().default('SuperSecurePass123!'),
        TENANT_CACHE_TTL_SECONDS: Joi.number().default(60),
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          const parsed = new URL(redisUrl);
          return {
            connection: {
              host: parsed.hostname,
              port: Number(parsed.port || 6379),
              username: parsed.username || 'default',
              password: parsed.password,
              tls: parsed.protocol === 'rediss:' ? {} : undefined,
              maxRetriesPerRequest: null,
            },
          };
        }
        return {
          connection: {
            host: 'localhost',
            port: 6379,
            maxRetriesPerRequest: null,
          },
        };
      },
      inject: [ConfigService],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule, ClsModule],
      useFactory: (config: ConfigService, cls: ClsService) => ({
        uri: config.get<string>('MONGODB_URI'),
        connectionFactory: (connection) => {
          connection.plugin(createTenantScopePlugin(cls));
          return connection;
        },
      }),
      inject: [ConfigService, ClsService],
    }),
    Neo4jModule,
    TenantsModule,
    SuperAdminModule,
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
    ConnectionsModule,
    CloudinaryModule,
    ActivityModule,
    HealthModule,
    ProfilesModule,
    ChatModule,
    EventsModule,
    FeedModule,
    PartnerModule,
    ProfileManagementModule,
    AppGraphqlModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ConstraintsSeed,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantContextGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Other global middleware can go here
  }
}
