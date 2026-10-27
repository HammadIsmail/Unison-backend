import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantNeo4jService } from '../neo4j/tenant-neo4j.service';
import { UserAuth } from '../auth/schemas/user-auth.schema';
import { Opportunity } from '../opportunity/schemas/opportunity.schema';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly neo4j: TenantNeo4jService,
    @InjectModel(UserAuth.name) private readonly userAuthModel: Model<UserAuth>,
    @InjectModel(Opportunity.name) private readonly opportunityModel: Model<Opportunity>,
  ) {}

  private prepareLuceneQuery(q: string): string {
    if (!q) return '';
    return q.trim().split(/\s+/).map((word) => `${word.replace(/[+\-!(){}\[\]^"~*?:\\]/g, '\\$&')}~`).join(' AND ');
  }

  private prepareSuggestionQuery(q: string): string {
    if (!q) return '';
    return q.trim().split(/\s+/).map((word) => `${word.replace(/[+\-!(){}\[\]^"~*?:\\]/g, '\\$&')}*`).join(' OR ');
  }

  async searchUsers(currentUserId: string, display_name?: string, company?: string, skill?: string, batch_year?: string, degree?: string) {
    try {
      let query = '';
      const params: any = { currentUserId, company, skill, batch_year, degree };

      if (display_name) {
        const luceneQ = this.prepareLuceneQuery(display_name);
        params.luceneQ = luceneQ;
        query = `
          CALL db.index.fulltext.queryNodes("user_search_index", $luceneQ, { limit: 500 }) YIELD node AS u, score
          WHERE u.tenantId = $tenantId 
            AND u.id <> $currentUserId 
            AND NOT u.role IN ['admin', 'moderator'] 
            AND u.account_status = 'approved' 
            AND (u.is_deleted IS NULL OR u.is_deleted = false)
        `;
      } else {
        query = `
          MATCH (u:User {tenantId: $tenantId})
          WHERE u.id <> $currentUserId 
            AND NOT u.role IN ['admin', 'moderator'] 
            AND u.account_status = 'approved' 
            AND (u.is_deleted IS NULL OR u.is_deleted = false)
        `;
      }

      if (batch_year) query += ` AND (u.graduation_year = toInteger($batch_year) OR u.batch CONTAINS $batch_year)`;
      if (degree) query += ` AND toLower(u.degree) CONTAINS toLower($degree)`;

      if (skill) {
        query += ` MATCH (u)-[:HAS_SKILL]->(s:Skill) WHERE toLower(s.name) CONTAINS toLower($skill)`;
      } else {
        query += ` OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)`;
      }

      if (company) {
        query += ` MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {tenantId: $tenantId, is_current: true}) WHERE toLower(w.company_name) CONTAINS toLower($company)`;
      } else {
        query += ` OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {tenantId: $tenantId, is_current: true})`;
      }

      query += `
        WITH u, w, collect(DISTINCT s.name) AS skills
        RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.profile_picture AS profile_picture, 
               u.bio AS bio, u.backDropImage AS backDropImage, u.batch AS batch_year, u.role AS platform_role,
               w.company_name AS company, w.role AS job_role, skills
        ORDER BY u.created_at DESC
        LIMIT 50
      `;

      const result = await this.neo4j.run(query, params);
      if (result.records && result.records.length > 0) {
        return result.records.map((r) => ({
          id: r.get('id'),
          username: r.get('username'),
          display_name: r.get('display_name'),
          profile_picture: r.get('profile_picture') || null,
          bio: r.get('bio') || null,
          backDropImage: r.get('backDropImage') || null,
          company: r.get('company') || null,
          job_role: r.get('job_role') || null,
          role: r.get('platform_role'),
          batch_year: r.get('batch_year') || null,
          skills: r.get('skills'),
        }));
      }
    } catch (err: any) {
      this.logger.warn(`Neo4j searchUsers failed: ${err?.message || err}. Falling back to MongoDB.`);
    }

    // Fallback to MongoDB
    const filter: any = {
      userId: { $ne: currentUserId },
      account_status: 'approved',
      role: { $nin: ['admin', 'moderator', 'super_admin'] },
      is_deleted: { $ne: true },
    };

    if (display_name) {
      filter.$or = [
        { display_name: { $regex: display_name, $options: 'i' } },
        { username: { $regex: display_name, $options: 'i' } },
      ];
    }
    if (batch_year) {
      const batchFilters: any[] = [{ batch: { $regex: batch_year, $options: 'i' } }];
      const parsedYear = Number(batch_year);
      if (!isNaN(parsedYear)) {
        batchFilters.push({ graduation_year: parsedYear });
      }
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: batchFilters }];
        delete filter.$or;
      } else {
        filter.$or = batchFilters;
      }
    }
    if (degree) {
      filter.degree = { $regex: degree, $options: 'i' };
    }
    if (skill) {
      filter.skills = { $regex: skill, $options: 'i' };
    }
    if (company) {
      const companyFilters = [
        { 'work_experiences.company_name': { $regex: company, $options: 'i' } },
        { affiliation: { $regex: company, $options: 'i' } },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: companyFilters }];
        delete filter.$or;
      } else {
        filter.$or = companyFilters;
      }
    }

    const users = await this.userAuthModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();

    return users.map((u: any) => ({
      id: u.userId,
      username: u.username || u.email?.split('@')[0],
      display_name: u.display_name || u.username || u.email?.split('@')[0],
      profile_picture: u.profile_picture || u.backDropImage || null,
      bio: u.bio || null,
      backDropImage: u.backDropImage || null,
      company: u.work_experiences?.find((w: any) => w.is_current)?.company_name || u.affiliation || null,
      job_role: u.work_experiences?.find((w: any) => w.is_current)?.role || u.job_title || null,
      role: u.role,
      batch_year: u.batch || (u.graduation_year ? String(u.graduation_year) : null),
      skills: u.skills || [],
    }));
  }

  async searchOpportunities(title?: string, type?: string, skill?: string, location?: string, is_remote?: string) {
    try {
      let query = '';
      const params: any = { type, location, skill, is_remote_bool: is_remote === 'true' };

      if (title) {
        const luceneQ = this.prepareLuceneQuery(title);
        params.luceneQ = luceneQ;
        query = `
          CALL db.index.fulltext.queryNodes("opportunity_search_index", $luceneQ, { limit: 500 }) YIELD node AS o, score
          MATCH (o)<-[:POSTED]-(u:User {tenantId: $tenantId})
          WHERE o.tenantId = $tenantId AND (o.is_deleted IS NULL OR o.is_deleted = false)
        `;
      } else {
        query = `
          MATCH (o:Opportunity {tenantId: $tenantId})<-[:POSTED]-(u:User {tenantId: $tenantId})
          WHERE (o.is_deleted IS NULL OR o.is_deleted = false)
        `;
      }

      if (type) query += ` AND o.type = $type`;
      if (location) query += ` AND toLower(o.location) CONTAINS toLower($location)`;
      if (is_remote !== undefined) query += ` AND o.is_remote = $is_remote_bool`;

      if (skill) {
        query += ` MATCH (o)-[:REQUIRES_SKILL]->(s:Skill) WHERE toLower(s.name) CONTAINS toLower($skill)`;
      }

      query += `
        RETURN o.id AS id, o.title AS title, o.type AS type, o.company_name AS company,
               o.location AS location, o.is_remote AS is_remote, o.apply_link AS apply_link,
               o.posted_at AS posted_at, o.deadline AS deadline, o.media AS media,
               u.id AS poster_id, u.display_name AS poster_name, u.username AS poster_username,
               u.profile_picture AS poster_picture, u.role AS poster_role
        ORDER BY o.posted_at DESC
        LIMIT 50
      `;

      const result = await this.neo4j.run(query, params);
      if (result.records && result.records.length > 0) {
        return result.records.map((r) => ({
          id: r.get('id'),
          title: r.get('title'),
          type: r.get('type'),
          company: r.get('company'),
          location: r.get('location'),
          is_remote: r.get('is_remote'),
          apply_link: r.get('apply_link'),
          posted_at: r.get('posted_at') ? new Date(r.get('posted_at').toString()).toISOString() : null,
          deadline: r.get('deadline'),
          media: r.get('media') || [],
          posted_by: {
            id: r.get('poster_id'),
            display_name: r.get('poster_name'),
            username: r.get('poster_username'),
            profile_picture: r.get('poster_picture') || null,
            role: r.get('poster_role'),
          },
        }));
      }
    } catch (err: any) {
      this.logger.warn(`Neo4j searchOpportunities failed: ${err?.message || err}. Falling back to MongoDB.`);
    }

    // Fallback to MongoDB
    const filter: any = { is_deleted: { $ne: true } };
    if (type) filter.type = type;
    if (is_remote !== undefined) filter.is_remote = is_remote === 'true';
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (skill) filter.required_skills = { $regex: skill, $options: 'i' };
    if (title) filter.title = { $regex: title, $options: 'i' };

    const opps = await this.opportunityModel
      .find(filter)
      .sort({ posted_at: -1 })
      .limit(50)
      .lean()
      .exec();

    const userIds = [...new Set(opps.map((o) => o.userId))];
    const authors = await this.userAuthModel
      .find({ userId: { $in: userIds } })
      .setOptions({ skipTenantScope: true })
      .lean()
      .exec();
    const authorMap = new Map(authors.map((a: any) => [a.userId, a]));

    return opps.map((o: any) => {
      const author = authorMap.get(o.userId);
      return {
        id: o.opportunityId,
        title: o.title,
        type: o.type,
        company: o.company_name,
        location: o.location,
        is_remote: o.is_remote,
        apply_link: o.apply_link,
        posted_at: o.posted_at ? new Date(o.posted_at).toISOString() : null,
        deadline: o.deadline,
        media: o.media || [],
        posted_by: {
          id: o.userId,
          display_name: author?.display_name || author?.username || 'User',
          username: author?.username || 'user',
          profile_picture: author?.profile_picture || null,
          role: author?.role || 'alumni',
        },
      };
    });
  }

  async findByUsername(username: string) {
    try {
      const query = `
        MATCH (u:User {username: $username, account_status: 'approved', tenantId: $tenantId})
        WHERE (u.is_deleted IS NULL OR u.is_deleted = false) AND NOT u.role IN ['admin', 'moderator']
        OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {tenantId: $tenantId, is_current: true})
        OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)
        RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.profile_picture AS profile_picture,
               u.bio AS bio, u.role AS role, u.degree AS degree, u.graduation_year AS graduation_year, u.batch AS batch,
               u.linkedin_url AS linkedin_url,
               w.company_name AS company, w.role AS job_role, 
               collect(DISTINCT s.name) AS skills
      `;
      const result = await this.neo4j.run(query, { username });
      if (result.records.length > 0) {
        const r = result.records[0];
        return {
          id: r.get('id'),
          username: r.get('username'),
          display_name: r.get('display_name'),
          profile_picture: r.get('profile_picture') || null,
          bio: r.get('bio') || null,
          role: r.get('role'),
          degree: r.get('degree'),
          graduation_year: typeof r.get('graduation_year')?.toNumber === 'function' ? r.get('graduation_year').toNumber() : r.get('graduation_year'),
          batch: r.get('batch') || null,
          linkedin_url: r.get('linkedin_url') || null,
          company: r.get('company') || null,
          job_role: r.get('job_role') || null,
          skills: r.get('skills'),
        };
      }
    } catch (err: any) {
      this.logger.warn(`Neo4j findByUsername failed: ${err?.message || err}. Falling back to MongoDB.`);
    }

    // Fallback to MongoDB
    const user = await this.userAuthModel
      .findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') }, is_deleted: { $ne: true } })
      .lean()
      .exec();
    if (!user) return null;
    const currentExp = user.work_experiences?.find((w: any) => w.is_current);
    return {
      id: user.userId,
      username: user.username,
      display_name: user.display_name || user.username,
      profile_picture: user.profile_picture || user.backDropImage || null,
      bio: user.bio || null,
      role: user.role,
      degree: user.degree || null,
      graduation_year: user.graduation_year || null,
      batch: user.batch || null,
      linkedin_url: user.linkedin_url || null,
      company: currentExp?.company_name || user.affiliation || null,
      job_role: currentExp?.role || user.job_title || null,
      skills: user.skills || [],
    };
  }

  async getSuggestions(q: string, currentUserId: string) {
    try {
      const luceneQ = this.prepareSuggestionQuery(q);
      const query = `
        CALL db.index.fulltext.queryNodes("user_search_index", $luceneQ, { limit: 100 }) YIELD node AS u, score
        WHERE u.tenantId = $tenantId 
          AND u.id <> $currentUserId 
          AND u.account_status = 'approved' 
          AND (u.is_deleted IS NULL OR u.is_deleted = false) 
          AND NOT u.role IN ['admin', 'moderator']
        RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.profile_picture AS profile_picture, u.role AS role
        ORDER BY score DESC
        LIMIT 10
      `;
      const result = await this.neo4j.run(query, { currentUserId, luceneQ });
      if (result.records && result.records.length > 0) {
        return result.records.map((record) => ({
          id: record.get('id'),
          username: record.get('username'),
          display_name: record.get('display_name'),
          profile_picture: record.get('profile_picture') || null,
          role: record.get('role'),
        }));
      }
    } catch (err: any) {
      this.logger.warn(`Neo4j getSuggestions failed: ${err?.message || err}. Falling back to MongoDB.`);
    }

    // Fallback to MongoDB
    const regex = new RegExp(q, 'i');
    const users = await this.userAuthModel
      .find({
        userId: { $ne: currentUserId },
        account_status: 'approved',
        role: { $nin: ['admin', 'moderator', 'super_admin'] },
        is_deleted: { $ne: true },
        $or: [{ username: regex }, { display_name: regex }],
      })
      .limit(10)
      .lean()
      .exec();

    return users.map((u: any) => ({
      id: u.userId,
      username: u.username || u.email?.split('@')[0],
      display_name: u.display_name || u.username || u.email?.split('@')[0],
      profile_picture: u.profile_picture || u.backDropImage || null,
      role: u.role,
    }));
  }
}
