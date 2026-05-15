import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { Announcement, AnnouncementSchema } from '../admin/schemas/announcement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Announcement.name, schema: AnnouncementSchema },
    ]),
    Neo4jModule,
  ],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
