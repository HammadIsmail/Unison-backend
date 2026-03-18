"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const neo4j_service_1 = require("../neo4j/neo4j.service");
let NotificationService = class NotificationService {
    neo4j;
    constructor(neo4j) {
        this.neo4j = neo4j;
    }
    async getUserNotifications(userId) {
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
    async markAsRead(userId, notificationId) {
        const query = `
      MATCH (u:User {id: $userId})<-[:FOR]-(n:Notification {id: $notificationId})
      SET n.is_read = true
      RETURN n
    `;
        const result = await this.neo4j.run(query, { userId, notificationId });
        if (!result.records.length) {
            throw new common_1.NotFoundException('Notification not found.');
        }
        return { message: 'Notification marked as read.' };
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map