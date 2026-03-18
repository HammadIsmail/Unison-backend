import { Neo4jService } from '../neo4j/neo4j.service';
export declare class NotificationService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    getUserNotifications(userId: string): Promise<{
        id: any;
        message: any;
        type: any;
        created_at: any;
        is_read: any;
    }[]>;
    markAsRead(userId: string, notificationId: string): Promise<{
        message: string;
    }>;
}
