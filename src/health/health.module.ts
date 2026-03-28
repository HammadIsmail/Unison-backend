import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { Neo4jHealthIndicator } from './neo4j.health';
import { Neo4jModule } from '../neo4j/neo4j.module';

@Module({
  imports: [TerminusModule, Neo4jModule],
  controllers: [HealthController],
  providers: [Neo4jHealthIndicator],
})
export class HealthModule {}
