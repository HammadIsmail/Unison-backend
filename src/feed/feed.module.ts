import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { Announcement, AnnouncementSchema } from '../admin/schemas/announcement.schema';
import { Opportunity, OpportunitySchema } from '../opportunity/schemas/opportunity.schema';
import { UserAuth, UserAuthSchema } from '../auth/schemas/user-auth.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: Opportunity.name, schema: OpportunitySchema },
      { name: UserAuth.name, schema: UserAuthSchema },
    ]),
    Neo4jModule,
  ],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
