import { Module } from '@nestjs/common';
import { OpportunityController } from './opportunity.controller';
import { OpportunityService } from './opportunity.service';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [Neo4jModule, CloudinaryModule, NotificationModule],
  controllers: [OpportunityController],
  providers: [OpportunityService]
})
export class OpportunityModule {}
