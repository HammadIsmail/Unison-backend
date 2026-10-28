import { Module } from '@nestjs/common';
import { AlumniService } from './alumni.service';
import { AlumniController } from './alumni.controller';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationModule } from '../notification/notification.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserAuth, UserAuthSchema } from '../auth/schemas/user-auth.schema';
import { Connection, ConnectionSchema } from '../connections/schemas/connection.schema';
import { Opportunity, OpportunitySchema } from '../opportunity/schemas/opportunity.schema';

@Module({
  imports: [
    Neo4jModule, 
    CloudinaryModule, 
    NotificationModule,
    MongooseModule.forFeature([
      { name: UserAuth.name, schema: UserAuthSchema },
      { name: Connection.name, schema: ConnectionSchema },
      { name: Opportunity.name, schema: OpportunitySchema },
    ]),
  ],
  controllers: [AlumniController],
  providers: [AlumniService],
  exports: [AlumniService],
})
export class AlumniModule {}
