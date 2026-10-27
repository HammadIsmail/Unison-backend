import { Module } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { MongooseModule } from '@nestjs/mongoose';
import { UserAuth, UserAuthSchema } from '../auth/schemas/user-auth.schema';

@Module({
  imports: [
    Neo4jModule,
    MongooseModule.forFeature([{ name: UserAuth.name, schema: UserAuthSchema }]),
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
