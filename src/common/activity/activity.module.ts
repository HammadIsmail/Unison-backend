import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityService } from './activity.service';
import { Neo4jModule } from '../../neo4j/neo4j.module';
import { Activity, ActivitySchema } from './schemas/activity.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Activity.name, schema: ActivitySchema }]),
    Neo4jModule
  ],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule { }
