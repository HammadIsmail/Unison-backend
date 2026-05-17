import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Neo4jService } from '../neo4j/neo4j.service';
import { Announcement } from '../admin/schemas/announcement.schema';
import { FeedItemDto } from './dto/feed-response.dto';

@Injectable()
export class FeedService {
  constructor(
    private readonly neo4j: Neo4jService,
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<Announcement>,
  ) {}

  async getFeed(page: number, limit: number) {
    const skip = (page - 1) * limit;

    // 1. Fetch Total Counts
    const [mongoTotal, neo4jTotalResult] = await Promise.all([
      this.announcementModel.countDocuments(),
      this.neo4j.run(`
        CALL {
          MATCH (o:Opportunity) WHERE o.is_deleted IS NULL OR o.is_deleted = false
          RETURN count(o) AS oppCount
        }
        CALL {
          MATCH (e:Event) WHERE e.is_deleted IS NULL OR e.is_deleted = false
          RETURN count(e) AS eventCount
        }
        RETURN oppCount + eventCount AS total
      `),
    ]);

    const totalItems = mongoTotal + (neo4jTotalResult.records[0]?.get('total').toNumber() || 0);

    // 2. Fetch Announcements and enrich with Admin profile from Neo4j
    const announcements = await this.announcementModel
      .find()
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const adminIds = announcements.map(a => a.created_by_admin);
    const adminProfilesResult = await this.neo4j.run(
      `MATCH (u:User) WHERE u.id IN $adminIds RETURN u.id AS id, u.display_name AS name, u.username AS username, u.profile_picture AS pic, u.role AS role`,
      { adminIds }
    );

    const adminMap = new Map();
    adminProfilesResult.records.forEach(r => {
      adminMap.set(r.get('id'), {
        id: r.get('id'),
        display_name: r.get('name'),
        username: r.get('username'),
        profile_picture: r.get('pic'),
        role: r.get('role')
      });
    });

    const announcementItems: FeedItemDto[] = announcements.map((a: any) => ({
      type: 'announcement',
      id: a._id.toString(),
      title: a.title,
      description: a.description,
      created_at: a.created_at.toISOString(),
      media_url: a.media_url,
      media_type: a.media_type,
      event_date: a.event_date,
      author: adminMap.get(a.created_by_admin) || { 
        id: a.created_by_admin, 
        display_name: 'UNISON Admin', 
        role: 'admin' 
      }
    }));

    // 3. Fetch Opportunities & Events with ALL fields
    const neo4jResult = await this.neo4j.run(
      `
      CALL {
        MATCH (o:Opportunity)<-[:POSTED]-(u:User)
        WHERE o.is_deleted IS NULL OR o.is_deleted = false
        RETURN 'opportunity' AS type, o.id AS id, o.title AS title, o.description AS description, 
               o.posted_at AS created_at, o.company_name AS company_name, o.type AS opportunity_type, 
               o.location AS location, o.is_remote AS is_remote, o.apply_link AS apply_link, 
               o.deadline AS deadline, o.media AS media, null AS banner_url,
               null AS event_date, null AS is_online, null AS meeting_link, null AS max_attendees, null AS event_type, 0 AS attendee_count,
               u.id AS author_id, u.display_name AS author_name, u.username AS author_username, u.profile_picture AS author_image, u.role AS author_role
        
        UNION ALL
        
        MATCH (e:Event)<-[:CREATED_EVENT]-(u:User)
        WHERE e.is_deleted IS NULL OR e.is_deleted = false
        OPTIONAL MATCH (att:User)-[r:RSVP {status: 'attending'}]->(e)
        WITH e, u, count(r) AS attendee_count
        RETURN 'event' AS type, e.id AS id, e.title AS title, e.description AS description, 
               e.created_at AS created_at, null AS company_name, null AS opportunity_type, 
               e.location AS location, null AS is_remote, null AS apply_link, 
               null AS deadline, null AS media, e.banner_url AS banner_url,
               e.date AS event_date, e.is_online AS is_online, e.meeting_link AS meeting_link, e.max_attendees AS max_attendees, e.type AS event_type, attendee_count,
               u.id AS author_id, u.display_name AS author_name, u.username AS author_username, u.profile_picture AS author_image, u.role AS author_role
      }
      RETURN type, id, title, description, created_at, company_name, opportunity_type, location, is_remote, apply_link, deadline, media, banner_url, event_date, is_online, meeting_link, max_attendees, event_type, attendee_count, author_id, author_name, author_username, author_image, author_role
      ORDER BY created_at DESC
      SKIP toInteger($skip) LIMIT toInteger($limit)
      `,
      { skip, limit }
    );

    const neo4jItems: FeedItemDto[] = neo4jResult.records.map((r) => {
      const type = r.get('type');
      const createdAt = r.get('created_at');
      const eventDate = r.get('event_date');
      const media = r.get('media');

      return {
        type: type as 'opportunity' | 'event',
        id: r.get('id'),
        title: r.get('title'),
        description: r.get('description'),
        created_at: typeof createdAt === 'string' ? createdAt : (createdAt.toString ? createdAt.toString() : createdAt),
        media_url: type === 'opportunity' ? (media && media.length > 0 ? media[0] : null) : r.get('banner_url'), // Wait, I need banner_url in return
        company_name: r.get('company_name'),
        opportunity_type: r.get('opportunity_type'),
        location: r.get('location'),
        is_remote: r.get('is_remote'),
        apply_link: r.get('apply_link'),
        deadline: r.get('deadline'),
        media: media,
        event_date: eventDate ? (typeof eventDate === 'string' ? eventDate : (eventDate.toString ? eventDate.toString() : eventDate)) : undefined,
        is_online: r.get('is_online'),
        meeting_link: r.get('meeting_link'),
        max_attendees: r.get('max_attendees') ? r.get('max_attendees').toNumber() : null,
        event_type: r.get('event_type'),
        attendee_count: r.get('attendee_count') != null ? (typeof r.get('attendee_count').toNumber === 'function' ? r.get('attendee_count').toNumber() : Number(r.get('attendee_count'))) : 0,
        author: {
          id: r.get('author_id'),
          display_name: r.get('author_name'),
          username: r.get('author_username'),
          profile_picture: r.get('author_image'),
          role: r.get('author_role')
        }
      };
    });

    // 4. Merge and Re-sort
    const mergedFeed = [...announcementItems, ...neo4jItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return {
      total: totalItems,
      page,
      data: mergedFeed.slice(0, limit),
    };
  }
}
