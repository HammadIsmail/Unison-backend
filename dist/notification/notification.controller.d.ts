import { NotificationService } from './notification.service';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    getNotifications(userId: string): Promise<{
        id: any;
        message: any;
        type: any;
        created_at: any;
        is_read: any;
    }[]>;
    markAsRead(userId: string, id: string): Promise<{
        message: string;
    }>;
}
