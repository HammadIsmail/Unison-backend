import { Injectable } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class SearchService {
  constructor(private readonly neo4j: Neo4jService) { }

  async searchAlumni(display_name?: string, company?: string, skill?: string, batch_year?: string, degree?: string) {
    let matchClause = `MATCH (u:User {role: 'alumni', account_status: 'approved'})`;
    const whereClauses: string[] = [];

    if (display_name) whereClauses.push(`toLower(u.display_name) CONTAINS toLower($display_name)`);
    if (batch_year) whereClauses.push(`u.graduation_year = toInteger($batch_year) OR u.batch CONTAINS $batch_year`);
    if (degree) whereClauses.push(`toLower(u.degree) CONTAINS toLower($degree)`);

    // Match skills and experiences if requested ----
    if (skill) {
      matchClause += ` MATCH (u)-[:HAS_SKILL]->(s:Skill)`;
      whereClauses.push(`toLower(s.name) CONTAINS toLower($skill)`);
    } else {
      matchClause += ` OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)`;
    }

    if (company) {
      matchClause += ` MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})`;
      whereClauses.push(`toLower(w.company_name) CONTAINS toLower($company)`);
    } else {
      matchClause += ` OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})`;
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      ${matchClause}
      ${whereString}
      WITH u, w, collect(DISTINCT s.name) AS skills
      RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.profile_picture AS profile_picture, w.company_name AS company, w.role AS role, skills
      ORDER BY u.created_at DESC
      LIMIT 50
    `;

    const result = await this.neo4j.run(query, { display_name, company, skill, batch_year, degree });

    return result.records.map((r) => ({
      id: r.get('id'),
      username: r.get('username'),
      display_name: r.get('display_name'),
      profile_picture: r.get('profile_picture') || null,
      company: r.get('company') || null,
      role: r.get('role') || null,
      skills: r.get('skills'),
    }));
  }

  async searchOpportunities(title?: string, type?: string, skill?: string, location?: string, is_remote?: string) {
    let matchClause = `MATCH (o:Opportunity)<-[:POSTED]-(u:User)`;
    const whereClauses: string[] = [];

    if (title) whereClauses.push(`toLower(o.title) CONTAINS toLower($title)`);
    if (type) whereClauses.push(`o.type = $type`);
    if (location) whereClauses.push(`toLower(o.location) CONTAINS toLower($location)`);
    if (is_remote !== undefined) whereClauses.push(`o.is_remote = $is_remote_bool`);

    if (skill) {
      matchClause += ` MATCH (o)-[:REQUIRES_SKILL]->(s:Skill)`;
      whereClauses.push(`toLower(s.name) CONTAINS toLower($skill)`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      ${matchClause}
      ${whereString}
      RETURN o.id AS id, o.title AS title, o.type AS type, o.company_name AS company,
             o.location AS location, o.is_remote AS is_remote, o.apply_link AS apply_link,
             o.posted_at AS posted_at, o.deadline AS deadline, o.media AS media,
             u.id AS poster_id, u.display_name AS poster_name, u.username AS poster_username,
             u.profile_picture AS poster_picture, u.role AS poster_role
      ORDER BY o.posted_at DESC
      LIMIT 50
    `;

    const result = await this.neo4j.run(query, {
      title, type, skill, location, is_remote_bool: is_remote === 'true'
    });

    return result.records.map((r) => ({
      id: r.get('id'),
      title: r.get('title'),
      type: r.get('type'),
      company: r.get('company'),
      location: r.get('location'),
      is_remote: r.get('is_remote'),
      apply_link: r.get('apply_link'),
      posted_at: r.get('posted_at'),
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
      OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience {is_current: true})
      OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)
      RETURN u.id AS id, u.username AS username, u.display_name AS display_name, u.profile_picture AS profile_picture,
             u.bio AS bio, u.role AS role, u.degree AS degree, u.graduation_year AS graduation_year,
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
      linkedin_url: r.get('linkedin_url') || null,
      company: r.get('company') || null,
      job_role: r.get('job_role') || null,
      skills: r.get('skills'),
    };
  }
}
