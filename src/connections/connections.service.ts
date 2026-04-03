import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Neo4jService } from '../neo4j/neo4j.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly neo4j: Neo4jService,
    private readonly notification: NotificationService,
  ) {}

  async getConnectionStatus(userId: string, targetId: string) {
    const result = await this.neo4j.run(
      `MATCH (u1:User {id: $userId}), (u2:User {id: $targetId})
       OPTIONAL MATCH (u1)-[r:CONNECTED_TO]-(u2)
       RETURN 
         CASE 
           WHEN r IS NULL THEN 'none'
           WHEN r.status = 'accepted' THEN 'connected'
           WHEN r.status = 'pending' THEN 'pending'
           ELSE 'none'
         END AS status,
         CASE
           WHEN r IS NOT NULL AND startNode(r) = u1 THEN true
           ELSE false
         END AS is_sender`,
      { userId, targetId }
    );

    if (!result.records.length) {
      throw new NotFoundException('Target user not found.');
    }

    return {
      status: result.records[0].get('status'),
      is_sender: result.records[0].get('is_sender'),
    };
  }

  async removeConnection(userId: string, targetId: string) {
    const query = `
      MATCH (u:User {id: $userId})-[r:CONNECTED_TO]-(t:User {id: $targetId})
      DELETE r
      RETURN count(r) AS cnt
    `;
    const result = await this.neo4j.run(query, { userId, targetId });
    if (result.records[0].get('cnt').toNumber() === 0) {
      throw new NotFoundException('Connection or request not found.');
    }
    return { message: 'Connection removed successfully.' };
  }

  async sendRequest(userId: string, targetId: string, connectionType: string) {
    if (userId === targetId) throw new ForbiddenException('Cannot connect with yourself.');

    const userResult = await this.neo4j.run(
      `MATCH (u:User {id: $userId}) RETURN u.role AS role, u.username AS username, u.display_name AS name, u.profile_picture AS pic`, 
      { userId }
    );
    if (!userResult.records.length) throw new NotFoundException('Sender user not found.');
    
    const sender = userResult.records[0].toObject();
    
    const targetResult = await this.neo4j.run(
      `MATCH (t:User {id: $targetId}) RETURN t.role AS role`,
      { targetId }
    );
    if (!targetResult.records.length) throw new NotFoundException('Target user not found.');
    
    const targetRole = targetResult.records[0].get('role');

    // Validation: Students can only connect to Alumni (as mentors)
    if (sender.role === 'student') {
      if (targetRole !== 'alumni') {
        throw new ForbiddenException('Students can only send connection requests to alumni.');
      }
      if (connectionType !== 'mentor') {
        throw new ForbiddenException('Students can only send mentor connection requests.');
      }
    }

    await this.neo4j.run(
      `MATCH (u:User {id: $userId}), (t:User {id: $targetId})
       MERGE (u)-[r:CONNECTED_TO]->(t)
       ON CREATE SET r.status = 'pending', r.created_at = datetime(), r.connection_type = $connectionType
       ON MATCH SET r.connection_type = $connectionType`,
      { userId, targetId, connectionType }
    );

    await this.notification.createNotification(
      targetId,
      `${sender.name} sent you a connection request.`,
      'connection_request',
      {
        sender_username: sender.username,
        sender_display_name: sender.name,
        sender_profile_picture: sender.pic,
        reference_link: '/network/requests'
      }
    );

    return { message: 'Connection request sent successfully.' };
  }

  async getPendingRequests(userId: string) {
    const result = await this.neo4j.run(
      `MATCH (u:User)-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId})
       RETURN u.id AS id, u.display_name AS display_name, u.username AS username, 
              u.profile_picture AS profile_picture, r.connection_type AS connection_type, r.created_at AS created_at`,
      { userId }
    );

    return result.records.map((r) => ({
      sender_id: r.get('id'),
      sender_display_name: r.get('display_name'),
      sender_username: r.get('username'),
      sender_profile_picture: r.get('profile_picture'),
      connection_type: r.get('connection_type'),
      requested_at: r.get('created_at'),
    }));
  }

  async getSentPendingRequests(userId: string) {
    const result = await this.neo4j.run(
      `MATCH (me:User {id: $userId})-[r:CONNECTED_TO {status: 'pending'}]->(u:User)
       RETURN u.id AS id, u.display_name AS display_name, u.username AS username, 
              u.profile_picture AS profile_picture, r.connection_type AS connection_type, r.created_at AS created_at`,
      { userId }
    );

    return result.records.map((r) => ({
      target_id: r.get('id'),
      target_display_name: r.get('display_name'),
      target_username: r.get('username'),
      target_profile_picture: r.get('profile_picture'),
      connection_type: r.get('connection_type'),
      requested_at: r.get('created_at'),
    }));
  }

  async cancelRequest(userId: string, targetId: string) {
    const query = `
      MATCH (u:User {id: $userId})-[r:CONNECTED_TO {status: 'pending'}]->(t:User {id: $targetId})
      DELETE r
      RETURN count(r) AS cnt
    `;
    const result = await this.neo4j.run(query, { userId, targetId });
    if (result.records[0].get('cnt').toNumber() === 0) {
      throw new NotFoundException('Pending connection request not found.');
    }
    return { message: 'Connection request cancelled successfully.' };
  }

  async respondToRequest(userId: string, senderId: string, action: 'accept' | 'reject') {
    if (action === 'accept') {
      const result = await this.neo4j.run(
        `MATCH (u:User {id: $senderId})-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId})
         SET r.status = 'accepted', r.accepted_at = datetime()
         RETURN r`,
        { userId, senderId }
      );
      if (!result.records.length) throw new NotFoundException('Connection request not found.');

      const userResult = await this.neo4j.run(
        `MATCH (u:User {id: $userId}) RETURN u.username AS username, u.display_name AS name, u.profile_picture AS pic`, 
        { userId }
      );
      const responder = userResult.records[0].toObject();

      await this.notification.createNotification(
        senderId,
        `${responder.name} accepted your connection request.`,
        'connection_accepted',
        {
          sender_username: responder.username,
          sender_display_name: responder.name,
          sender_profile_picture: responder.pic,
          reference_link: '/network'
        }
      );

      return { message: 'Connection request accepted.' };
    } else {
      const result = await this.neo4j.run(
        `MATCH (u:User {id: $senderId})-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId})
         DELETE r RETURN count(r) AS cnt`,
        { userId, senderId }
      );
      if (result.records[0].get('cnt').toNumber() === 0) throw new NotFoundException('Connection request not found.');
      return { message: 'Connection request rejected.' };
    }
  }
}
