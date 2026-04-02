import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { NotificationGateway } from './notification.gateway';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationMetadata {
  sender_username?: string;
  sender_display_name?: string;
  sender_profile_picture?: string;
  reference_link?: string;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly gateway: NotificationGateway,
  ) { }

  async getUserNotifications(userId: string, readStatus?: string) {
    let isRead: boolean | undefined;
    if (readStatus === 'true') isRead = true;
    else if (readStatus === 'false') isRead = false;

    const query = `
      MATCH (u:User {id: $userId})<-[:FOR]-(n:Notification)
      ${isRead !== undefined ? 'WHERE n.is_read = $isRead' : ''}
      RETURN n.id AS id, n.message AS message, n.type AS type, 
             n.created_at AS created_at, n.is_read AS is_read,
             n.sender_username AS sender_username, n.sender_display_name AS sender_display_name,
             n.sender_profile_picture AS sender_profile_picture, n.reference_link AS reference_link
      ORDER BY n.created_at DESC
    `;
    const result = await this.neo4j.run(query, { userId, isRead });
    return result.records.map(r => ({
      id: r.get('id'),
      message: r.get('message'),
      type: r.get('type'),
      created_at: r.get('created_at'),
      is_read: r.get('is_read'),
      sender_username: r.get('sender_username') || null,
      sender_display_name: r.get('sender_display_name') || null,
      sender_profile_picture: r.get('sender_profile_picture') || null,
      reference_link: r.get('reference_link') || null,
    }));
  }

  async markAsRead(userId: string, notificationId: string) {
    const query = `
      MATCH (u:User {id: $userId})<-[:FOR]-(n:Notification {id: $notificationId})
      SET n.is_read = true
      RETURN n
    `;
    const result = await this.neo4j.run(query, { userId, notificationId });
    if (!result.records.length) {
      throw new NotFoundException('Notification not found.');
    }
    return { message: 'Notification marked as read.' };
  }

  async createNotification(userId: string, message: string, type: string, metadata?: NotificationMetadata) {
    const id = uuidv4();
    const created_at = new Date().toISOString();

    // 1. Create notification in Neo4j
    const query = `
      MATCH (u:User {id: $userId})
      CREATE (n:Notification {
        id: $id,
        message: $message,
        type: $type,
        created_at: $created_at,
        is_read: false,
        sender_username: $sender_username,
        sender_display_name: $sender_display_name,
        sender_profile_picture: $sender_profile_picture,
        reference_link: $reference_link
      })
      CREATE (n)-[:FOR]->(u)
      RETURN n
    `;
    await this.neo4j.run(query, { 
      userId, 
      id, 
      message, 
      type, 
      created_at,
      sender_username: metadata?.sender_username || null,
      sender_display_name: metadata?.sender_display_name || null,
      sender_profile_picture: metadata?.sender_profile_picture || null,
      reference_link: metadata?.reference_link || null
    });

    // 2. Push real-time via gateway
    this.gateway.sendToUser(userId, 'notification', {
      id,
      message,
      type,
      created_at,
      is_read: false,
      sender_username: metadata?.sender_username || null,
      sender_display_name: metadata?.sender_display_name || null,
      sender_profile_picture: metadata?.sender_profile_picture || null,
      reference_link: metadata?.reference_link || null
    });

    return { id, message, type, created_at };
  }
}
