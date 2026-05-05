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

    if (result.records[0].get('cnt').toNumber() === 0) {
      throw new NotFoundException('Skill not found in your profile.');
    }

    // Optionally delete skill node if it's no longer connected to anything
    await this.neo4j.run(`MATCH (s:Skill) WHERE NOT ()-[:HAS_SKILL]->(s) DELETE s`);

    return { message: 'Skill removed successfully.' };
  }
}
