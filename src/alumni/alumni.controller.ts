import { Controller, Get, Put, Post, Patch, Delete, Param, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AlumniService } from './alumni.service';
import {
  UpdateAlumniProfileDto,
  CreateWorkExperienceDto,
  UpdateWorkExperienceDto,
  AddSkillDto,
  ConnectDto,
} from './dto/alumni.dto';
import { RespondToConnectionDto } from './dto/connection.dto';
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
  getMe(@GetUser('sub') userId: string) {
    return this.alumniService.getProfile(userId);
  }

  @Put('me')
  @Roles('alumni')
  @ApiOperation({ summary: 'Update your own alumni profile' })
  updateMe(@GetUser('sub') userId: string, @Body() dto: UpdateAlumniProfileDto) {
    return this.alumniService.updateProfile(userId, dto);
  }


  @Post('work-experience')
  @Roles('alumni')
  @ApiOperation({ summary: 'Add a new work experience record' })
  addWorkExperience(@GetUser('sub') userId: string, @Body() dto: CreateWorkExperienceDto) {
    return this.alumniService.addWorkExperience(userId, dto);
  }

  @Put('work-experience/:id')
  @Roles('alumni')
  @ApiOperation({ summary: 'Update an existing work experience record' })
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
  deleteWorkExperience(@GetUser('sub') userId: string, @Param('id') expId: string) {
    return this.alumniService.deleteWorkExperience(userId, expId);
  }

  @Post('skills')
  @Roles('alumni')
  @ApiOperation({ summary: 'Add a new skill to your profile' })
  addSkill(@GetUser('sub') userId: string, @Body() dto: AddSkillDto) {
    return this.alumniService.addSkill(userId, dto);
  }

  @Delete('skills/:skill_id')
  @Roles('alumni')
  @ApiOperation({ summary: 'Remove a skill from your profile' })
  deleteSkill(@GetUser('sub') userId: string, @Param('skill_id') skillId: string) {
    return this.alumniService.deleteSkill(userId, skillId);
  }

  @Get('network')
  @Roles('alumni')
  @ApiOperation({ summary: 'Get your professional network' })
  getNetwork(@GetUser('sub') userId: string) {
    return this.alumniService.getNetwork(userId);
  }

  @Post('connect/:target_id')
  @Roles('alumni')
  @ApiOperation({ summary: 'Send a connection request to another user' })
  connectWith(
    @GetUser('sub') userId: string,
    @Param('target_id') targetId: string,
    @Body() dto: ConnectDto,
  ) {
    return this.alumniService.connectWith(userId, targetId, dto);
  }

  @Get('connections/requests')
  @Roles('alumni')
  @ApiOperation({ summary: 'Get pending connection requests' })
  getPendingRequests(@GetUser('sub') userId: string) {
    return this.alumniService.getPendingRequests(userId);
  }

  @Patch('connections/requests/:sender_id/respond')
  @Roles('alumni')
  @ApiOperation({ summary: 'Respond to a connection request' })
  respondToRequest(
    @GetUser('sub') userId: string,
    @Param('sender_id') senderId: string,
    @Body() dto: RespondToConnectionDto,
  ) {
    return this.alumniService.respondToRequest(userId, senderId, dto.action);
  }

  @Get('batch-mates')
  @Roles('alumni')
  @ApiOperation({ summary: 'Find your batch mates' })
  getBatchMates(@GetUser('sub') userId: string) {
    return this.alumniService.getBatchMates(userId);
  }
}
