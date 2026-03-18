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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlumniController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const alumni_service_1 = require("./alumni.service");
const alumni_dto_1 = require("./dto/alumni.dto");
const connection_dto_1 = require("./dto/connection.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const get_user_decorator_1 = require("../common/decorators/get-user.decorator");
let AlumniController = class AlumniController {
    alumniService;
    constructor(alumniService) {
        this.alumniService = alumniService;
    }
    getMe(userId) {
        return this.alumniService.getProfile(userId);
    }
    updateMe(userId, dto) {
        return this.alumniService.updateProfile(userId, dto);
    }
    addWorkExperience(userId, dto) {
        return this.alumniService.addWorkExperience(userId, dto);
    }
    updateWorkExperience(userId, expId, dto) {
        return this.alumniService.updateWorkExperience(userId, expId, dto);
    }
    deleteWorkExperience(userId, expId) {
        return this.alumniService.deleteWorkExperience(userId, expId);
    }
    addSkill(userId, dto) {
        return this.alumniService.addSkill(userId, dto);
    }
    deleteSkill(userId, skillId) {
        return this.alumniService.deleteSkill(userId, skillId);
    }
    getNetwork(userId) {
        return this.alumniService.getNetwork(userId);
    }
    connectWith(userId, targetId, dto) {
        return this.alumniService.connectWith(userId, targetId, dto);
    }
    getPendingRequests(userId) {
        return this.alumniService.getPendingRequests(userId);
    }
    respondToRequest(userId, senderId, dto) {
        return this.alumniService.respondToRequest(userId, senderId, dto.action);
    }
    getBatchMates(userId) {
        return this.alumniService.getBatchMates(userId);
    }
};
exports.AlumniController = AlumniController;
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Get your own alumni profile' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AlumniController.prototype, "getMe", null);
__decorate([
    (0, common_1.Put)('me'),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Update your own alumni profile' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, alumni_dto_1.UpdateAlumniProfileDto]),
    __metadata("design:returntype", void 0)
], AlumniController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Post)('work-experience'),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a new work experience record' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, alumni_dto_1.CreateWorkExperienceDto]),
    __metadata("design:returntype", void 0)
], AlumniController.prototype, "addWorkExperience", null);
__decorate([
    (0, common_1.Put)('work-experience/:id'),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an existing work experience record' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, alumni_dto_1.UpdateWorkExperienceDto]),
    __metadata("design:returntype", void 0)
], AlumniController.prototype, "updateWorkExperience", null);
__decorate([
    (0, common_1.Delete)('work-experience/:id'),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a work experience record' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AlumniController.prototype, "deleteWorkExperience", null);
__decorate([
    (0, common_1.Post)('skills'),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a new skill to your profile' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, alumni_dto_1.AddSkillDto]),
    __metadata("design:returntype", void 0)
], AlumniController.prototype, "addSkill", null);
__decorate([
    (0, common_1.Delete)('skills/:skill_id'),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a skill from your profile' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __param(1, (0, common_1.Param)('skill_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AlumniController.prototype, "deleteSkill", null);
__decorate([
    (0, common_1.Get)('network'),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Get your professional network' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AlumniController.prototype, "getNetwork", null);
__decorate([
    (0, common_1.Post)('connect/:target_id'),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a connection request to another user' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __param(1, (0, common_1.Param)('target_id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, alumni_dto_1.ConnectDto]),
    __metadata("design:returntype", void 0)
], AlumniController.prototype, "connectWith", null);
__decorate([
    (0, common_1.Get)('connections/requests'),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Get pending connection requests' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AlumniController.prototype, "getPendingRequests", null);
__decorate([
    (0, common_1.Patch)('connections/requests/:sender_id/respond'),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Respond to a connection request' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __param(1, (0, common_1.Param)('sender_id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, connection_dto_1.RespondToConnectionDto]),
    __metadata("design:returntype", void 0)
], AlumniController.prototype, "respondToRequest", null);
__decorate([
    (0, common_1.Get)('batch-mates'),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Find your batch mates' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AlumniController.prototype, "getBatchMates", null);
exports.AlumniController = AlumniController = __decorate([
    (0, swagger_1.ApiTags)('Alumni'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('alumni'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [alumni_service_1.AlumniService])
], AlumniController);
//# sourceMappingURL=alumni.controller.js.map