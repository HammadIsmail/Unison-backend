import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Neo4jService } from '../neo4j/neo4j.service';
import { MailService } from '../common/mail/mail.service';
import { RejectAccountDto, RejectUpgradeDto } from './dto/admin.dto';
import { CreateAnnouncementDto } from './dto/admin-request.dto';
import { ActivityService, ActivityType } from '../common/activity/activity.service';
import { NotificationService } from '../notification/notification.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UserAuth } from '../auth/schemas/user-auth.schema';
import { OTPRecord } from '../auth/schemas/otp.schema';
import { Activity } from '../common/activity/schemas/activity.schema';
import { Message } from '../chat/schemas/message.schema';
import { Conversation } from '../chat/schemas/conversation.schema';
import { Announcement } from './schemas/announcement.schema';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly mail: MailService,
    private readonly activity: ActivityService,
    private readonly notification: NotificationService,
    private readonly cloudinary: CloudinaryService,
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
  ) { }

  async getPendingAccounts() {
    const result = await this.neo4j.run(
      `MATCH (u:User {account_status: 'pending'})
       WHERE u.is_deleted IS NULL OR u.is_deleted = false
       RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.email AS email, u.role AS role, u.created_at AS registered_at, u.profile_picture AS profile_picture, u.student_card_url AS student_card_url`
    );

    return result.records.map((record) => {
      const registeredAt = record.get('registered_at');
      return {
        id: record.get('id'),
        username: record.get('username'),
        display_name: record.get('display_name'),
        email: record.get('email'),
        role: record.get('role'),
        registered_at: registeredAt ? (typeof registeredAt === 'string' ? registeredAt : (registeredAt.toString ? registeredAt.toString() : registeredAt)) : null,
        profile_picture: record.get('profile_picture') || null,
        student_card_url: record.get('student_card_url') || null,
      };
    });
  }

  async approveAccount(id: string) {
    // 1. Update Neo4j
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id})
       SET u.account_status = 'approved'
       RETURN u`,
      { id }
    );

    if (!result.records.length) {
      throw new NotFoundException('Account not found in Neo4j.');
    }

    try {
      // 2. Update MongoDB
      await this.userAuthModel.findOneAndUpdate({ userId: id }, { account_status: 'approved' });
    } catch (error) {
      // Rollback Neo4j
      await this.neo4j.run(
        `MATCH (u:User {id: $id}) SET u.account_status = 'pending'`,
        { id }
      );
      throw error;
    }

    const user = result.records[0].get('u').properties;
    await this.mail.sendApprovalEmail(user.email, user.display_name || user.username);

    await this.activity.logActivity(
      ActivityType.ACCOUNT_APPROVED,
      `Account approved for ${user.display_name || user.username}`,
      id
    );

    await this.notification.createNotification(
      id,
      'Your account has been approved by the admin. Welcome to UNISON!',
      'account_approved',
      {
        sender_display_name: 'UNISON Administration',
        reference_link: '/'
      }
    );

    return { message: 'Account approved. Email sent to user.' };
  }

  async rejectAccount(id: string, dto: RejectAccountDto) {
    // 1. Update Neo4j
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id})
       SET u.account_status = 'rejected'
       RETURN u`,
      { id }
    );

    if (!result.records.length) {
      throw new NotFoundException('Account not found in Neo4j.');
    }

    try {
      // 2. Update MongoDB
      await this.userAuthModel.findOneAndUpdate(
        { userId: id }, 
        { account_status: 'rejected', rejection_reason: dto.rejection_reason }
      );
    } catch (error) {
      // Rollback Neo4j
      await this.neo4j.run(
        `MATCH (u:User {id: $id}) SET u.account_status = 'pending'`,
        { id }
      );
      throw error;
    }

    const user = result.records[0].get('u').properties;
    await this.mail.sendRejectionEmail(user.email, user.display_name || user.username, dto.rejection_reason);

    await this.notification.createNotification(
      id,
      `Your account request was rejected. Reason: ${dto.rejection_reason}`,
      'account_rejected',
      {
        sender_display_name: 'UNISON Administration'
      }
    );

    return { message: 'Account rejected. Email sent to user.' };
  }

  async bulkApproveAccounts(ids: string[]) {
    const results = await Promise.allSettled(ids.map(id => this.approveAccount(id)));
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { 
      message: `Bulk approval complete. ${succeeded} succeeded, ${failed} failed.`,
      succeeded,
      failed
    };
  }

  async bulkRejectAccounts(ids: string[], reason: string) {
    const results = await Promise.allSettled(ids.map(id => this.rejectAccount(id, { rejection_reason: reason })));
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { 
      message: `Bulk rejection complete. ${succeeded} succeeded, ${failed} failed.`,
      succeeded,
      failed
    };
  }

  async getPendingUpgrades() {
    const result = await this.neo4j.run(
      `MATCH (u:User {role: 'student', upgrade_status: 'pending'})
       WHERE u.is_deleted IS NULL OR u.is_deleted = false
       RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.email AS email, u.roll_number AS roll_number, u.upgrade_status AS upgrade_status, u.profile_picture AS profile_picture, u.graduation_year AS graduation_year`
    );

    return result.records.map((record) => ({
      id: record.get('id'),
      username: record.get('username'),
      display_name: record.get('display_name'),
      email: record.get('email'),
      roll_number: record.get('roll_number') || null,
      graduation_year: typeof record.get('graduation_year')?.toNumber === 'function' ? record.get('graduation_year').toNumber() : record.get('graduation_year') || null,
      upgrade_status: record.get('upgrade_status'),
      profile_picture: record.get('profile_picture') || null,
    }));
  }

  async approveUpgrade(id: string) {
    // 1. Update Neo4j
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id, role: 'student', upgrade_status: 'pending'})
       SET u.role = 'alumni'
       REMOVE u.upgrade_status, u.upgrade_rejection_reason
       RETURN u`,
      { id }
    );

    if (!result.records.length) {
      throw new NotFoundException('Pending upgrade request not found for this user.');
    }

    try {
      // 2. Update MongoDB Role
      await this.userAuthModel.findOneAndUpdate({ userId: id }, { role: 'alumni' });
    } catch (error) {
      // Rollback Neo4j
      await this.neo4j.run(
        `MATCH (u:User {id: $id}) 
         SET u.role = 'student', u.upgrade_status = 'pending'`,
        { id }
      );
      throw error;
    }

    const user = result.records[0].get('u').properties;
    await this.mail.sendUpgradeApprovalEmail(user.email, user.display_name || user.username);

    await this.activity.logActivity(
      ActivityType.PROFILE_UPDATED,
      `Profile upgraded to Alumni for ${user.display_name || user.username}`,
      id
    );

    await this.notification.createNotification(
      id,
      'Congratulations! Your request to upgrade to an Alumni profile has been approved.',
      'profile_upgraded',
      {
        sender_display_name: 'UNISON Administration',
        reference_link: '/'
      }
    );

    return { message: 'Profile upgraded successfully. Email sent to user.' };
  }

  async rejectUpgrade(id: string, dto: RejectUpgradeDto) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id, role: 'student', upgrade_status: 'pending'})
       SET u.upgrade_status = 'rejected', u.upgrade_rejection_reason = $reason
       RETURN u`,
      { id, reason: dto.rejection_reason }
    );

    if (!result.records.length) {
      throw new NotFoundException('Pending upgrade request not found for this user.');
    }

    const user = result.records[0].get('u').properties;
    await this.mail.sendUpgradeRejectionEmail(user.email, user.display_name || user.username, dto.rejection_reason);

    await this.notification.createNotification(
      id,
      `Your request to upgrade to an Alumni profile was rejected. Reason: ${dto.rejection_reason}`,
      'upgrade_rejected',
      {
        sender_display_name: 'UNISON Administration'
      }
    );

    return { message: 'Upgrade request rejected. Email sent to user.' };
  }

  async getDashboardStats() {
    const totalAlumniResult = await this.neo4j.run(`MATCH (u:User {role: 'alumni', account_status: 'approved'}) WHERE u.is_deleted IS NULL OR u.is_deleted = false RETURN count(u) AS count`);
    const totalStudentsResult = await this.neo4j.run(`MATCH (u:User {role: 'student', account_status: 'approved'}) WHERE u.is_deleted IS NULL OR u.is_deleted = false RETURN count(u) AS count`);
    const pendingAccountsResult = await this.neo4j.run(`MATCH (u:User {account_status: 'pending'}) WHERE u.is_deleted IS NULL OR u.is_deleted = false RETURN count(u) AS count`);
    const totalOpportunitiesResult = await this.neo4j.run(`MATCH (o:Opportunity) WHERE o.is_deleted IS NULL OR o.is_deleted = false RETURN count(o) AS count`);

    // Most common skills
    const skillsResult = await this.neo4j.run(`
      MATCH (u:User)-[:HAS_SKILL]->(s:Skill)
      RETURN s.name AS skill, count(u) AS frequency
      ORDER BY frequency DESC LIMIT 3
    `);

    const totalCompaniesResult = await this.neo4j.run(`MATCH (w:WorkExperience) RETURN count(DISTINCT w.company_name) AS count`);

    return {
      total_alumni: typeof totalAlumniResult.records[0]?.get('count').toNumber === 'function' ? totalAlumniResult.records[0]?.get('count').toNumber() : totalAlumniResult.records[0]?.get('count') || 0,
      total_students: typeof totalStudentsResult.records[0]?.get('count').toNumber === 'function' ? totalStudentsResult.records[0]?.get('count').toNumber() : totalStudentsResult.records[0]?.get('count') || 0,
      pending_accounts: typeof pendingAccountsResult.records[0]?.get('count').toNumber === 'function' ? pendingAccountsResult.records[0]?.get('count').toNumber() : pendingAccountsResult.records[0]?.get('count') || 0,
      total_opportunities: typeof totalOpportunitiesResult.records[0]?.get('count').toNumber === 'function' ? totalOpportunitiesResult.records[0]?.get('count').toNumber() : totalOpportunitiesResult.records[0]?.get('count') || 0,
      total_companies: typeof totalCompaniesResult.records[0]?.get('count').toNumber === 'function' ? totalCompaniesResult.records[0]?.get('count').toNumber() : totalCompaniesResult.records[0]?.get('count') || 0,
      most_common_skills: skillsResult.records.map((r) => r.get('skill')),
    };
  }

  private prepareLuceneQuery(q: string): string {
    if (!q) return '';
    return q.trim().split(/\s+/).map(word => `${word}~`).join(' AND ');
  }

  async getAllAlumni(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;
    let queryBase = '';
    const params: any = { skip, limit };

    if (search) {
      const luceneQ = this.prepareLuceneQuery(search);
      queryBase = `
        CALL db.index.fulltext.queryNodes("user_search_index", "${luceneQ}") YIELD node AS u, score
        WHERE u.role = 'alumni' AND u.account_status = 'approved' AND (u.is_deleted IS NULL OR u.is_deleted = false)
      `;
    } else {
      queryBase = `
        MATCH (u:User {role: 'alumni', account_status: 'approved'})
        WHERE (u.is_deleted IS NULL OR u.is_deleted = false)
      `;
    }

    const countResult = await this.neo4j.run(
      `${queryBase} RETURN count(u) AS total`,
      params
    );
    const total = countResult.records[0]?.get('total').toNumber() || 0;

    const result = await this.neo4j.run(
      `${queryBase}
       OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
       RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.email AS email, u.phone AS phone, u.bio AS bio,
              w.company_name AS company, w.role AS role, u.graduation_year AS graduation_year, u.degree AS degree,
              u.batch AS batch, u.linkedin_url AS linkedin_url, u.profile_picture AS profile_picture, u.created_at AS created_at
       ORDER BY u.created_at DESC
       SKIP toInteger($skip) LIMIT toInteger($limit)`,
      params
    );

    const data = result.records.map((record) => {
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
        graduation_year: typeof record.get('graduation_year')?.toNumber === 'function' ? record.get('graduation_year').toNumber() : record.get('graduation_year') || null,
        degree: record.get('degree') || null,
        batch: batch,
        linkedin_url: record.get('linkedin_url') || null,
        profile_picture: record.get('profile_picture') || null,
        created_at: createdAt ? (typeof createdAt === 'string' ? createdAt : (createdAt.toString ? createdAt.toString() : createdAt)) : null,
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
        WHERE u.role = 'student' AND u.account_status = 'approved' AND (u.is_deleted IS NULL OR u.is_deleted = false)
      `;
    } else {
      queryBase = `
        MATCH (u:User {role: 'student', account_status: 'approved'})
        WHERE (u.is_deleted IS NULL OR u.is_deleted = false)
      `;
    }

    const countResult = await this.neo4j.run(
      `${queryBase} RETURN count(u) AS total`,
      params
    );
    const total = countResult.records[0]?.get('total').toNumber() || 0;

    const result = await this.neo4j.run(
      `${queryBase}
       RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.email AS email, u.phone AS phone, u.bio AS bio,
              u.roll_number AS roll_number, u.semester AS semester, u.degree AS degree, u.batch AS batch,
              u.profile_picture AS profile_picture, u.created_at AS created_at
       ORDER BY u.created_at DESC
       SKIP toInteger($skip) LIMIT toInteger($limit)`,
      params
    );

    const data = result.records.map((record) => {
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
        semester: typeof record.get('semester')?.toNumber === 'function' ? record.get('semester').toNumber() : record.get('semester') || null,
        degree: record.get('degree') || null,
        batch: batch,
        profile_picture: record.get('profile_picture') || null,
        created_at: createdAt ? (typeof createdAt === 'string' ? createdAt : (createdAt.toString ? createdAt.toString() : createdAt)) : null,
      };
    });

    return { total, page, data };
  }

  async removeAccount(adminId: string, id: string, reason?: string) {
    const now = new Date();
    const nowIso = now.toISOString();

    // ── Phase 1: Soft-delete in Neo4j ────────────────────────────────────────
    const neo4jResult = await this.neo4j.run(
      `MATCH (u:User {id: $id})
       OPTIONAL MATCH (u)-[:POSTED]->(o:Opportunity)
       SET u.is_deleted = true, u.deleted_at = $now,
           o.is_deleted = true
       RETURN count(u) AS updated`,
      { id, now: nowIso }
    );

    const updated = neo4jResult.records[0]?.get('updated').toNumber() ?? 0;
    if (updated === 0) throw new NotFoundException('Account not found.');

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
        }
      );
    } catch (mongoError) {
      // Compensation: revert Neo4j soft-delete to keep both DBs consistent
      this.logger.error(
        `MongoDB soft-delete failed for user ${id} — reverting Neo4j. Error: ${mongoError.message}`,
      );
      await this.neo4j.run(
        `MATCH (u:User {id: $id})
         OPTIONAL MATCH (u)-[:POSTED]->(o:Opportunity)
         REMOVE u.is_deleted, u.deleted_at, o.is_deleted`,
        { id }
      ).catch((revertErr) =>
        this.logger.error(`Neo4j revert also failed for user ${id}: ${revertErr.message}`)
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
      `MATCH (u:User {id: $userId})
       OPTIONAL MATCH (u)-[:POSTED]->(o:Opportunity)
       REMOVE u.is_deleted, u.deleted_at
       SET o.is_deleted = false
       RETURN count(u) AS restored`,
      { userId }
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
        }
      );
    } catch (mongoError) {
      // Compensation: re-apply soft-delete in Neo4j to stay consistent
      this.logger.error(
        `MongoDB restore failed for user ${userId} — reverting Neo4j. Error: ${mongoError.message}`,
      );
      await this.neo4j.run(
        `MATCH (u:User {id: $userId})
         SET u.is_deleted = true, u.deleted_at = $now`,
        { userId, now: nowIso }
      ).catch((revertErr) =>
        this.logger.error(`Neo4j re-delete revert also failed for ${userId}: ${revertErr.message}`)
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

  async requestEmailChange(newEmail: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await this.otpModel.findOneAndUpdate(
      { email: newEmail, type: 'admin_email_change' },
      { otp, expires_at: expiresAt, verified: false },
      { upsert: true, new: true }
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
      `MATCH (u:User {id: $adminId, role: 'admin'})
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
        MATCH (o:Opportunity)
        WHERE (o.title CONTAINS $search OR o.description CONTAINS $search OR o.company_name CONTAINS $search)
          AND (o.is_deleted IS NULL OR o.is_deleted = false)
      `;
      params.search = search;
    } else {
      queryBase = `
        MATCH (o:Opportunity)
        WHERE (o.is_deleted IS NULL OR o.is_deleted = false)
      `;
    }

    const countResult = await this.neo4j.run(`${queryBase} RETURN count(o) AS total`, params);
    const total = countResult.records[0].get('total').toNumber();

    const result = await this.neo4j.run(
      `${queryBase}
       MATCH (u:User)-[:POSTED]->(o)
       RETURN o, u.display_name AS posted_by, u.username AS poster_username
       ORDER BY o.created_at DESC
       SKIP toInteger($skip) LIMIT toInteger($limit)`,
      params
    );

    const data = result.records.map(r => {
      const opp = r.get('o').properties;
      return {
        ...opp,
        posted_by: r.get('posted_by'),
        poster_username: r.get('poster_username'),
        // Ensure posted_at is an ISO string even if it's a Neo4j date object
        posted_at: opp.posted_at ? (typeof opp.posted_at === 'string' ? opp.posted_at : (opp.posted_at.toString ? opp.posted_at.toString() : opp.posted_at)) : null,
        // Ensure deadline is handled similarly if needed
        deadline: opp.deadline ? (typeof opp.deadline === 'string' ? opp.deadline : (opp.deadline.toString ? opp.deadline.toString() : opp.deadline)) : null,
      };
    });

    return { total, page, data };
  }

  async adminDeleteOpportunity(id: string) {
    const result = await this.neo4j.run(
      `MATCH (o:Opportunity {id: $id})
       SET o.is_deleted = true, o.deleted_at = datetime(), o.deleted_by = 'admin'
       RETURN count(o) AS cnt`,
      { id }
    );

    if (result.records[0].get('cnt').toNumber() === 0) {
      throw new NotFoundException('Opportunity not found.');
    }

    return { message: 'Opportunity removed by administrator.' };
  }

  async exportUsersToCsv(role: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {role: $role, account_status: 'approved'})
       WHERE u.is_deleted IS NULL OR u.is_deleted = false
       RETURN u.display_name AS name, u.email AS email, u.batch AS batch, u.degree AS degree, u.created_at AS joined`,
      { role }
    );

    let csv = 'Name,Email,Batch,Degree,JoinedAt\n';
    result.records.forEach(r => {
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
      related_id: a.related_id
    }));
  }

  async getAdvancedAnalytics(from?: string, to?: string) {
    try {
      const fromDate = from && !isNaN(Date.parse(from)) ? new Date(from) : undefined;
      const toDate = to && !isNaN(Date.parse(to)) ? new Date(to) : undefined;

      const [
        skillGap,
        growth,
        engagement,
        departmental,
        alignment,
        mentorship
      ] = await Promise.all([
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
      console.error('Error fetching advanced analytics:', error);
      throw new BadRequestException('Failed to fetch analytics. Ensure date formats are correct (YYYY-MM-DD).');
    }
  }

  async getSkillGapAnalysis() {
    // 1. Skills in Demand (Opportunities)
    const demandResult = await this.neo4j.run(`
      MATCH (o:Opportunity)-[:REQUIRES_SKILL]->(s:Skill)
      WHERE o.is_deleted IS NULL OR o.is_deleted = false
      RETURN s.name AS skill, count(o) AS demand
      ORDER BY demand DESC LIMIT 10
    `);

    // 2. Skills in Supply (Users)
    const supplyResult = await this.neo4j.run(`
      MATCH (u:User)-[:HAS_SKILL]->(s:Skill)
      WHERE u.account_status = 'approved' AND (u.is_deleted IS NULL OR u.is_deleted = false)
      RETURN s.name AS skill, count(u) AS supply
    `);

    const supplyMap = new Map();
    supplyResult.records.forEach(r => {
      const supply = r.get('supply');
      supplyMap.set(r.get('skill'), (supply?.toNumber ? supply.toNumber() : Number(supply || 0)));
    });

    return demandResult.records.map(r => {
      const skill = r.get('skill');
      const rawDemand = r.get('demand');
      const demand = rawDemand?.toNumber ? rawDemand.toNumber() : Number(rawDemand || 0);
      const supply = supplyMap.get(skill) || 0;
      return {
        skill,
        demand,
        supply,
        gap: Math.max(0, demand - supply),
        priority: demand > supply * 2 ? 'High' : 'Medium'
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
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    return growth.map(g => ({
      month: `${g._id.year}-${String(g._id.month).padStart(2, '0')}`,
      signups: g.count
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

    const connectionResult = await this.neo4j.run(`
      MATCH ()-[r:CONNECTED_TO]->()
      WHERE r.created_at >= $from OR (r.status = 'pending' AND r.updated_at >= $from)
      ${to ? 'AND r.created_at <= $to' : ''}
      RETURN count(r) AS count
    `, { from: fromDate.toISOString(), to: to ? to.toISOString() : undefined });

    return {
      messages_last_30_days: messageCount,
      active_conversations: activeConversations,
      connections_activity: connectionResult.records[0]?.get('count').toNumber() || 0
    };
  }

  async getDepartmentalAnalysis() {
    const result = await this.neo4j.run(`
      MATCH (u:User)
      WHERE u.degree IS NOT NULL AND u.account_status = 'approved'
      OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)
      RETURN u.degree AS degree, count(u) AS student_count, collect(DISTINCT s.name)[0..3] AS top_skills
      ORDER BY student_count DESC
    `);

    return result.records.map(r => {
      const studentCount = r.get('student_count');
      return {
        degree: r.get('degree'),
        student_count: (studentCount?.toNumber ? studentCount.toNumber() : Number(studentCount || 0)),
        top_skills: r.get('top_skills')
      };
    });
  }

  async getCurriculumAlignmentScore() {
    const result = await this.neo4j.run(`
      MATCH (o:Opportunity)-[:REQUIRES_SKILL]->(s:Skill)
      WITH s, count(o) AS demand
      MATCH (u:User)-[:HAS_SKILL]->(s)
      WITH demand, count(u) AS supply
      RETURN sum(demand * supply) / (sum(demand) * sum(supply) + 1) * 100 AS score
    `);

    const rawScore = result.records[0]?.get('score');
    const score = (rawScore && typeof rawScore === 'object' && 'toNumber' in rawScore) 
      ? rawScore.toNumber() 
      : Number(rawScore || 0);

    return {
      overall_alignment_score: Math.min(100, Math.round(score))
    };
  }

  async getAlumniMentorshipIndex() {
    const result = await this.neo4j.run(`
      MATCH (a:User {role: 'alumni'})-[:CONNECTED_TO {status: 'accepted'}]-(s:User {role: 'student'})
      RETURN count(DISTINCT a) AS active_mentors, count(DISTINCT s) AS mentored_students, count(*) AS total_interactions
    `);

    const records = result.records[0];
    if (!records) {
      return {
        active_mentors: 0,
        mentored_students: 0,
        interaction_density: 0
      };
    }
    const active_mentors = records.get('active_mentors');
    const mentored_students = records.get('mentored_students');
    const total_interactions = records.get('total_interactions');

    return {
      active_mentors: (active_mentors?.toNumber ? active_mentors.toNumber() : Number(active_mentors || 0)),
      mentored_students: (mentored_students?.toNumber ? mentored_students.toNumber() : Number(mentored_students || 0)),
      interaction_density: (total_interactions?.toNumber ? total_interactions.toNumber() : Number(total_interactions || 0))
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
    const announcement = await this.announcementModel.create({
      title: dto.title,
      description: dto.description,
      event_date: dto.event_date,
      media_url,
      media_type,
      created_by_admin: adminId,
    }) as Announcement;

    // Fetch all approved user IDs from Neo4j
    const result = await this.neo4j.run(
      `MATCH (u:User {account_status: 'approved'})
       WHERE u.is_deleted IS NULL OR u.is_deleted = false
       RETURN u.id AS id`,
    );
    const userIds: string[] = result.records.map(r => r.get('id'));

    // Broadcast notification to each user (fire-and-forget, non-blocking)
    const notifMessage = dto.event_date
      ? `📢 ${dto.title} — ${dto.description} (Event: ${new Date(dto.event_date).toLocaleDateString()})`
      : `📢 ${dto.title} — ${dto.description}`;

    await Promise.allSettled(
      userIds.map(userId =>
        this.notification.createNotification(userId, notifMessage, 'announcement', {
          sender_display_name: 'UNISON Administration',
          reference_link: `/announcements/${announcement._id}`,
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

    return {
      total,
      page,
      data: data.map(a => ({
        id: a._id,
        title: a.title,
        description: a.description,
        event_date: a.event_date || null,
        media_url: a.media_url || null,
        media_type: a.media_type || null,
        created_by_admin: a.created_by_admin,
        created_at: a.created_at,
      })),
    };
  }

  async deleteAnnouncement(id: string) {
    const result = await this.announcementModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Announcement not found.');
    return { message: 'Announcement deleted successfully.' };
  }
}
