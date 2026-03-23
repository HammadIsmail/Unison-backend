import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkillService } from './skill.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Skills')
@ApiBearerAuth()
@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get('all')
  @ApiOperation({ summary: 'Get list of all available skills in the system' })
  @ApiResponse({ status: 200, type: [String], description: 'List of skill names' })
  findAll() {
    return this.skillService.findAll();
  }
}
