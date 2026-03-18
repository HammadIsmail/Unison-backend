import { Injectable, NotFoundException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class NotificationService {
  constructor(private readonly neo4j: Neo4jService) {}

  async getUserNotifications(userId: string) {
    const query = `
      MATCH (u:User {id: $userId})<-[:FOR]-(n:Notification)
      RETURN n.id AS id, n.message AS message, n.type AS type, 
             n.created_at AS created_at, n.is_read AS is_read
      ORDER BY n.created_at DESC
    `;
    const result = await this.neo4j.run(query, { userId });
    return result.records.map(r => ({
      id: r.get('id'),
      message: r.get('message'),
      type: r.get('type'),
      created_at: r.get('created_at'),
      is_read: r.get('is_read'),
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
}
