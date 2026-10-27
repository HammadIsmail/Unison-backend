import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClsService } from 'nestjs-cls';
import { v4 as uuidv4 } from 'uuid';
import { TenantNeo4jService } from '../neo4j/tenant-neo4j.service';
import { NotificationService } from '../notification/notification.service';
import { ACTIVE_USER } from '../common/utils/neo4j-filters';
import { Connection } from './schemas/connection.schema';
import { UserAuth } from '../auth/schemas/user-auth.schema';

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(
    private readonly neo4j: TenantNeo4jService,
    private readonly notification: NotificationService,
    private readonly cls: ClsService,
    @InjectModel(Connection.name)
    private readonly connectionModel: Model<Connection>,
    @InjectModel(UserAuth.name)
    private readonly userAuthModel: Model<UserAuth>,
  ) {}

  async getMyConnections(userId: string) {
    // 1. Retrieve accepted connections from MongoDB
    const mongoConns = await this.connectionModel
      .find({
        $or: [{ senderId: userId }, { receiverId: userId }],
        status: 'accepted',
      })
      .setOptions({ skipTenantScope: true })
      .lean()
      .exec();

    if (mongoConns.length > 0) {
      const partnerIds = mongoConns.map((c) =>
        c.senderId === userId ? c.receiverId : c.senderId
      );
      const partners = await this.userAuthModel
        .find({
          userId: { $in: partnerIds },
          is_deleted: { $ne: true },
        })
        .setOptions({ skipTenantScope: true })
        .lean()
        .exec();

      return partners.map((p) => {
        const currentExp = (p as any).work_experiences?.find((w: any) => w.is_current);
        return {
          id: p.userId,
          display_name: p.display_name || p.username,
          username: p.username,
          profile_picture: p.profile_picture || null,
          bio: (p as any).bio || null,
          backDropImage: (p as any).backDropImage || null,
          company: currentExp?.company_name || (p as any).affiliation || null,
          role: currentExp?.role || (p as any).job_title || p.role || null,
        };
      });
    }

    // 2. Fallback to Neo4j
    try {
      const result = await this.neo4j.run(
        `MATCH (u:User {id: $userId, tenantId: $tenantId})-[r:CONNECTED_TO {status: 'accepted'}]-(c:User {tenantId: $tenantId})
         WHERE (c.is_deleted IS NULL OR c.is_deleted = false) AND NOT c.role IN ['admin', 'moderator']
         OPTIONAL MATCH (c)-[:HAS_EXPERIENCE]->(w:WorkExperience {tenantId: $tenantId, is_current: true})
         RETURN c.id AS id, c.display_name AS display_name, c.username AS username, 
                c.profile_picture AS profile_picture, c.bio AS bio, c.backDropImage AS backDropImage, 
                w.company_name AS company, w.role AS role`,
        { userId }
      );

      return result.records.map((r) => ({
        id: r.get('id'),
        display_name: r.get('display_name'),
        username: r.get('username'),
        profile_picture: r.get('profile_picture') || null,
        bio: r.get('bio') || null,
        backDropImage: r.get('backDropImage') || null,
        company: r.get('company') || null,
        role: r.get('role') || null,
      }));
    } catch {
      return [];
    }
  }

  async getConnectionStatus(userId: string, targetId: string) {
    // 1. Check MongoDB Connection
    const conn = await this.connectionModel
      .findOne({
        $or: [
          { senderId: userId, receiverId: targetId },
          { senderId: targetId, receiverId: userId },
        ],
      })
      .lean()
      .exec();

    if (conn) {
      if (conn.status === 'accepted') {
        return { status: 'connected', is_sender: conn.senderId === userId };
      }
      if (conn.status === 'pending') {
        return { status: 'pending', is_sender: conn.senderId === userId };
      }
      return { status: 'none', is_sender: false };
    }

    // 2. Fallback to Neo4j
    try {
      const result = await this.neo4j.run(
        `MATCH (u1:User {id: $userId, tenantId: $tenantId}), (u2:User {id: $targetId, tenantId: $tenantId})
         WHERE ${ACTIVE_USER('u1')} AND ${ACTIVE_USER('u2')}
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

      if (result.records.length > 0) {
        return {
          status: result.records[0].get('status'),
          is_sender: result.records[0].get('is_sender'),
        };
      }
    } catch (neoErr) {
      this.logger.warn(`Neo4j getConnectionStatus failed: ${neoErr}`);
    }

    // 3. Check if target user exists in Mongo before 404
    const targetUser = await this.userAuthModel
      .findOne({ userId: targetId, is_deleted: { $ne: true } })
      .lean()
      .exec();

    if (!targetUser) {
      throw new NotFoundException('Target user not found.');
    }

    return { status: 'none', is_sender: false };
  }

  async removeConnection(userId: string, targetId: string) {
    // 1. Remove from MongoDB
    const mongoRes = await this.connectionModel.deleteMany({
      $or: [
        { senderId: userId, receiverId: targetId },
        { senderId: targetId, receiverId: userId },
      ],
    });

    // 2. Remove from Neo4j (best effort)
    let neoDeleted = 0;
    try {
      const query = `
        MATCH (u:User {id: $userId, tenantId: $tenantId})-[r:CONNECTED_TO]-(t:User {id: $targetId, tenantId: $tenantId})
        DELETE r
        RETURN count(r) AS cnt
      `;
      const result = await this.neo4j.run(query, { userId, targetId });
      neoDeleted = result.records[0]?.get('cnt')?.toNumber() || 0;
    } catch (neoErr) {
      this.logger.warn(`Neo4j removeConnection failed: ${neoErr}`);
    }

    if (mongoRes.deletedCount === 0 && neoDeleted === 0) {
      throw new NotFoundException('Connection or request not found.');
    }

    return { message: 'Connection removed successfully.' };
  }

  async sendRequest(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new ForbiddenException('Cannot connect with yourself.');
    }

    // 1. Validate sender and target in MongoDB
    const sender = await this.userAuthModel
      .findOne({ userId, is_deleted: { $ne: true } })
      .lean()
      .exec();
    if (!sender) throw new NotFoundException('Sender user not found.');

    const target = await this.userAuthModel
      .findOne({ userId: targetId, is_deleted: { $ne: true } })
      .lean()
      .exec();
    if (!target) throw new NotFoundException('Target user not found.');

    // 2. Check existing connection in MongoDB
    const existing = await this.connectionModel
      .findOne({
        $or: [
          { senderId: userId, receiverId: targetId },
          { senderId: targetId, receiverId: userId },
        ],
      })
      .exec();

    if (existing) {
      if (existing.status === 'accepted') {
        return { message: 'Already connected.' };
      }
      if (existing.status === 'pending') {
        if (existing.senderId === userId) {
          return { message: 'Connection request already sent.' };
        } else {
          // If the target had already sent us a request, automatically accept it
          existing.status = 'accepted';
          existing.accepted_at = new Date();
          await existing.save();

          try {
            await this.notification.createNotification(
              targetId,
              `${sender.display_name || sender.username} accepted your connection request.`,
              'connection_accepted',
              {
                sender_username: sender.username,
                sender_display_name: sender.display_name || sender.username,
                sender_profile_picture: sender.profile_picture || undefined,
                reference_link: '/network',
              }
            );
          } catch {}

          return { message: 'Connection accepted.' };
        }
      }

      // If previously rejected, re-open as pending
      existing.status = 'pending';
      existing.senderId = userId;
      existing.receiverId = targetId;
      existing.created_at = new Date();
      existing.accepted_at = null;
      await existing.save();
    } else {
      const tenantId =
        sender.tenantId ||
        this.cls.get<string>('tenantId') ||
        target.tenantId ||
        '';

      await this.connectionModel.create({
        connectionId: uuidv4(),
        tenantId,
        senderId: userId,
        receiverId: targetId,
        status: 'pending',
        created_at: new Date(),
      });
    }

    // 3. Best effort Neo4j
    try {
      await this.neo4j.run(
        `MATCH (u:User {id: $userId, tenantId: $tenantId}), (t:User {id: $targetId, tenantId: $tenantId})
         MERGE (u)-[r:CONNECTED_TO]->(t)
         ON CREATE SET r.status = 'pending', r.created_at = datetime()`,
        { userId, targetId }
      );
    } catch (neoErr) {
      this.logger.warn(`Neo4j sendRequest failed: ${neoErr}`);
    }

    // 4. Send notification to target
    try {
      await this.notification.createNotification(
        targetId,
        `${sender.display_name || sender.username} sent you a connection request.`,
        'connection_request',
        {
          sender_username: sender.username,
          sender_display_name: sender.display_name || sender.username,
          sender_profile_picture: sender.profile_picture || undefined,
          reference_link: '/network/requests',
        }
      );
    } catch (notifErr) {
      this.logger.warn(`Notification failed: ${notifErr}`);
    }

    return { message: 'Connection request sent successfully.' };
  }

  async getPendingRequests(userId: string) {
    // 1. Retrieve from MongoDB
    const mongoRequests = await this.connectionModel
      .find({ receiverId: userId, status: 'pending' })
      .sort({ created_at: -1 })
      .lean()
      .exec();

    if (mongoRequests.length > 0) {
      const senderIds = mongoRequests.map((r) => r.senderId);
      const senders = await this.userAuthModel
        .find({ userId: { $in: senderIds } })
        .lean()
        .exec();
      const senderMap = new Map(senders.map((s) => [s.userId, s]));

      return mongoRequests.map((r) => {
        const s = senderMap.get(r.senderId);
        return {
          sender_id: r.senderId,
          sender_display_name: s?.display_name || s?.username || 'User',
          sender_username: s?.username || 'user',
          sender_profile_picture: s?.profile_picture || null,
          requested_at: r.created_at,
        };
      });
    }

    // 2. Fallback to Neo4j
    try {
      const result = await this.neo4j.run(
        `MATCH (u:User {tenantId: $tenantId})-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId, tenantId: $tenantId})
         WHERE ${ACTIVE_USER('u')} AND NOT u.role IN ['admin', 'moderator']
         RETURN u.id AS id, u.display_name AS display_name, u.username AS username,
                u.profile_picture AS profile_picture, r.created_at AS created_at`,
        { userId }
      );

      return result.records.map((r) => ({
        sender_id: r.get('id'),
        sender_display_name: r.get('display_name'),
        sender_username: r.get('username'),
        sender_profile_picture: r.get('profile_picture'),
        requested_at: r.get('created_at'),
      }));
    } catch (neoErr) {
      this.logger.warn(`Neo4j getPendingRequests failed: ${neoErr}`);
      return [];
    }
  }

  async getSentPendingRequests(userId: string) {
    // 1. Retrieve from MongoDB
    const mongoRequests = await this.connectionModel
      .find({ senderId: userId, status: 'pending' })
      .sort({ created_at: -1 })
      .lean()
      .exec();

    if (mongoRequests.length > 0) {
      const targetIds = mongoRequests.map((r) => r.receiverId);
      const targets = await this.userAuthModel
        .find({ userId: { $in: targetIds } })
        .lean()
        .exec();
      const targetMap = new Map(targets.map((t) => [t.userId, t]));

      return mongoRequests.map((r) => {
        const t = targetMap.get(r.receiverId);
        return {
          target_id: r.receiverId,
          target_display_name: t?.display_name || t?.username || 'User',
          target_username: t?.username || 'user',
          target_profile_picture: t?.profile_picture || null,
          requested_at: r.created_at,
        };
      });
    }

    // 2. Fallback to Neo4j
    try {
      const result = await this.neo4j.run(
        `MATCH (me:User {id: $userId, tenantId: $tenantId})-[r:CONNECTED_TO {status: 'pending'}]->(u:User {tenantId: $tenantId})
         WHERE ${ACTIVE_USER('u')} AND NOT u.role IN ['admin', 'moderator']
         RETURN u.id AS id, u.display_name AS display_name, u.username AS username,
                u.profile_picture AS profile_picture, r.created_at AS created_at`,
        { userId }
      );

      return result.records.map((r) => ({
        target_id: r.get('id'),
        target_display_name: r.get('display_name'),
        target_username: r.get('username'),
        target_profile_picture: r.get('profile_picture'),
        requested_at: r.get('created_at'),
      }));
    } catch (neoErr) {
      this.logger.warn(`Neo4j getSentPendingRequests failed: ${neoErr}`);
      return [];
    }
  }

  async cancelRequest(userId: string, targetId: string) {
    const mongoRes = await this.connectionModel.deleteOne({
      senderId: userId,
      receiverId: targetId,
      status: 'pending',
    });

    let neoDeleted = 0;
    try {
      const query = `
        MATCH (u:User {id: $userId, tenantId: $tenantId})-[r:CONNECTED_TO {status: 'pending'}]->(t:User {id: $targetId, tenantId: $tenantId})
        DELETE r
        RETURN count(r) AS cnt
      `;
      const result = await this.neo4j.run(query, { userId, targetId });
      neoDeleted = result.records[0]?.get('cnt')?.toNumber() || 0;
    } catch (neoErr) {
      this.logger.warn(`Neo4j cancelRequest failed: ${neoErr}`);
    }

    if (mongoRes.deletedCount === 0 && neoDeleted === 0) {
      throw new NotFoundException('Pending connection request not found.');
    }

    return { message: 'Connection request cancelled successfully.' };
  }

  async respondToRequest(
    userId: string,
    senderId: string,
    action: 'accept' | 'reject'
  ) {
    // 1. Process in MongoDB
    const conn = await this.connectionModel
      .findOne({
        senderId,
        receiverId: userId,
        status: 'pending',
      })
      .exec();

    if (conn) {
      if (action === 'accept') {
        conn.status = 'accepted';
        conn.accepted_at = new Date();
        await conn.save();

        // Best effort Neo4j sync
        try {
          await this.neo4j.run(
            `MATCH (u:User {id: $senderId, tenantId: $tenantId})-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId, tenantId: $tenantId})
             SET r.status = 'accepted', r.accepted_at = datetime()
             MERGE (u)-[f1:FOLLOWS]->(me)
             ON CREATE SET f1.created_at = datetime()
             MERGE (me)-[f2:FOLLOWS]->(u)
             ON CREATE SET f2.created_at = datetime()`,
            { userId, senderId }
          );
        } catch {}

        // Notification to sender
        const responder = await this.userAuthModel
          .findOne({ userId })
          .lean()
          .exec();
        try {
          await this.notification.createNotification(
            senderId,
            `${responder?.display_name || responder?.username || 'User'} accepted your connection request.`,
            'connection_accepted',
            {
              sender_username: responder?.username,
              sender_display_name: responder?.display_name || responder?.username,
              sender_profile_picture: responder?.profile_picture || undefined,
              reference_link: '/network',
            }
          );
        } catch {}

        return { message: 'Connection request accepted.' };
      } else {
        await this.connectionModel.deleteOne({ _id: conn._id });

        try {
          await this.neo4j.run(
            `MATCH (u:User {id: $senderId, tenantId: $tenantId})-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId, tenantId: $tenantId})
             DELETE r RETURN count(r) AS cnt`,
            { userId, senderId }
          );
        } catch {}

        return { message: 'Connection request rejected.' };
      }
    }

    // 2. Fallback to Neo4j if not in Mongo
    try {
      if (action === 'accept') {
        const result = await this.neo4j.run(
          `MATCH (u:User {id: $senderId, tenantId: $tenantId})-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId, tenantId: $tenantId})
           SET r.status = 'accepted', r.accepted_at = datetime()
           MERGE (u)-[f1:FOLLOWS]->(me)
           ON CREATE SET f1.created_at = datetime()
           MERGE (me)-[f2:FOLLOWS]->(u)
           ON CREATE SET f2.created_at = datetime()
           RETURN r`,
          { userId, senderId }
        );
        if (!result.records.length) {
          throw new NotFoundException('Connection request not found.');
        }

        const responder = await this.userAuthModel
          .findOne({ userId })
          .lean()
          .exec();
        try {
          await this.notification.createNotification(
            senderId,
            `${responder?.display_name || responder?.username || 'User'} accepted your connection request.`,
            'connection_accepted',
            {
              sender_username: responder?.username,
              sender_display_name: responder?.display_name || responder?.username,
              sender_profile_picture: responder?.profile_picture || undefined,
              reference_link: '/network',
            }
          );
        } catch {}

        return { message: 'Connection request accepted.' };
      } else {
        const result = await this.neo4j.run(
          `MATCH (u:User {id: $senderId, tenantId: $tenantId})-[r:CONNECTED_TO {status: 'pending'}]->(me:User {id: $userId, tenantId: $tenantId})
           DELETE r RETURN count(r) AS cnt`,
          { userId, senderId }
        );
        if (result.records[0]?.get('cnt')?.toNumber() === 0) {
          throw new NotFoundException('Connection request not found.');
        }
        return { message: 'Connection request rejected.' };
      }
    } catch (neoErr: any) {
      if (neoErr instanceof NotFoundException) throw neoErr;
      throw new NotFoundException('Connection request not found.');
    }
  }

  async followUser(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new ForbiddenException('Cannot follow yourself.');
    }

    const follower = await this.userAuthModel.findOne({ userId }).lean().exec();
    const target = await this.userAuthModel.findOne({ userId: targetId }).lean().exec();

    if (!target) throw new NotFoundException('Target user not found.');

    try {
      await this.neo4j.run(
        `MATCH (u:User {id: $userId, tenantId: $tenantId}), (t:User {id: $targetId, tenantId: $tenantId})
         MERGE (u)-[r:FOLLOWS]->(t)
         ON CREATE SET r.created_at = datetime()`,
        { userId, targetId }
      );
    } catch (neoErr) {
      this.logger.warn(`Neo4j followUser failed: ${neoErr}`);
    }

    if (follower) {
      try {
        await this.notification.createNotification(
          targetId,
          `${follower.display_name || follower.username} started following you.`,
          'new_follower',
          {
            sender_username: follower.username,
            sender_display_name: follower.display_name || follower.username,
            sender_profile_picture: follower.profile_picture || undefined,
            reference_link: `/profile/${follower.username}`,
          }
        );
      } catch {}
    }

    return { message: 'Successfully followed user.' };
  }

  async unfollowUser(userId: string, targetId: string) {
    try {
      const result = await this.neo4j.run(
        `MATCH (u:User {id: $userId, tenantId: $tenantId})-[r:FOLLOWS]->(t:User {id: $targetId, tenantId: $tenantId})
         DELETE r
         RETURN count(r) AS cnt`,
        { userId, targetId }
      );

      if (result.records[0]?.get('cnt')?.toNumber() === 0) {
        throw new NotFoundException('You are not following this user.');
      }
    } catch (neoErr: any) {
      if (neoErr instanceof NotFoundException) throw neoErr;
      this.logger.warn(`Neo4j unfollowUser failed: ${neoErr}`);
    }

    return { message: 'Successfully unfollowed user.' };
  }

  async getFollowers(targetId: string) {
    try {
      const result = await this.neo4j.run(
        `MATCH (f:User {tenantId: $tenantId})-[r:FOLLOWS]->(u:User {id: $targetId, tenantId: $tenantId})
         WHERE ${ACTIVE_USER('f')} AND NOT f.role IN ['admin', 'moderator']
         RETURN f.id AS id, f.display_name AS display_name, f.username AS username,
                f.profile_picture AS profile_picture, f.role AS role, f.bio AS bio`,
        { targetId }
      );

      return result.records.map((r) => ({
        id: r.get('id'),
        display_name: r.get('display_name'),
        username: r.get('username'),
        profile_picture: r.get('profile_picture'),
        role: r.get('role'),
        bio: r.get('bio'),
      }));
    } catch {
      return [];
    }
  }

  async getFollowing(userId: string) {
    try {
      const result = await this.neo4j.run(
        `MATCH (u:User {id: $userId, tenantId: $tenantId})-[r:FOLLOWS]->(f:User {tenantId: $tenantId})
         WHERE ${ACTIVE_USER('f')} AND NOT f.role IN ['admin', 'moderator']
         RETURN f.id AS id, f.display_name AS display_name, f.username AS username,
                f.profile_picture AS profile_picture, f.role AS role, f.bio AS bio`,
        { userId }
      );

      return result.records.map((r) => ({
        id: r.get('id'),
        display_name: r.get('display_name'),
        username: r.get('username'),
        profile_picture: r.get('profile_picture'),
        role: r.get('role'),
        bio: r.get('bio'),
      }));
    } catch {
      return [];
    }
  }

  async blockUser(userId: string, targetId: string) {
    if (userId === targetId) {
      throw new ForbiddenException('Cannot block yourself.');
    }

    const targetCheck = await this.userAuthModel
      .findOne({ userId: targetId })
      .lean()
      .exec();
    if (!targetCheck) throw new NotFoundException('Target user not found.');

    try {
      await this.neo4j.run(
        `MATCH (u:User {id: $userId, tenantId: $tenantId}), (t:User {id: $targetId, tenantId: $tenantId})
         MERGE (u)-[r:BLOCKED]->(t)
         ON CREATE SET r.created_at = datetime()`,
        { userId, targetId }
      );
    } catch {}

    return { message: 'User blocked successfully.' };
  }

  async unblockUser(userId: string, targetId: string) {
    try {
      const result = await this.neo4j.run(
        `MATCH (u:User {id: $userId, tenantId: $tenantId})-[r:BLOCKED]->(t:User {id: $targetId, tenantId: $tenantId})
         DELETE r
         RETURN count(r) AS cnt`,
        { userId, targetId }
      );

      if (result.records[0]?.get('cnt')?.toNumber() === 0) {
        throw new NotFoundException('Block record not found.');
      }
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
    }

    return { message: 'User unblocked successfully.' };
  }

  async isBlocked(userId: string, targetId: string): Promise<boolean> {
    try {
      const result = await this.neo4j.run(
        `MATCH (u1:User {id: $userId, tenantId: $tenantId})
         MATCH (u2:User {id: $targetId, tenantId: $tenantId})
         RETURN EXISTS((u1)-[:BLOCKED]-(u2)) AS blocked`,
        { userId, targetId }
      );
      return result.records[0]?.get('blocked') || false;
    } catch {
      return false;
    }
  }

  async getBlockedUsers(userId: string) {
    try {
      const result = await this.neo4j.run(
        `MATCH (me:User {id: $userId, tenantId: $tenantId})-[r:BLOCKED]->(u:User {tenantId: $tenantId})
         WHERE ${ACTIVE_USER('u')} AND NOT u.role IN ['admin', 'moderator']
         RETURN u.id AS id, u.display_name AS display_name, u.username AS username,
                u.profile_picture AS profile_picture, u.role AS role, r.created_at AS blocked_at`,
        { userId }
      );

      return result.records.map((r) => ({
        id: r.get('id'),
        display_name: r.get('display_name'),
        username: r.get('username'),
        profile_picture: r.get('profile_picture'),
        role: r.get('role'),
        blocked_at: r.get('blocked_at'),
      }));
    } catch {
      return [];
    }
  }
}
