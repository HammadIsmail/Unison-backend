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

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationGateway');
  private userSockets: Map<string, string[]> = new Map(); // userId -> socketIds[]

  constructor(private readonly jwtService: JwtService) {}

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

      // Add socket ID to user sockets map
      const sockets = this.userSockets.get(userId) || [];
      sockets.push(client.id);
      this.userSockets.set(userId, sockets);

      client.data.userId = userId;
      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (err) {
      this.logger.error(`Connection authentication failed for ${client.id}: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      const updatedSockets = sockets.filter((id) => id !== client.id);
      
      if (updatedSockets.length === 0) {
        this.userSockets.delete(userId);
      } else {
        this.userSockets.set(userId, updatedSockets);
      }
      this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);
    }
  }

  sendToUser(userId: string, event: string, data: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.length > 0) {
      socketIds.forEach((id) => {
        this.server.to(id).emit(event, data);
      });
      this.logger.debug(`Notification emitted to User ${userId}: ${event}`);
      return true;
    }
    this.logger.debug(`User ${userId} is offline. Notification not emitted.`);
    return false;
  }

  private extractToken(client: Socket): string | null {
    // 1. Check handshake.auth (The standard way for Socket.io v4+)
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // 2. Try to get token from handshake headers
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    
    // 3. Try to get token from query
    const queryToken = client.handshake.query.token;
    if (typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }
}
