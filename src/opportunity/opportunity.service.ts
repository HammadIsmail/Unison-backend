import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClsService } from 'nestjs-cls';
import { TenantNeo4jService } from '../neo4j/tenant-neo4j.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateOpportunityDto, UpdateOpportunityDto, OpportunityStatus } from './dto/opportunity.dto';
import { ActivityService, ActivityType } from '../common/activity/activity.service';
import { v4 as uuidv4 } from 'uuid';
import { NotificationService } from '../notification/notification.service';
import { Opportunity } from './schemas/opportunity.schema';
import { UserAuth } from '../auth/schemas/user-auth.schema';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class OpportunityService {
  constructor(
    private readonly neo4j: TenantNeo4jService,
    private readonly cloudinary: CloudinaryService,
    private readonly activity: ActivityService,
    private readonly notification: NotificationService,
    private readonly cls: ClsService,
    @InjectModel(Opportunity.name)
    private readonly opportunityModel: Model<Opportunity>,
    @InjectModel(UserAuth.name)
    private readonly userAuthModel: Model<UserAuth>,
  ) {}

  async create(userId: string, dto: CreateOpportunityDto, files?: Express.Multer.File[]) {
    const opportunityId = uuidv4();

    let mediaUrls: string[] = [];
    if (files && files.length > 0) {
      const uploadPromises = files.map((file) => this.cloudinary.uploadFile(file));
      const results = await Promise.all(uploadPromises);
      mediaUrls = results.map((res) => res.secure_url);
    }

    const now = new Date().toISOString();
    const tenantId = this.cls.get('tenantId') || 'default';

    // 1. Always persist to MongoDB for high reliability
    await this.opportunityModel.create({
      opportunityId,
      tenantId,
      userId,
      title: dto.title,
      type: dto.type,
      description: sanitizeHtml(dto.description),
      requirements: sanitizeHtml(dto.requirements),
      location: dto.location,
      is_remote: dto.is_remote,
      deadline: dto.deadline,
      company_name: dto.company_name,
      apply_link: dto.apply_link || '',
      status: 'open',
      required_skills: dto.required_skills || [],
      media: mediaUrls,
      posted_at: new Date(now),
    });

    // 2. Best-effort Neo4j persistence
    try {
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
            requirements: sanitizeHtml(dto.requirements),
          },
          mediaUrls,
          now,
        },
      );
    } catch (neoErr) {
      console.warn('[Neo4j] Opportunity creation failed in Neo4j:', neoErr);
    }

    try {
      await this.activity.logActivity(
        ActivityType.OPPORTUNITY_POSTED,
        `${dto.company_name} posted a new opportunity: ${dto.title}`,
        opportunityId,
      );
    } catch {}

    // Fetch poster details
    let posterUsername: string | null = null;
    let posterPic: string | null = null;
    try {
      const userResult = await this.neo4j.run(
        `MATCH (u:User {id: $userId, tenantId: $tenantId}) RETURN u.username AS username, u.profile_picture AS pic`,
        { userId },
      );
      posterUsername = userResult.records[0]?.get('username') || null;
      posterPic = userResult.records[0]?.get('pic') || null;
    } catch {}

    if (!posterUsername) {
      const dbUser = await this.userAuthModel.findOne({ userId }).lean().exec();
      posterUsername = dbUser?.username || null;
      posterPic = dbUser?.profile_picture || null;
    }

    // Broadcast notifications to network
    try {
      const broadcastQuery = `
        MATCH (u:User {tenantId: $tenantId})
        WHERE u.account_status = 'approved' AND (u.role = 'student' OR u.role = 'alumni') AND u.id <> $userId
          AND (u.is_deleted IS NULL OR u.is_deleted = false)
        RETURN u.id AS userId
      `;
      const networkResult = await this.neo4j.run(broadcastQuery, { userId });
      const userIds = networkResult.records.map((r) => r.get('userId'));

      const notificationPromises = userIds.map((targetId) =>
        this.notification.createNotification(
          targetId,
          `New opportunity at ${dto.company_name}: ${dto.title}`,
          'new_opportunity',
          {
            sender_username: posterUsername || undefined,
            sender_display_name: dto.company_name,
            sender_profile_picture: posterPic || undefined,
            reference_link: `/opportunities/${opportunityId}`,
          },
        ),
      );
      await Promise.allSettled(notificationPromises);
    } catch {}

    return { message: 'Opportunity broadcasted to network successfully.', opportunity_id: opportunityId };
  }

  async findAll(page: number = 1, limit: number = 10, type?: string, skill?: string, is_remote?: string) {
    const skip = (page - 1) * limit;

    let total = 0;
    let data: any[] = [];

    // Try Neo4j first
    try {
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
      total = countResult.records[0]?.get('total')?.toNumber() || 0;

      if (total > 0) {
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
        data = result.records.map((r) => ({
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
      }
    } catch {}

    // Fallback to MongoDB if Neo4j returns empty
    if (data.length === 0) {
      const filter: any = { is_deleted: { $ne: true } };
      if (type) filter.type = type;
      if (is_remote !== undefined) filter.is_remote = is_remote === 'true';
      if (skill) filter.required_skills = { $regex: new RegExp(skill, 'i') };

      const [mongoTotal, mongoOpps] = await Promise.all([
        this.opportunityModel.countDocuments(filter),
        this.opportunityModel.find(filter).sort({ posted_at: -1 }).skip(skip).limit(limit).lean().exec(),
      ]);

      if (mongoOpps.length > 0) {
        total = mongoTotal;
        const userIds = [...new Set(mongoOpps.map((o) => o.userId))];
        const users = await this.userAuthModel
          .find({ userId: { $in: userIds } })
          .setOptions({ skipTenantScope: true })
          .lean()
          .exec();
        const userMap = new Map(users.map((u) => [u.userId, u]));

        data = mongoOpps.map((opp) => {
          const author = userMap.get(opp.userId);
          return {
            id: opp.opportunityId,
            title: opp.title,
            type: opp.type,
            description: opp.description,
            company: opp.company_name,
            location: opp.location,
            is_remote: opp.is_remote,
            apply_link: opp.apply_link,
            posted_by: {
              id: opp.userId,
              display_name: author?.display_name || author?.email?.split('@')[0] || 'User',
              username: author?.username || 'user',
              profile_picture: author?.profile_picture || null,
              role: author?.role || 'alumni',
            },
            posted_at: opp.posted_at ? new Date(opp.posted_at).toISOString() : new Date().toISOString(),
            deadline: opp.deadline,
            media: opp.media || [],
          };
        });
      }
    }

    return { total, page, data };
  }

  async findOne(id: string) {
    try {
      const result = await this.neo4j.run(
        `MATCH (o:Opportunity {id: $id, tenantId: $tenantId})<-[:POSTED]-(u:User {tenantId: $tenantId})
         WHERE (o.is_deleted IS NULL OR o.is_deleted = false)
         OPTIONAL MATCH (o)-[:REQUIRES_SKILL]->(s:Skill)
         RETURN o, u.id AS poster_id, u.display_name AS poster_name, u.username AS poster_username, 
                u.profile_picture AS poster_profile_picture, u.role AS poster_role, collect(s.name) AS required_skills`,
        { id },
      );

      if (result.records.length > 0) {
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
          company: { name: opp.company_name },
          required_skills: r.get('required_skills'),
          posted_by: {
            id: r.get('poster_id'),
            display_name: r.get('poster_name'),
            username: r.get('poster_username'),
            profile_picture: r.get('poster_profile_picture'),
            role: r.get('poster_role'),
          },
        };
      }
    } catch {}

    // Fallback to MongoDB
    const mongoOpp = await this.opportunityModel
      .findOne({ opportunityId: id, is_deleted: { $ne: true } })
      .lean()
      .exec();
    if (!mongoOpp) throw new NotFoundException('Opportunity not found.');

    const author = await this.userAuthModel
      .findOne({ userId: mongoOpp.userId })
      .setOptions({ skipTenantScope: true })
      .lean()
      .exec();

    return {
      id: mongoOpp.opportunityId,
      title: mongoOpp.title,
      type: mongoOpp.type,
      description: mongoOpp.description,
      requirements: mongoOpp.requirements,
      location: mongoOpp.location,
      is_remote: mongoOpp.is_remote,
      apply_link: mongoOpp.apply_link,
      deadline: mongoOpp.deadline,
      posted_at: mongoOpp.posted_at ? new Date(mongoOpp.posted_at).toISOString() : null,
      media: mongoOpp.media || [],
      company: { name: mongoOpp.company_name },
      required_skills: mongoOpp.required_skills || [],
      posted_by: {
        id: mongoOpp.userId,
        display_name: author?.display_name || author?.email?.split('@')[0] || 'User',
        username: author?.username || 'user',
        profile_picture: author?.profile_picture || null,
        role: author?.role || 'alumni',
      },
    };
  }

  async findMyPosts(userId: string) {
    let posts: any[] = [];
    try {
      const result = await this.neo4j.run(
        `MATCH (u:User {id: $userId, tenantId: $tenantId})-[:POSTED]->(o:Opportunity {tenantId: $tenantId})
         WHERE o.is_deleted IS NULL OR o.is_deleted = false
         RETURN o.id AS id, o.title AS title, o.company_name AS company, 
                o.status AS status, o.posted_at AS posted_at, o.deadline AS deadline
         ORDER BY o.posted_at DESC`,
        { userId },
      );

      if (result.records.length > 0) {
        posts = result.records.map((r) => ({
          id: r.get('id'),
          title: r.get('title'),
          company: r.get('company'),
          status: r.get('status'),
          posted_at: r.get('posted_at') ? new Date(r.get('posted_at').toString()).toISOString() : null,
          deadline: r.get('deadline'),
        }));
      }
    } catch {}

    // Fallback to MongoDB
    if (posts.length === 0) {
      const mongoPosts = await this.opportunityModel
        .find({ userId, is_deleted: { $ne: true } })
        .sort({ posted_at: -1 })
        .lean()
        .exec();

      posts = mongoPosts.map((o) => ({
        id: o.opportunityId,
        title: o.title,
        company: o.company_name,
        status: o.status,
        posted_at: o.posted_at ? new Date(o.posted_at).toISOString() : null,
        deadline: o.deadline,
      }));
    }

    return posts;
  }

  async update(userId: string, userRole: string, id: string, dto: UpdateOpportunityDto, files?: Express.Multer.File[]) {
    // Check permission in MongoDB or Neo4j
    const mongoOpp = await this.opportunityModel.findOne({ opportunityId: id, is_deleted: { $ne: true } }).lean().exec();
    let posterId = mongoOpp?.userId;
    if (!posterId) {
      try {
        const neoRes = await this.neo4j.run(
          `MATCH (u:User {tenantId: $tenantId})-[:POSTED]->(o:Opportunity {id: $id, tenantId: $tenantId}) RETURN u.id AS posterId`,
          { id },
        );
        if (neoRes.records.length > 0) {
          posterId = neoRes.records[0].get('posterId');
        }
      } catch {}
    }

    if (posterId && posterId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('Only the poster or an admin can update this opportunity.');
    }

    let mediaUrls = mongoOpp?.media || [];
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

    // Update in MongoDB (with upsert)
    const tenantId = this.cls.get<string>('tenantId');
    await this.opportunityModel.updateOne(
      { opportunityId: id },
      {
        $set: {
          ...(dto.title && { title: dto.title }),
          ...(dto.type && { type: dto.type }),
          ...(dto.description && { description: sanitizeHtml(dto.description) }),
          ...(dto.requirements && { requirements: sanitizeHtml(dto.requirements) }),
          ...(dto.location && { location: dto.location }),
          ...(dto.is_remote !== undefined && { is_remote: dto.is_remote }),
          ...(dto.deadline && { deadline: dto.deadline }),
          ...(dto.company_name && { company_name: dto.company_name }),
          ...(dto.apply_link && { apply_link: dto.apply_link }),
          ...(dto.status && { status: dto.status }),
          ...(dto.required_skills && { required_skills: dto.required_skills }),
          ...(mediaUrls.length > 0 && { media: mediaUrls }),
        },
        $setOnInsert: {
          opportunityId: id,
          userId: posterId || userId,
          tenantId: tenantId || '',
          posted_at: new Date(),
        },
      },
      { upsert: true },
    );

    // Update in Neo4j (best effort)
    try {
      const { required_skills, media, ...updateData } = dto;
      const setClauses = Object.keys(updateData)
        .filter((k) => updateData[k as keyof typeof updateData] !== undefined)
        .map((k) => `o.${k} = $${k}`);
      if (files?.length || dto.media) setClauses.push(`o.media = $mediaUrls`);
      const setQuery = setClauses.join(', ');

      if (setQuery) {
        const sanitizedData = { ...updateData };
        if (sanitizedData.description) sanitizedData.description = sanitizeHtml(sanitizedData.description);
        if (sanitizedData.requirements) sanitizedData.requirements = sanitizeHtml(sanitizedData.requirements);
        await this.neo4j.run(
          `MATCH (o:Opportunity {id: $id, tenantId: $tenantId}) SET ${setQuery} RETURN o`,
          { id, ...sanitizedData, mediaUrls },
        );
      }

      if (required_skills) {
        await this.neo4j.run(
          `MATCH (o:Opportunity {id: $id, tenantId: $tenantId})-[r:REQUIRES_SKILL]->() DELETE r`,
          { id },
        );
        await this.neo4j.run(
          `MATCH (o:Opportunity {id: $id, tenantId: $tenantId})
           WITH o
           UNWIND $required_skills AS skillName
           MERGE (s:Skill {name: toLower(skillName)})
           ON CREATE SET s.id = randomUUID()
           MERGE (o)-[:REQUIRES_SKILL]->(s)`,
          { id, required_skills },
        );
      }
    } catch {}

    return { message: 'Opportunity updated successfully.' };
  }

  async remove(userId: string, userRole: string, id: string) {
    const mongoOpp = await this.opportunityModel.findOne({ opportunityId: id, is_deleted: { $ne: true } }).lean().exec();
    let posterId = mongoOpp?.userId;
    if (!posterId) {
      try {
        const neoRes = await this.neo4j.run(
          `MATCH (u:User {tenantId: $tenantId})-[:POSTED]->(o:Opportunity {id: $id, tenantId: $tenantId}) RETURN u.id AS posterId`,
          { id },
        );
        if (neoRes.records.length > 0) {
          posterId = neoRes.records[0].get('posterId');
        }
      } catch {}
    }

    if (posterId && posterId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('Only the poster or an admin can delete this opportunity.');
    }

    // Mark deleted in MongoDB
    await this.opportunityModel.updateOne(
      { opportunityId: id },
      { $set: { is_deleted: true } },
      { upsert: true },
    );

    // Mark deleted in Neo4j (best effort)
    try {
      await this.neo4j.run(
        `MATCH (o:Opportunity {id: $id, tenantId: $tenantId}) 
         SET o.is_deleted = true, o.deleted_at = datetime()`,
        { id },
      );
    } catch {}

    return { message: 'Opportunity removed successfully.' };
  }

  async getComments(opportunityId: string) {
    const opp = await this.opportunityModel
      .findOne({ opportunityId, is_deleted: { $ne: true } })
      .lean()
      .exec();
    if (!opp) throw new NotFoundException('Opportunity not found.');

    return opp.comments || [];
  }

  async addComment(opportunityId: string, userId: string, content: string) {
    const opp = await this.opportunityModel
      .findOne({ opportunityId, is_deleted: { $ne: true } })
      .exec();
    if (!opp) throw new NotFoundException('Opportunity not found.');

    const author = await this.userAuthModel
      .findOne({ userId })
      .setOptions({ skipTenantScope: true })
      .lean()
      .exec();

    const commentItem = {
      id: uuidv4(),
      userId,
      display_name: author?.display_name || author?.username || 'User',
      username: author?.username || 'user',
      profile_picture: author?.profile_picture || author?.backDropImage || null,
      role: author?.role || 'student',
      content: sanitizeHtml(content),
      created_at: new Date(),
    };

    if (!opp.comments) opp.comments = [];
    opp.comments.push(commentItem as any);
    opp.markModified('comments');
    await opp.save();

    // Send notification to opportunity poster if commenter is not poster
    if (opp.userId && opp.userId !== userId) {
      try {
        await this.notification.createNotification(
          opp.userId,
          `${commentItem.display_name} asked a question/commented on your opportunity: "${opp.title}"`,
          'opportunity_comment',
          {
            sender_username: commentItem.username,
            sender_display_name: commentItem.display_name,
            sender_profile_picture: commentItem.profile_picture || undefined,
            reference_link: `/opportunities/${opportunityId}`,
          },
        );
      } catch {}
    }

    return commentItem;
  }

  async deleteComment(opportunityId: string, commentId: string, userId: string, userRole: string) {
    const opp = await this.opportunityModel
      .findOne({ opportunityId, is_deleted: { $ne: true } })
      .exec();
    if (!opp) throw new NotFoundException('Opportunity not found.');

    const comment = (opp.comments || []).find((c: any) => c.id === commentId);
    if (!comment) throw new NotFoundException('Comment not found.');

    if (comment.userId !== userId && opp.userId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to delete this comment.');
    }

    opp.comments = opp.comments.filter((c: any) => c.id !== commentId);
    opp.markModified('comments');
    await opp.save();

    return { message: 'Comment deleted successfully.' };
  }

  async addReply(
    opportunityId: string,
    commentId: string,
    userId: string,
    content: string,
  ) {
    const opp = await this.opportunityModel
      .findOne({ opportunityId, is_deleted: { $ne: true } })
      .exec();
    if (!opp) throw new NotFoundException('Opportunity not found.');

    if (!opp.comments) opp.comments = [];
    const comment = opp.comments.find((c: any) => c.id === commentId);
    if (!comment) throw new NotFoundException('Comment not found.');

    const author = await this.userAuthModel
      .findOne({ userId })
      .setOptions({ skipTenantScope: true })
      .lean()
      .exec();

    const replyItem = {
      id: uuidv4(),
      userId,
      display_name: author?.display_name || author?.username || 'User',
      username: author?.username || 'user',
      profile_picture: author?.profile_picture || author?.backDropImage || null,
      role: author?.role || 'student',
      content: sanitizeHtml(content),
      created_at: new Date(),
    };

    if (!comment.replies) comment.replies = [];
    comment.replies.push(replyItem);
    opp.markModified('comments');
    await opp.save();

    // Send notification to the original commenter (if different from replier)
    if (comment.userId && comment.userId !== userId) {
      try {
        await this.notification.createNotification(
          comment.userId,
          `${replyItem.display_name} replied to your question on: "${opp.title}"`,
          'opportunity_comment_reply',
          {
            sender_username: replyItem.username,
            sender_display_name: replyItem.display_name,
            sender_profile_picture: replyItem.profile_picture || undefined,
            reference_link: `/opportunities/${opportunityId}`,
          },
        );
      } catch {}
    }

    // Also notify opportunity poster if poster is not the replier and not the commenter
    if (opp.userId && opp.userId !== userId && opp.userId !== comment.userId) {
      try {
        await this.notification.createNotification(
          opp.userId,
          `${replyItem.display_name} replied to a question on your opportunity: "${opp.title}"`,
          'opportunity_comment_reply',
          {
            sender_username: replyItem.username,
            sender_display_name: replyItem.display_name,
            sender_profile_picture: replyItem.profile_picture || undefined,
            reference_link: `/opportunities/${opportunityId}`,
          },
        );
      } catch {}
    }

    return replyItem;
  }

  async deleteReply(
    opportunityId: string,
    commentId: string,
    replyId: string,
    userId: string,
    userRole: string,
  ) {
    const opp = await this.opportunityModel
      .findOne({ opportunityId, is_deleted: { $ne: true } })
      .exec();
    if (!opp) throw new NotFoundException('Opportunity not found.');

    const comment = (opp.comments || []).find((c: any) => c.id === commentId);
    if (!comment) throw new NotFoundException('Comment not found.');

    const reply = (comment.replies || []).find((r: any) => r.id === replyId);
    if (!reply) throw new NotFoundException('Reply not found.');

    if (
      reply.userId !== userId &&
      comment.userId !== userId &&
      opp.userId !== userId &&
      userRole !== 'admin'
    ) {
      throw new ForbiddenException('You do not have permission to delete this reply.');
    }

    comment.replies = (comment.replies || []).filter((r: any) => r.id !== replyId);
    opp.markModified('comments');
    await opp.save();

    return { message: 'Reply deleted successfully.' };
  }
}
