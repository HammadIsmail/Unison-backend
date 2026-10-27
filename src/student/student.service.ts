import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TenantNeo4jService } from '../neo4j/tenant-neo4j.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationService } from '../notification/notification.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserAuth } from '../auth/schemas/user-auth.schema';
import { Connection } from '../connections/schemas/connection.schema';

@Injectable()
export class StudentService {
  constructor(
    private readonly neo4j: TenantNeo4jService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notification: NotificationService,
    @InjectModel(UserAuth.name)
    private readonly userAuthModel: Model<UserAuth>,
    @InjectModel(Connection.name)
    private readonly connectionModel: Model<Connection>,
  ) {}

  async getProfile(id: string) {
    let result: any = null;
    try {
      result = await this.neo4j.run(
        `MATCH (u:User {id: $id, tenantId: $tenantId})
         WHERE u.is_deleted IS NULL OR u.is_deleted = false
         OPTIONAL MATCH (u)-[:HAS_EDUCATION]->(e:Education {tenantId: $tenantId})
         OPTIONAL MATCH (u)-[r:HAS_SKILL]->(s:Skill)
         OPTIONAL MATCH (u)-[:CONNECTED_TO {status: 'accepted'}]-(c:User {tenantId: $tenantId})
         WHERE c.is_deleted IS NULL OR c.is_deleted = false
         OPTIONAL MATCH (f_in:User {tenantId: $tenantId})-[:FOLLOWS]->(u)
         OPTIONAL MATCH (u)-[:FOLLOWS]->(f_out:User {tenantId: $tenantId})
         RETURN u, collect(DISTINCT e) AS education, collect(DISTINCT {id: s.id, name: s.name, category: s.category, proficiency_level: r.proficiency_level}) AS skills, count(DISTINCT c) AS connections_count, count(DISTINCT f_in) AS followerCount, count(DISTINCT f_out) AS followingCount`,
        { id }
      );
    } catch (err: any) {
      result = { records: [] };
    }

    if (result && result.records && result.records.length > 0) {
      const record = result.records[0];
      const user = record.get('u').properties;
      const education = record.get('education').map((node: any) => node.properties);
      const skills = record.get('skills').filter((s: any) => s.id !== null);
      const connections_count = record.get('connections_count').toNumber();
      const followerCount = record.get('followerCount').toNumber();
      const followingCount = record.get('followingCount').toNumber();

      return {
        id: user.id || id,
        role: user.role || 'student',
        username: user.username,
        display_name: user.display_name,
        name: user.display_name || user.username,
        email: user.email,
        roll_number: user.roll_number,
        semester: typeof user.semester?.toNumber === 'function' ? user.semester.toNumber() : user.semester,
        degree: user.degree,
        skills: skills.map((s: any) => s.name),
        detailed_skills: skills,
        batch: user.batch || null,
        bio: user.bio || null,
        phone: user.phone || null,
        profile_picture: user.profile_picture || null,
        backDropImage: user.backDropImage || null,
        connections_count,
        followerCount,
        followingCount,
        education: education,
        account_status: user.account_status || 'approved',
        tenant_id: user.tenantId,
      };
    }

    // Fallback to MongoDB
    const auth = await this.userAuthModel
      .findOne({ userId: id, is_deleted: { $ne: true } })
      .lean()
      .exec();

    if (!auth) {
      throw new NotFoundException('Student profile not found.');
    }

    const emailName = auth.email.split('@')[0];
    return {
      id: auth.userId,
      role: auth.role || 'student',
      username: (auth as any).username || emailName,
      display_name: (auth as any).display_name || emailName,
      name: (auth as any).display_name || emailName,
      email: auth.email,
      roll_number: (auth as any).roll_number || 'N/A',
      semester: (auth as any).semester || 1,
      degree: (auth as any).degree || 'BS',
      skills: (auth as any).skills || [],
      detailed_skills: (auth as any).detailed_skills || [],
      batch: (auth as any).batch || null,
      bio: (auth as any).bio || null,
      phone: (auth as any).phone || null,
      profile_picture: (auth as any).profile_picture || null,
      backDropImage: (auth as any).backDropImage || null,
      connections_count: 0,
      followerCount: 0,
      followingCount: 0,
      education: (auth as any).education || [],
      upgrade_status: (auth as any).upgrade_status || null,
      upgrade_rejection_reason: (auth as any).upgrade_rejection_reason || null,
      graduation_year: (auth as any).graduation_year || null,
      account_status: auth.account_status,
      tenant_id: auth.tenantId,
    };
  }

  async getConnections(userId: string) {
    const mongoConns = await this.connectionModel
      .find({
        $or: [{ senderId: userId }, { receiverId: userId }],
        status: 'accepted',
      })
      .setOptions({ skipTenantScope: true })
      .lean()
      .exec();

    if (mongoConns.length > 0) {
      const partnerIds = mongoConns.map((c) =>
        c.senderId === userId ? c.receiverId : c.senderId
      );
      const partners = await this.userAuthModel
        .find({
          userId: { $in: partnerIds },
          is_deleted: { $ne: true },
        })
        .setOptions({ skipTenantScope: true })
        .lean()
        .exec();

      return partners.map((p) => {
        const currentExp = (p as any).work_experiences?.find((w: any) => w.is_current);
        return {
          id: p.userId,
          display_name: p.display_name || p.username,
          username: p.username,
          profile_picture: p.profile_picture || null,
          bio: (p as any).bio || null,
          backDropImage: (p as any).backDropImage || null,
          company: currentExp?.company_name || (p as any).affiliation || null,
          role: currentExp?.role || (p as any).job_title || p.role || null,
        };
      });
    }

    try {
      const result = await this.neo4j.run(
        `MATCH (u:User {id: $userId, tenantId: $tenantId})-[r:CONNECTED_TO {status: 'accepted'}]-(c:User {tenantId: $tenantId})
         WHERE (c.is_deleted IS NULL OR c.is_deleted = false) AND NOT c.role IN ['admin', 'moderator']
         OPTIONAL MATCH (c)-[:HAS_EXPERIENCE]->(w:WorkExperience {tenantId: $tenantId, is_current: true})
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
    } catch {
      return [];
    }
  }

  async deleteAccount(userId: string) {
    const now = new Date().toISOString();

    // 1. Soft Delete in Neo4j with tenantId filter
    await this.neo4j.run(
      `MATCH (u:User {id: $userId, tenantId: $tenantId})
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
    const auth = await this.userAuthModel.findOne({ userId, is_deleted: { $ne: true } });
    if (!auth || auth.role !== 'student') {
      throw new NotFoundException('Student profile not found or user is not a student.');
    }

    if ((auth as any).upgrade_status === 'pending') {
      throw new ForbiddenException('Upgrade request is already pending.');
    }

    await this.userAuthModel.updateOne(
      { userId },
      {
        $set: {
          upgrade_status: 'pending',
          upgrade_rejection_reason: null,
          graduation_year: graduationYear,
        },
      }
    );

    // Neo4j update (best effort)
    try {
      await this.neo4j.run(
        `MATCH (u:User {id: $userId, role: 'student', tenantId: $tenantId})
         SET u.upgrade_status = 'pending', u.upgrade_rejection_reason = null, u.graduation_year = $graduationYear`,
        { userId, graduationYear }
      );
    } catch (neoErr) {
      console.warn('[Neo4j] requestUpgrade failed:', neoErr);
    }

    return { message: 'Profile upgrade request submitted successfully.' };
  }
}
