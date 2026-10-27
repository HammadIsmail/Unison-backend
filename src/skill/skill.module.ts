import { Module } from '@nestjs/common';
import { SkillController } from './skill.controller';
import { SkillService } from './skill.service';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserAuth, UserAuthSchema } from '../auth/schemas/user-auth.schema';

@Module({
  imports: [
    Neo4jModule,
    MongooseModule.forFeature([{ name: UserAuth.name, schema: UserAuthSchema }]),
  ],
  controllers: [SkillController],
  providers: [SkillService],
})
export class SkillModule {}
