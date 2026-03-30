import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { MailService } from '../common/mail/mail.service';
import { RejectAccountDto } from './dto/admin.dto';
import { ActivityService, ActivityType } from '../common/activity/activity.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly mail: MailService,
    private readonly activity: ActivityService,
    private readonly notification: NotificationService,
  ) { }

  async getPendingAccounts() {
    const result = await this.neo4j.run(
      `MATCH (u:User {account_status: 'pending'})
       RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.email AS email, u.role AS role, u.created_at AS registered_at, u.profile_picture AS profile_picture`
    );

    return result.records.map((record) => ({
      id: record.get('id'),
      username: record.get('username'),
      display_name: record.get('display_name'),
      email: record.get('email'),
      role: record.get('role'),
      registered_at: record.get('registered_at'),
      profile_picture: record.get('profile_picture') || null,
    }));
  }

  async approveAccount(id: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id})
       SET u.account_status = 'approved'
       RETURN u`,
      { id }
    );

    if (!result.records.length) {
      throw new NotFoundException('Account not found or role mismatch.');
    }

    const user = result.records[0].get('u').properties;
    await this.mail.sendApprovalEmail(user.email, user.display_name || user.name);

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
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id})
       SET u.account_status = 'rejected'
       RETURN u`,
      { id }
    );

    if (!result.records.length) {
      throw new NotFoundException('Account not found or role mismatch.');
    }

    const user = result.records[0].get('u').properties;
    await this.mail.sendRejectionEmail(user.email, user.name, dto.rejection_reason);

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

  async getDashboardStats() {
    const totalAlumniResult = await this.neo4j.run(`MATCH (u:User {role: 'alumni', account_status: 'approved'}) RETURN count(u) AS count`);
    const totalStudentsResult = await this.neo4j.run(`MATCH (u:User {role: 'student', account_status: 'approved'}) RETURN count(u) AS count`);
    const pendingAccountsResult = await this.neo4j.run(`MATCH (u:User {account_status: 'pending'}) RETURN count(u) AS count`);
    // Placeholder counts for Opportunities and Companies
    const totalOpportunitiesResult = await this.neo4j.run(`MATCH (o:Opportunity) RETURN count(o) AS count`);

    // Most common skills
    const skillsResult = await this.neo4j.run(`
      MATCH (u:User)-[:HAS_SKILL]->(s:Skill)
      RETURN s.name AS skill, count(u) AS frequency
      ORDER BY frequency DESC LIMIT 3
    `);

    // Just returning random unique companies for now or 0 if none exist
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
      ? `AND toLower(u.name) CONTAINS toLower($search)`
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
      ? `AND toLower(u.name) CONTAINS toLower($search)`
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
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $id})
       DETACH DELETE u
       RETURN count(u) as deleted`,
      { id }
    );

    const deleted = result.records[0]?.get('deleted').toNumber() || 0;
    if (deleted === 0) {
      throw new NotFoundException('Account not found or role mismatch.');
    }

    return { message: 'Account removed successfully.' };
  }

  async requestEmailChange(newEmail: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    await this.neo4j.run(
      `MERGE (o:OTPRecord {email: $email, type: 'admin_email_change'})
       SET o.otp = $otp, o.expires_at = $expiresAt, o.verified = false`,
      { email: newEmail, otp, expiresAt },
    );

    await this.mail.sendOtp(newEmail, otp);
    return { message: 'OTP sent to your new email address.' };
  }

  async verifyEmailChange(adminId: string, newEmail: string, otp: string) {
    const result = await this.neo4j.run(
      `MATCH (o:OTPRecord {email: $email, type: 'admin_email_change'})
       RETURN o`,
      { email: newEmail },
    );

    if (!result.records.length) {
      throw new NotFoundException('No OTP request found for this email.');
    }

    const record = result.records[0].get('o').properties;
    if (new Date(record.expires_at) < new Date()) {
      throw new BadRequestException('OTP has expired.');
    }
    if (record.otp !== otp) {
      throw new BadRequestException('Invalid OTP.');
    }

    // Update admin email
    await this.neo4j.run(
      `MATCH (u:User {id: $adminId, role: 'admin'})
       SET u.email = $newEmail`,
      { adminId, newEmail },
    );

    // Clean up OTP record
    await this.neo4j.run(
      `MATCH (o:OTPRecord {email: $email, type: 'admin_email_change'}) DELETE o`,
      { email: newEmail },
    );

    return { message: 'Admin email updated successfully.', new_email: newEmail };
  }

  async getRecentActivity(limit: number = 10) {
    const result = await this.neo4j.run(
      `MATCH (a:Activity)
       RETURN a.id AS id, a.type AS type, a.description AS description, a.created_at AS created_at
       ORDER BY a.created_at DESC
       LIMIT toInteger($limit)`,
      { limit }
    );

    return result.records.map((record) => ({
      id: record.get('id'),
      type: record.get('type'),
      description: record.get('description'),
      created_at: record.get('created_at'),
    }));
  }
}
