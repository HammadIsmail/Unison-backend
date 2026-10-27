import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantNeo4jService } from '../neo4j/tenant-neo4j.service';
import { ClsService } from 'nestjs-cls';
import { TenantsService } from '../tenants/tenants.service';
import { Tenant, TenantDocument } from '../tenants/schemas/tenant.schema';
import { MailService } from '../common/mail/mail.service';
import { RejectAccountDto, RejectUpgradeDto } from './dto/admin.dto';
import * as bcrypt from 'bcryptjs';
import {
  CreateAnnouncementDto,
  UpdateAdminProfileDto,
  CreateStaffDto,
  UpdateTenantSettingsDto,
} from './dto/admin-request.dto';
import { ActivityService, ActivityType } from '../common/activity/activity.service';
import { NotificationService } from '../notification/notification.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UserAuth } from '../auth/schemas/user-auth.schema';
import { OTPRecord } from '../auth/schemas/otp.schema';
import { Activity } from '../common/activity/schemas/activity.schema';
import { Message } from '../chat/schemas/message.schema';
import { Conversation } from '../chat/schemas/conversation.schema';
import { Announcement } from './schemas/announcement.schema';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly neo4j: TenantNeo4jService,
    private readonly mail: MailService,
    private readonly activity: ActivityService,
    private readonly notification: NotificationService,
    private readonly cloudinary: CloudinaryService,
    private readonly cls: ClsService,
    private readonly tenantsService: TenantsService,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(UserAuth.name)
    private readonly userAuthModel: Model<UserAuth>,
    @InjectModel(OTPRecord.name)
    private readonly otpModel: Model<OTPRecord>,
    @InjectModel(Activity.name)
    private readonly activityModel: Model<Activity>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<Announcement>,
  ) {}

  private toNum(val: any): number {
    if (!val) return 0;
    if (typeof val.toNumber === 'function') return val.toNumber();
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }

  async getPendingAccounts() {
    try {
      const result = await this.neo4j.run(
        `MATCH (u:User {account_status: 'pending'})
         WHERE u.is_deleted IS NULL OR u.is_deleted = false
         RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.email AS email, u.role AS role, 
                u.created_at AS registered_at, u.profile_picture AS profile_picture, u.student_card_url AS student_card_url,
                u.affiliation AS affiliation, u.job_title AS job_title,
                u.roll_number AS roll_number, u.degree AS degree, u.batch AS batch,
                u.graduation_year AS graduation_year, u.semester AS semester`,
      );

      if (result.records && result.records.length > 0) {
        return result.records.map((record) => {
          const registeredAt = record.get('registered_at');
          return {
            id: record.get('id'),
            username: record.get('username') || record.get('email')?.split('@')[0],
            display_name: record.get('display_name') || record.get('username') || record.get('email')?.split('@')[0],
            email: record.get('email'),
            role: record.get('role'),
            registered_at: registeredAt
              ? typeof registeredAt === 'string'
                ? registeredAt
                : registeredAt.toString
                  ? registeredAt.toString()
                  : registeredAt
              : null,
            profile_picture: record.get('profile_picture') || null,
            student_card_url: record.get('student_card_url') || null,
            affiliation: record.get('affiliation') || null,
            job_title: record.get('job_title') || null,
            roll_number: record.get('roll_number') || null,
            degree: record.get('degree') || null,
            batch: record.get('batch') || null,
            graduation_year: record.get('graduation_year') || null,
            semester: record.get('semester') || null,
          };
        });
      }
    } catch (err: any) {
      this.logger.warn(`Neo4j getPendingAccounts query failed: ${err?.message || err}`);
    }

    // Fallback to MongoDB
    const pendingUsers = await this.userAuthModel
      .find({ account_status: 'pending', is_deleted: { $ne: true } })
      .lean()
      .exec();

    return pendingUsers.map((u: any) => ({
      id: u.userId,
      username: u.username || u.email.split('@')[0],
      display_name: u.display_name || u.username || u.email.split('@')[0],
      email: u.email,
      role: u.role,
      registered_at: u.createdAt ? u.createdAt.toISOString() : null,
      profile_picture: u.backDropImage || null,
      student_card_url: u.student_card_url || null,
      affiliation: u.affiliation || null,
      job_title: u.job_title || null,
      roll_number: u.roll_number || null,
      degree: u.degree || null,
      batch: u.batch || null,
      graduation_year: u.graduation_year || null,
      semester: u.semester || null,
    }));
  }

  async approveAccount(id: string) {
    // 1. Update MongoDB
    const authUser = await this.userAuthModel.findOneAndUpdate(
      { userId: id },
      { account_status: 'approved' },
      { new: true },
    );

    // 2. Update Neo4j
    let neo4jUser: any = null;
    try {
      const result = await this.neo4j.run(
        `MATCH (u:User {id: $id, tenantId: $tenantId})
         SET u.account_status = 'approved'
         RETURN u`,
        { id },
      );
      if (result.records && result.records.length > 0) {
        neo4jUser = result.records[0].get('u').properties;
      }
    } catch (err: any) {
      this.logger.warn(`Neo4j approveAccount update failed: ${err?.message || err}`);
    }

    if (!authUser && !neo4jUser) {
      throw new NotFoundException('Account not found.');
    }

    const email = authUser?.email || neo4jUser?.email;
    const displayName = neo4jUser?.display_name || neo4jUser?.username || email?.split('@')[0] || 'User';

    if (email) {
      try {
        await this.mail.sendApprovalEmail(email, displayName);
      } catch (err: any) {
        this.logger.warn(`Failed to send approval email: ${err?.message || err}`);
      }
    }

    try {
      await this.activity.logActivity(
        ActivityType.ACCOUNT_APPROVED,
        `Account approved for ${displayName}`,
        id,
      );
    } catch (err: any) {
      this.logger.warn(`Activity logging failed: ${err?.message || err}`);
    }

    try {
      await this.notification.createNotification(
        id,
        'Your account has been approved by the admin. Welcome to UNISON!',
        'account_approved',
        {
          sender_display_name: 'UNISON Administration',
          reference_link: '/',
        },
      );
    } catch (err: any) {
      this.logger.warn(`Notification failed: ${err?.message || err}`);
    }

    return { message: 'Account approved. Email sent to user.' };
  }

  async rejectAccount(id: string, dto: RejectAccountDto) {
    // 1. Update MongoDB
    const authUser = await this.userAuthModel.findOneAndUpdate(
      { userId: id },
      { account_status: 'rejected', rejection_reason: dto.rejection_reason },
      { new: true },
    );

    // 2. Update Neo4j
    let neo4jUser: any = null;
    try {
      const result = await this.neo4j.run(
        `MATCH (u:User {id: $id, tenantId: $tenantId})
         SET u.account_status = 'rejected'
         RETURN u`,
        { id },
      );
      if (result.records && result.records.length > 0) {
        neo4jUser = result.records[0].get('u').properties;
      }
    } catch (err: any) {
      this.logger.warn(`Neo4j rejectAccount update failed: ${err?.message || err}`);
    }

    if (!authUser && !neo4jUser) {
      throw new NotFoundException('Account not found.');
    }

    const email = authUser?.email || neo4jUser?.email;
    const displayName = neo4jUser?.display_name || neo4jUser?.username || email?.split('@')[0] || 'User';

    if (email) {
      try {
        await this.mail.sendRejectionEmail(email, displayName, dto.rejection_reason);
      } catch (err: any) {
        this.logger.warn(`Failed to send rejection email: ${err?.message || err}`);
      }
    }

    try {
      await this.activity.logActivity(
        ActivityType.ACCOUNT_REJECTED,
        `Account rejected for ${displayName}: ${dto.rejection_reason}`,
        id,
      );
    } catch (err: any) {
      this.logger.warn(`Activity logging failed: ${err?.message || err}`);
    }

    try {
      await this.notification.createNotification(
        id,
        `Your account request was rejected. Reason: ${dto.rejection_reason}`,
        'account_rejected',
        {
          sender_display_name: 'UNISON Administration',
        },
      );
    } catch (err: any) {
      this.logger.warn(`Notification failed: ${err?.message || err}`);
    }

    return { message: 'Account rejected. Email sent to user.' };
  }

  async bulkApproveAccounts(ids: string[]) {
    const results = await Promise.allSettled(ids.map((id) => this.approveAccount(id)));
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      message: `Bulk approval complete. ${succeeded} succeeded, ${failed} failed.`,
      succeeded,
      failed,
    };
  }

  async bulkRejectAccounts(ids: string[], reason: string) {
    const results = await Promise.allSettled(
      ids.map((id) => this.rejectAccount(id, { rejection_reason: reason })),
    );
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      message: `Bulk rejection complete. ${succeeded} succeeded, ${failed} failed.`,
      succeeded,
      failed,
    };
  }

  async getPendingUpgrades(tenantId?: string) {
    let result: any = null;
    try {
      result = await this.neo4j.run(
        `MATCH (u:User {role: 'student', upgrade_status: 'pending'})
         WHERE (u.is_deleted IS NULL OR u.is_deleted = false)
           AND ($tenantId IS NULL OR u.tenantId = $tenantId)
         RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.email AS email, u.roll_number AS roll_number, u.upgrade_status AS upgrade_status, u.profile_picture AS profile_picture, u.graduation_year AS graduation_year`,
        { tenantId: tenantId || null },
      );
    } catch {
      result = { records: [] };
    }

    if (result?.records?.length) {
      return result.records.map((record: any) => ({
        id: record.get('id'),
        username: record.get('username'),
        display_name: record.get('display_name'),
        email: record.get('email'),
        roll_number: record.get('roll_number') || null,
        graduation_year:
          typeof record.get('graduation_year')?.toNumber === 'function'
            ? record.get('graduation_year').toNumber()
            : record.get('graduation_year') || null,
        upgrade_status: record.get('upgrade_status'),
        profile_picture: record.get('profile_picture') || null,
      }));
    }

    // Fallback to MongoDB
    const filter: any = { role: 'student', upgrade_status: 'pending', is_deleted: { $ne: true } };
    if (tenantId) {
      filter.$or = [{ tenantId }, { tenant_id: tenantId }, { tenantId: null }, { tenantId: { $exists: false } }];
    }
    const pending = await this.userAuthModel
      .find(filter)
      .lean()
      .exec();

    return pending.map((u: any) => ({
      id: u.userId,
      username: u.username || u.email.split('@')[0],
      display_name: u.display_name || (u as any).name || u.email.split('@')[0],
      email: u.email,
      roll_number: u.roll_number || null,
      graduation_year: u.graduation_year || null,
      upgrade_status: u.upgrade_status || 'pending',
      profile_picture: u.profile_picture || null,
    }));
  }

  async approveUpgrade(id: string) {
    const user = await this.userAuthModel.findOne({ userId: id, is_deleted: { $ne: true } });
    if (!user) {
      throw new NotFoundException('Pending upgrade request not found for this user.');
    }

    // 1. Update MongoDB Role & remove upgrade_status
    await this.userAuthModel.updateOne(
      { userId: id },
      {
        $set: { role: 'alumni' },
        $unset: { upgrade_status: 1, upgrade_rejection_reason: 1 },
      }
    );

    // 2. Update Neo4j (best effort)
    try {
      await this.neo4j.run(
        `MATCH (u:User {id: $id})
         SET u.role = 'alumni'
         REMOVE u.upgrade_status, u.upgrade_rejection_reason
         RETURN u`,
        { id },
      );
    } catch (neoErr) {
      console.warn('[Neo4j] approveUpgrade failed:', neoErr);
    }

    const displayName = (user as any).display_name || (user as any).username || 'User';
    try {
      await this.mail.sendUpgradeApprovalEmail(user.email, displayName);
    } catch {}

    try {
      await this.activity.logActivity(
        ActivityType.PROFILE_UPDATED,
        `Profile upgraded to Alumni for ${displayName}`,
        id,
      );
    } catch {}

    try {
      await this.notification.createNotification(
        id,
        'Congratulations! Your request to upgrade to an Alumni profile has been approved.',
        'profile_upgraded',
        {
          sender_display_name: 'UNISON Administration',
          reference_link: '/',
        },
      );
    } catch {}

    return { message: 'Profile upgraded successfully. Email sent to user.' };
  }

  async rejectUpgrade(id: string, dto: RejectUpgradeDto) {
    const user = await this.userAuthModel.findOne({ userId: id, is_deleted: { $ne: true } });
    if (!user) {
      throw new NotFoundException('Pending upgrade request not found for this user.');
    }

    // 1. Update MongoDB
    await this.userAuthModel.updateOne(
      { userId: id },
      {
        $set: {
          upgrade_status: 'rejected',
          upgrade_rejection_reason: dto.rejection_reason,
        },
      }
    );

    // 2. Update Neo4j (best effort)
    try {
      await this.neo4j.run(
        `MATCH (u:User {id: $id})
         SET u.upgrade_status = 'rejected', u.upgrade_rejection_reason = $reason
         RETURN u`,
        { id, reason: dto.rejection_reason },
      );
    } catch (neoErr) {
      console.warn('[Neo4j] rejectUpgrade failed:', neoErr);
    }

    const displayName = (user as any).display_name || (user as any).username || 'User';
    try {
      await this.mail.sendUpgradeRejectionEmail(user.email, displayName, dto.rejection_reason);
    } catch {}

    await this.notification.createNotification(
      id,
      `Your request to upgrade to an Alumni profile was rejected. Reason: ${dto.rejection_reason}`,
      'upgrade_rejected',
      {
        sender_display_name: 'UNISON Administration',
      },
    );

    return { message: 'Upgrade request rejected. Email sent to user.' };
  }

  async getDashboardStats() {
    const totalAlumniResult = await this.neo4j.run(
      `MATCH (u:User {role: 'alumni', account_status: 'approved', tenantId: $tenantId}) WHERE u.is_deleted IS NULL OR u.is_deleted = false RETURN count(u) AS count`,
    );
    const totalStudentsResult = await this.neo4j.run(
      `MATCH (u:User {role: 'student', account_status: 'approved', tenantId: $tenantId}) WHERE u.is_deleted IS NULL OR u.is_deleted = false RETURN count(u) AS count`,
    );
    const pendingAccountsResult = await this.neo4j.run(
      `MATCH (u:User {account_status: 'pending', tenantId: $tenantId}) WHERE u.is_deleted IS NULL OR u.is_deleted = false RETURN count(u) AS count`,
    );
    const totalOpportunitiesResult = await this.neo4j.run(
      `MATCH (o:Opportunity {tenantId: $tenantId}) WHERE o.is_deleted IS NULL OR o.is_deleted = false RETURN count(o) AS count`,
    );

    // Most common skills
    const skillsResult = await this.neo4j.run(`
      MATCH (u:User {tenantId: $tenantId})-[:HAS_SKILL]->(s:Skill)
      RETURN s.name AS skill, count(u) AS frequency
      ORDER BY frequency DESC LIMIT 3
    `);

    const totalCompaniesResult = await this.neo4j.run(
      `MATCH (w:WorkExperience {tenantId: $tenantId}) RETURN count(DISTINCT w.company_name) AS count`,
    );

    let total_alumni = this.toNum(totalAlumniResult.records[0]?.get('count'));
    let total_students = this.toNum(totalStudentsResult.records[0]?.get('count'));
    let pending_accounts = this.toNum(pendingAccountsResult.records[0]?.get('count'));
    const total_opportunities = this.toNum(totalOpportunitiesResult.records[0]?.get('count'));
    const total_companies = this.toNum(totalCompaniesResult.records[0]?.get('count'));

    // Fallback to MongoDB if Neo4j is offline/empty
    if (total_alumni === 0 && total_students === 0 && pending_accounts === 0) {
      const [alumniCount, studentCount, pendingCount] = await Promise.all([
        this.userAuthModel.countDocuments({ role: 'alumni', account_status: 'approved' }),
        this.userAuthModel.countDocuments({ role: 'student', account_status: 'approved' }),
        this.userAuthModel.countDocuments({ account_status: 'pending' }),
      ]);
      total_alumni = alumniCount;
      total_students = studentCount;
      pending_accounts = pendingCount;
    }

    return {
      total_alumni,
      total_students,
      pending_accounts,
      total_opportunities,
      total_companies,
      most_common_skills: (skillsResult.records || []).map((r) => r.get('skill')),
    };
  }

  private prepareLuceneQuery(q: string): string {
    if (!q) return '';
    return q
      .trim()
      .split(/\s+/)
      .map((word) => `${word}~`)
      .join(' AND ');
  }

  async getAllAlumni(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;
    let queryBase = '';
    const params: any = { skip, limit };

    if (search) {
      const luceneQ = this.prepareLuceneQuery(search);
      queryBase = `
        CALL db.index.fulltext.queryNodes("user_search_index", "${luceneQ}") YIELD node AS u, score
        WHERE u.tenantId = $tenantId AND u.role = 'alumni' AND u.account_status = 'approved' AND (u.is_deleted IS NULL OR u.is_deleted = false)
      `;
    } else {
      queryBase = `
        MATCH (u:User {role: 'alumni', account_status: 'approved', tenantId: $tenantId})
        WHERE (u.is_deleted IS NULL OR u.is_deleted = false)
      `;
    }

    const countResult = await this.neo4j.run(`${queryBase} RETURN count(u) AS total`, params);
    const total = this.toNum(countResult.records[0]?.get('total'));

    const result = await this.neo4j.run(
      `${queryBase}
       OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true, tenantId: $tenantId})
       RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.email AS email, u.phone AS phone, u.bio AS bio,
              w.company_name AS company, w.role AS role, u.graduation_year AS graduation_year, u.degree AS degree,
              u.batch AS batch, u.linkedin_url AS linkedin_url, u.profile_picture AS profile_picture, u.created_at AS created_at
       ORDER BY u.created_at DESC
       SKIP toInteger($skip) LIMIT toInteger($limit)`,
      params,
    );

    const data = (result.records || []).map((record) => {
      let batch = record.get('batch') || null;
      if (batch && typeof batch === 'string') {
        batch = batch.replace(/\.0/g, '');
      }

      const createdAt = record.get('created_at');

      return {
        id: record.get('id'),
        username: record.get('username'),
        display_name: record.get('display_name'),
        email: record.get('email'),
        phone: record.get('phone') || null,
        bio: record.get('bio') || null,
        company: record.get('company') || null,
        role: record.get('role') || null,
        graduation_year:
          typeof record.get('graduation_year')?.toNumber === 'function'
            ? record.get('graduation_year').toNumber()
            : record.get('graduation_year') || null,
        degree: record.get('degree') || null,
        batch: batch,
        linkedin_url: record.get('linkedin_url') || null,
        profile_picture: record.get('profile_picture') || null,
        created_at: createdAt
          ? typeof createdAt === 'string'
            ? createdAt
            : createdAt.toString
              ? createdAt.toString()
              : createdAt
          : null,
      };
    });

    return { total, page, data };
  }

  async getAllStudents(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;
    let queryBase = '';
    const params: any = { skip, limit };

    if (search) {
      const luceneQ = this.prepareLuceneQuery(search);
      queryBase = `
        CALL db.index.fulltext.queryNodes("user_search_index", "${luceneQ}") YIELD node AS u, score
        WHERE u.tenantId = $tenantId AND u.role = 'student' AND u.account_status = 'approved' AND (u.is_deleted IS NULL OR u.is_deleted = false)
      `;
    } else {
      queryBase = `
        MATCH (u:User {role: 'student', account_status: 'approved', tenantId: $tenantId})
        WHERE (u.is_deleted IS NULL OR u.is_deleted = false)
      `;
    }

    const countResult = await this.neo4j.run(`${queryBase} RETURN count(u) AS total`, params);
    const total = this.toNum(countResult.records[0]?.get('total'));

    const result = await this.neo4j.run(
      `${queryBase}
       RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.email AS email, u.phone AS phone, u.bio AS bio,
              u.roll_number AS roll_number, u.semester AS semester, u.degree AS degree, u.batch AS batch,
              u.profile_picture AS profile_picture, u.created_at AS created_at
       ORDER BY u.created_at DESC
       SKIP toInteger($skip) LIMIT toInteger($limit)`,
      params,
    );

    const data = (result.records || []).map((record) => {
      let batch = record.get('batch') || null;
      if (batch && typeof batch === 'string') {
        batch = batch.replace(/\.0/g, '');
      }

      const createdAt = record.get('created_at');

      return {
        id: record.get('id'),
        username: record.get('username'),
        display_name: record.get('display_name'),
        email: record.get('email'),
        phone: record.get('phone') || null,
        bio: record.get('bio') || null,
        roll_number: record.get('roll_number'),
        semester:
          typeof record.get('semester')?.toNumber === 'function'
            ? record.get('semester').toNumber()
            : record.get('semester') || null,
        degree: record.get('degree') || null,
        batch: batch,
        profile_picture: record.get('profile_picture') || null,
        created_at: createdAt
          ? typeof createdAt === 'string'
            ? createdAt
            : createdAt.toString
              ? createdAt.toString()
              : createdAt
          : null,
      };
    });

    return { total, page, data };
  }

  async getAllPartners(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;
    let queryBase = '';
    const params: any = { skip, limit };

    if (search) {
      const luceneQ = this.prepareLuceneQuery(search);
      queryBase = `
        CALL db.index.fulltext.queryNodes("user_search_index", "${luceneQ}") YIELD node AS u, score
        WHERE u.tenantId = $tenantId AND u.role = 'partner' AND u.account_status = 'approved' AND (u.is_deleted IS NULL OR u.is_deleted = false)
      `;
    } else {
      queryBase = `
        MATCH (u:User {role: 'partner', account_status: 'approved', tenantId: $tenantId})
        WHERE (u.is_deleted IS NULL OR u.is_deleted = false)
      `;
    }

    const countResult = await this.neo4j.run(`${queryBase} RETURN count(u) AS total`, params);
    const total = this.toNum(countResult.records[0]?.get('total'));

    const result = await this.neo4j.run(
      `${queryBase}
       RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.email AS email, u.phone AS phone, u.bio AS bio,
              u.affiliation AS affiliation, u.job_title AS job_title, u.linkedin_url AS linkedin_url,
              u.profile_picture AS profile_picture, u.created_at AS created_at
       ORDER BY u.created_at DESC
       SKIP toInteger($skip) LIMIT toInteger($limit)`,
      params,
    );

    const data = (result.records || []).map((record) => {
      const createdAt = record.get('created_at');
      return {
        id: record.get('id'),
        username: record.get('username'),
        display_name: record.get('display_name'),
        email: record.get('email'),
        phone: record.get('phone') || null,
        bio: record.get('bio') || null,
        affiliation: record.get('affiliation') || null,
        job_title: record.get('job_title') || null,
        linkedin_url: record.get('linkedin_url') || null,
        profile_picture: record.get('profile_picture') || null,
        created_at: createdAt
          ? typeof createdAt === 'string'
            ? createdAt
            : createdAt.toString
              ? createdAt.toString()
              : createdAt
          : null,
      };
    });

    return { total, page, data };
  }

  async removeAccount(adminId: string, id: string, reason?: string) {
    const now = new Date();
    const nowIso = now.toISOString();

    // ── Phase 1: Soft-delete in Neo4j ────────────────────────────────────────
    const neo4jResult = await this.neo4j.run(
      `MATCH (u:User {id: $id, tenantId: $tenantId})
       OPTIONAL MATCH (u)-[:POSTED]->(o:Opportunity {tenantId: $tenantId})
       SET u.is_deleted = true, u.deleted_at = $now,
           o.is_deleted = true
       RETURN count(u) AS updated`,
      { id, now: nowIso },
    );

    let updated = this.toNum(neo4jResult.records[0]?.get('updated'));
    if (updated === 0) {
      const auth = await this.userAuthModel.findOne({ userId: id });
      if (!auth) throw new NotFoundException('Account not found.');
      updated = 1;
    }

    // ── Phase 2: Soft-delete in MongoDB (with rollback on failure) ────────────
    try {
      await this.userAuthModel.updateOne(
        { userId: id },
        {
          is_deleted: true,
          deleted_at: now,
          deleted_by: adminId,
          deletion_reason: reason ?? 'Admin removal',
          deletion_source: 'admin',
        },
      );
    } catch (mongoError: any) {
      // Compensation: revert Neo4j soft-delete to keep both DBs consistent
      this.logger.error(
        `MongoDB soft-delete failed for user ${id} — reverting Neo4j. Error: ${mongoError?.message || mongoError}`,
      );
      await this.neo4j
        .run(
          `MATCH (u:User {id: $id, tenantId: $tenantId})
         OPTIONAL MATCH (u)-[:POSTED]->(o:Opportunity {tenantId: $tenantId})
         REMOVE u.is_deleted, u.deleted_at, o.is_deleted`,
          { id },
        )
        .catch((revertErr: any) =>
          this.logger.error(`Neo4j revert also failed for user ${id}: ${revertErr?.message || revertErr}`),
        );
      throw new Error('Account deletion failed due to a database error. Please try again.');
    }

    await this.activity.logActivity(
      ActivityType.PROFILE_UPDATED,
      `Admin soft-deleted account ${id}. Reason: ${reason ?? 'Admin removal'}`,
      adminId,
    );

    return { message: 'Account has been soft-deleted. Historical data is preserved.' };
  }

  async restoreAccount(adminId: string, userId: string) {
    // ── Phase 1: Verify account exists and is actually soft-deleted ───────────
    const auth = await this.userAuthModel.findOne({ userId, is_deleted: true });
    if (!auth) {
      throw new NotFoundException('No soft-deleted account found with this ID.');
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // ── Phase 2: Restore in Neo4j first ──────────────────────────────────────
    await this.neo4j.run(
      `MATCH (u:User {id: $userId, tenantId: $tenantId})
       OPTIONAL MATCH (u)-[:POSTED]->(o:Opportunity {tenantId: $tenantId})
       REMOVE u.is_deleted, u.deleted_at
       SET o.is_deleted = false
       RETURN count(u) AS restored`,
      { userId },
    );

    // ── Phase 3: Restore in MongoDB (with compensation on failure) ────────────
    try {
      await this.userAuthModel.updateOne(
        { userId },
        {
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          deletion_reason: null,
          deletion_source: null,
          restored_at: now,
          restored_by: adminId,
        },
      );
    } catch (mongoError: any) {
      // Compensation: re-apply soft-delete in Neo4j to stay consistent
      this.logger.error(
        `MongoDB restore failed for user ${userId} — reverting Neo4j. Error: ${mongoError?.message || mongoError}`,
      );
      await this.neo4j
        .run(
          `MATCH (u:User {id: $userId, tenantId: $tenantId})
         SET u.is_deleted = true, u.deleted_at = $now`,
          { userId, now: nowIso },
        )
        .catch((revertErr: any) =>
          this.logger.error(`Neo4j re-delete revert also failed for ${userId}: ${revertErr?.message || revertErr}`),
        );
      throw new Error('Account restoration failed due to a database error. Please try again.');
    }

    await this.activity.logActivity(
      ActivityType.PROFILE_UPDATED,
      `Admin restored soft-deleted account ${userId}.`,
      adminId,
    );

    return {
      message: 'Account restored successfully. The user can now log in.',
      userId,
      restored_at: now.toISOString(),
    };
  }

  async getDeletedUsers() {
    const deletedUsers = await this.userAuthModel
      .find({ is_deleted: true })
      .sort({ deleted_at: -1 })
      .lean()
      .exec();

    if (deletedUsers.length === 0) return { total: 0, data: [] };

    const userIds = deletedUsers.map((u) => u.userId);

    // Fetch display names and usernames from Neo4j in bulk
    const result = await this.neo4j.run(
      `MATCH (u:User {tenantId: $tenantId})
       WHERE u.id IN $userIds
       RETURN u.id AS id, u.display_name AS display_name, u.username AS username`,
      { userIds },
    );

    const profileMap = new Map();
    result.records.forEach((r) => {
      profileMap.set(r.get('id'), {
        display_name: r.get('display_name'),
        username: r.get('username'),
      });
    });

    const data = deletedUsers.map((u) => {
      const profile = profileMap.get(u.userId) || {};
      return {
        id: u.userId,
        username: profile.username || null,
        display_name: profile.display_name || 'Deleted User',
        email: u.email,
        role: u.role,
        deleted_at: u.deleted_at,
        deletion_reason: u.deletion_reason || 'No reason provided',
        deletion_source: u.deletion_source,
      };
    });

    return {
      total: deletedUsers.length,
      data,
    };
  }

  async requestEmailChange(newEmail: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await this.otpModel.findOneAndUpdate(
      { email: newEmail, type: 'admin_email_change' },
      { otp, expires_at: expiresAt, verified: false },
      { upsert: true, new: true },
    );

    await this.mail.sendOtp(newEmail, otp);
    return { message: 'OTP sent to your new email address.' };
  }

  async verifyEmailChange(adminId: string, newEmail: string, otp: string) {
    const record = await this.otpModel.findOne({ email: newEmail, type: 'admin_email_change' });

    if (!record) {
      throw new NotFoundException('No OTP request found for this email.');
    }

    if (record.expires_at < new Date()) {
      throw new BadRequestException('OTP has expired.');
    }
    if (record.otp !== otp) {
      throw new BadRequestException('Invalid OTP.');
    }

    // Update admin email in both DBs
    await this.neo4j.run(
      `MATCH (u:User {id: $adminId, role: 'admin', tenantId: $tenantId})
       SET u.email = $newEmail`,
      { adminId, newEmail },
    );
    await this.userAuthModel.findOneAndUpdate({ userId: adminId }, { email: newEmail });

    // Clean up OTP record in MongoDB
    await this.otpModel.deleteOne({ email: newEmail, type: 'admin_email_change' });

    return { message: 'Admin email updated successfully.', new_email: newEmail };
  }

  async getAllOpportunities(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;
    let queryBase = '';
    const params: any = { skip, limit };

    if (search) {
      queryBase = `
        MATCH (o:Opportunity {tenantId: $tenantId})
        WHERE (o.title CONTAINS $search OR o.description CONTAINS $search OR o.company_name CONTAINS $search)
          AND (o.is_deleted IS NULL OR o.is_deleted = false)
      `;
      params.search = search;
    } else {
      queryBase = `
        MATCH (o:Opportunity {tenantId: $tenantId})
        WHERE (o.is_deleted IS NULL OR o.is_deleted = false)
      `;
    }

    const countResult = await this.neo4j.run(`${queryBase} RETURN count(o) AS total`, params);
    const total = this.toNum(countResult.records[0]?.get('total'));

    const result = await this.neo4j.run(
      `${queryBase}
       MATCH (u:User {tenantId: $tenantId})-[:POSTED]->(o)
       RETURN o, u.display_name AS posted_by, u.username AS poster_username
       ORDER BY o.created_at DESC
       SKIP toInteger($skip) LIMIT toInteger($limit)`,
      params,
    );

    const data = (result.records || []).map((r) => {
      const opp = r.get('o')?.properties || {};
      return {
        ...opp,
        posted_by: r.get('posted_by') || null,
        poster_username: r.get('poster_username') || null,
        posted_at: opp.posted_at
          ? typeof opp.posted_at === 'string'
            ? opp.posted_at
            : opp.posted_at.toString
              ? opp.posted_at.toString()
              : opp.posted_at
          : null,
        deadline: opp.deadline
          ? typeof opp.deadline === 'string'
            ? opp.deadline
            : opp.deadline.toString
              ? opp.deadline.toString()
              : opp.deadline
          : null,
      };
    });

    return { total, page, data };
  }

  async adminDeleteOpportunity(id: string) {
    const result = await this.neo4j.run(
      `MATCH (o:Opportunity {id: $id, tenantId: $tenantId})
       SET o.is_deleted = true, o.deleted_at = datetime(), o.deleted_by = 'admin'
       RETURN count(o) AS cnt`,
      { id },
    );

    if (!result.records.length || this.toNum(result.records[0].get('cnt')) === 0) {
      throw new NotFoundException('Opportunity not found.');
    }

    return { message: 'Opportunity removed by administrator.' };
  }

  async exportUsersToCsv(role: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {role: $role, account_status: 'approved', tenantId: $tenantId})
       WHERE u.is_deleted IS NULL OR u.is_deleted = false
       RETURN u.display_name AS name, u.email AS email, u.batch AS batch, u.degree AS degree, u.created_at AS joined`,
      { role },
    );

    let csv = 'Name,Email,Batch,Degree,JoinedAt\n';
    result.records.forEach((r) => {
      csv += `"${r.get('name')}","${r.get('email')}","${r.get('batch')}","${r.get('degree')}","${r.get('joined')}"\n`;
    });

    return csv;
  }

  async getRecentActivity(limit: number = 10, type?: string, userId?: string) {
    const query: any = {};
    if (type) query.type = type;
    if (userId) query.related_id = userId;

    const activities = await this.activityModel
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .exec();

    return activities.map((a) => ({
      id: a._id,
      type: a.type,
      description: a.description,
      created_at: a.created_at,
      related_id: a.related_id,
    }));
  }

  async getAdvancedAnalytics(from?: string, to?: string) {
    try {
      const fromDate = from && !isNaN(Date.parse(from)) ? new Date(from) : undefined;
      const toDate = to && !isNaN(Date.parse(to)) ? new Date(to) : undefined;

      const [skillGap, growth, engagement, departmental, alignment, mentorship] =
        await Promise.all([
          this.getSkillGapAnalysis(),
          this.getGrowthMetrics(fromDate, toDate),
          this.getEngagementMetrics(fromDate, toDate),
          this.getDepartmentalAnalysis(),
          this.getCurriculumAlignmentScore(),
          this.getAlumniMentorshipIndex(),
        ]);

      return {
        skill_gap: skillGap,
        growth_trends: growth,
        engagement_metrics: engagement,
        departmental_analysis: departmental,
        curriculum_alignment: alignment,
        mentorship_impact: mentorship,
      };
    } catch (error) {
      this.logger.error('Error fetching advanced analytics:', error);
      throw new BadRequestException('Failed to fetch analytics. Ensure date formats are correct (YYYY-MM-DD).');
    }
  }

  async getSkillGapAnalysis() {
    // 1. Skills in Demand (Opportunities)
    const demandResult = await this.neo4j.run(`
      MATCH (o:Opportunity {tenantId: $tenantId})-[:REQUIRES_SKILL]->(s:Skill)
      WHERE o.is_deleted IS NULL OR o.is_deleted = false
      RETURN s.name AS skill, count(o) AS demand
      ORDER BY demand DESC LIMIT 10
    `);

    // 2. Skills in Supply (Users)
    const supplyResult = await this.neo4j.run(`
      MATCH (u:User {tenantId: $tenantId})-[:HAS_SKILL]->(s:Skill)
      WHERE u.account_status = 'approved' AND (u.is_deleted IS NULL OR u.is_deleted = false)
      RETURN s.name AS skill, count(u) AS supply
    `);

    const supplyMap = new Map();
    supplyResult.records.forEach((r) => {
      const supply = r.get('supply');
      supplyMap.set(r.get('skill'), supply?.toNumber ? supply.toNumber() : Number(supply || 0));
    });

    return demandResult.records.map((r) => {
      const skill = r.get('skill');
      const rawDemand = r.get('demand');
      const demand = rawDemand?.toNumber ? rawDemand.toNumber() : Number(rawDemand || 0);
      const supply = supplyMap.get(skill) || 0;
      return {
        skill,
        demand,
        supply,
        gap: Math.max(0, demand - supply),
        priority: demand > supply * 2 ? 'High' : 'Medium',
      };
    });
  }

  async getGrowthMetrics(from?: Date, to?: Date) {
    const matchQuery: any = {};
    if (from || to) {
      matchQuery.createdAt = {};
      if (from) matchQuery.createdAt.$gte = from;
      if (to) matchQuery.createdAt.$lte = to;
    } else {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      matchQuery.createdAt = { $gte: sixMonthsAgo };
    }

    const growth = await this.userAuthModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return growth.map((g) => ({
      month: `${g._id.year}-${String(g._id.month).padStart(2, '0')}`,
      signups: g.count,
    }));
  }

  async getEngagementMetrics(from?: Date, to?: Date) {
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const matchQuery: any = { createdAt: { $gte: fromDate } };
    if (to) matchQuery.createdAt.$lte = to;

    const messageCount = await this.messageModel.countDocuments(matchQuery);

    // For conversations, we use updatedAt
    const convMatch: any = { updatedAt: { $gte: fromDate } };
    if (to) convMatch.updatedAt.$lte = to;
    const activeConversations = await this.conversationModel.countDocuments(convMatch);

    const connectionResult = await this.neo4j.run(
      `
      MATCH (u1:User {tenantId: $tenantId})-[r:CONNECTED_TO]->(u2:User {tenantId: $tenantId})
      WHERE (r.created_at >= $from OR (r.status = 'pending' AND r.updated_at >= $from))
      ${to ? 'AND r.created_at <= $to' : ''}
      RETURN count(r) AS count
    `,
      { from: fromDate.toISOString(), to: to ? to.toISOString() : undefined },
    );

    return {
      messages_last_30_days: messageCount,
      active_conversations: activeConversations,
      connections_activity: this.toNum(connectionResult.records[0]?.get('count')),
    };
  }

  async getDepartmentalAnalysis() {
    const result = await this.neo4j.run(`
      MATCH (u:User {tenantId: $tenantId})
      WHERE u.degree IS NOT NULL AND u.account_status = 'approved'
      OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)
      RETURN u.degree AS degree, count(u) AS student_count, collect(DISTINCT s.name)[0..3] AS top_skills
      ORDER BY student_count DESC
    `);

    return result.records.map((r) => {
      const studentCount = r.get('student_count');
      return {
        degree: r.get('degree'),
        student_count: studentCount?.toNumber ? studentCount.toNumber() : Number(studentCount || 0),
        top_skills: r.get('top_skills'),
      };
    });
  }

  async getCurriculumAlignmentScore() {
    const result = await this.neo4j.run(`
      MATCH (o:Opportunity {tenantId: $tenantId})-[:REQUIRES_SKILL]->(s:Skill)
      WITH s, count(o) AS demand
      MATCH (u:User {tenantId: $tenantId})-[:HAS_SKILL]->(s)
      WITH demand, count(u) AS supply
      RETURN sum(demand * supply) / (sum(demand) * sum(supply) + 1) * 100 AS score
    `);

    const rawScore = result.records[0]?.get('score');
    const score =
      rawScore && typeof rawScore === 'object' && 'toNumber' in rawScore
        ? rawScore.toNumber()
        : Number(rawScore || 0);

    return {
      overall_alignment_score: Math.min(100, Math.round(score)),
    };
  }

  async getAlumniMentorshipIndex() {
    const result = await this.neo4j.run(`
      MATCH (a:User {role: 'alumni', tenantId: $tenantId})-[:CONNECTED_TO {status: 'accepted'}]-(s:User {role: 'student', tenantId: $tenantId})
      RETURN count(DISTINCT a) AS active_mentors, count(DISTINCT s) AS mentored_students, count(*) AS total_interactions
    `);

    const records = result.records[0];
    if (!records) {
      return {
        active_mentors: 0,
        mentored_students: 0,
        interaction_density: 0,
      };
    }
    const active_mentors = records.get('active_mentors');
    const mentored_students = records.get('mentored_students');
    const total_interactions = records.get('total_interactions');

    return {
      active_mentors: active_mentors?.toNumber ? active_mentors.toNumber() : Number(active_mentors || 0),
      mentored_students:
        mentored_students?.toNumber ? mentored_students.toNumber() : Number(mentored_students || 0),
      interaction_density:
        total_interactions?.toNumber ? total_interactions.toNumber() : Number(total_interactions || 0),
    };
  }

  async broadcastAnnouncement(
    adminId: string,
    dto: CreateAnnouncementDto,
    file?: Express.Multer.File,
  ) {
    let media_url: string | undefined;
    let media_type: 'image' | 'video' | undefined;

    // Upload media to Cloudinary if provided
    if (file) {
      const isVideo = file.mimetype.startsWith('video/');
      const uploadResult = await this.cloudinary.uploadFile(file);
      media_url = uploadResult.secure_url;
      media_type = isVideo ? 'video' : 'image';
    }

    // Persist announcement record
    const announcement = (await this.announcementModel.create({
      title: dto.title,
      description: sanitizeHtml(dto.description),
      event_date: dto.event_date,
      media_url,
      media_type,
      created_by_admin: adminId,
    })) as Announcement;

    // Fetch all approved user IDs in current tenant from Neo4j
    const result = await this.neo4j.run(
      `MATCH (u:User {account_status: 'approved', tenantId: $tenantId})
       WHERE u.is_deleted IS NULL OR u.is_deleted = false
       RETURN u.id AS id`,
    );
    const userIds: string[] = result.records.map((r) => r.get('id'));

    // Broadcast notification to each user (fire-and-forget, non-blocking)
    const notifMessage = dto.event_date
      ? `📢 ${dto.title} — ${dto.description} (Event: ${new Date(dto.event_date).toLocaleDateString()})`
      : `📢 ${dto.title} — ${dto.description}`;

    await Promise.allSettled(
      userIds.map((userId) =>
        this.notification.createNotification(userId, notifMessage, 'announcement', {
          sender_display_name: 'UNISON Administration',
          reference_link: `/announcements/${announcement._id}`,
          reference_id: announcement._id.toString(),
        }),
      ),
    );

    await this.activity.logActivity(
      ActivityType.PROFILE_UPDATED,
      `Admin broadcast announcement: "${dto.title}" to ${userIds.length} users`,
      adminId,
    );

    return {
      message: `Announcement broadcasted to ${userIds.length} users.`,
      id: announcement._id,
      title: announcement.title,
      media_url: announcement.media_url || null,
    };
  }

  async getAnnouncements(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.announcementModel
        .find()
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.announcementModel.countDocuments(),
    ]);

    // Fetch admin names from Neo4j in bulk
    const adminIds = [...new Set(data.map((a) => a.created_by_admin))];
    const adminResult = await this.neo4j.run(
      `MATCH (u:User {tenantId: $tenantId}) WHERE u.id IN $adminIds RETURN u.id AS id, u.display_name AS name, u.username AS username`,
      { adminIds },
    );
    const adminMap = new Map();
    adminResult.records.forEach((r) => {
      adminMap.set(r.get('id'), r.get('name') || r.get('username') || 'Unknown Admin');
    });

    return {
      total,
      page,
      data: data.map((a) => ({
        id: a._id,
        title: a.title,
        description: a.description,
        event_date: a.event_date || null,
        media_url: a.media_url || null,
        media_type: a.media_type || null,
        created_by_admin: {
          id: a.created_by_admin,
          name: adminMap.get(a.created_by_admin) || 'Unknown Admin',
        },
        created_at: a.created_at,
      })),
    };
  }

  async getAnnouncementById(id: string) {
    const announcement = await this.announcementModel.findById(id).lean().exec();
    if (!announcement) {
      throw new NotFoundException('Announcement not found.');
    }

    const adminResult = await this.neo4j.run(
      `MATCH (u:User {id: $adminId, tenantId: $tenantId}) RETURN u.display_name AS name, u.username AS username`,
      { adminId: announcement.created_by_admin },
    );
    const adminName =
      adminResult.records[0]?.get('name') || adminResult.records[0]?.get('username') || 'Unknown Admin';

    return {
      id: announcement._id,
      title: announcement.title,
      description: announcement.description,
      event_date: announcement.event_date || null,
      media_url: announcement.media_url || null,
      media_type: announcement.media_type || null,
      created_by_admin: {
        id: announcement.created_by_admin,
        name: adminName,
      },
      created_at: announcement.created_at,
    };
  }

  async deleteAnnouncement(id: string) {
    const result = await this.announcementModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Announcement not found.');
    return { message: 'Announcement deleted successfully.' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event Moderation
  // ─────────────────────────────────────────────────────────────────────────

  async getAllEvents(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;
    let queryBase = '';
    const params: any = { skip, limit };

    if (search) {
      queryBase = `
        MATCH (e:Event {tenantId: $tenantId})
        WHERE (toLower(e.title) CONTAINS toLower($search) OR toLower(e.description) CONTAINS toLower($search))
          AND (e.is_deleted IS NULL OR e.is_deleted = false)
      `;
      params.search = search;
    } else {
      queryBase = `
        MATCH (e:Event {tenantId: $tenantId})
        WHERE (e.is_deleted IS NULL OR e.is_deleted = false)
      `;
    }

    const countResult = await this.neo4j.run(`${queryBase} RETURN count(e) AS total`, params);
    const total = this.toNum(countResult.records[0]?.get('total'));

    const result = await this.neo4j.run(
      `${queryBase}
       MATCH (u:User {tenantId: $tenantId})-[:CREATED_EVENT]->(e)
       RETURN e, u.display_name AS hosted_by, u.username AS host_username
       ORDER BY e.date DESC
       SKIP toInteger($skip) LIMIT toInteger($limit)`,
      params,
    );

    const data = (result.records || []).map((r) => {
      const event = r.get('e')?.properties || {};
      return {
        ...event,
        hosted_by: r.get('hosted_by') || null,
        host_username: r.get('host_username') || null,
        date: event.date
          ? typeof event.date === 'string'
            ? event.date
            : event.date.toString
              ? event.date.toString()
              : event.date
          : null,
        created_at: event.created_at
          ? typeof event.created_at === 'string'
            ? event.created_at
            : event.created_at.toString
              ? event.created_at.toString()
              : event.created_at
          : null,
      };
    });

    return { total, page, data };
  }

  async adminDeleteEvent(id: string) {
    const result = await this.neo4j.run(
      `MATCH (e:Event {id: $id, tenantId: $tenantId})
       SET e.is_deleted = true, e.deleted_at = datetime(), e.deleted_by = 'admin'
       RETURN count(e) AS cnt`,
      { id },
    );

    if (!result.records.length || this.toNum(result.records[0].get('cnt')) === 0) {
      throw new NotFoundException('Event not found.');
    }

    return { message: 'Event removed by administrator.' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Admin Profile & Staff Management
  // ─────────────────────────────────────────────────────────────────────────

  async getAdminProfile(adminId: string) {
    const tenantId = this.cls.get<string>('tenantId');
    if (tenantId) {
      try {
        const result = await this.neo4j.run(`MATCH (u:User {id: $adminId, tenantId: $tenantId}) RETURN u`, {
          adminId,
        });
        if (result.records && result.records.length > 0) {
          const u = result.records[0].get('u').properties;
          return {
            id: u.id,
            username: u.username,
            display_name: u.display_name,
            profile_picture: u.profile_picture || null,
            role: u.role,
          };
        }
      } catch {
        // Fallback below
      }
    }

    // Fallback to MongoDB (for super_admin or when Neo4j is offline/missing node)
    const auth = await this.userAuthModel
      .findOne({ userId: adminId, is_deleted: { $ne: true } })
      .setOptions({ skipTenantScope: true })
      .lean()
      .exec();

    if (auth) {
      return {
        id: auth.userId,
        username: auth.email.split('@')[0],
        display_name: auth.role === 'super_admin' ? 'Platform Super Admin' : 'Administrator',
        profile_picture: null,
        role: auth.role,
      };
    }

    throw new NotFoundException('Admin profile not found');
  }

  async updateAdminProfile(adminId: string, dto: UpdateAdminProfileDto, file?: Express.Multer.File) {
    let profile_picture: string | undefined;
    if (file) {
      const upload = await this.cloudinary.uploadFile(file);
      profile_picture = upload.secure_url;
    }

    const tenantId = this.cls.get<string>('tenantId');
    const setClauses: string[] = [];
    const params: any = { adminId };

    if (dto.username) {
      setClauses.push('u.username = $username');
      params.username = dto.username;
    }
    if (dto.display_name) {
      setClauses.push('u.display_name = $display_name');
      params.display_name = dto.display_name;
    }
    if (profile_picture) {
      setClauses.push('u.profile_picture = $profile_picture');
      params.profile_picture = profile_picture;
    }

    if (tenantId && setClauses.length > 0) {
      try {
        await this.neo4j.run(
          `MATCH (u:User {id: $adminId, tenantId: $tenantId}) SET ${setClauses.join(', ')}`,
          params,
        );
      } catch {
        // Neo4j update silently caught if offline
      }
    }

    return { message: 'Profile updated successfully' };
  }

  async createStaff(dto: CreateStaffDto) {
    // 1. Check uniqueness globally across all tenants
    const existing = await this.userAuthModel
      .findOne({ email: dto.email })
      .setOptions({ skipTenantScope: true });
    if (existing) throw new ConflictException('Email already in use');

    const neoExisting = await this.neo4j.run(
      `MATCH (u:User) WHERE u.username = $username OR u.email = $email RETURN u`,
      { username: dto.username, email: dto.email },
      { skipTenantScope: true },
    );
    if (neoExisting.records.length)
      throw new ConflictException('Username or Email already in use in profile system');

    const tenantId = this.cls.get<string>('tenantId');
    if (!tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 2. Create MongoDB Auth
    await this.userAuthModel.create({
      userId,
      tenantId,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
      account_status: 'approved',
    });

    // 3. Create Neo4j Profile
    await this.neo4j.run(
      `CREATE (u:User {
        id: $userId,
        tenantId: $tenantId,
        username: $username,
        display_name: $display_name,
        email: $email,
        role: $role,
        account_status: 'approved',
        created_at: datetime()
      })`,
      {
        userId,
        username: dto.username,
        display_name: dto.display_name,
        email: dto.email,
        role: dto.role,
      },
    );

    return { message: `${dto.role} created successfully`, userId };
  }

  async removeStaff(currentAdminId: string, staffId: string) {
    if (currentAdminId === staffId) throw new BadRequestException('You cannot remove yourself');

    const auth = await this.userAuthModel.findOne({ userId: staffId });
    if (!auth) throw new NotFoundException('Staff account not found');
    if (!['admin', 'moderator'].includes(auth.role))
      throw new BadRequestException('Can only remove staff accounts');

    await this.removeAccount(currentAdminId, staffId, 'Removed by Admin');

    return { message: 'Staff member removed successfully' };
  }

  async getStaffList() {
    const result = await this.neo4j.run(
      `MATCH (u:User {tenantId: $tenantId}) WHERE u.role IN ['admin', 'moderator'] AND (u.is_deleted IS NULL OR u.is_deleted = false)
       RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.role AS role, u.email AS email, u.profile_picture AS profile_picture`,
    );

    return result.records.map((r) => ({
      id: r.get('id'),
      username: r.get('username'),
      display_name: r.get('display_name'),
      role: r.get('role'),
      email: r.get('email'),
      profile_picture: r.get('profile_picture') || null,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Tenant Settings (Tenant Admin)
  // ─────────────────────────────────────────────────────────────────────────

  async getCurrentTenantSettings() {
    const tenantId = this.cls.get<string>('tenantId');
    if (!tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }
    const tenant = await this.tenantsService.getActiveTenantOrThrow(tenantId);
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      logo_url: tenant.logo_url || null,
      contact_email: tenant.contact_email || null,
      allowed_email_domains: tenant.allowed_email_domains || [],
      status: tenant.status,
    };
  }

  async updateCurrentTenantSettings(dto: UpdateTenantSettingsDto) {
    const tenantId = this.cls.get<string>('tenantId');
    if (!tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const updatePayload: Partial<Tenant> = {};
    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.logo_url !== undefined) updatePayload.logo_url = dto.logo_url;
    if (dto.contact_email !== undefined) updatePayload.contact_email = dto.contact_email;
    if (dto.allowed_email_domains !== undefined) {
      updatePayload.allowed_email_domains = dto.allowed_email_domains.map((d) => d.toLowerCase().trim());
    }

    const updated = await this.tenantModel
      .findOneAndUpdate({ id: tenantId }, { $set: updatePayload }, { new: true })
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('Tenant not found');
    }

    this.tenantsService.invalidate(tenantId);

    return {
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      logo_url: updated.logo_url || null,
      contact_email: updated.contact_email || null,
      allowed_email_domains: updated.allowed_email_domains || [],
      status: updated.status,
    };
  }
}
