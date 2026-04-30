import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateStudentProfileDto, AddStudentSkillDto } from './dto/student.dto';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class StudentService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notification: NotificationService,
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
      backDropImage: user.backDropImage || null,
    };
  }

  async updateProfile(userId: string, dto: UpdateStudentProfileDto, files?: { profile_picture?: Express.Multer.File[], backDropImage?: Express.Multer.File[] }) {
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
        console.error('[Cloudinary] Student profile picture update failed:', err);
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
        console.error('[Cloudinary] Student backdrop image update failed:', err);
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



  async getConnections(userId: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId})-[r:CONNECTED_TO {status: 'accepted'}]-(c:User)
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

  async deleteAccount(userId: string) {
    // 1. Fetch user profile picture
    const mediaResult = await this.neo4j.run(
      `MATCH (u:User {id: $userId}) RETURN u.profile_picture AS profile_pic`,
      { userId }
    );

    if (mediaResult.records.length > 0) {
      const profilePic = mediaResult.records[0].get('profile_pic');
      if (profilePic) {
        const publicId = this.cloudinaryService.extractPublicIdFromUrl(profilePic);
        if (publicId) await this.cloudinaryService.deleteImage(publicId);
      }
    }

    // 2. Comprehensive Neo4j Delete
    await this.neo4j.run(
      `MATCH (u:User {id: $userId})
       OPTIONAL MATCH (n:Notification)-[:FOR]->(u)
       DETACH DELETE u, n`,
      { userId }
    );

    return { message: 'Your account and all associated data have been permanently deleted.' };
  }

  async requestUpgrade(userId: string, graduationYear: number) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId, role: 'student'}) RETURN u.upgrade_status AS status`,
      { userId }
    );

    if (!result.records.length) {
      throw new NotFoundException('Student profile not found or user is not a student.');
    }

    const currentStatus = result.records[0].get('status');
    if (currentStatus === 'pending') {
      throw new ForbiddenException('Upgrade request is already pending.');
    }

    await this.neo4j.run(
      `MATCH (u:User {id: $userId, role: 'student'})
       SET u.upgrade_status = 'pending', u.upgrade_rejection_reason = null, u.graduation_year = $graduationYear`,
      { userId, graduationYear }
    );

    return { message: 'Profile upgrade request submitted successfully.' };
  }
}
