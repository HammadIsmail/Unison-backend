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
  ) { }

  async getPendingAccounts() {
    const result = await this.neo4j.run(
      `MATCH (u:User {account_status: 'pending'})
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

    // 2. Update MongoDB
    await this.userAuthModel.findOneAndUpdate({ userId: id }, { account_status: 'approved' });

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

    // 2. Update MongoDB
    await this.userAuthModel.findOneAndUpdate(
      { userId: id }, 
      { account_status: 'rejected', rejection_reason: dto.rejection_reason }
    );

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

    // 2. Update MongoDB Role
    await this.userAuthModel.findOneAndUpdate({ userId: id }, { role: 'alumni' });

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
    const totalAlumniResult = await this.neo4j.run(`MATCH (u:User {role: 'alumni', account_status: 'approved'}) RETURN count(u) AS count`);
    const totalStudentsResult = await this.neo4j.run(`MATCH (u:User {role: 'student', account_status: 'approved'}) RETURN count(u) AS count`);
    const pendingAccountsResult = await this.neo4j.run(`MATCH (u:User {account_status: 'pending'}) RETURN count(u) AS count`);
    const totalOpportunitiesResult = await this.neo4j.run(`MATCH (o:Opportunity) RETURN count(o) AS count`);

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

  async getAllAlumni(page: number, limit: number, search: string) {
    const skip = (page - 1) * limit;

    const searchCondition = search
      ? `AND toLower(u.display_name) CONTAINS toLower($search)`
      : '';

    const countResult = await this.neo4j.run(
      `MATCH (u:User {role: 'alumni', account_status: 'approved'})
       WHERE 1=1 ${searchCondition}
       RETURN count(u) AS total`,
      { search }
    );
    const total = countResult.records[0]?.get('total').toNumber() || 0;

    const result = await this.neo4j.run(
      `MATCH (u:User {role: 'alumni', account_status: 'approved'})
       WHERE 1=1 ${searchCondition}
       OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
       RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.email AS email, u.phone AS phone, u.bio AS bio,
              w.company_name AS company, w.role AS role, u.graduation_year AS graduation_year, u.degree AS degree,
              u.batch AS batch, u.linkedin_url AS linkedin_url, u.profile_picture AS profile_picture, u.created_at AS created_at
       ORDER BY u.created_at DESC
       SKIP toInteger($skip) LIMIT toInteger($limit)`,
      { search, skip, limit }
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

    const searchCondition = search
      ? `AND toLower(u.display_name) CONTAINS toLower($search)`
      : '';

    const countResult = await this.neo4j.run(
      `MATCH (u:User {role: 'student', account_status: 'approved'})
       WHERE 1=1 ${searchCondition}
       RETURN count(u) AS total`,
      { search }
    );
    const total = countResult.records[0]?.get('total').toNumber() || 0;

    const result = await this.neo4j.run(
      `MATCH (u:User {role: 'student', account_status: 'approved'})
       WHERE 1=1 ${searchCondition}
       RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.email AS email, u.phone AS phone, u.bio AS bio,
              u.roll_number AS roll_number, u.semester AS semester, u.degree AS degree, u.batch AS batch,
              u.profile_picture AS profile_picture, u.created_at AS created_at
       ORDER BY u.created_at DESC
       SKIP toInteger($skip) LIMIT toInteger($limit)`,
      { search, skip, limit }
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
    // 1. Fetch user profile picture and opportunity media
    const mediaResult = await this.neo4j.run(
      `MATCH (u:User {id: $id})
       OPTIONAL MATCH (u)-[:POSTED]->(o:Opportunity)
       RETURN u.profile_picture AS profile_pic, collect(o.media) AS opp_media`,
      { id }
    );

    if (mediaResult.records.length > 0) {
      const profilePic = mediaResult.records[0].get('profile_pic');
      const oppMediaArrays = mediaResult.records[0].get('opp_media');

      // Delete profile picture
      if (profilePic) {
        const publicId = this.cloudinary.extractPublicIdFromUrl(profilePic);
        if (publicId) await this.cloudinary.deleteImage(publicId);
      }

      // Delete opportunity media
      for (const mediaArray of oppMediaArrays) {
        if (Array.isArray(mediaArray)) {
          for (const url of mediaArray) {
            const publicId = this.cloudinary.extractPublicIdFromUrl(url);
            if (publicId) await this.cloudinary.deleteImage(publicId);
          }
        }
      }
    }

    // 2. Comprehensive Neo4j Delete
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id})
       OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience)
       OPTIONAL MATCH (u)-[:POSTED]->(o:Opportunity)
       DETACH DELETE u, w, o
       RETURN count(u) as deleted`,
      { id }
    );

    // 3. Delete from MongoDB
    await this.userAuthModel.deleteOne({ userId: id });

    const deleted = result.records[0]?.get('deleted').toNumber() || 0;
    if (deleted === 0) {
      throw new NotFoundException('Account not found.');
    }

    return { message: 'Account and all associated data removed successfully.' };
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
}
