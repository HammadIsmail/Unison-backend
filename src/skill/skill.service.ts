import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantNeo4jService } from '../neo4j/tenant-neo4j.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAuth } from '../auth/schemas/user-auth.schema';

@Injectable()
export class SkillService {
  constructor(
    private readonly neo4j: TenantNeo4jService,
    @InjectModel(UserAuth.name)
    private readonly userAuthModel: Model<UserAuth>,
  ) {}

  async findAll() {
    let result: any = null;
    try {
      result = await this.neo4j.run(
        `MATCH (s:Skill) RETURN DISTINCT s.name AS skill_name ORDER BY skill_name ASC`,
        {},
        { skipTenantScope: true } // Skill is global shared taxonomy
      );
    } catch {
      result = { records: [] };
    }

    if (result?.records?.length) {
      return result.records.map((r: any) => r.get('skill_name'));
    }

    // Fallback: distinct skills across Mongo users
    const mongoSkills = await this.userAuthModel.distinct('skills', { is_deleted: { $ne: true } }).exec();
    return (mongoSkills || []).sort();
  }

  async deleteSkill(userId: string, skillId: string) {
    const user = await this.userAuthModel.findOne({ userId }).lean().exec();
    const currentDetailedSkills = (user as any)?.detailed_skills || [];
    const skillToDelete = currentDetailedSkills.find(
      (s: any) => s.id === skillId || s.name?.toLowerCase() === skillId.toLowerCase()
    );

    if (skillToDelete) {
      await this.userAuthModel.updateOne(
        { userId },
        {
          $pull: {
            detailed_skills: { id: skillToDelete.id },
            skills: skillToDelete.name,
          },
        }
      );
    }

    // Neo4j update (best effort)
    try {
      const result = await this.neo4j.run(
        `MATCH (u:User {id: $userId, tenantId: $tenantId})-[r:HAS_SKILL]->(s:Skill {id: $skillId})
         DELETE r RETURN count(r) AS cnt`,
        { userId, skillId }
      );

      await this.neo4j.run(
        `MATCH (s:Skill {id: $skillId}) 
         WHERE NOT (s)-[]-() 
         DELETE s`,
        { skillId },
        { skipTenantScope: true }
      );
    } catch (neoErr) {
      console.warn('[Neo4j] deleteSkill failed:', neoErr);
    }

    return { message: 'Skill removed successfully.' };
  }
}
