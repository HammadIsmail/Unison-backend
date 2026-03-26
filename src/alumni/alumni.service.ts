import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { v4 as uuidv4 } from 'uuid';
import {
  UpdateAlumniProfileDto,
  CreateWorkExperienceDto,
  UpdateWorkExperienceDto,
  AddSkillDto,
  ConnectDto,
} from './dto/alumni.dto';

@Injectable()
export class AlumniService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async getProfile(id: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id, role: 'alumni'})
       OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience)
       OPTIONAL MATCH (u)-[r:HAS_SKILL]->(s:Skill)
       OPTIONAL MATCH (u)-[:CONNECTED_TO {status: 'accepted'}]-(c:User)
       RETURN u, collect(DISTINCT w) AS experiences, 
              collect(DISTINCT {id: s.id, name: s.name, category: s.category, proficiency_level: r.proficiency_level}) AS skills, 
              count(DISTINCT c) AS connections_count`,
      { id }
    );

    if (!result.records.length) {
      throw new NotFoundException('Alumni profile not found.');
    }

    const record = result.records[0];
    const user = record.get('u').properties;
    const experiences = record.get('experiences').map((node: any) => node.properties);
    const skills = record.get('skills').filter((s: any) => s.id !== null);
    const connections_count = record.get('connections_count').toNumber();

    return {
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      bio: user.bio,
      graduation_year: typeof user.graduation_year?.toNumber === 'function' ? user.graduation_year.toNumber() : user.graduation_year,
      degree: user.degree,
      current_company: experiences.find((e: any) => e.is_current)?.company_name || null,
      role: experiences.find((e: any) => e.is_current)?.role || null,
      skills: skills.map((s: any) => s.name),
      batch: user.batch,
      connections_count,
      linkedin_url: user.linkedin_url || null,
      phone: user.phone || null,
      profile_picture: user.profile_picture || null,
      work_experiences: experiences,
      detailed_skills: skills,
    };
  }

  async updateProfile(userId: string, dto: UpdateAlumniProfileDto, file?: Express.Multer.File) {
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
        console.error('[Cloudinary] Profile picture update failed:', err);
      }
    }

    const setQuery = Object.keys(dto)
      .filter((k) => dto[k as keyof UpdateAlumniProfileDto] !== undefined)
      .map((k) => `u.${k} = $${k}`)
      .join(', ');

    if (!setQuery) return { message: 'No fields to update.' };

    await this.neo4j.run(
      `MATCH (u:User {id: $userId, role: 'alumni'}) SET ${setQuery} RETURN u`,
      { userId, ...dto }
    );

    return { message: 'Profile updated successfully.' };
  }

  async addWorkExperience(userId: string, dto: CreateWorkExperienceDto) {
    const expId = uuidv4();
    await this.neo4j.run(
      `MATCH (u:User {id: $userId})
       CREATE (w:WorkExperience {
         id: $expId,
         company_name: $dto.company_name,
         role: $dto.role,
         start_date: $dto.start_date,
         end_date: $dto.end_date,
         is_current: $dto.is_current,
         employment_type: $dto.employment_type
       })
       CREATE (u)-[:HAS_EXPERIENCE]->(w)`,
      { userId, expId, dto }
    );

    return { message: 'Work experience added successfully.' };
  }

  async updateWorkExperience(userId: string, expId: string, dto: UpdateWorkExperienceDto) {
    const setQuery = Object.keys(dto)
      .filter((k) => dto[k as keyof UpdateWorkExperienceDto] !== undefined)
      .map((k) => `w.${k} = $${k}`)
      .join(', ');

    if (!setQuery) return { message: 'No fields to update.' };

    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId})-[:HAS_EXPERIENCE]->(w:WorkExperience {id: $expId})
       SET ${setQuery} RETURN w`,
      { userId, expId, ...dto }
    );

    if (!result.records.length) throw new NotFoundException('Work experience not found.');

    return { message: 'Work experience updated successfully.' };
  }

  async deleteWorkExperience(userId: string, expId: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId})-[:HAS_EXPERIENCE]->(w:WorkExperience {id: $expId})
       DETACH DELETE w RETURN count(w) AS cnt`,
      { userId, expId }
    );

    if (result.records[0].get('cnt').toNumber() === 0) {
      throw new NotFoundException('Work experience not found.');
    }

    return { message: 'Work experience removed successfully.' };
  }

  async addSkill(userId: string, dto: AddSkillDto) {
    const skillId = uuidv4();
    await this.neo4j.run(
      `MATCH (u:User {id: $userId})
       MERGE (s:Skill {name: toLower($dto.skill_name)})
       ON CREATE SET s.id = $skillId, s.category = $dto.category
       MERGE (u)-[r:HAS_SKILL]->(s)
       SET r.proficiency_level = $dto.proficiency_level, r.years_experience = $dto.years_experience`,
      { userId, skillId, dto }
    );

    return { message: 'Skill added successfully.' };
  }

  async deleteSkill(userId: string, skillId: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId})-[r:HAS_SKILL]->(s:Skill {id: $skillId})
       DELETE r RETURN count(r) AS cnt`,
      { userId, skillId }
    );

    if (result.records[0].get('cnt').toNumber() === 0) {
      throw new NotFoundException('Skill not found in local profile.');
    }

    // Optionally delete skill node if it's no longer connected to anything
    await this.neo4j.run(`MATCH (s:Skill) WHERE NOT ()-[:HAS_SKILL]->(s) DELETE s`);

    return { message: 'Skill removed successfully.' };
  }

  async getNetwork(userId: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId})-[r:CONNECTED_TO {status: 'accepted'}]-(c:User)
       OPTIONAL MATCH (c)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
       RETURN c.id AS id, c.display_name AS display_name, w.company_name AS company, w.role AS role, r.connection_type AS connection_type`,
      { userId }
    );

    return result.records.map((r) => ({
      id: r.get('id'),
      display_name: r.get('display_name'),
      company: r.get('company') || null,
      role: r.get('role') || null,
      connection_type: r.get('connection_type') || null,
    }));
  }

  async connectWith(userId: string, targetId: string, dto: ConnectDto) {
    if (userId === targetId) throw new ForbiddenException('Cannot connect with yourself.');

    const check = await this.neo4j.run(
      `MATCH (t:User {id: $targetId}) RETURN t`,
      { targetId }
    );
    if (!check.records.length) throw new NotFoundException('Target user not found.');

    await this.neo4j.run(
      `MATCH (u:User {id: $userId}), (t:User {id: $targetId})
       MERGE (u)-[r:CONNECTED_TO]->(t)
       ON CREATE SET r.status = 'pending', r.created_at = datetime(), r.connection_type = $dto.connection_type
       ON MATCH SET r.connection_type = $dto.connection_type`,
      { userId, targetId, dto }
    );

    return { message: 'Connection request sent successfully.' };
  }

  async getPendingRequests(userId: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User)-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId})
       RETURN u.id AS id, u.display_name AS display_name, r.connection_type AS connection_type, r.created_at AS created_at`,
      { userId }
    );

    return result.records.map((r) => ({
      sender_id: r.get('id'),
      sender_name: r.get('display_name'),
      connection_type: r.get('connection_type'),
      requested_at: r.get('created_at'),
    }));
  }

  async respondToRequest(userId: string, senderId: string, action: 'accept' | 'reject') {
    if (action === 'accept') {
      const result = await this.neo4j.run(
        `MATCH (u:User {id: $senderId})-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId})
         SET r.status = 'accepted', r.accepted_at = datetime()
         RETURN r`,
        { userId, senderId }
      );
      if (!result.records.length) throw new NotFoundException('Connection request not found.');
      return { message: 'Connection request accepted.' };
    } else {
      const result = await this.neo4j.run(
        `MATCH (u:User {id: $senderId})-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId})
         DELETE r RETURN count(r) AS cnt`,
        { userId, senderId }
      );
      if (result.records[0].get('cnt').toNumber() === 0) throw new NotFoundException('Connection request not found.');
      return { message: 'Connection request rejected.' };
    }
  }

  async getBatchMates(userId: string) {
    const userResult = await this.neo4j.run(
      `MATCH (u:User {id: $userId}) RETURN u.batch AS batch`,
      { userId }
    );
    if (!userResult.records.length) throw new NotFoundException('User not found.');

    const batch = userResult.records[0].get('batch');
    if (!batch) return [];

    const result = await this.neo4j.run(
      `MATCH (c:User {batch: $batch, role: 'alumni'})
       WHERE c.id <> $userId AND c.account_status = 'approved'
       OPTIONAL MATCH (c)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
       RETURN c.id AS id, c.display_name AS display_name, w.company_name AS company, w.role AS role`,
      { batch, userId }
    );

    return result.records.map((r) => ({
      id: r.get('id'),
      display_name: r.get('display_name'),
      company: r.get('company') || null,
      role: r.get('role') || null,
    }));
  }
}
