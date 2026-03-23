import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NetworkService } from './network.service';
import {
  BatchAnalysisResponseDto,
  CentralityResponseDto,
  ShortestPathResponseDto,
  SkillTrendResponseDto,
  TopCompanyResponseDto,
} from './dto/network-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Network Science')
@ApiBearerAuth()
@Controller('network')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('centrality')
  @Roles('admin', 'alumni')
  @ApiOperation({ summary: 'Get top alumni by centrality (connections count)' })
  @ApiResponse({ status: 200, type: [CentralityResponseDto] })
  getCentrality() {
    return this.networkService.getCentrality();
  }

  @Get('shortest-path')
  @Roles('admin', 'alumni')
  @ApiOperation({ summary: 'Find the shortest connection path between two users' })
  @ApiResponse({ status: 200, type: ShortestPathResponseDto })
  getShortestPath(@Query('from') fromId: string, @Query('to') toId: string) {
    return this.networkService.getShortestPath(fromId, toId);
  }

  @Get('top-companies')
  @Roles('admin', 'alumni')
  @ApiOperation({ summary: 'Get companies with most alumni' })
  @ApiResponse({ status: 200, type: [TopCompanyResponseDto] })
  getTopCompanies() {
    return this.networkService.getTopCompanies();
  }

  @Get('skill-trends')
  @Roles('admin', 'alumni')
  @ApiOperation({ summary: 'Analyze skill supply and demand' })
  @ApiResponse({ status: 200, type: SkillTrendResponseDto })
  getSkillTrends() {
    return this.networkService.getSkillTrends();
  }

  @Get('batch-analysis')
  @Roles('admin', 'alumni')
  @ApiOperation({ summary: 'Engagement and success metrics by batch' })
  @ApiResponse({ status: 200, type: [BatchAnalysisResponseDto] })
  getBatchAnalysis() {
    return this.networkService.getBatchAnalysis();
  }
}
