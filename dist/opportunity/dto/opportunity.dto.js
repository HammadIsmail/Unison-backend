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
exports.UpdateOpportunityDto = exports.CreateOpportunityDto = exports.OpportunityStatus = exports.OpportunityType = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var OpportunityType;
(function (OpportunityType) {
    OpportunityType["JOB"] = "job";
    OpportunityType["INTERNSHIP"] = "internship";
    OpportunityType["FREELANCE"] = "freelance";
})(OpportunityType || (exports.OpportunityType = OpportunityType = {}));
var OpportunityStatus;
(function (OpportunityStatus) {
    OpportunityStatus["OPEN"] = "open";
    OpportunityStatus["CLOSED"] = "closed";
})(OpportunityStatus || (exports.OpportunityStatus = OpportunityStatus = {}));
class CreateOpportunityDto {
    title;
    type;
    description;
    requirements;
    location;
    is_remote;
    deadline;
    company_name;
    apply_link;
    required_skills;
}
exports.CreateOpportunityDto = CreateOpportunityDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Title of the opportunity' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateOpportunityDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Type of opportunity', enum: OpportunityType }),
    (0, class_validator_1.IsEnum)(OpportunityType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateOpportunityDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Detailed description of the opportunity' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateOpportunityDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Requirements for the opportunity' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateOpportunityDto.prototype, "requirements", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Location (e.g. Faisalabad, Remote)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateOpportunityDto.prototype, "location", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether the opportunity is remote' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Boolean)
], CreateOpportunityDto.prototype, "is_remote", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Deadline for applications', example: '2023-12-31' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateOpportunityDto.prototype, "deadline", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Name of the posting company' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateOpportunityDto.prototype, "company_name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Direct link to apply' }),
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateOpportunityDto.prototype, "apply_link", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'List of required skills', type: [String] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Array)
], CreateOpportunityDto.prototype, "required_skills", void 0);
class UpdateOpportunityDto {
    title;
    description;
    apply_link;
    deadline;
    status;
}
exports.UpdateOpportunityDto = UpdateOpportunityDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Updated title' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateOpportunityDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Updated description' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateOpportunityDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Updated application link' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateOpportunityDto.prototype, "apply_link", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Updated deadline', example: '2024-01-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateOpportunityDto.prototype, "deadline", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Updated status', enum: OpportunityStatus }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(OpportunityStatus),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], UpdateOpportunityDto.prototype, "status", void 0);
//# sourceMappingURL=opportunity.dto.js.map