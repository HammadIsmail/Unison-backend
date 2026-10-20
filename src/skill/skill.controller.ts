import { Controller, Get, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkillService } from './skill.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { SuccessResponseDto } from '../common/dto/response.dto';

@ApiTags('Skills')
@ApiBearerAuth()
@Controller('skills')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get('all')
  @ApiOperation({ summary: 'Get list of all available skills in the system' })
  @ApiResponse({ status: 200, type: [String], description: 'List of skill names' })
  findAll() {
    return this.skillService.findAll();
  }

  @Delete(':skill_id')
  @Roles('student', 'alumni', 'partner')
  @ApiOperation({ summary: 'Remove a skill from your profile (shared for students and alumni)' })
  @ApiResponse({ status: 200, type: SuccessResponseDto })
  deleteSkill(@GetUser('sub') userId: string, @Param('skill_id') skillId: string) {
    return this.skillService.deleteSkill(userId, skillId);
  }
}
