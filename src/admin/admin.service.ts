import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Neo4jService } from '../neo4j/neo4j.service';
import { MailService } from '../common/mail/mail.service';
import { RejectAccountDto, RejectUpgradeDto } from './dto/admin.dto';
import { ActivityService, ActivityType } from '../common/activity/activity.service';
import { NotificationService } from '../notification/notification.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UserAuth } from '../auth/schemas/user-auth.schema';
import { OTPRecord } from '../auth/schemas/otp.schema';
import { Activity } from '../common/activity/schemas/activity.schema';
import { Message } from '../chat/schemas/message.schema';
import { Conversation } from '../chat/schemas/conversation.schema';

@Injectable()
export class AdminService {
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
  ) { }

  async getPendingAccounts() {
    const result = await this.neo4j.run(
      `MATCH (u:User {account_status: 'pending'})
       WHERE u.is_deleted IS NULL OR u.is_deleted = false
       RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.email AS email, u.role AS role, u.created_at AS registered_at, u.profile_picture AS profile_picture, u.student_card_url AS student_card_url`
    );

    return result.records.map((record) => ({
      id: record.get('id'),
      username: record.get('username'),
      display_name: record.get('display_name'),
      email: record.get('email'),
      role: record.get('role'),
      registered_at: record.get('registered_at'),
      profile_picture: record.get('profile_picture') || null,
      student_card_url: record.get('student_card_url') || null,
    }));
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
        created_at: record.get('created_at'),
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
        created_at: record.get('created_at'),
      };
    });

    return { total, page, data };
  }

  async removeAccount(id: string) {
    const now = new Date().toISOString();

    // 1. Soft Delete in Neo4j
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id})
       OPTIONAL MATCH (u)-[:POSTED]->(o:Opportunity)
       SET u.is_deleted = true, u.deleted_at = $now, o.is_deleted = true
       RETURN count(u) as updated`,
      { id, now }
    );

    // 2. Soft Delete in MongoDB
    await this.userAuthModel.updateOne(
      { userId: id },
      { is_deleted: true, deleted_at: new Date() }
    );

    const updated = result.records[0]?.get('updated').toNumber() || 0;
    if (updated === 0) {
      throw new NotFoundException('Account not found.');
    }

    return { message: 'Account has been soft-deleted. Historical data is preserved.' };
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

  async getRecentActivity(limit: number = 10) {
    const activities = await this.activityModel
      .find()
      .sort({ created_at: -1 })
      .limit(limit)
      .exec();

    return activities.map((a) => ({
      id: a._id,
      type: a.type,
      description: a.description,
      created_at: a.created_at,
    }));
  }

  async getAdvancedAnalytics() {
    const [
      skillGap,
      growth,
      engagement,
      departmental,
      alignment,
      mentorship
    ] = await Promise.all([
      this.getSkillGapAnalysis(),
      this.getGrowthMetrics(),
      this.getEngagementMetrics(),
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
    supplyResult.records.forEach(r => supplyMap.set(r.get('skill'), r.get('supply').toNumber()));

    return demandResult.records.map(r => {
      const skill = r.get('skill');
      const demand = r.get('demand').toNumber();
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

  async getGrowthMetrics() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const growth = await this.userAuthModel.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
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

  async getEngagementMetrics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const messageCount = await this.messageModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const activeConversations = await this.conversationModel.countDocuments({ updatedAt: { $gte: thirtyDaysAgo } });

    const connectionResult = await this.neo4j.run(`
      MATCH ()-[r:CONNECTED_TO]->()
      WHERE r.created_at >= $thirtyDaysAgo OR (r.status = 'pending' AND r.updated_at >= $thirtyDaysAgo)
      RETURN count(r) AS count
    `, { thirtyDaysAgo: thirtyDaysAgo.toISOString() });

    return {
      messages_last_30_days: messageCount,
      active_conversations: activeConversations,
      connections_activity: connectionResult.records[0].get('count').toNumber()
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

    return result.records.map(r => ({
      degree: r.get('degree'),
      student_count: r.get('student_count').toNumber(),
      top_skills: r.get('top_skills')
    }));
  }

  async getCurriculumAlignmentScore() {
    const result = await this.neo4j.run(`
      MATCH (o:Opportunity)-[:REQUIRES_SKILL]->(s:Skill)
      WITH s, count(o) AS demand
      MATCH (u:User)-[:HAS_SKILL]->(s)
      WITH demand, count(u) AS supply
      RETURN sum(demand * supply) / (sum(demand) * sum(supply) + 1) * 100 AS score
    `);

    return {
      overall_alignment_score: Math.min(100, Math.round(result.records[0].get('score') || 0))
    };
  }

  async getAlumniMentorshipIndex() {
    const result = await this.neo4j.run(`
      MATCH (a:User {role: 'alumni'})-[:CONNECTED_TO {status: 'accepted'}]-(s:User {role: 'student'})
      RETURN count(DISTINCT a) AS active_mentors, count(DISTINCT s) AS mentored_students, count(*) AS total_interactions
    `);

    const records = result.records[0];
    return {
      active_mentors: records.get('active_mentors').toNumber(),
      mentored_students: records.get('mentored_students').toNumber(),
      interaction_density: records.get('total_interactions').toNumber()
    };
  }
}
