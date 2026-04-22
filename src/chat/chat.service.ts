import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation } from './schemas/conversation.schema';
import { Message } from './schemas/message.schema';
import { ConnectionsService } from '../connections/connections.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationService } from '../notification/notification.service';
import { Neo4jService } from '../neo4j/neo4j.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private readonly connectionsService: ConnectionsService,
    private readonly notificationGateway: NotificationGateway,
    private readonly notificationService: NotificationService,
    private readonly neo4jService: Neo4jService,
  ) {}

  async sendMessage(senderId: string, receiverId: string, content: string) {
    if (senderId === receiverId) {
      throw new ForbiddenException('Cannot send a message to yourself.');
    }

    // Verify connection status
    const statusObj = await this.connectionsService.getConnectionStatus(senderId, receiverId);
    if (statusObj.status !== 'connected') {
      throw new ForbiddenException('You can only message your connected network.');
    }

    // Find or create conversation
    let conversation = await this.conversationModel.findOne({
      participants: { $all: [senderId, receiverId], $size: 2 },
    });

    if (!conversation) {
      conversation = new this.conversationModel({
        participants: [senderId, receiverId],
      });
      await conversation.save();
    }

    // Create the message
    const newMessage = new this.messageModel({
      conversationId: conversation._id,
      senderId,
      content,
    });
    
    await newMessage.save();

    // Update conversation last message
    conversation.lastMessage = newMessage._id as any;
    await conversation.save();

    // Broadcast via WebSocket
    this.notificationGateway.sendToUser(receiverId, 'new_message', {
      _id: newMessage._id,
      conversationId: conversation._id,
      senderId,
      content,
      createdAt: (newMessage as any).createdAt,
      isRead: false,
    });

    const userResult = await this.neo4jService.run(
      `MATCH (u:User {id: $senderId}) RETURN u.username AS username, u.display_name AS name, u.profile_picture AS pic`, 
      { senderId }
    );

    if (userResult.records.length > 0) {
      const sender = userResult.records[0].toObject();
      await this.notificationService.createNotification(
        receiverId,
        `New message from ${sender.name}`,
        'new_message',
        {
          sender_username: sender.username,
          sender_display_name: sender.name,
          sender_profile_picture: sender.pic,
          reference_link: `/chat/${senderId}`
        }
      );
    }

    return newMessage;
  }

  async getConversations(userId: string) {
    const conversations = await this.conversationModel
      .find({ participants: userId })
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .exec();

    // Attach basic Neo4j profile info of the other participant
    // Since this is a fast loop, we'll collect IDs and fetch in bulk
    const otherParticipantIds = conversations.map(c => 
      c.participants.find(p => p !== userId)
    ).filter(id => !!id);

    let userDict = {};
    if (otherParticipantIds.length > 0) {
      const result = await this.neo4jService.run(
        `MATCH (u:User) WHERE u.id IN $ids 
         RETURN u.id AS id, u.display_name AS display_name, u.profile_picture AS profile_picture, u.username AS username`,
        { ids: otherParticipantIds }
      );
      
      result.records.forEach(r => {
        userDict[r.get('id')] = {
          id: r.get('id'),
          display_name: r.get('display_name'),
          profile_picture: r.get('profile_picture'),
          username: r.get('username')
        };
      });
    }

    return conversations.map(c => {
      const otherId = c.participants.find(p => p !== userId) || userId;
      const cObj = c.toObject();
      return {
        ...cObj,
        participantProfile: userDict[otherId] || null,
      };
    });
  }

  async getMessages(userId: string, targetParticipantId: string) {
    // Optionally check if they are still connected, but allowing history read even if disconnected is common.
    // For privacy, we only allow fetching if they were part of it
    const conversation = await this.conversationModel.findOne({
      participants: { $all: [userId, targetParticipantId], $size: 2 },
    });

    if (!conversation) {
      return [];
    }

    const messages = await this.messageModel
      .find({ conversationId: conversation._id })
      .sort({ createdAt: 1 }) // Chronological order
      .exec();

    return messages;
  }

  async markAsRead(userId: string, messageId: string) {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    // Ensure the message does not belong to the sender (meaning the reader is the receiver)
    if (message.senderId === userId) {
      return { success: true }; // Already belongs to sender, can't mark their own message as read for the receiver.
    }

    message.isRead = true;
    await message.save();

    return { success: true };
  }
}
