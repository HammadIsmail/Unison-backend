import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { NetworkService } from './network.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('network')
@UseGuards(JwtAuthGuard)
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('centrality')
  getCentrality() {
    return this.networkService.getCentrality();
  }

  @Get('shortest-path/:from_id/:to_id')
  getShortestPath(@Param('from_id') fromId: string, @Param('to_id') toId: string) {
    return this.networkService.getShortestPath(fromId, toId);
  }

  @Get('top-companies')
  getTopCompanies() {
    return this.networkService.getTopCompanies();
  }

  @Get('skill-trends')
  getSkillTrends() {
    return this.networkService.getSkillTrends();
  }

  @Get('batch-analysis')
  getBatchAnalysis() {
    return this.networkService.getBatchAnalysis();
  }
}
