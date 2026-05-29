import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { v4 as uuidv4 } from 'uuid';
import {
  UpdateAlumniProfileDto,
  CreateWorkExperienceDto,
  UpdateWorkExperienceDto,
  AddSkillDto,
  UpdateSkillDto,
  CreateEducationDto,
  UpdateEducationDto,
} from './dto/alumni.dto';
import { ActivityService, ActivityType } from '../common/activity/activity.service';
import { NotificationService } from '../notification/notification.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAuth } from '../auth/schemas/user-auth.schema';
import { UnifiedUpdateProfileDto } from '../profile-management/dto/profile-management.dto';

@Injectable()
export class AlumniService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly activity: ActivityService,
    private readonly notification: NotificationService,
    @InjectModel(UserAuth.name)
    private readonly userAuthModel: Model<UserAuth>,
  ) { }

  async getProfile(id: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id, role: 'alumni'})
       WHERE u.is_deleted IS NULL OR u.is_deleted = false
       OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience)
       OPTIONAL MATCH (u)-[:HAS_EDUCATION]->(e:Education)
       OPTIONAL MATCH (u)-[r:HAS_SKILL]->(s:Skill)
       OPTIONAL MATCH (u)-[:CONNECTED_TO {status: 'accepted'}]-(c:User)
       WHERE c.is_deleted IS NULL OR c.is_deleted = false
       RETURN u, collect(DISTINCT w) AS experiences, 
              collect(DISTINCT e) AS education,
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
    const education = record.get('education').map((node: any) => node.properties);
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
      backDropImage: user.backDropImage || null,
      work_experiences: experiences,
      detailed_skills: skills,
      education: education,
    };
  }

  async updateProfile(userId: string, dto: UnifiedUpdateProfileDto, files?: { profile_picture?: Express.Multer.File[], backDropImage?: Express.Multer.File[] }) {
    if (files?.profile_picture?.length) {
      const file = files.profile_picture[0];
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

    if (files?.backDropImage?.length) {
      const file = files.backDropImage[0];
      try {
        const result = await this.neo4j.run(
          `MATCH (u:User {id: $userId}) RETURN u.backDropImage AS oldPic`,
          { userId }
        );
        const oldPic = result.records[0]?.get('oldPic');

        const uploadResult = await this.cloudinaryService.uploadFile(file);
        dto.backDropImage = uploadResult.secure_url;

        if (oldPic) {
          const publicId = this.cloudinaryService.extractPublicIdFromUrl(oldPic);
          if (publicId) {
            await this.cloudinaryService.deleteImage(publicId);
          }
        }
      } catch (err) {
        console.error('[Cloudinary] Backdrop image update failed:', err);
      }
    }

    const setQuery = Object.keys(dto)
      .filter((k) => dto[k as keyof UnifiedUpdateProfileDto] !== undefined)
      .map((k) => `u.${k} = $${k}`)
      .join(', ');

    if (!setQuery) return { message: 'No fields to update.' };

    await this.neo4j.run(
      `MATCH (u:User {id: $userId}) SET ${setQuery} RETURN u`,
      { userId, ...dto }
    );

    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId}) RETURN u.display_name AS name`,
      { userId }
    );
    const name = result.records[0]?.get('name') || 'User';

    await this.activity.logActivity(
      ActivityType.PROFILE_UPDATED,
      `${name} updated their profile information`,
      userId
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

    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId}) RETURN u.display_name AS name`,
      { userId }
    );
    const name = result.records[0]?.get('name') || 'User';

    await this.activity.logActivity(
      ActivityType.EXPERIENCE_ADDED,
      `${name} added a new work experience at ${dto.company_name}`,
      expId
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

  // ── Unified Skill Methods (accessible by alumni, partner, student) ──────────

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

  async updateSkill(userId: string, skillId: string, dto: UpdateSkillDto) {
    const updates: string[] = [];
    if (dto.proficiency_level !== undefined) updates.push('r.proficiency_level = $proficiency_level');
    if (dto.years_experience !== undefined) updates.push('r.years_experience = $years_experience');

    if (!updates.length) return { message: 'No fields to update.' };

    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId})-[r:HAS_SKILL]->(s:Skill {id: $skillId})
       SET ${updates.join(', ')}
       RETURN r`,
      { userId, skillId, ...dto }
    );

    if (!result.records.length) {
      throw new NotFoundException('Skill not found on your profile.');
    }

    return { message: 'Skill updated successfully.' };
  }

  async deleteSkill(userId: string, skillId: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId})-[r:HAS_SKILL]->(s:Skill {id: $skillId})
       DELETE r
       RETURN count(r) AS cnt`,
      { userId, skillId }
    );

    if (result.records[0].get('cnt').toNumber() === 0) {
      throw new NotFoundException('Skill not found on your profile.');
    }

    return { message: 'Skill removed successfully.' };
  }

  // ─────────────────────────────────────────────────────────────────────────────

  async addEducation(userId: string, dto: CreateEducationDto) {
    const eduId = uuidv4();
    await this.neo4j.run(
      `MATCH (u:User {id: $userId})
       CREATE (e:Education {
         id: $eduId,
         university: $dto.university,
         degree: $dto.degree,
         field_of_study: $dto.field_of_study,
         start_date: $dto.start_date,
         end_date: $dto.end_date,
         is_current: $dto.is_current
       })
       CREATE (u)-[:HAS_EDUCATION]->(e)`,
      { userId, eduId, dto }
    );

    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId}) RETURN u.display_name AS name`,
      { userId }
    );
    const name = result.records[0]?.get('name') || 'User';

    await this.activity.logActivity(
      ActivityType.PROFILE_UPDATED,
      `${name} added new education: ${dto.degree} at ${dto.university}`,
      userId
    );

    return { message: 'Education added successfully.' };
  }

  async updateEducation(userId: string, eduId: string, dto: UpdateEducationDto) {
    const setQuery = Object.keys(dto)
      .filter((k) => dto[k as keyof UpdateEducationDto] !== undefined)
      .map((k) => `e.${k} = $${k}`)
      .join(', ');

    if (!setQuery) return { message: 'No fields to update.' };

    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId})-[:HAS_EDUCATION]->(e:Education {id: $eduId})
       SET ${setQuery} RETURN e`,
      { userId, eduId, ...dto }
    );

    if (!result.records.length) throw new NotFoundException('Education record not found.');

    return { message: 'Education updated successfully.' };
  }

  async deleteEducation(userId: string, eduId: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId})-[:HAS_EDUCATION]->(e:Education {id: $eduId})
       DETACH DELETE e RETURN count(e) AS cnt`,
      { userId, eduId }
    );

    if (result.records[0].get('cnt').toNumber() === 0) {
      throw new NotFoundException('Education record not found.');
    }

    return { message: 'Education removed successfully.' };
  }


  async getConnections(userId: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId})-[r:CONNECTED_TO {status: 'accepted'}]-(c:User)
       WHERE (c.is_deleted IS NULL OR c.is_deleted = false) AND NOT c.role IN ['admin', 'moderator']
       OPTIONAL MATCH (c)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
       RETURN c.id AS id, c.display_name AS display_name, c.username AS username, 
              c.profile_picture AS profile_picture, c.bio AS bio, c.backDropImage AS backDropImage, 
              w.company_name AS company, w.role AS role`,
      { userId }
    );

    return result.records.map((r) => ({
      id: r.get('id'),
      display_name: r.get('display_name'),
      username: r.get('username'),
      profile_picture: r.get('profile_picture') || null,
      bio: r.get('bio') || null,
      backDropImage: r.get('backDropImage') || null,
      company: r.get('company') || null,
      role: r.get('role') || null,
    }));
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
       WHERE c.id <> $userId AND c.account_status = 'approved' AND (c.is_deleted IS NULL OR c.is_deleted = false)
       OPTIONAL MATCH (c)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
       RETURN c.id AS id, c.display_name AS display_name, c.username AS username, 
              c.profile_picture AS profile_picture, c.bio AS bio, c.backDropImage AS backDropImage, 
              w.company_name AS company, w.role AS role`,
      { batch, userId }
    );

    return result.records.map((r) => ({
      id: r.get('id'),
      display_name: r.get('display_name'),
      username: r.get('username'),
      profile_picture: r.get('profile_picture') || null,
      bio: r.get('bio') || null,
      backDropImage: r.get('backDropImage') || null,
      company: r.get('company') || null,
      role: r.get('role') || null,
    }));
  }

  async deleteAccount(userId: string) {
    const now = new Date().toISOString();

    // 1. Soft Delete in Neo4j
    await this.neo4j.run(
      `MATCH (u:User {id: $userId})
       OPTIONAL MATCH (u)-[:POSTED]->(o:Opportunity)
       SET u.is_deleted = true, u.deleted_at = $now, o.is_deleted = true`,
      { userId, now }
    );

    // 2. Soft Delete in MongoDB
    await this.userAuthModel.updateOne(
      { userId: userId },
      { is_deleted: true, deleted_at: new Date() }
    );

    return { message: 'Your account has been soft-deleted. Historical data is preserved.' };
  }
}
