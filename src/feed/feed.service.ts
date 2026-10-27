import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TenantNeo4jService } from '../neo4j/tenant-neo4j.service';
import { Announcement } from '../admin/schemas/announcement.schema';
import { Opportunity } from '../opportunity/schemas/opportunity.schema';
import { UserAuth } from '../auth/schemas/user-auth.schema';
import { FeedItemDto } from './dto/feed-response.dto';

@Injectable()
export class FeedService {
  constructor(
    private readonly neo4j: TenantNeo4jService,
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<Announcement>,
    @InjectModel(Opportunity.name)
    private readonly opportunityModel: Model<Opportunity>,
    @InjectModel(UserAuth.name)
    private readonly userAuthModel: Model<UserAuth>,
  ) {}

  async getFeed(page: number, limit: number, type?: 'announcement' | 'opportunity' | 'event') {
    const skip = (page - 1) * limit;

    if (type === 'announcement') return this.getAnnouncementsFeed(page, limit, skip);
    if (type === 'opportunity') return this.getOpportunitiesFeed(page, limit, skip);
    if (type === 'event') return this.getEventsFeed(page, limit, skip);

    return this.getMixedFeed(page, limit, skip);
  }

  // ─── Announcement-only ─────────────────────────────────────────────────────

  private async getAnnouncementsFeed(page: number, limit: number, skip: number) {
    const [total, announcements] = await Promise.all([
      this.announcementModel.countDocuments(),
      this.announcementModel.find().sort({ created_at: -1 }).skip(skip).limit(limit).lean().exec(),
    ]);
    return { total, page, data: await this.enrichAnnouncements(announcements) };
  }

  // ─── Opportunity-only ──────────────────────────────────────────────────────

  private async getOpportunitiesFeed(page: number, limit: number, skip: number) {
    try {
      const countResult = await this.neo4j.run(
        `MATCH (o:Opportunity {tenantId: $tenantId}) WHERE o.is_deleted IS NULL OR o.is_deleted = false RETURN count(o) AS total`,
      );
      const total = countResult.records[0]?.get('total')?.toNumber() ?? 0;

      if (total > 0) {
        const result = await this.neo4j.run(
          `
          MATCH (o:Opportunity {tenantId: $tenantId})<-[:POSTED]-(u:User {tenantId: $tenantId})
          WHERE o.is_deleted IS NULL OR o.is_deleted = false
          RETURN 'opportunity' AS type, o.id AS id, o.title AS title, o.description AS description,
                 o.posted_at AS created_at, o.company_name AS company_name, o.type AS opportunity_type,
                 o.location AS location, o.is_remote AS is_remote, o.apply_link AS apply_link,
                 o.deadline AS deadline, o.media AS media,
                 null AS banner_url, null AS event_date, null AS is_online,
                 null AS meeting_link, null AS max_attendees, null AS event_type, 0 AS attendee_count,
                 u.id AS author_id, u.display_name AS author_name, u.username AS author_username,
                 u.profile_picture AS author_image, u.role AS author_role
          ORDER BY created_at DESC
          SKIP toInteger($skip) LIMIT toInteger($limit)
          `,
          { skip, limit },
        );
        const neo4jData = this.mapNeo4jRecords(result.records);
        if (neo4jData.length > 0) {
          return { total, page, data: neo4jData };
        }
      }
    } catch {}

    // Fallback to MongoDB
    const [mTotal, mOpps] = await Promise.all([
      this.opportunityModel.countDocuments({ is_deleted: { $ne: true } }),
      this.opportunityModel
        .find({ is_deleted: { $ne: true } })
        .sort({ posted_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const userIds = [...new Set(mOpps.map((o) => o.userId))];
    const users = await this.userAuthModel
      .find({ userId: { $in: userIds } })
      .setOptions({ skipTenantScope: true })
      .lean()
      .exec();
    const userMap = new Map(users.map((u) => [u.userId, u]));

    const data: any[] = mOpps.map((o) => {
      const author = userMap.get(o.userId);
      return {
        type: 'opportunity',
        id: o.opportunityId,
        title: o.title,
        description: o.description,
        created_at: o.posted_at ? new Date(o.posted_at).toISOString() : new Date().toISOString(),
        company_name: o.company_name,
        opportunity_type: o.type,
        location: o.location,
        is_remote: o.is_remote,
        apply_link: o.apply_link,
        deadline: o.deadline,
        media: o.media || [],
        media_url: Array.isArray(o.media) ? (o.media[0] || null) : (o.media || null),
        banner_url: null,
        event_date: null,
        is_online: null,
        meeting_link: null,
        max_attendees: null,
        event_type: null,
        attendee_count: 0,
        author: {
          id: o.userId,
          display_name: author?.display_name || author?.email?.split('@')[0] || 'User',
          username: author?.username || undefined,
          profile_picture: author?.profile_picture || undefined,
          role: author?.role || 'alumni',
        },
      };
    });

    return { total: mTotal, page, data };
  }

  // ─── Event-only ────────────────────────────────────────────────────────────

  private async getEventsFeed(page: number, limit: number, skip: number) {
    try {
      const countResult = await this.neo4j.run(
        `MATCH (e:Event {tenantId: $tenantId}) WHERE e.is_deleted IS NULL OR e.is_deleted = false RETURN count(e) AS total`,
      );
      const total = countResult.records[0]?.get('total')?.toNumber() ?? 0;

      const result = await this.neo4j.run(
        `
        MATCH (e:Event {tenantId: $tenantId})<-[:CREATED_EVENT]-(u:User {tenantId: $tenantId})
        WHERE e.is_deleted IS NULL OR e.is_deleted = false
        OPTIONAL MATCH (att:User {tenantId: $tenantId})-[r:RSVP {status: 'attending'}]->(e)
        WITH e, u, count(r) AS attendee_count
        RETURN 'event' AS type, e.id AS id, e.title AS title, e.description AS description,
               e.created_at AS created_at, null AS company_name, null AS opportunity_type,
               e.location AS location, null AS is_remote, null AS apply_link,
               null AS deadline, null AS media, e.banner_url AS banner_url,
               e.date AS event_date, e.is_online AS is_online, e.meeting_link AS meeting_link,
               e.max_attendees AS max_attendees, e.type AS event_type, attendee_count,
               u.id AS author_id, u.display_name AS author_name, u.username AS author_username,
               u.profile_picture AS author_image, u.role AS author_role
        ORDER BY created_at DESC
        SKIP toInteger($skip) LIMIT toInteger($limit)
        `,
        { skip, limit },
      );

      return { total, page, data: this.mapNeo4jRecords(result.records) };
    } catch {
      return { total: 0, page, data: [] };
    }
  }

  // ─── Mixed (all types) ─────────────────────────────────────────────────────

  private async getMixedFeed(page: number, limit: number, skip: number) {
    const mongoAnnouncements = await this.announcementModel
      .find()
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
    const announcementItems = await this.enrichAnnouncements(mongoAnnouncements);

    let neo4jItems: FeedItemDto[] = [];
    try {
      const neo4jResult = await this.neo4j.run(
        `
        CALL {
          MATCH (o:Opportunity {tenantId: $tenantId})<-[:POSTED]-(u:User {tenantId: $tenantId})
          WHERE o.is_deleted IS NULL OR o.is_deleted = false
          RETURN 'opportunity' AS type, o.id AS id, o.title AS title, o.description AS description,
                 o.posted_at AS created_at, o.company_name AS company_name, o.type AS opportunity_type,
                 o.location AS location, o.is_remote AS is_remote, o.apply_link AS apply_link,
                 o.deadline AS deadline, o.media AS media, null AS banner_url,
                 null AS event_date, null AS is_online, null AS meeting_link,
                 null AS max_attendees, null AS event_type, 0 AS attendee_count,
                 u.id AS author_id, u.display_name AS author_name, u.username AS author_username,
                 u.profile_picture AS author_image, u.role AS author_role

          UNION ALL

          MATCH (e:Event {tenantId: $tenantId})<-[:CREATED_EVENT]-(u:User {tenantId: $tenantId})
          WHERE e.is_deleted IS NULL OR e.is_deleted = false
          OPTIONAL MATCH (att:User {tenantId: $tenantId})-[r:RSVP {status: 'attending'}]->(e)
          WITH e, u, count(r) AS attendee_count
          RETURN 'event' AS type, e.id AS id, e.title AS title, e.description AS description,
                 e.created_at AS created_at, null AS company_name, null AS opportunity_type,
                 e.location AS location, null AS is_remote, null AS apply_link,
                 null AS deadline, null AS media, e.banner_url AS banner_url,
                 e.date AS event_date, e.is_online AS is_online, e.meeting_link AS meeting_link,
                 e.max_attendees AS max_attendees, e.type AS event_type, attendee_count,
                 u.id AS author_id, u.display_name AS author_name, u.username AS author_username,
                 u.profile_picture AS author_image, u.role AS author_role
        }
        RETURN type, id, title, description, created_at, company_name, opportunity_type,
               location, is_remote, apply_link, deadline, media, banner_url, event_date,
               is_online, meeting_link, max_attendees, event_type, attendee_count,
               author_id, author_name, author_username, author_image, author_role
        ORDER BY created_at DESC
        SKIP toInteger($skip) LIMIT toInteger($limit)
        `,
        { skip, limit },
      );
      neo4jItems = this.mapNeo4jRecords(neo4jResult.records);
    } catch {}

    // If Neo4j has no opportunities (e.g. Neo4j is offline), enrich with Mongo opportunities
    const hasNeo4jOpportunities = neo4jItems.some((i) => i.type === 'opportunity');
    if (!hasNeo4jOpportunities) {
      const mOpps = await this.opportunityModel
        .find({ is_deleted: { $ne: true } })
        .sort({ posted_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec();

      if (mOpps.length > 0) {
        const userIds = [...new Set(mOpps.map((o) => o.userId))];
        const users = await this.userAuthModel
          .find({ userId: { $in: userIds } })
          .setOptions({ skipTenantScope: true })
          .lean()
          .exec();
        const userMap = new Map(users.map((u) => [u.userId, u]));

        const fallbackOppItems: any[] = mOpps.map((o) => {
          const author = userMap.get(o.userId);
          return {
            type: 'opportunity',
            id: o.opportunityId,
            title: o.title,
            description: o.description,
            created_at: o.posted_at ? new Date(o.posted_at).toISOString() : new Date().toISOString(),
            company_name: o.company_name,
            opportunity_type: o.type,
            location: o.location,
            is_remote: o.is_remote,
            apply_link: o.apply_link,
            deadline: o.deadline,
            media: o.media || [],
            media_url: Array.isArray(o.media) ? (o.media[0] || null) : (o.media || null),
            banner_url: null,
            event_date: null,
            is_online: null,
            meeting_link: null,
            max_attendees: null,
            event_type: null,
            attendee_count: 0,
            author: {
              id: o.userId,
              display_name: author?.display_name || author?.email?.split('@')[0] || 'User',
              username: author?.username || undefined,
              profile_picture: author?.profile_picture || undefined,
              role: author?.role || 'alumni',
            },
          };
        });

        neo4jItems.push(...fallbackOppItems);
      }
    }

    const mergedFeed = [...announcementItems, ...neo4jItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const [mongoAnnounceCount, mongoOppCount] = await Promise.all([
      this.announcementModel.countDocuments(),
      this.opportunityModel.countDocuments({ is_deleted: { $ne: true } }),
    ]);

    const totalItems = mongoAnnounceCount + mongoOppCount;

    return { total: Math.max(totalItems, mergedFeed.length), page, data: mergedFeed.slice(0, limit) };
  }

  // ─── Shared helpers ────────────────────────────────────────────────────────

  private async enrichAnnouncements(announcements: any[]): Promise<FeedItemDto[]> {
    if (announcements.length === 0) return [];

    const adminIds = announcements.map((a) => a.created_by_admin);
    const adminMap = new Map<string, any>();

    try {
      const adminProfilesResult = await this.neo4j.run(
        `MATCH (u:User {tenantId: $tenantId}) WHERE u.id IN $adminIds
         RETURN u.id AS id, u.display_name AS name, u.username AS username,
                u.profile_picture AS pic, u.role AS role`,
        { adminIds },
      );

      adminProfilesResult.records.forEach((r) => {
        adminMap.set(r.get('id'), {
          id: r.get('id'),
          name: r.get('name'),
          username: r.get('username'),
          pic: r.get('pic'),
          role: r.get('role'),
        });
      });
    } catch {}

    // Fallback to MongoDB UserAuth if Neo4j is unreachable
    if (adminMap.size === 0) {
      const dbAdmins = await this.userAuthModel
        .find({ userId: { $in: adminIds } })
        .setOptions({ skipTenantScope: true })
        .lean()
        .exec();
      dbAdmins.forEach((u) => {
        adminMap.set(u.userId, {
          id: u.userId,
          name: u.display_name || u.email?.split('@')[0] || 'Admin',
          username: u.username || 'admin',
          pic: u.profile_picture || null,
          role: u.role || 'admin',
        });
      });
    }

    return announcements.map((a) => {
      const author = adminMap.get(a.created_by_admin);
      return {
        type: 'announcement',
        id: a._id.toString(),
        title: a.title,
        description: a.content,
        created_at: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString(),
        company_name: null,
        opportunity_type: null,
        location: null,
        is_remote: null,
        apply_link: null,
        deadline: null,
        media: [],
        banner_url: a.banner_url || null,
        media_url: a.banner_url || null,
        event_date: null,
        is_online: null,
        meeting_link: null,
        max_attendees: null,
        event_type: null,
        attendee_count: 0,
        author: {
          id: a.created_by_admin,
          display_name: author?.name || 'Administrator',
          username: author?.username || undefined,
          profile_picture: author?.pic || undefined,
          role: author?.role || 'admin',
        },
      } as any;
    });
  }

  private mapNeo4jRecords(records: any[]): FeedItemDto[] {
    return records.map((r) => ({
      type: r.get('type'),
      id: r.get('id'),
      title: r.get('title'),
      description: r.get('description'),
      created_at: r.get('created_at') ? new Date(r.get('created_at').toString()).toISOString() : new Date().toISOString(),
      company_name: r.get('company_name'),
      opportunity_type: r.get('opportunity_type'),
      location: r.get('location'),
      is_remote: r.get('is_remote'),
      apply_link: r.get('apply_link'),
      deadline: r.get('deadline'),
      media: r.get('media') || [],
      banner_url: r.get('banner_url'),
      media_url: r.get('banner_url') || (Array.isArray(r.get('media')) ? r.get('media')[0] : r.get('media')) || null,
      event_date: r.get('event_date'),
      is_online: r.get('is_online'),
      meeting_link: r.get('meeting_link'),
      max_attendees: r.get('max_attendees') ? Number(r.get('max_attendees')) : null,
      event_type: r.get('event_type'),
      attendee_count: r.get('attendee_count') ? Number(r.get('attendee_count')) : 0,
      author: {
        id: r.get('author_id'),
        display_name: r.get('author_name'),
        username: r.get('author_username') || undefined,
        profile_picture: r.get('author_image') || undefined,
        role: r.get('author_role'),
      },
    } as any));
  }
}
