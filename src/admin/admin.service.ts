import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { MailService } from '../common/mail/mail.service';
import { RejectAccountDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly mail: MailService,
  ) { }

  async getPendingAccounts() {
    const result = await this.neo4j.run(
      `MATCH (u:User {account_status: 'pending'})
       RETURN u.id AS id, u.name AS name, u.email AS email, u.role AS role, u.created_at AS registered_at`
    );

    return result.records.map((record) => ({
      id: record.get('id'),
      name: record.get('name'),
      email: record.get('email'),
      role: record.get('role'),
      registered_at: record.get('registered_at'),
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
    await this.mail.sendApprovalEmail(user.email, user.name);

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
       RETURN u.id AS id, u.name AS name, w.company_name AS company, w.role AS role
       ORDER BY u.created_at DESC
       SKIP toInteger($skip) LIMIT toInteger($limit)`,
      { search, skip, limit }
    );

    const data = result.records.map((record) => ({
      id: record.get('id'),
      name: record.get('name'),
      company: record.get('company') || null,
      role: record.get('role') || null,
    }));

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
       RETURN u.id AS id, u.name AS name, u.roll_number AS roll_number, u.semester AS semester
       ORDER BY u.created_at DESC
       SKIP toInteger($skip) LIMIT toInteger($limit)`,
      { search, skip, limit }
    );

    const data = result.records.map((record) => ({
      id: record.get('id'),
      name: record.get('name'),
      roll_number: record.get('roll_number'),
      semester: typeof record.get('semester')?.toNumber === 'function' ? record.get('semester').toNumber() : record.get('semester') || null,
    }));

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
}
