import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TenantNeo4jService } from '../neo4j/tenant-neo4j.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateOpportunityDto, UpdateOpportunityDto, OpportunityStatus } from './dto/opportunity.dto';
import { ActivityService, ActivityType } from '../common/activity/activity.service';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../notification/notification.service';
import { ACTIVE_USER } from '../common/utils/neo4j-filters';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class OpportunityService {
  constructor(
    private readonly neo4j: TenantNeo4jService,
    private readonly cloudinary: CloudinaryService,
    private readonly activity: ActivityService,
    private readonly notification: NotificationService,
  ) { }

  async create(userId: string, dto: CreateOpportunityDto, files?: Express.Multer.File[]) {
    const opportunityId = uuidv4();

    let mediaUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadPromises = files.map((file) => this.cloudinary.uploadFile(file));
      const results = await Promise.all(uploadPromises);
      mediaUrls = results.map((res) => res.secure_url);
    }

    const now = new Date().toISOString();

    await this.neo4j.run(
      `MATCH (u:User {id: $userId, tenantId: $tenantId})
       CREATE (o:Opportunity {
         id: $opportunityId,
         tenantId: $tenantId,
         title: $dto.title,
         type: $dto.type,
         description: $dto.description,
         requirements: $dto.requirements,
         location: $dto.location,
         is_remote: $dto.is_remote,
         deadline: $dto.deadline,
         company_name: $dto.company_name,
         apply_link: $dto.apply_link,
         status: 'open',
         media: $mediaUrls,
         posted_at: $now
       })
       CREATE (u)-[:POSTED]->(o)
       WITH o
       UNWIND $dto.required_skills AS skillName
       MERGE (s:Skill {name: toLower(skillName)})
       ON CREATE SET s.id = randomUUID()
       MERGE (o)-[:REQUIRES_SKILL]->(s)`,
      { 
        userId, 
        opportunityId, 
        dto: {
          ...dto,
          description: sanitizeHtml(dto.description),
          requirements: sanitizeHtml(dto.requirements)
        }, 
        mediaUrls, 
        now 
      }
    );

    await this.activity.logActivity(
      ActivityType.OPPORTUNITY_POSTED,
      `${dto.company_name} posted a new opportunity: ${dto.title}`,
      opportunityId
    );

    // Fetch poster details
    const userResult = await this.neo4j.run(
      `MATCH (u:User {id: $userId, tenantId: $tenantId}) RETURN u.username AS username, u.profile_picture AS pic`,
      { userId }
    );
    const posterUsername = userResult.records[0]?.get('username') || null;
    const posterPic = userResult.records[0]?.get('pic') || null;

    // Notify only this university's approved students and alumni
    const broadcastQuery = `
      MATCH (u:User {tenantId: $tenantId})
      WHERE u.account_status = 'approved' AND (u.role = 'student' OR u.role = 'alumni') AND u.id <> $userId
        AND (u.is_deleted IS NULL OR u.is_deleted = false)
      RETURN u.id AS userId
    `;
    const networkResult = await this.neo4j.run(broadcastQuery, { userId });

    const notificationPromises = networkResult.records.map((r) =>
      this.notification.createNotification(
        r.get('userId'),
        `New opportunity at ${dto.company_name}: ${dto.title}`,
        'new_opportunity',
        {
          sender_username: posterUsername,
          sender_display_name: dto.company_name,
          sender_profile_picture: posterPic,
          reference_link: `/opportunities/${opportunityId}`
        }
      )
    );

    await Promise.allSettled(notificationPromises);

    return { message: 'Opportunity broadcasted to network successfully.', opportunity_id: opportunityId };
  }

  async findAll(page: number = 1, limit: number = 10, type?: string, skill?: string, is_remote?: string) {
    const skip = (page - 1) * limit;

    let matchClause = `MATCH (o:Opportunity {tenantId: $tenantId})<-[:POSTED]-(u:User {tenantId: $tenantId})`;
    let whereClauses: string[] = [];

    if (type) whereClauses.push(`o.type = $type`);
    if (is_remote !== undefined) whereClauses.push(`o.is_remote = $is_remote_bool`);

    if (skill) {
      matchClause += ` MATCH (o)-[:REQUIRES_SKILL]->(s:Skill)`;
      whereClauses.push(`toLower(s.name) CONTAINS toLower($skill)`);
    }

    whereClauses.push(`(o.is_deleted IS NULL OR o.is_deleted = false)`);

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `${matchClause} ${whereString} RETURN count(DISTINCT o) AS total`;
    const countResult = await this.neo4j.run(countQuery, { type, is_remote_bool: is_remote === 'true', skill });
    const total = countResult.records[0]?.get('total').toNumber() || 0;

    const query = `
      ${matchClause}
      ${whereString}
      RETURN o.id AS id, o.title AS title, o.type AS type, o.description AS description, o.company_name AS company, 
             o.location AS location, o.is_remote AS is_remote, o.apply_link AS apply_link,
             o.deadline AS deadline, o.posted_at AS posted_at, o.media AS media,
             u.id AS poster_id, u.display_name AS poster_name, u.username AS poster_username, 
             u.profile_picture AS poster_profile_picture, u.role AS poster_role
      ORDER BY o.posted_at DESC
      SKIP toInteger($skip) LIMIT toInteger($limit)
    `;

    const result = await this.neo4j.run(query, { type, is_remote_bool: is_remote === 'true', skill, skip, limit });

    const data = result.records.map((r) => ({
      id: r.get('id'),
      title: r.get('title'),
      type: r.get('type'),
      description: r.get('description'),
      company: r.get('company'),
      location: r.get('location'),
      is_remote: r.get('is_remote'),
      apply_link: r.get('apply_link'),
      posted_by: {
        id: r.get('poster_id'),
        display_name: r.get('poster_name'),
        username: r.get('poster_username'),
        profile_picture: r.get('poster_profile_picture'),
        role: r.get('poster_role'),
      },
      posted_at: r.get('posted_at') ? new Date(r.get('posted_at').toString()).toISOString() : null,
      deadline: r.get('deadline'),
      media: r.get('media'),
    }));

    return { total, page, data };
  }

  async findOne(id: string) {
    const result = await this.neo4j.run(
      `MATCH (o:Opportunity {id: $id, tenantId: $tenantId})<-[:POSTED]-(u:User {tenantId: $tenantId})
       WHERE (o.is_deleted IS NULL OR o.is_deleted = false)
       OPTIONAL MATCH (o)-[:REQUIRES_SKILL]->(s:Skill)
       RETURN o, u.id AS poster_id, u.display_name AS poster_name, u.username AS poster_username, 
              u.profile_picture AS poster_profile_picture, u.role AS poster_role, collect(s.name) AS required_skills`,
      { id }
    );

    if (!result.records.length) throw new NotFoundException('Opportunity not found.');

    const r = result.records[0];
    const opp = r.get('o').properties;

    return {
      id: opp.id,
      title: opp.title,
      type: opp.type,
      description: opp.description,
      requirements: opp.requirements,
      location: opp.location,
      is_remote: opp.is_remote,
      apply_link: opp.apply_link,
      deadline: opp.deadline,
      posted_at: opp.posted_at ? new Date(opp.posted_at.toString()).toISOString() : null,
      media: opp.media,
      company: {
        name: opp.company_name,
      },
      required_skills: r.get('required_skills'),
      posted_by: {
        id: r.get('poster_id'),
        display_name: r.get('poster_name'),
        username: r.get('poster_username'),
        profile_picture: r.get('poster_profile_picture'),
        role: r.get('poster_role'),
      }
    };
  }

  async findMyPosts(userId: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User {id: $userId, tenantId: $tenantId})-[:POSTED]->(o:Opportunity {tenantId: $tenantId})
       WHERE o.is_deleted IS NULL OR o.is_deleted = false
       RETURN o.id AS id, o.title AS title, o.company_name AS company, 
              o.status AS status, o.posted_at AS posted_at, o.deadline AS deadline
       ORDER BY o.posted_at DESC`,
      { userId }
    );

    return result.records.map((r) => ({
      id: r.get('id'),
      title: r.get('title'),
      company: r.get('company'),
      status: r.get('status'),
      posted_at: r.get('posted_at') ? new Date(r.get('posted_at').toString()).toISOString() : null,
      deadline: r.get('deadline'),
    }));
  }

  async update(userId: string, userRole: string, id: string, dto: UpdateOpportunityDto, files?: Express.Multer.File[]) {
    const oppResult = await this.neo4j.run(
      `MATCH (u:User {tenantId: $tenantId})-[:POSTED]->(o:Opportunity {id: $id, tenantId: $tenantId}) 
       RETURN u.id AS poster_id, o.media AS currentMedia`,
      { id }
    );
    if (!oppResult.records.length) throw new NotFoundException('Opportunity not found.');

    const posterId = oppResult.records[0].get('poster_id');
    const currentMedia = oppResult.records[0].get('currentMedia') || [];

    if (userId !== posterId && userRole !== 'admin') {
      throw new ForbiddenException('Only the poster or an admin can update this opportunity.');
    }

    let mediaUrls = [...currentMedia];

    if (dto.media && Array.isArray(dto.media)) {
      mediaUrls = dto.media.filter((m) => typeof m === 'string');
    } else if (typeof dto.media === 'string') {
      mediaUrls = [dto.media];
    }

    if (files && files.length > 0) {
      const uploadPromises = files.map((file) => this.cloudinary.uploadFile(file));
      const results = await Promise.all(uploadPromises);
      const newMediaUrls = results.map((res) => res.secure_url);
      mediaUrls = [...mediaUrls, ...newMediaUrls].slice(0, 5);
    }

    const { required_skills, media, ...updateData } = dto;

    const setClauses = Object.keys(updateData)
      .filter((k) => updateData[k as keyof typeof updateData] !== undefined)
      .map((k) => `o.${k} = $${k}`);

    if (files?.length || dto.media) {
      setClauses.push(`o.media = $mediaUrls`);
    }

    const setQuery = setClauses.join(', ');

    if (setQuery) {
      const sanitizedData = { ...updateData };
      if (sanitizedData.description) sanitizedData.description = sanitizeHtml(sanitizedData.description);
      if (sanitizedData.requirements) sanitizedData.requirements = sanitizeHtml(sanitizedData.requirements);
      
      await this.neo4j.run(
        `MATCH (o:Opportunity {id: $id, tenantId: $tenantId}) SET ${setQuery} RETURN o`,
        { id, ...sanitizedData, mediaUrls }
      );
    }

    if (required_skills) {
      await this.neo4j.run(
        `MATCH (o:Opportunity {id: $id, tenantId: $tenantId})-[r:REQUIRES_SKILL]->() DELETE r`,
        { id }
      );
      await this.neo4j.run(
        `MATCH (o:Opportunity {id: $id, tenantId: $tenantId})
         WITH o
         UNWIND $required_skills AS skillName
         MERGE (s:Skill {name: toLower(skillName)})
         ON CREATE SET s.id = randomUUID()
         MERGE (o)-[:REQUIRES_SKILL]->(s)`,
        { id, required_skills }
      );
    }

    return { message: 'Opportunity updated successfully.' };
  }

  async remove(userId: string, userRole: string, id: string) {
    const oppResult = await this.neo4j.run(
      `MATCH (u:User {tenantId: $tenantId})-[:POSTED]->(o:Opportunity {id: $id, tenantId: $tenantId}) RETURN u.id AS poster_id`,
      { id }
    );
    if (!oppResult.records.length) throw new NotFoundException('Opportunity not found.');

    const posterId = oppResult.records[0].get('poster_id');
    if (userId !== posterId && userRole !== 'admin') {
      throw new ForbiddenException('Only the poster or an admin can delete this opportunity.');
    }

    await this.neo4j.run(
      `MATCH (o:Opportunity {id: $id, tenantId: $tenantId}) 
       SET o.is_deleted = true, o.deleted_at = datetime()`, 
      { id }
    );
    return { message: 'Opportunity removed successfully.' };
  }
}
