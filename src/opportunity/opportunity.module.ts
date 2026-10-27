import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OpportunityController } from './opportunity.controller';
import { OpportunityService } from './opportunity.service';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationModule } from '../notification/notification.module';
import { Opportunity, OpportunitySchema } from './schemas/opportunity.schema';
import { UserAuth, UserAuthSchema } from '../auth/schemas/user-auth.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Opportunity.name, schema: OpportunitySchema },
      { name: UserAuth.name, schema: UserAuthSchema },
    ]),
    Neo4jModule,
    CloudinaryModule,
    NotificationModule,
  ],
  controllers: [OpportunityController],
  providers: [OpportunityService],
  exports: [OpportunityService],
})
export class OpportunityModule {}

