import { Module } from '@nestjs/common';
import { OpportunityController } from './opportunity.controller';
import { OpportunityService } from './opportunity.service';
import { Neo4jModule } from '../neo4j/neo4j.module';

@Module({
  imports: [Neo4jModule],
  controllers: [OpportunityController],
  providers: [OpportunityService]
})
export class OpportunityModule {}
