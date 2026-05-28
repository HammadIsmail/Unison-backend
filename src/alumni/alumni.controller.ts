import { Controller, Get, Put, Post, Patch, Delete, Param, Body, UseGuards, ForbiddenException, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AlumniService } from './alumni.service';
import {
  UpdateAlumniProfileDto,
  CreateWorkExperienceDto,
  UpdateWorkExperienceDto,
  AddSkillDto,
  CreateEducationDto,
  UpdateEducationDto,
} from './dto/alumni.dto';
import { AlumniProfileResponseDto, ConnectionRequestResponseDto, NetworkUserResponseDto } from './dto/alumni-response.dto';
import { ConnectionStatusResponseDto } from '../common/dto/connection-status.dto';
import { SuccessResponseDto } from '../common/dto/response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Alumni')
@ApiBearerAuth()
@Controller('alumni')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlumniController {
  constructor(private readonly alumniService: AlumniService) {}


  @Get('me')
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Get your own alumni profile' })
  @ApiResponse({ status: 200, type: AlumniProfileResponseDto })
  getMe(@GetUser('sub') userId: string) {
    return this.alumniService.getProfile(userId);
  }

  @Put('me')
  @Roles('alumni', 'partner')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'profile_picture', maxCount: 1 },
    { name: 'backDropImage', maxCount: 1 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update your own alumni profile' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  updateMe(
    @GetUser('sub') userId: string,
    @Body() dto: UpdateAlumniProfileDto,
    @UploadedFiles() files?: { profile_picture?: Express.Multer.File[], backDropImage?: Express.Multer.File[] },
  ) {
    return this.alumniService.updateProfile(userId, dto, files);
  }


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

  @Post('skills')
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Add a new skill to your profile' })
  @ApiResponse({ status: 201, type: SuccessResponseDto })
  addSkill(@GetUser('sub') userId: string, @Body() dto: AddSkillDto) {
    return this.alumniService.addSkill(userId, dto);
  }

  @Post('education')
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Add a new education record' })
  @ApiResponse({ status: 201, type: SuccessResponseDto })
  addEducation(@GetUser('sub') userId: string, @Body() dto: CreateEducationDto) {
    return this.alumniService.addEducation(userId, dto);
  }

  @Put('education/:id')
  @Roles('alumni', 'partner')
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
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Delete an education record' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  deleteEducation(@GetUser('sub') userId: string, @Param('id') eduId: string) {
    return this.alumniService.deleteEducation(userId, eduId);
  }


  @Get('connections')
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Get your accepted connections' })
  @ApiResponse({ status: 200, type: [NetworkUserResponseDto] })
  getConnections(@GetUser('sub') userId: string) {
    return this.alumniService.getConnections(userId);
  }

  @Get('batch-mates')
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Find your batch mates' })
  @ApiResponse({ status: 200, type: [NetworkUserResponseDto] })
  getBatchMates(@GetUser('sub') userId: string) {
    return this.alumniService.getBatchMates(userId);
  }

  @Delete('me')
  @Roles('alumni', 'partner')
  @ApiOperation({ summary: 'Permanently delete your alumni account' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  deleteMe(@GetUser('sub') userId: string) {
    return this.alumniService.deleteAccount(userId);
  }
}
