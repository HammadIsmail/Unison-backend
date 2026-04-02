import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class ProfilesService {
  constructor(private readonly neo4j: Neo4jService) {}

  async getUserPublicProfile(targetId: string, currentUserId: string) {
    const query = `
      MATCH (u:User {id: $targetId, account_status: 'approved'})
      
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
        name: s.name,
        category: s.category,
        proficiency: s.proficiency_level
      }) AS skills
      
      // 3. Fetch Posted Opportunities
      OPTIONAL MATCH (u)-[:POSTED]->(o:Opportunity)
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
    const skills = record.get('skills').filter(s => s.name !== null);
    const opportunities = record.get('opps').filter(o => o.id !== null);

    return {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      profile_picture: user.profile_picture || null,
      bio: user.bio || null,
      degree: user.degree || 'N/A',
      batch: user.batch || 'N/A',
      graduation_year: user.graduation_year ? (typeof user.graduation_year.toNumber === 'function' ? user.graduation_year.toNumber() : user.graduation_year) : null,
      linkedin_url: user.linkedin_url || null,
      semester: user.semester ? (typeof user.semester.toNumber === 'function' ? user.semester.toNumber() : user.semester) : null,
      roll_number: user.roll_number || null,
      work_experience: workExperience,
      skills: skills,
      opportunities_posted: opportunities,
      connection_status: record.get('conn_status') || 'none',
      is_connection_sender: record.get('is_sender')
    };
  }
}
