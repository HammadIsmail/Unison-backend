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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
const admin_dto_1 = require("./dto/admin.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
let AdminController = class AdminController {
    adminService;
    constructor(adminService) {
        this.adminService = adminService;
    }
    getPendingAccounts() {
        return this.adminService.getPendingAccounts();
    }
    approveAccount(id) {
        return this.adminService.approveAccount(id);
    }
    rejectAccount(id, dto) {
        return this.adminService.rejectAccount(id, dto);
    }
    getDashboardStats() {
        return this.adminService.getDashboardStats();
    }
    getAllAlumni(page = '1', limit = '10', search = '') {
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const validatedSearch = search === 'string' ? '' : search;
        return this.adminService.getAllAlumni(isNaN(pageNum) ? 1 : pageNum, isNaN(limitNum) ? 10 : limitNum, validatedSearch);
    }
    getAllStudents(page = '1', limit = '10', search = '') {
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const validatedSearch = search === 'string' ? '' : search;
        return this.adminService.getAllStudents(isNaN(pageNum) ? 1 : pageNum, isNaN(limitNum) ? 10 : limitNum, validatedSearch);
    }
    removeAccount(id) {
        return this.adminService.removeAccount(id);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('pending-accounts'),
    (0, swagger_1.ApiOperation)({ summary: 'List all accounts pending approval' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPendingAccounts", null);
__decorate([
    (0, common_1.Patch)('approve-account/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a pending account' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "approveAccount", null);
__decorate([
    (0, common_1.Patch)('reject-account/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a pending account request' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, admin_dto_1.RejectAccountDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "rejectAccount", null);
__decorate([
    (0, common_1.Get)('dashboard-stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get overall dashboard statistics' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)('all-alumni'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all approved alumni with pagination' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default: 10)' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, type: String, description: 'Search by name' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllAlumni", null);
__decorate([
    (0, common_1.Get)('all-students'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all approved students with pagination' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default: 10)' }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false, type: String, description: 'Search by name' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAllStudents", null);
__decorate([
    (0, common_1.Delete)('remove-account/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Completely remove an account' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "removeAccount", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map