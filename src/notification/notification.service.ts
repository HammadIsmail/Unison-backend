import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationGateway } from './notification.gateway';
import { Notification } from './schemas/notification.schema';

export interface NotificationMetadata {
  sender_username?: string;
  sender_display_name?: string;
  sender_profile_picture?: string;
  reference_link?: string;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
    private readonly gateway: NotificationGateway,
  ) { }

  async getUserNotifications(userId: string, readStatus?: string) {
    let filter: any = { recipientId: userId };
    if (readStatus === 'true') filter.is_read = true;
    else if (readStatus === 'false') filter.is_read = false;

    const notifications = await this.notificationModel
      .find(filter)
      .sort({ created_at: -1 })
      .exec();

    return notifications.map(n => ({
      id: n._id,
      message: n.message,
      type: n.type,
      created_at: n.created_at,
      is_read: n.is_read,
      sender_username: n.sender_username || null,
      sender_display_name: n.sender_display_name || null,
      sender_profile_picture: n.sender_profile_picture || null,
      reference_link: (['new_opportunity', 'connection_request', 'new_message'].includes(n.type)) ? (n.reference_link || null) : undefined,
    }));
  }

  async markAsRead(userId: string, notificationId: string) {
    const result = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, recipientId: userId },
      { is_read: true },
      { new: true }
    );

    if (!result) {
      throw new NotFoundException('Notification not found.');
    }
    return { message: 'Notification marked as read.' };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const result = await this.notificationModel.findOneAndDelete({
      _id: notificationId,
      recipientId: userId,
    });

    if (!result) {
      throw new NotFoundException('Notification not found.');
    }
    return { message: 'Notification deleted successfully.' };
  }

  async deleteAllNotifications(userId: string) {
    await this.notificationModel.deleteMany({ recipientId: userId });
    return { message: 'All notifications cleared.' };
  }

  async createNotification(userId: string, message: string, type: string, metadata?: NotificationMetadata) {
    const notification = await this.notificationModel.create({
      recipientId: userId,
      message,
      type,
      sender_username: metadata?.sender_username,
      sender_display_name: metadata?.sender_display_name,
      sender_profile_picture: metadata?.sender_profile_picture,
      reference_link: metadata?.reference_link,
    }) as Notification;

    // Push real-time via gateway
    this.gateway.sendToUser(userId, 'notification', {
      id: notification._id,
      message,
      type,
      created_at: notification.created_at,
      is_read: false,
      sender_username: metadata?.sender_username || null,
      sender_display_name: metadata?.sender_display_name || null,
      sender_profile_picture: metadata?.sender_profile_picture || null,
      reference_link: (['new_opportunity', 'connection_request', 'new_message'].includes(type)) ? (metadata?.reference_link || null) : undefined
    });

    return { id: notification._id, message, type, created_at: notification.created_at };
  }
}
