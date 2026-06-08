import { Controller, Get, Put, Post, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AlumniService } from '../alumni/alumni.service';
import {
  CreateWorkExperienceDto,
  UpdateWorkExperienceDto,
  AddSkillDto,
  UpdateSkillDto,
  CreateEducationDto,
  UpdateEducationDto,
} from '../alumni/dto/alumni.dto';
import { UnifiedUpdateProfileDto } from './dto/profile-management.dto';
import { SuccessResponseDto } from '../common/dto/response.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Profile Management')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfileManagementController {
  constructor(private readonly alumniService: AlumniService) {}

  // ── Core Profile Update (unified for alumni, partner, & student) ───────────
  @Put('me')
  @Roles('alumni', 'partner', 'student')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profile_picture', maxCount: 1 },
      { name: 'backDropImage', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update core profile information (display_name, bio, etc.)' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  updateProfile(
    @GetUser('sub') userId: string,
    @Body() dto: UnifiedUpdateProfileDto,
    @UploadedFiles() files?: { profile_picture?: Express.Multer.File[]; backDropImage?: Express.Multer.File[] },
  ) {
    return this.alumniService.updateProfile(userId, dto, files);
  }

  // ── Work Experience (alumni & partner only) ────────────────────────────────

  @Post('work-experience')
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Add a new work experience record' })
  @ApiResponse({ status: 201, type: SuccessResponseDto })
  addWorkExperience(@GetUser('sub') userId: string, @Body() dto: CreateWorkExperienceDto) {
    return this.alumniService.addWorkExperience(userId, dto);
  }

  @Put('work-experience/:id')
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Update an existing work experience record' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  updateWorkExperience(
    @GetUser('sub') userId: string,
    @Param('id') expId: string,
    @Body() dto: UpdateWorkExperienceDto,
  ) {
    return this.alumniService.updateWorkExperience(userId, expId, dto);
  }

  @Delete('work-experience/:id')
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Delete a work experience record' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  deleteWorkExperience(@GetUser('sub') userId: string, @Param('id') expId: string) {
    return this.alumniService.deleteWorkExperience(userId, expId);
  }

  // ── Skills (alumni, partner & student — unified) ───────────────────────────

  @Post('skills')
  @Roles('alumni', 'partner', 'student')
  @ApiOperation({ summary: 'Add a skill to your profile' })
  @ApiResponse({ status: 201, type: SuccessResponseDto })
  addSkill(@GetUser('sub') userId: string, @Body() dto: AddSkillDto) {
    return this.alumniService.addSkill(userId, dto);
  }

  @Put('skills/:id')
  @Roles('alumni', 'partner', 'student')
  @ApiOperation({ summary: 'Update a skill on your profile by skill ID' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  updateSkill(
    @GetUser('sub') userId: string,
    @Param('id') skillId: string,
    @Body() dto: UpdateSkillDto,
  ) {
    return this.alumniService.updateSkill(userId, skillId, dto);
  }

  @Delete('skills/:id')
  @Roles('alumni', 'partner', 'student')
  @ApiOperation({ summary: 'Remove a skill from your profile by skill ID' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  deleteSkill(@GetUser('sub') userId: string, @Param('id') skillId: string) {
    return this.alumniService.deleteSkill(userId, skillId);
  }

  // ── Education (alumni, partner & student) ─────────────────────────────────────

  @Post('education')
  @Roles('alumni', 'partner', 'student')
  @ApiOperation({ summary: 'Add a new education record' })
  @ApiResponse({ status: 201, type: SuccessResponseDto })
  addEducation(@GetUser('sub') userId: string, @Body() dto: CreateEducationDto) {
    return this.alumniService.addEducation(userId, dto);
  }

  @Put('education/:id')
  @Roles('alumni', 'partner', 'student')
  @ApiOperation({ summary: 'Update an existing education record' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  updateEducation(
    @GetUser('sub') userId: string,
    @Param('id') eduId: string,
    @Body() dto: UpdateEducationDto,
  ) {
    return this.alumniService.updateEducation(userId, eduId, dto);
  }

  @Delete('education/:id')
  @Roles('alumni', 'partner', 'student')
  @ApiOperation({ summary: 'Delete an education record' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  deleteEducation(@GetUser('sub') userId: string, @Param('id') eduId: string) {
    return this.alumniService.deleteEducation(userId, eduId);
  }
}
