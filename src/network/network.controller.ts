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
  @Roles('admin')
  @ApiOperation({ summary: 'Get top alumni by centrality (count of accepted connections)' })
  @ApiResponse({ status: 200, type: [CentralityResponseDto] })
  getCentrality() {
    return this.networkService.getCentrality();
  }

  @Get('shortest-path')
  @Roles('admin')
  @ApiOperation({ summary: 'Find the shortest connection path through accepted connections only' })
  @ApiResponse({ status: 200, type: ShortestPathResponseDto })
  getShortestPath(@Query('from') fromId: string, @Query('to') toId: string) {
    return this.networkService.getShortestPath(fromId, toId);
  }

  @Get('top-companies')
  @Roles('admin')
  @ApiOperation({ summary: 'Get companies with most alumni' })
  @ApiResponse({ status: 200, type: [TopCompanyResponseDto] })
  getTopCompanies() {
    return this.networkService.getTopCompanies();
  }

  @Get('skill-trends')
  @Roles('admin')
  @ApiOperation({ summary: 'Analyze skill supply and demand' })
  @ApiResponse({ status: 200, type: SkillTrendResponseDto })
  getSkillTrends() {
    return this.networkService.getSkillTrends();
  }

  @Get('batch-analysis')
  @Roles('admin')
  @ApiOperation({ summary: 'Engagement and success metrics by batch (based on accepted connections)' })
  @ApiResponse({ status: 200, type: [BatchAnalysisResponseDto] })
  getBatchAnalysis() {
    return this.networkService.getBatchAnalysis();
  }
}
