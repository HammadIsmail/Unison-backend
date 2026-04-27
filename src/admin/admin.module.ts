import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { MailModule } from '../common/mail/mail.module';
import { NotificationModule } from '../notification/notification.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [Neo4jModule, MailModule, NotificationModule, CloudinaryModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
