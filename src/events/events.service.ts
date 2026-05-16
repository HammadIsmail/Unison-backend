import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotificationService } from '../notification/notification.service';
import { CreateEventDto, UpdateEventDto, RsvpDto } from './dto/events.dto';
import { v4 as uuidv4 } from 'uuid';
import { ACTIVE_USER } from '../common/utils/neo4j-filters';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class EventsService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notification: NotificationService,
  ) {}

  async createEvent(userId: string, dto: CreateEventDto, file?: Express.Multer.File) {
    const eventId = uuidv4();
    let bannerUrl = null;

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      bannerUrl = uploadResult.secure_url;
    }

    const query = `
      MATCH (u:User {id: $userId})
      WHERE ${ACTIVE_USER('u')} AND u.role IN ['admin', 'alumni']
      CREATE (e:Event {
        id: $eventId,
        title: $dto.title,
        description: $dto.description,
        type: $dto.type,
        date: datetime($dto.date),
        is_online: $dto.is_online,
        location: $dto.location,
        meeting_link: $dto.meeting_link,
        max_attendees: $dto.max_attendees,
        banner_url: $bannerUrl,
        created_at: datetime(),
        is_deleted: false
      })
      CREATE (u)-[:CREATED_EVENT]->(e)
      RETURN e
    `;

    const result = await this.neo4j.run(query, { 
      userId, 
      eventId, 
      dto: {
        ...dto,
        description: sanitizeHtml(dto.description)
      }, 
      bannerUrl 
    });
    if (!result.records.length) {
      throw new ForbiddenException('Only alumni and admins can create events, or user not found.');
    }

    return { message: 'Event created successfully.', eventId };
  }

  async updateEvent(userId: string, eventId: string, dto: UpdateEventDto, file?: Express.Multer.File) {
    let bannerUrl = null;
    let oldBannerUrl = null;

    // Check ownership or admin status
    const checkQuery = `
      MATCH (u:User {id: $userId}), (e:Event {id: $eventId})
      WHERE (u)-[:CREATED_EVENT]->(e) OR u.role = 'admin'
      RETURN e.banner_url AS old_banner
    `;
    const checkResult = await this.neo4j.run(checkQuery, { userId, eventId });
    if (!checkResult.records.length) {
      throw new ForbiddenException('You do not have permission to update this event.');
    }
    oldBannerUrl = checkResult.records[0].get('old_banner');

    if (file) {
      const uploadResult = await this.cloudinaryService.uploadFile(file);
      bannerUrl = uploadResult.secure_url;
      if (oldBannerUrl) {
        const publicId = this.cloudinaryService.extractPublicIdFromUrl(oldBannerUrl);
        if (publicId) await this.cloudinaryService.deleteImage(publicId);
      }
    }

    const updates: string[] = [];
    if (dto.title !== undefined) updates.push('e.title = $dto.title');
    if (dto.description !== undefined) updates.push('e.description = $dto.description');
    if (dto.type !== undefined) updates.push('e.type = $dto.type');
    if (dto.date !== undefined) updates.push('e.date = datetime($dto.date)');
    if (dto.is_online !== undefined) updates.push('e.is_online = $dto.is_online');
    if (dto.location !== undefined) updates.push('e.location = $dto.location');
    if (dto.meeting_link !== undefined) updates.push('e.meeting_link = $dto.meeting_link');
    if (dto.max_attendees !== undefined) updates.push('e.max_attendees = $dto.max_attendees');
    if (bannerUrl) updates.push('e.banner_url = $bannerUrl');

    if (updates.length === 0) return { message: 'No fields to update.' };

    const updateQuery = `
      MATCH (e:Event {id: $eventId})
      SET ${updates.join(', ')}
      RETURN e
    `;

    const resultDto = { ...dto };
    if (resultDto.description) resultDto.description = sanitizeHtml(resultDto.description);

    await this.neo4j.run(updateQuery, { eventId, dto: resultDto, bannerUrl });

    // Notify attendees of update
    const notifyQuery = `
      MATCH (a:User)-[:RSVP]->(e:Event {id: $eventId})
      RETURN a.id AS attendeeId, e.title AS title
    `;
    const notifyResult = await this.neo4j.run(notifyQuery, { eventId });
    for (const record of notifyResult.records) {
      const attendeeId = record.get('attendeeId');
      const title = record.get('title');
      await this.notification.createNotification(
        attendeeId,
        `An event you RSVP'd to ("${title}") has been updated.`,
        'event_update',
        { reference_link: `/events/${eventId}` }
      );
    }

    return { message: 'Event updated successfully.' };
  }

  async deleteEvent(userId: string, eventId: string) {
    // Check ownership or admin status
    const checkQuery = `
      MATCH (u:User {id: $userId}), (e:Event {id: $eventId})
      WHERE (u)-[:CREATED_EVENT]->(e) OR u.role = 'admin'
      RETURN e.title AS title, e.banner_url AS banner_url
    `;
    const checkResult = await this.neo4j.run(checkQuery, { userId, eventId });
    if (!checkResult.records.length) {
      throw new ForbiddenException('You do not have permission to delete this event.');
    }
    
    const title = checkResult.records[0].get('title');
    const bannerUrl = checkResult.records[0].get('banner_url');

    // Notify attendees of cancellation before deletion
    const notifyQuery = `
      MATCH (a:User)-[:RSVP]->(e:Event {id: $eventId})
      RETURN a.id AS attendeeId
    `;
    const notifyResult = await this.neo4j.run(notifyQuery, { eventId });
    for (const record of notifyResult.records) {
      const attendeeId = record.get('attendeeId');
      await this.notification.createNotification(
        attendeeId,
        `The event "${title}" has been cancelled.`,
        'event_cancelled',
        {}
      );
    }

    const deleteQuery = `
      MATCH (e:Event {id: $eventId})
      SET e.is_deleted = true
    `;
    await this.neo4j.run(deleteQuery, { eventId });

    if (bannerUrl) {
      const publicId = this.cloudinaryService.extractPublicIdFromUrl(bannerUrl);
      if (publicId) await this.cloudinaryService.deleteImage(publicId);
    }

    return { message: 'Event cancelled successfully.' };
  }

  async getEvents(query: { type?: string; is_online?: string; status?: 'upcoming' | 'past'; limit?: number; offset?: number }) {
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    
    let matchQuery = `MATCH (e:Event)<-[:CREATED_EVENT]-(host:User) WHERE (e.is_deleted IS NULL OR e.is_deleted = false)`;
    
    if (query.type) matchQuery += ` AND e.type = $type`;
    if (query.is_online !== undefined) matchQuery += ` AND e.is_online = $is_online_bool`;
    
    if (query.status === 'past') {
      matchQuery += ` AND e.date < datetime()`;
    } else {
      matchQuery += ` AND e.date >= datetime()`;
    }

    matchQuery += `
      OPTIONAL MATCH (a:User)-[r:RSVP {status: 'attending'}]->(e)
      WITH e, host, count(r) AS attendee_count
      RETURN e.id AS id, e.title AS title, e.type AS type, e.date AS date, 
             e.is_online AS is_online, e.location AS location, e.banner_url AS banner_url,
             host.id AS host_id, host.display_name AS host_name, host.profile_picture AS host_pic,
             attendee_count, e.max_attendees AS max_attendees
      ORDER BY e.date ASC
      SKIP toInteger($offset) LIMIT toInteger($limit)
    `;

    const params: any = { 
      type: query.type, 
      is_online_bool: query.is_online === 'true',
      offset: offset,
      limit: limit
    };

    const result = await this.neo4j.run(matchQuery, params);

    return result.records.map(r => ({
      id: r.get('id'),
      title: r.get('title'),
      type: r.get('type'),
      date: r.get('date') ? new Date(r.get('date').toString()).toISOString() : null,
      is_online: r.get('is_online'),
      location: r.get('location') || null,
      banner_url: r.get('banner_url') || null,
      attendee_count: r.get('attendee_count').toNumber(),
      max_attendees: r.get('max_attendees') ? r.get('max_attendees').toNumber() : null,
      host: {
        id: r.get('host_id'),
        name: r.get('host_name'),
        profile_picture: r.get('host_pic') || null
      }
    }));
  }

  async getEventDetails(userId: string, eventId: string) {
    const query = `
      MATCH (e:Event {id: $eventId})<-[:CREATED_EVENT]-(host:User)
      WHERE (e.is_deleted IS NULL OR e.is_deleted = false)
      OPTIONAL MATCH (a:User)-[r:RSVP {status: 'attending'}]->(e)
      OPTIONAL MATCH (me:User {id: $userId})-[my_rsvp:RSVP]->(e)
      WITH e, host, count(r) AS attendee_count, my_rsvp.status AS my_rsvp_status
      RETURN e, host.id AS host_id, host.display_name AS host_name, host.username AS host_username, host.profile_picture AS host_pic, host.role AS host_role,
             attendee_count, my_rsvp_status
    `;

    const result = await this.neo4j.run(query, { eventId, userId });
    if (!result.records.length) throw new NotFoundException('Event not found.');

    const record = result.records[0];
    const e = record.get('e').properties;

    return {
      id: e.id,
      title: e.title,
      description: e.description,
      type: e.type,
      date: e.date ? new Date(e.date.toString()).toISOString() : null,
      is_online: e.is_online,
      location: e.location || null,
      meeting_link: e.meeting_link || null,
      max_attendees: e.max_attendees ? e.max_attendees.toNumber() : null,
      banner_url: e.banner_url || null,
      created_at: e.created_at ? new Date(e.created_at.toString()).toISOString() : null,
      attendee_count: record.get('attendee_count').toNumber(),
      my_rsvp_status: record.get('my_rsvp_status') || 'none',
      host: {
        id: record.get('host_id'),
        name: record.get('host_name'),
        username: record.get('host_username'),
        profile_picture: record.get('host_pic') || null,
        role: record.get('host_role')
      }
    };
  }

  async rsvpToEvent(userId: string, eventId: string, dto: RsvpDto) {
    // Check if event exists and max attendees
    const checkQuery = `
      MATCH (e:Event {id: $eventId})<-[:CREATED_EVENT]-(host:User)
      WHERE (e.is_deleted IS NULL OR e.is_deleted = false) AND e.date >= datetime()
      OPTIONAL MATCH (a:User)-[r:RSVP {status: 'attending'}]->(e)
      RETURN e.max_attendees AS max, count(r) AS current_attendees, host.id AS host_id, e.title AS title
    `;
    const checkResult = await this.neo4j.run(checkQuery, { eventId });
    if (!checkResult.records.length) throw new NotFoundException('Upcoming event not found.');

    const max = checkResult.records[0].get('max') ? checkResult.records[0].get('max').toNumber() : null;
    const current = checkResult.records[0].get('current_attendees').toNumber();
    const hostId = checkResult.records[0].get('host_id');
    const title = checkResult.records[0].get('title');

    // Fetch user for notification
    const userResult = await this.neo4j.run(`MATCH (u:User {id: $userId}) RETURN u.display_name AS name, u.profile_picture AS pic`, { userId });
    const userName = userResult.records[0]?.get('name') || 'Someone';
    const userPic = userResult.records[0]?.get('pic') || null;

    // Check if user is already RSVP'd to know if we are updating or creating
    const existingRsvpQuery = `MATCH (u:User {id: $userId})-[r:RSVP]->(e:Event {id: $eventId}) RETURN r.status AS status`;
    const existingRsvpResult = await this.neo4j.run(existingRsvpQuery, { userId, eventId });
    const existingStatus = existingRsvpResult.records.length ? existingRsvpResult.records[0].get('status') : null;

    if (dto.status === 'attending' && max !== null && current >= max && existingStatus !== 'attending') {
      throw new BadRequestException('Event has reached maximum capacity.');
    }

    const rsvpQuery = `
      MATCH (u:User {id: $userId}), (e:Event {id: $eventId})
      MERGE (u)-[r:RSVP]->(e)
      SET r.status = $status, r.created_at = datetime()
    `;
    await this.neo4j.run(rsvpQuery, { userId, eventId, status: dto.status });

    // Notify host if it's a new attending RSVP
    if (dto.status === 'attending' && existingStatus !== 'attending' && userId !== hostId) {
      await this.notification.createNotification(
        hostId,
        `${userName} RSVP'd to your event "${title}".`,
        'new_rsvp',
        { 
          reference_link: `/events/${eventId}`,
          sender_profile_picture: userPic
        }
      );
    }

    return { message: `RSVP status updated to ${dto.status}.` };
  }

  async cancelRsvp(userId: string, eventId: string) {
    const query = `
      MATCH (u:User {id: $userId})-[r:RSVP]->(e:Event {id: $eventId})
      DELETE r
      RETURN count(r) AS cnt
    `;
    const result = await this.neo4j.run(query, { userId, eventId });
    if (result.records[0].get('cnt').toNumber() === 0) {
      throw new NotFoundException('RSVP not found.');
    }
    return { message: 'RSVP cancelled successfully.' };
  }

  async getEventAttendees(eventId: string) {
    const query = `
      MATCH (a:User)-[r:RSVP {status: 'attending'}]->(e:Event {id: $eventId})
      WHERE ${ACTIVE_USER('a')} AND a.role <> 'admin'
      RETURN a.id AS id, a.display_name AS display_name, a.username AS username,
             a.profile_picture AS profile_picture, a.role AS role, a.bio AS bio
      ORDER BY r.created_at DESC
    `;
    const result = await this.neo4j.run(query, { eventId });

    return result.records.map((r) => ({
      id: r.get('id'),
      display_name: r.get('display_name'),
      username: r.get('username'),
      profile_picture: r.get('profile_picture'),
      role: r.get('role'),
      bio: r.get('bio'),
    }));
  }

  async getMyEvents(userId: string) {
    const query = `
      MATCH (e:Event)<-[:CREATED_EVENT|RSVP]-(u:User {id: $userId})
      WHERE (e.is_deleted IS NULL OR e.is_deleted = false)
      OPTIONAL MATCH (e)<-[:CREATED_EVENT]-(host:User)
      WITH e, host
      ORDER BY e.date ASC
      RETURN DISTINCT e.id AS id, e.title AS title, e.type AS type, e.date AS date, 
             e.is_online AS is_online, e.location AS location, e.banner_url AS banner_url,
             host.id AS host_id, host.display_name AS host_name, host.profile_picture AS host_pic
    `;
    const result = await this.neo4j.run(query, { userId });

    return result.records.map(r => ({
      id: r.get('id'),
      title: r.get('title'),
      type: r.get('type'),
      date: r.get('date') ? new Date(r.get('date').toString()).toISOString() : null,
      is_online: r.get('is_online'),
      location: r.get('location') || null,
      banner_url: r.get('banner_url') || null,
      host: {
        id: r.get('host_id'),
        name: r.get('host_name'),
        profile_picture: r.get('host_pic') || null
      }
    }));
  }
}
