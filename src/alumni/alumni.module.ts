import { Module } from '@nestjs/common';
import { AlumniService } from './alumni.service';
import { AlumniController } from './alumni.controller';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [Neo4jModule, CloudinaryModule, NotificationModule],
  controllers: [AlumniController],
  providers: [AlumniService],
})
export class AlumniModule {}
