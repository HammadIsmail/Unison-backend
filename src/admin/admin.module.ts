import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { MailModule } from '../common/mail/mail.module';
import { NotificationModule } from '../notification/notification.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UserAuth, UserAuthSchema } from '../auth/schemas/user-auth.schema';
import { OTPRecord, OTPSchema } from '../auth/schemas/otp.schema';
import { Activity, ActivitySchema } from '../common/activity/schemas/activity.schema';
import { Message, MessageSchema } from '../chat/schemas/message.schema';
import { Conversation, ConversationSchema } from '../chat/schemas/conversation.schema';
import { Announcement, AnnouncementSchema } from './schemas/announcement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserAuth.name, schema: UserAuthSchema },
      { name: OTPRecord.name, schema: OTPSchema },
      { name: Activity.name, schema: ActivitySchema },
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Announcement.name, schema: AnnouncementSchema },
    ]),
    Neo4jModule,
    MailModule,
    NotificationModule,
    CloudinaryModule
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule { }
