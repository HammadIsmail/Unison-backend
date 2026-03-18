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
exports.OpportunityController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const opportunity_service_1 = require("./opportunity.service");
const opportunity_dto_1 = require("./dto/opportunity.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const get_user_decorator_1 = require("../common/decorators/get-user.decorator");
let OpportunityController = class OpportunityController {
    opportunityService;
    constructor(opportunityService) {
        this.opportunityService = opportunityService;
    }
    create(userId, dto) {
        return this.opportunityService.create(userId, dto);
    }
    findAll(page, limit, type, skill, is_remote) {
        const pageNum = page ? parseInt(page, 10) : 1;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.opportunityService.findAll(isNaN(pageNum) ? 1 : pageNum, isNaN(limitNum) ? 10 : limitNum, type, skill, is_remote);
    }
    findMyPosts(userId) {
        return this.opportunityService.findMyPosts(userId);
    }
    findOne(id) {
        return this.opportunityService.findOne(id);
    }
    update(userId, role, id, dto) {
        return this.opportunityService.update(userId, role, id, dto);
    }
    remove(userId, role, id) {
        return this.opportunityService.remove(userId, role, id);
    }
};
exports.OpportunityController = OpportunityController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new opportunity (Alumni only)' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, opportunity_dto_1.CreateOpportunityDto]),
    __metadata("design:returntype", void 0)
], OpportunityController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all opportunities with filtering and pagination' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default: 10)' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false, type: String, description: 'Filter by type (job, internship, freelance)' }),
    (0, swagger_1.ApiQuery)({ name: 'skill', required: false, type: String, description: 'Filter by required skill' }),
    (0, swagger_1.ApiQuery)({ name: 'is_remote', required: false, type: Boolean, description: 'Filter by remote status' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('skill')),
    __param(4, (0, common_1.Query)('is_remote')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], OpportunityController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('my-posts'),
    (0, roles_decorator_1.Roles)('alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Get opportunities posted by the current user' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OpportunityController.prototype, "findMyPosts", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single opportunity by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OpportunityController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update an opportunity (Owner or Admin only)' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __param(1, (0, get_user_decorator_1.GetUser)('role')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, opportunity_dto_1.UpdateOpportunityDto]),
    __metadata("design:returntype", void 0)
], OpportunityController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete an opportunity (Owner or Admin only)' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __param(1, (0, get_user_decorator_1.GetUser)('role')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], OpportunityController.prototype, "remove", null);
exports.OpportunityController = OpportunityController = __decorate([
    (0, swagger_1.ApiTags)('Opportunities'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('opportunities'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [opportunity_service_1.OpportunityService])
], OpportunityController);
//# sourceMappingURL=opportunity.controller.js.map