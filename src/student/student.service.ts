import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { UpdateStudentProfileDto, AddStudentSkillDto } from './dto/student.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StudentService {
  constructor(private readonly neo4j: Neo4jService) {}

  async getProfile(id: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id, role: 'student'})
       OPTIONAL MATCH (u)-[r:HAS_SKILL]->(s:Skill)
       RETURN u, collect(DISTINCT {id: s.id, name: s.name, category: s.category, proficiency_level: r.proficiency_level}) AS skills`,
      { id }
    );

    if (!result.records.length) {
      throw new NotFoundException('Student profile not found.');
    }

    const record = result.records[0];
    const user = record.get('u').properties;
    const skills = record.get('skills').filter((s: any) => s.id !== null);

    return {
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      roll_number: user.roll_number,
      semester: typeof user.semester?.toNumber === 'function' ? user.semester.toNumber() : user.semester,
      degree: user.degree,
      skills: skills.map((s: any) => s.name),
      detailed_skills: skills,
      batch: user.batch || null, // Might be null/undefined for students initially
      bio: user.bio || null,
      phone: user.phone || null,
      profile_picture: user.profile_picture || null,
    };
  }

  async updateProfile(userId: string, dto: UpdateStudentProfileDto) {
    const setQuery = Object.keys(dto)
      .filter((k) => dto[k as keyof UpdateStudentProfileDto] !== undefined)
      .map((k) => `u.${k} = $${k}`)
      .join(', ');

    if (!setQuery) return { message: 'No fields to update.' };

    await this.neo4j.run(
      `MATCH (u:User {id: $userId, role: 'student'}) SET ${setQuery} RETURN u`,
      { userId, ...dto }
    );

    return { message: 'Profile updated successfully.' };
  }

  async addSkill(userId: string, dto: AddStudentSkillDto) {
    const skillId = uuidv4();
    await this.neo4j.run(
      `MATCH (u:User {id: $userId, role: 'student'})
       MERGE (s:Skill {name: toLower($dto.skill_name)})
       ON CREATE SET s.id = $skillId, s.category = $dto.category
       MERGE (u)-[r:HAS_SKILL]->(s)
       SET r.proficiency_level = $dto.proficiency_level`,
      { userId, skillId, dto }
    );

    return { message: 'Skill added successfully.' };
  }

  async getMentors(userId: string) {
    // Recommend mentors (alumni) based on shared skills
    const result = await this.neo4j.run(
      `MATCH (student:User {id: $userId, role: 'student'})-[:HAS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(alumni:User {role: 'alumni', account_status: 'approved'})
       OPTIONAL MATCH (alumni)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
       RETURN alumni.id AS alumni_id, 
              alumni.display_name AS display_name, 
              s.category AS domain, 
              w.company_name AS company,
              count(s) AS common_skills
       ORDER BY common_skills DESC
       LIMIT 10`,
      { userId }
    );

    return result.records.map((r) => ({
      alumni_id: r.get('alumni_id'),
      display_name: r.get('display_name'),
      domain: r.get('domain'),
      company: r.get('company') || null,
    }));
  }
}
