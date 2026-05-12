import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ACTIVE_USER } from '../common/utils/neo4j-filters';

@Injectable()
export class ProfilesService {
  constructor(private readonly neo4j: Neo4jService) {}

  async getUserPublicProfile(targetId: string, currentUserId: string) {
    const query = `
      MATCH (u:User {id: $targetId, account_status: 'approved'})
      WHERE ${ACTIVE_USER('u')}
      
      // 1. Fetch Work Experience
      OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience)
      WITH u, collect(DISTINCT {
        id: w.id,
        company_name: w.company_name,
        role: w.role,
        start_date: w.start_date,
        end_date: w.end_date,
        is_current: w.is_current,
        employment_type: w.employment_type
      }) AS work_exp
      
      // 2. Fetch Skills
      OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)
      WITH u, work_exp, collect(DISTINCT {
        id: s.id,
        name: s.name,
        category: s.category,
        proficiency: s.proficiency_level
      }) AS skills
      
      // 3. Fetch Posted Opportunities (exclude soft-deleted)
      OPTIONAL MATCH (u)-[:POSTED]->(o:Opportunity)
      WHERE o.is_deleted IS NULL OR o.is_deleted = false
      WITH u, work_exp, skills, collect(DISTINCT {
        id: o.id,
        title: o.title,
        type: o.type,
        company: o.company_name,
        posted_at: o.posted_at,
        deadline: o.deadline
      }) AS opps
      
      // 4. Check Connection Status (Social Context)
      OPTIONAL MATCH (me:User {id: $currentUserId})-[r:CONNECTED_TO]-(u)
      WITH u, work_exp, skills, opps, 
           r.status AS conn_status, 
           startNode(r) = me AS is_sender
      
      RETURN u, work_exp, skills, opps, conn_status, is_sender
    `;

    const result = await this.neo4j.run(query, { targetId, currentUserId });
    if (!result.records.length) {
      throw new NotFoundException('User profile not found or not approved.');
    }

    const record = result.records[0];
    const user = record.get('u').properties;
    
    // Cleanup collections: Neo4j OPTIONAL MATCH returns [{id: null}] if no match, 
    // we need to filter them out based on a required property like id or name.
    const workExperience = record.get('work_exp').filter(e => e.id !== null);
    const skills = record.get('skills').filter(s => s.id !== null);
    const opportunities = record.get('opps')
      .filter(o => o.id !== null)
      .map(o => ({
        ...o,
        posted_at: o.posted_at ? new Date(o.posted_at.toString()).toISOString() : null
      }));

    return {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      profile_picture: user.profile_picture || null,
      backDropImage: user.backDropImage || null,
      bio: user.bio || null,
      degree: user.degree || 'N/A',
      batch: user.batch || 'N/A',
      graduation_year: user.graduation_year ? (typeof user.graduation_year.toNumber === 'function' ? user.graduation_year.toNumber() : user.graduation_year) : null,
      linkedin_url: user.linkedin_url || null,
      semester: user.semester ? (typeof user.semester.toNumber === 'function' ? user.semester.toNumber() : user.semester) : null,
      roll_number: user.roll_number || null,
      is_online: user.is_online || false,
      last_seen: user.last_seen || null,
      work_experience: workExperience,
      skills: skills,
      opportunities_posted: opportunities,
      connection_status: record.get('conn_status') || 'none',
      is_connection_sender: record.get('is_sender')
    };
  }

  async getSuggestions(userId: string) {
    const query = `
      MATCH (u:User {id: $userId})
      MATCH (other:User) WHERE other.id <> $userId 
        AND other.account_status = 'approved'
        AND ${ACTIVE_USER('other')}
        AND NOT (u)-[:CONNECTED_TO]-(other)
      OPTIONAL MATCH (u)-[:HAS_SKILL]->(s:Skill)<-[:HAS_SKILL]-(other)
      OPTIONAL MATCH (u)-[:HAS_EXPERIENCE]->(w:WorkExperience)
      OPTIONAL MATCH (other)-[:HAS_EXPERIENCE]->(ow:WorkExperience) WHERE toLower(w.company_name) = toLower(ow.company_name)
      WITH u, other, count(DISTINCT s) AS commonSkills, count(DISTINCT w) AS commonCompany
      WITH u, other, commonSkills, commonCompany,
           CASE WHEN u.batch = other.batch AND u.batch IS NOT NULL THEN 1 ELSE 0 END AS sameBatch,
           CASE WHEN u.degree = other.degree AND u.degree IS NOT NULL THEN 1 ELSE 0 END AS sameDegree,
           CASE WHEN u.department = other.department AND u.department IS NOT NULL THEN 1 ELSE 0 END AS sameDepartment
      WITH other, commonSkills, commonCompany, sameBatch, sameDegree, sameDepartment,
           (commonSkills + commonCompany + sameBatch + sameDegree + sameDepartment) AS score
      WHERE score > 0
      ORDER BY score DESC
      LIMIT 5
      RETURN other.id AS id, other.display_name AS display_name, other.username AS username, 
             other.profile_picture AS profile_picture, other.role AS role, 
             other.degree AS degree, other.batch AS batch
    `;

    const result = await this.neo4j.run(query, { userId });

    return result.records.map(record => ({
      id: record.get('id'),
      display_name: record.get('display_name'),
      username: record.get('username'),
      profile_picture: record.get('profile_picture') || null,
      role: record.get('role'),
      degree: record.get('degree') || null,
      batch: record.get('batch') || null,
    }));
  }
}
