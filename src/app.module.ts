import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Neo4jModule } from './neo4j/neo4j.module';
import { MailModule } from './common/mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AlumniModule } from './alumni/alumni.module';
import { StudentModule } from './student/student.module';
import { OpportunityModule } from './opportunity/opportunity.module';
import { SearchModule } from './search/search.module';
import { SkillModule } from './skill/skill.module';
import { NetworkModule } from './network/network.module';
import { NotificationModule } from './notification/notification.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ActivityModule } from './common/activity/activity.module';
import { ConstraintsSeed } from './seed/constraints.seed';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    Neo4jModule,
    MailModule,
    AuthModule,
    AdminModule,
    AlumniModule,
    StudentModule,
    OpportunityModule,
    SearchModule,
    SkillModule,
    NetworkModule,
    NotificationModule,
    CloudinaryModule,
    ActivityModule,
  ],
  providers: [ConstraintsSeed],
})
export class AppModule { }
