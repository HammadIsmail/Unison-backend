import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantNeo4jService } from '../neo4j/tenant-neo4j.service';

@Injectable()
export class SkillService {
  constructor(private readonly neo4j: TenantNeo4jService) {}

  async findAll() {
    const result = await this.neo4j.run(
      `MATCH (s:Skill) RETURN DISTINCT s.name AS skill_name ORDER BY skill_name ASC`,
      {},
      { skipTenantScope: true } // Skill is global shared taxonomy
    );
    return result.records.map((r) => r.get('skill_name'));
  }

  async deleteSkill(userId: string, skillId: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId, tenantId: $tenantId})-[r:HAS_SKILL]->(s:Skill {id: $skillId})
       DELETE r RETURN count(r) AS cnt`,
      { userId, skillId }
    );

    const count = result.records[0].get('cnt');
    const countValue = typeof count?.toNumber === 'function' ? count.toNumber() : count;

    if (countValue === 0) {
      throw new NotFoundException('Skill not found in your profile.');
    }

    await this.neo4j.run(
      `MATCH (s:Skill {id: $skillId}) 
       WHERE NOT (s)-[]-() 
       DELETE s`,
      { skillId },
      { skipTenantScope: true }
    );

    return { message: 'Skill removed successfully.' };
  }
}
