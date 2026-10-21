import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Neo4jService } from '../neo4j/neo4j.service';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['https://unison-lovat.vercel.app', 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationGateway');
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]

  constructor(
    private readonly jwtService: JwtService,
    private readonly neo4jService: Neo4jService,
    private readonly tenantsService: TenantsService,
    private readonly cls: ClsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`No token provided for connection ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;

      if (!userId) {
        this.logger.warn(`Invalid payload for connection ${client.id}`);
        client.disconnect();
        return;
      }

      if (payload.role === 'super_admin') {
        client.data.userId = userId;
        client.data.role = 'super_admin';
        this.logger.log(`SuperAdmin connected to websocket: ${client.id}`);
        return;
      }

      // Non-super-admin MUST have tenantId
      const tenantId = payload.tenantId;
      if (!tenantId) {
        this.logger.warn(`Token without tenantId rejected for connection ${client.id}`);
        client.disconnect();
        return;
      }

      // Check tenant suspension
      const tenant = await this.tenantsService.getTenantById(tenantId);
      if (!tenant || tenant.status === 'suspended') {
        this.logger.warn(`Connection rejected: Tenant ${tenantId} is inactive or suspended`);
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      client.data.tenantId = tenantId;
      client.data.role = payload.role;

      // Join tenant rooms
      client.join(`tenant:${tenantId}`);
      client.join(`tenant:${tenantId}:user:${userId}`);

      // Add socket ID to user sockets map
      const sockets = this.userSockets.get(userId) || [];
      sockets.push(client.id);
      this.userSockets.set(userId, sockets);

      this.logger.log(`Client connected: ${client.id} (User: ${userId}, Tenant: ${tenantId})`);

      // If first socket, mark as online
      if (sockets.length === 1) {
        await this.updateOnlineStatus(userId, tenantId, true);
      }
    } catch (err: any) {
      this.logger.error(`Connection authentication failed for ${client.id}: ${err?.message || err}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    const tenantId = client.data?.tenantId;

    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      const updatedSockets = sockets.filter((id) => id !== client.id);

      if (updatedSockets.length === 0) {
        this.userSockets.delete(userId);
        if (tenantId) {
          await this.updateOnlineStatus(userId, tenantId, false);
        }
      } else {
        this.userSockets.set(userId, updatedSockets);
      }
      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
    }
  }

  private async updateOnlineStatus(userId: string, tenantId: string, isOnline: boolean) {
    const now = new Date().toISOString();
    try {
      await this.cls.run(async () => {
        this.cls.set('tenantId', tenantId);

        await this.neo4jService.run(
          `MATCH (u:User {id: $userId, tenantId: $tenantId})
           SET u.is_online = $isOnline, u.last_seen = $now
           RETURN u`,
          { userId, tenantId, isOnline, now },
        );

        // Broadcast presence change ONLY to same-tenant connected friends
        const connectionsResult = await this.neo4jService.run(
          `MATCH (u:User {id: $userId, tenantId: $tenantId})-[:CONNECTED_TO]-(friend:User {tenantId: $tenantId})
           RETURN friend.id AS friendId`,
          { userId, tenantId },
        );

        const event = isOnline ? 'user_online' : 'user_offline';
        const data = { userId, last_seen: now };

        connectionsResult.records.forEach((record) => {
          const friendId = record.get('friendId');
          this.sendToTenantUser(tenantId, friendId, event, data);
        });
      });
    } catch (err: any) {
      this.logger.error(`Failed to update online status for user ${userId}: ${err?.message || err}`);
    }
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, payload: { receiverId: string; isTyping: boolean }) {
    const userId = client.data?.userId;
    const tenantId = client.data?.tenantId;
    if (!userId || !tenantId || !payload?.receiverId) return;

    this.sendToTenantUser(tenantId, payload.receiverId, 'typing_status', {
      senderId: userId,
      isTyping: payload.isTyping,
    });
  }

  sendToTenantUser(tenantId: string, userId: string, event: string, data: any): boolean {
    this.server.to(`tenant:${tenantId}:user:${userId}`).emit(event, data);
    this.logger.debug(`Notification emitted to tenant:${tenantId}:user:${userId} (${event})`);
    return true;
  }

  sendToTenant(tenantId: string, event: string, data: any): boolean {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
    this.logger.debug(`Notification broadcasted to tenant:${tenantId} (${event})`);
    return true;
  }

  // Backwards compatibility for existing code that calls sendToUser(userId, event, data)
  sendToUser(userId: string, event: string, data: any): boolean {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.length > 0) {
      socketIds.forEach((id) => {
        this.server.to(id).emit(event, data);
      });
      return true;
    }
    return false;
  }

  private extractToken(client: Socket): string | null {
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    const queryToken = client.handshake.query.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }
    return null;
  }
}
