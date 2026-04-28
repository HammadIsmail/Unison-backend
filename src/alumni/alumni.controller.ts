import { Controller, Get, Put, Post, Patch, Delete, Param, Body, UseGuards, ForbiddenException, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AlumniService } from './alumni.service';
import {
  UpdateAlumniProfileDto,
  CreateWorkExperienceDto,
  UpdateWorkExperienceDto,
  AddSkillDto,
} from './dto/alumni.dto';
import { AlumniProfileResponseDto, ConnectionRequestResponseDto, NetworkUserResponseDto } from './dto/alumni-response.dto';
import { ConnectionStatusResponseDto } from '../common/dto/connection-status.dto';
import { MessageResponseDto } from '../common/dto/response.dto';
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
  @Roles('alumni')
  @ApiOperation({ summary: 'Get your own alumni profile' })
  @ApiResponse({ status: 200, type: AlumniProfileResponseDto })
  getMe(@GetUser('sub') userId: string) {
    return this.alumniService.getProfile(userId);
  }

  @Put('me')
  @Roles('alumni')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'profile_picture', maxCount: 1 },
    { name: 'backDropImage', maxCount: 1 },
  ]))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update your own alumni profile' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  updateMe(
    @GetUser('sub') userId: string,
    @Body() dto: UpdateAlumniProfileDto,
    @UploadedFiles() files?: { profile_picture?: Express.Multer.File[], backDropImage?: Express.Multer.File[] },
  ) {
    return this.alumniService.updateProfile(userId, dto, files);
  }


  @Post('work-experience')
  @Roles('alumni')
  @ApiOperation({ summary: 'Add a new work experience record' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  addWorkExperience(@GetUser('sub') userId: string, @Body() dto: CreateWorkExperienceDto) {
    return this.alumniService.addWorkExperience(userId, dto);
  }

  @Put('work-experience/:id')
  @Roles('alumni')
  @ApiOperation({ summary: 'Update an existing work experience record' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  updateWorkExperience(
    @GetUser('sub') userId: string,
    @Param('id') expId: string,
    @Body() dto: UpdateWorkExperienceDto,
  ) {
    return this.alumniService.updateWorkExperience(userId, expId, dto);
  }

  @Delete('work-experience/:id')
  @Roles('alumni')
  @ApiOperation({ summary: 'Delete a work experience record' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  deleteWorkExperience(@GetUser('sub') userId: string, @Param('id') expId: string) {
    return this.alumniService.deleteWorkExperience(userId, expId);
  }

  @Post('skills')
  @Roles('alumni')
  @ApiOperation({ summary: 'Add a new skill to your profile' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  addSkill(@GetUser('sub') userId: string, @Body() dto: AddSkillDto) {
    return this.alumniService.addSkill(userId, dto);
  }

  @Delete('skills/:skill_id')
  @Roles('alumni')
  @ApiOperation({ summary: 'Remove a skill from your profile' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  deleteSkill(@GetUser('sub') userId: string, @Param('skill_id') skillId: string) {
    return this.alumniService.deleteSkill(userId, skillId);
  }

  @Get('connections')
  @Roles('alumni')
  @ApiOperation({ summary: 'Get your accepted connections' })
  @ApiResponse({ status: 200, type: [NetworkUserResponseDto] })
  getConnections(@GetUser('sub') userId: string) {
    return this.alumniService.getConnections(userId);
  }

  @Get('batch-mates')
  @Roles('alumni')
  @ApiOperation({ summary: 'Find your batch mates' })
  @ApiResponse({ status: 200, type: [NetworkUserResponseDto] })
  getBatchMates(@GetUser('sub') userId: string) {
    return this.alumniService.getBatchMates(userId);
  }

  @Delete('me')
  @Roles('alumni')
  @ApiOperation({ summary: 'Permanently delete your alumni account' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  deleteMe(@GetUser('sub') userId: string) {
    return this.alumniService.deleteAccount(userId);
  }
}
