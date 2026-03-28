import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class Neo4jHealthIndicator extends HealthIndicator {
  constructor(private readonly neo4jService: Neo4jService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.neo4jService.run('RETURN 1');
      return this.getStatus(key, true);
    } catch (e) {
      throw new HealthCheckError(
        'Neo4j Health check failed',
        this.getStatus(key, false, { message: e.message }),
      );
    }
  }
}
