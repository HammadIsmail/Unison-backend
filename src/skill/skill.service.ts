import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class SkillService {
  constructor(private readonly neo4j: Neo4jService) {}

  async findAll() {
    const result = await this.neo4j.run(`MATCH (s:Skill) RETURN DISTINCT s.name AS skill_name ORDER BY skill_name ASC`);
    return result.records.map((r) => r.get('skill_name'));
  }

  async deleteSkill(userId: string, skillId: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId})-[r:HAS_SKILL]->(s:Skill {id: $skillId})
       DELETE r RETURN count(r) AS cnt`,
      { userId, skillId }
    );

    const count = result.records[0].get('cnt');
    const countValue = typeof count?.toNumber === 'function' ? count.toNumber() : count;

    if (countValue === 0) {
      throw new NotFoundException('Skill not found in your profile.');
    }

    // Cleanup: Only delete the skill node if it has NO relationships left at all 
    // (e.g., no one else has it and it's not required by any opportunity)
    // We target only the skillId being deleted to avoid full label scans.
    await this.neo4j.run(
      `MATCH (s:Skill {id: $skillId}) 
       WHERE NOT (s)-[]-() 
       DELETE s`,
      { skillId }
    );

    return { message: 'Skill removed successfully.' };
  }
}
