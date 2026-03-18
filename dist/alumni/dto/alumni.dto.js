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
exports.ConnectDto = exports.AddSkillDto = exports.UpdateWorkExperienceDto = exports.CreateWorkExperienceDto = exports.UpdateAlumniProfileDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class UpdateAlumniProfileDto {
    bio;
    linkedin_url;
    phone;
    profile_picture;
}
exports.UpdateAlumniProfileDto = UpdateAlumniProfileDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'A short bio of the alumni' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAlumniProfileDto.prototype, "bio", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'LinkedIn profile URL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAlumniProfileDto.prototype, "linkedin_url", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Phone number' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAlumniProfileDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Profile picture URL' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateAlumniProfileDto.prototype, "profile_picture", void 0);
class CreateWorkExperienceDto {
    company_name;
    role;
    start_date;
    end_date;
    is_current;
    employment_type;
}
exports.CreateWorkExperienceDto = CreateWorkExperienceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Name of the company' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWorkExperienceDto.prototype, "company_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Job role or title' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateWorkExperienceDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Start date of the work experience', example: '2023-01-01' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateWorkExperienceDto.prototype, "start_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'End date of the work experience', example: '2023-12-31' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateWorkExperienceDto.prototype, "end_date", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether this is the current job' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateWorkExperienceDto.prototype, "is_current", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Employment type', enum: ['full-time', 'part-time', 'freelance'] }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(['full-time', 'part-time', 'freelance']),
    __metadata("design:type", String)
], CreateWorkExperienceDto.prototype, "employment_type", void 0);
class UpdateWorkExperienceDto {
    role;
    end_date;
    is_current;
}
exports.UpdateWorkExperienceDto = UpdateWorkExperienceDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Updated job role or title' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateWorkExperienceDto.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Updated end date', example: '2024-01-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateWorkExperienceDto.prototype, "end_date", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Whether this is now the current job' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateWorkExperienceDto.prototype, "is_current", void 0);
class AddSkillDto {
    skill_name;
    category;
    proficiency_level;
    years_experience;
}
exports.AddSkillDto = AddSkillDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Name of the skill' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddSkillDto.prototype, "skill_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Skill category (e.g. Programming, Soft Skills)' }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddSkillDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Proficiency level', enum: ['beginner', 'intermediate', 'expert'] }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(['beginner', 'intermediate', 'expert']),
    __metadata("design:type", String)
], AddSkillDto.prototype, "proficiency_level", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Years of experience in this skill' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], AddSkillDto.prototype, "years_experience", void 0);
class ConnectDto {
    connection_type;
}
exports.ConnectDto = ConnectDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Type of connection', enum: ['batchmate', 'colleague', 'mentor'] }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(['batchmate', 'colleague', 'mentor']),
    __metadata("design:type", String)
], ConnectDto.prototype, "connection_type", void 0);
//# sourceMappingURL=alumni.dto.js.map