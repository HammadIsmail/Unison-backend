import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateStudentProfileDto, AddStudentSkillDto, ConnectToMentorDto } from './dto/student.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StudentService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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

  async updateProfile(userId: string, dto: UpdateStudentProfileDto, file?: Express.Multer.File) {
    if (file) {
      try {
        const result = await this.neo4j.run(
          `MATCH (u:User {id: $userId}) RETURN u.profile_picture AS oldPic`,
          { userId }
        );
        const oldPic = result.records[0]?.get('oldPic');

        const uploadResult = await this.cloudinaryService.uploadFile(file);
        dto.profile_picture = uploadResult.secure_url;

        if (oldPic) {
          const publicId = this.cloudinaryService.extractPublicIdFromUrl(oldPic);
          if (publicId) {
            await this.cloudinaryService.deleteImage(publicId);
          }
        }
      } catch (err) {
        console.error('[Cloudinary] Student profile picture update failed:', err);
      }
    }

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
      `MATCH (student:User {id: $userId, role: 'student'})-[:HAS_SKILL]->(s:Skill)
       MATCH (alumni:User {role: 'alumni', account_status: 'approved'})-[:HAS_SKILL]->(s)
       OPTIONAL MATCH (alumni)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
       RETURN alumni.id AS alumni_id, 
              alumni.username AS username,
              alumni.display_name AS display_name, 
              alumni.profile_picture AS profile_picture,
              s.category AS domain, 
              w.company_name AS company,
              count(s) AS common_skills
       ORDER BY common_skills DESC
       LIMIT 10`,
      { userId }
    );

    return result.records.map((r) => ({
      alumni_id: r.get('alumni_id'),
      username: r.get('username'),
      display_name: r.get('display_name'),
      profile_picture: r.get('profile_picture') || null,
      domain: r.get('domain'),
      company: r.get('company') || null,
      common_skills: typeof r.get('common_skills')?.toNumber === 'function' ? r.get('common_skills').toNumber() : r.get('common_skills'),
    }));
  }

  async connectToMentor(userId: string, targetId: string, dto: ConnectToMentorDto) {
    if (userId === targetId) throw new ForbiddenException('Cannot connect with yourself.');

    // Check if target is an alumni
    const check = await this.neo4j.run(
      `MATCH (t:User {id: $targetId}) RETURN t.role AS role`,
      { targetId }
    );
    if (!check.records.length) throw new NotFoundException('Target user not found.');
    
    const role = check.records[0].get('role');
    if (role !== 'alumni') {
      throw new ForbiddenException('You can only send mentor connection requests to alumni.');
    }

    await this.neo4j.run(
      `MATCH (u:User {id: $userId}), (t:User {id: $targetId})
       MERGE (u)-[r:CONNECTED_TO]->(t)
       ON CREATE SET r.status = 'pending', r.created_at = datetime(), r.connection_type = $dto.connection_type
       ON MATCH SET r.connection_type = $dto.connection_type`,
      { userId, targetId, dto }
    );

    return { message: 'Connection request sent successfully.' };
  }
}
