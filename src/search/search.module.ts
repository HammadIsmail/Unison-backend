import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { UserAuth, UserAuthSchema } from '../auth/schemas/user-auth.schema';
import { Opportunity, OpportunitySchema } from '../opportunity/schemas/opportunity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserAuth.name, schema: UserAuthSchema },
      { name: Opportunity.name, schema: OpportunitySchema },
    ]),
    Neo4jModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}


