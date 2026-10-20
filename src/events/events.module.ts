import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [Neo4jModule, CloudinaryModule, NotificationModule],
  providers: [EventsService],
  controllers: [EventsController]
})
export class EventsModule {}
