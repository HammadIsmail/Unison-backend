import { Injectable, ForbiddenException } from '@nestjs/common';
import { QueryResult } from 'neo4j-driver';
import { ClsService } from 'nestjs-cls';
import { Neo4jService } from './neo4j.service';

const TENANT_LABELS = /:\s*(User|Opportunity|Event|WorkExperience|Education)\b/;

export interface TenantNeo4jOptions {
  skipTenantScope?: boolean;
}

@Injectable()
export class TenantNeo4jService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly cls: ClsService,
  ) {}

  async run(
    cypher: string,
    params: Record<string, any> = {},
    opts: TenantNeo4jOptions = {},
  ): Promise<QueryResult> {
    if (opts.skipTenantScope) {
      return this.neo4j.run(cypher, params);
    }

    const tenantId = this.cls.get<string>('tenantId');
    if (!tenantId) {
      if (
        this.cls.get<boolean>('isSuperAdmin') ||
        this.cls.get<boolean>('skipTenantScope') ||
        this.cls.get<string>('userRole') === 'super_admin'
      ) {
        return this.neo4j.run(cypher, params);
      }
      throw new ForbiddenException('Tenant context missing (fail-closed)');
    }

    if (TENANT_LABELS.test(cypher) && !cypher.includes('$tenantId')) {
      throw new Error(`Unscoped Cypher touches tenant-owned label: ${cypher.slice(0, 200)}`);
    }

    return this.neo4j.run(cypher, { ...params, tenantId });
  }

  // Raw underlying run for migrations or maintenance
  async rawRun(cypher: string, params: Record<string, any> = {}): Promise<QueryResult> {
    return this.neo4j.run(cypher, params);
  }
}
