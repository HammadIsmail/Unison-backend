import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OpportunityService } from './opportunity.service';
import { CreateOpportunityDto, UpdateOpportunityDto } from './dto/opportunity.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Opportunities')
@ApiBearerAuth()
@Controller('opportunities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OpportunityController {
  constructor(private readonly opportunityService: OpportunityService) {}

  @Post()
  @Roles('alumni')
  @ApiOperation({ summary: 'Create a new opportunity (Alumni only)' })
  create(@GetUser('sub') userId: string, @Body() dto: CreateOpportunityDto) {
    return this.opportunityService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all opportunities with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default: 10)' })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter by type (job, internship, freelance)' })
  @ApiQuery({ name: 'skill', required: false, type: String, description: 'Filter by required skill' })
  @ApiQuery({ name: 'is_remote', required: false, type: Boolean, description: 'Filter by remote status' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('skill') skill?: string,
    @Query('is_remote') is_remote?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    return this.opportunityService.findAll(
      isNaN(pageNum) ? 1 : pageNum,
      isNaN(limitNum) ? 10 : limitNum,
      type,
      skill,
      is_remote
    );
  }

  @Get('my-posts')
  @Roles('alumni')
  @ApiOperation({ summary: 'Get opportunities posted by the current user' })
  findMyPosts(@GetUser('sub') userId: string) {
    return this.opportunityService.findMyPosts(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single opportunity by ID' })
  findOne(@Param('id') id: string) {
    // Need to correctly await or just return the Promise. 
    return this.opportunityService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an opportunity (Owner or Admin only)' })
  update(
    @GetUser('sub') userId: string,
    @GetUser('role') role: string,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto
  ) {
    return this.opportunityService.update(userId, role, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an opportunity (Owner or Admin only)' })
  remove(
    @GetUser('sub') userId: string,
    @GetUser('role') role: string,
    @Param('id') id: string
  ) {
    return this.opportunityService.remove(userId, role, id);
  }
}
