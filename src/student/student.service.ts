import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

import { NotificationService } from '../notification/notification.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAuth } from '../auth/schemas/user-auth.schema';

@Injectable()
export class StudentService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notification: NotificationService,
    @InjectModel(UserAuth.name)
    private readonly userAuthModel: Model<UserAuth>,
  ) {}

  async getProfile(id: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id, role: 'student'})
       WHERE u.is_deleted IS NULL OR u.is_deleted = false
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



  // Skill management (add/update/delete) is unified under AlumniService.
  // Students use POST/PUT/DELETE /api/alumni/skills via @Roles('alumni','partner','student').



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

  async deleteAccount(userId: string) {
    const now = new Date().toISOString();

    // 1. Soft Delete in Neo4j
    await this.neo4j.run(
      `MATCH (u:User {id: $userId})
       SET u.is_deleted = true, u.deleted_at = $now`,
      { userId, now }
    );

    // 2. Soft Delete in MongoDB
    await this.userAuthModel.updateOne(
      { userId: userId },
      { is_deleted: true, deleted_at: new Date() }
    );

    return { message: 'Your account has been soft-deleted. Your data is preserved for historical purposes.' };
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
