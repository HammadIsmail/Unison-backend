import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkillService } from './skill.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get('all')
  findAll() {
    return this.skillService.findAll();
  }
}
