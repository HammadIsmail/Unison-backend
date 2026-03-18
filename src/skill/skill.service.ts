import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class SkillService {
  constructor(private readonly neo4j: Neo4jService) {}

  async findAll() {
    const result = await this.neo4j.run(`MATCH (s:Skill) RETURN DISTINCT s.name AS skill_name ORDER BY skill_name ASC`);
    return result.records.map((r) => r.get('skill_name'));
  }
}
