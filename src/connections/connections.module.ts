import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { NotificationModule } from '../notification/notification.module';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';
import { Connection, ConnectionSchema } from './schemas/connection.schema';
import { UserAuth, UserAuthSchema } from '../auth/schemas/user-auth.schema';

@Module({
  imports: [
    Neo4jModule,
    NotificationModule,
    MongooseModule.forFeature([
      { name: Connection.name, schema: ConnectionSchema },
      { name: UserAuth.name, schema: UserAuthSchema },
    ]),
  ],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
  exports: [ConnectionsService, MongooseModule],
})
export class ConnectionsModule {}
