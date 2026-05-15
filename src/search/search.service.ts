import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class SearchService {
  constructor(private readonly neo4j: Neo4jService) { }

  private prepareLuceneQuery(q: string): string {
    if (!q) return '';
    // Basic fuzzy search by adding ~ to each word
    return q.trim().split(/\s+/).map(word => `${word}~`).join(' AND ');
  }

  async searchAlumni(display_name?: string, company?: string, skill?: string, batch_year?: string, degree?: string) {
    let query = '';
    const params: any = { company, skill, batch_year, degree };

    if (display_name) {
      const luceneQ = this.prepareLuceneQuery(display_name);
      query = `
        CALL db.index.fulltext.queryNodes("user_search_index", "${luceneQ}") YIELD node AS u, score
        WHERE u.role = 'alumni' AND u.account_status = 'approved' AND (u.is_deleted IS NULL OR u.is_deleted = false)
      `;
    } else {
      query = `
        MATCH (u:User {role: 'alumni', account_status: 'approved'})
        WHERE (u.is_deleted IS NULL OR u.is_deleted = false)
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
      query += ` MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true}) WHERE toLower(w.company_name) CONTAINS toLower($company)`;
    } else {
      query += ` OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})`;
    }

    query += `
      WITH u, w, collect(DISTINCT s.name) AS skills
      RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.profile_picture AS profile_picture, 
             u.bio AS bio, u.backDropImage AS backDropImage, w.company_name AS company, w.role AS role, skills
      ORDER BY u.created_at DESC
      LIMIT 50
    `;

    const result = await this.neo4j.run(query, params);

    return result.records.map((r) => ({
      id: r.get('id'),
      username: r.get('username'),
      display_name: r.get('display_name'),
      profile_picture: r.get('profile_picture') || null,
      bio: r.get('bio') || null,
      backDropImage: r.get('backDropImage') || null,
      company: r.get('company') || null,
      role: r.get('role') || null,
      skills: r.get('skills'),
    }));
  }

  async searchOpportunities(title?: string, type?: string, skill?: string, location?: string, is_remote?: string) {
    let query = '';
    const params: any = { type, location, skill, is_remote_bool: is_remote === 'true' };

    if (title) {
      const luceneQ = this.prepareLuceneQuery(title);
      query = `
        CALL db.index.fulltext.queryNodes("opportunity_search_index", "${luceneQ}") YIELD node AS o, score
        MATCH (o)<-[:POSTED]-(u:User)
        WHERE (o.is_deleted IS NULL OR o.is_deleted = false)
      `;
    } else {
      query = `
        MATCH (o:Opportunity)<-[:POSTED]-(u:User)
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

  async findByUsername(username: string) {
    const query = `
      MATCH (u:User {username: $username, account_status: 'approved'})
      WHERE (u.is_deleted IS NULL OR u.is_deleted = false) AND u.role <> 'admin'
      OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
      OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)
      RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.profile_picture AS profile_picture,
             u.bio AS bio, u.role AS role, u.degree AS degree, u.graduation_year AS graduation_year, u.batch AS batch,
             u.linkedin_url AS linkedin_url,
             w.company_name AS company, w.role AS job_role, 
             collect(DISTINCT s.name) AS skills
    `;
    const result = await this.neo4j.run(query, { username });
    if (!result.records.length) return null;

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

  async getSuggestions(q: string) {
    const luceneQ = this.prepareLuceneQuery(q);
    const query = `
      CALL db.index.fulltext.queryNodes("user_search_index", "${luceneQ}") YIELD node AS u, score
      WHERE u.account_status = 'approved' AND (u.is_deleted IS NULL OR u.is_deleted = false) AND u.role <> 'admin'
      RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.profile_picture AS profile_picture, u.role AS role
      ORDER BY score DESC
      LIMIT 10
    `;
    const result = await this.neo4j.run(query);
    return result.records.map(record => ({
      id: record.get('id'),
      username: record.get('username'),
      display_name: record.get('display_name'),
      profile_picture: record.get('profile_picture') || null,
      role: record.get('role'),
    }));
  }
}
