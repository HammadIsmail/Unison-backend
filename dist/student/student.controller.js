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
exports.StudentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const student_service_1 = require("./student.service");
const student_dto_1 = require("./dto/student.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const get_user_decorator_1 = require("../common/decorators/get-user.decorator");
let StudentController = class StudentController {
    studentService;
    constructor(studentService) {
        this.studentService = studentService;
    }
    getMe(userId) {
        return this.studentService.getProfile(userId);
    }
    updateMe(userId, dto) {
        return this.studentService.updateProfile(userId, dto);
    }
    addSkill(userId, dto) {
        return this.studentService.addSkill(userId, dto);
    }
    getMentors(userId) {
        return this.studentService.getMentors(userId);
    }
};
exports.StudentController = StudentController;
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)('student'),
    (0, swagger_1.ApiOperation)({ summary: 'Get your own student profile' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudentController.prototype, "getMe", null);
__decorate([
    (0, common_1.Put)('me'),
    (0, roles_decorator_1.Roles)('student'),
    (0, swagger_1.ApiOperation)({ summary: 'Update your own student profile' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, student_dto_1.UpdateStudentProfileDto]),
    __metadata("design:returntype", void 0)
], StudentController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Post)('skills'),
    (0, roles_decorator_1.Roles)('student'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a new skill to your profile' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, student_dto_1.AddStudentSkillDto]),
    __metadata("design:returntype", void 0)
], StudentController.prototype, "addSkill", null);
__decorate([
    (0, common_1.Get)('mentors'),
    (0, roles_decorator_1.Roles)('student'),
    (0, swagger_1.ApiOperation)({ summary: 'Get list of suggested mentors' }),
    __param(0, (0, get_user_decorator_1.GetUser)('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StudentController.prototype, "getMentors", null);
exports.StudentController = StudentController = __decorate([
    (0, swagger_1.ApiTags)('Student'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('student'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [student_service_1.StudentService])
], StudentController);
//# sourceMappingURL=student.controller.js.map