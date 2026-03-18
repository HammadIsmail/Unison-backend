import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('alumni')
  searchAlumni(
    @Query('name') name?: string,
    @Query('company') company?: string,
    @Query('skill') skill?: string,
    @Query('batch_year') batch_year?: string,
    @Query('degree') degree?: string,
  ) {
    return this.searchService.searchAlumni(name, company, skill, batch_year, degree);
  }

  @Get('opportunities')
  searchOpportunities(
    @Query('title') title?: string,
    @Query('type') type?: string,
    @Query('skill') skill?: string,
    @Query('location') location?: string,
    @Query('is_remote') is_remote?: string,
  ) {
    return this.searchService.searchOpportunities(title, type, skill, location, is_remote);
  }
}
