import { Controller, Get, Query, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchAlumniResponseDto, SearchOpportunityResponseDto, UserDetailResponseDto } from './dto/search-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('alumni')
  @ApiOperation({ summary: 'Search for alumni with multiple filters' })
  @ApiQuery({ name: 'display_name', required: false, type: String, example: 'Ahmed' })
  @ApiQuery({ name: 'company', required: false, type: String, example: 'Google' })
  @ApiQuery({ name: 'skill', required: false, type: String, example: 'TypeScript' })
  @ApiQuery({ name: 'batch_year', required: false, type: String, example: '2020' })
  @ApiQuery({ name: 'degree', required: false, type: String, example: 'BSCS' })
  @ApiResponse({ status: 200, type: [SearchAlumniResponseDto] })
  searchAlumni(
    @Query('display_name') display_name?: string,
    @Query('company') company?: string,
    @Query('skill') skill?: string,
    @Query('batch_year') batch_year?: string,
    @Query('degree') degree?: string,
  ) {
    return this.searchService.searchAlumni(display_name, company, skill, batch_year, degree);
  }

  @Get('opportunities')
  @ApiOperation({ summary: 'Search for opportunities with filters' })
  @ApiQuery({ name: 'title', required: false, type: String, example: 'Developer' })
  @ApiQuery({ name: 'type', required: false, type: String, example: 'job' })
  @ApiQuery({ name: 'skill', required: false, type: String, example: 'Node.js' })
  @ApiQuery({ name: 'location', required: false, type: String, example: 'Remote' })
  @ApiQuery({ name: 'is_remote', required: false, type: String, example: 'true' })
  @ApiResponse({ status: 200, type: [SearchOpportunityResponseDto] })
  searchOpportunities(
    @Query('title') title?: string,
    @Query('type') type?: string,
    @Query('skill') skill?: string,
    @Query('location') location?: string,
    @Query('is_remote') is_remote?: string,
  ) {
    return this.searchService.searchOpportunities(title, type, skill, location, is_remote);
  }

  @Get('user/:username')
  @ApiOperation({ summary: 'Find a specific user by their exact username' })
  @ApiResponse({ status: 200, type: UserDetailResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findByUsername(@Param('username') username: string) {
    const user = await this.searchService.findByUsername(username);
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }
}
