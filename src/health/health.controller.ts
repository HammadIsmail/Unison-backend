import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, MemoryHealthIndicator, HealthCheck } from '@nestjs/terminus';
import { Neo4jHealthIndicator } from './neo4j.health';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private neo4jHealth: Neo4jHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Only require up to 150MB of memory for the heap
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      // Validate the database is actually reachable
      () => this.neo4jHealth.isHealthy('neo4j'),
    ]);
  }

  @Get('test-error')
  triggerError() {
    throw new Error('🚀 Sentry Test Error: Monitoring is working!');
  }
}
