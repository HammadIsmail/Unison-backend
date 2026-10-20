import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, HealthIndicatorResult } from '@nestjs/terminus';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class Neo4jHealthIndicator {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.neo4jService.run('RETURN 1');
      return indicator.up();
    } catch (e: any) {
      return indicator.down({ message: e?.message || 'Neo4j Health check failed' });
    }
  }
}
