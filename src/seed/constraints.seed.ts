import { Injectable, OnModuleInit } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class ConstraintsSeed implements OnModuleInit {
  constructor(private readonly neo4j: Neo4jService) {}

  async onModuleInit() {
    await this.applyConstraints();
  }

  private async applyConstraints() {
    console.log('Applying Neo4j Unique Constraints...');
    try {
      // Create unique constraint for username
      await this.neo4j.run(
        `CREATE CONSTRAINT user_username_unique IF NOT EXISTS
         FOR (u:User) REQUIRE u.username IS UNIQUE`
      );
      console.log('✅ Unique constraint on User.username applied.');

      // Create tenantId indexes
      const tenantLabels = ['User', 'Opportunity', 'Event', 'WorkExperience', 'Education'];
      for (const label of tenantLabels) {
        await this.neo4j.run(
          `CREATE INDEX ${label.toLowerCase()}_tenant_idx IF NOT EXISTS FOR (n:${label}) ON (n.tenantId)`
        );
      }
      console.log('✅ Tenant indexes applied.');
    } catch (error) {
      console.error('❌ Error applying constraints:', error);
    }

  }
}
