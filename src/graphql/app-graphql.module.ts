import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

import { TenantsModule } from '../tenants/tenants.module';
import { AuthModule } from '../auth/auth.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { SearchModule } from '../search/search.module';
import { OpportunityModule } from '../opportunity/opportunity.module';
import { EventsModule } from '../events/events.module';
import { AdminModule } from '../admin/admin.module';
import { SuperAdminModule } from '../super-admin/super-admin.module';

import { TenantsResolver } from './resolvers/tenants.resolver';
import { AuthResolver } from './resolvers/auth.resolver';
import { ProfilesResolver } from './resolvers/profiles.resolver';
import { OpportunityResolver } from './resolvers/opportunity.resolver';
import { EventsResolver } from './resolvers/events.resolver';
import { AnnouncementsResolver } from './resolvers/announcements.resolver';
import { AdminResolver } from './resolvers/admin.resolver';
import { SuperAdminResolver } from './resolvers/super-admin.resolver';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      path: '/graphql',
      context: ({ req, res }) => ({ req, res }),
    }),
    TenantsModule,
    AuthModule,
    ProfilesModule,
    SearchModule,
    OpportunityModule,
    EventsModule,
    AdminModule,
    SuperAdminModule,
  ],
  providers: [
    TenantsResolver,
    AuthResolver,
    ProfilesResolver,
    OpportunityResolver,
    EventsResolver,
    AnnouncementsResolver,
    AdminResolver,
    SuperAdminResolver,
  ],
})
export class AppGraphqlModule {}
