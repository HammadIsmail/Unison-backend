import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationModule } from '../notification/notification.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserAuth, UserAuthSchema } from '../auth/schemas/user-auth.schema';

@Module({
  imports: [
    Neo4jModule, 
    CloudinaryModule, 
    NotificationModule,
    MongooseModule.forFeature([{ name: UserAuth.name, schema: UserAuthSchema }])
  ],
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}
