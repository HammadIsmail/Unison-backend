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
exports.AddStudentSkillDto = exports.UpdateStudentProfileDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateStudentProfileDto {
    phone;
    bio;
    profile_picture;
}
exports.UpdateStudentProfileDto = UpdateStudentProfileDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Phone number' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateStudentProfileDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'A short bio of the student' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateStudentProfileDto.prototype, "bio", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Profile picture URL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateStudentProfileDto.prototype, "profile_picture", void 0);
class AddStudentSkillDto {
    skill_name;
    category;
    proficiency_level;
}
exports.AddStudentSkillDto = AddStudentSkillDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Name of the skill' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddStudentSkillDto.prototype, "skill_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Skill category (e.g. Programming, Soft Skills)' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddStudentSkillDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Proficiency level', enum: ['beginner', 'intermediate', 'expert'] }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(['beginner', 'intermediate', 'expert']),
    __metadata("design:type", String)
], AddStudentSkillDto.prototype, "proficiency_level", void 0);
//# sourceMappingURL=student.dto.js.map