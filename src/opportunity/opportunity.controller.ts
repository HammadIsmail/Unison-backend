import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OpportunityService } from './opportunity.service';
import { CreateOpportunityDto, UpdateOpportunityDto } from './dto/opportunity.dto';
import {
  CreateOpportunityResponseDto,
  MyOpportunityPostResponseDto,
  OpportunityDetailResponseDto,
  OpportunityPaginationResponseDto,
} from './dto/opportunity-response.dto';
import { MessageResponseDto } from '../common/dto/response.dto';
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
  @Roles('alumni', 'admin')
  @UseInterceptors(FilesInterceptor('media', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Post a new job or internship opportunity with optional images/videos (max 5)' })
  @ApiResponse({ status: 201, type: CreateOpportunityResponseDto })
  create(
    @GetUser('sub') userId: string,
    @Body() dto: CreateOpportunityDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (files && files.length > 5) {
      throw new BadRequestException('media cannot exceed more than 5');
    }
    return this.opportunityService.create(userId, dto, files);
  }

  @Get()
  @ApiOperation({ summary: 'List all opportunities with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page (default: 10)', example: 10 })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter by type (job/internship)', example: 'job' })
  @ApiQuery({ name: 'skill', required: false, type: String, description: 'Filter by required skill', example: 'NestJS' })
  @ApiQuery({ name: 'is_remote', required: false, type: String, description: 'Filter by remote status (true/false)', example: 'true' })
  @ApiResponse({ status: 200, type: OpportunityPaginationResponseDto })
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('type') type?: string,
    @Query('skill') skill?: string,
    @Query('is_remote') is_remote?: string,
  ) {
    return this.opportunityService.findAll(+page, +limit, type, skill, is_remote);
  }

  @Get('my-posts')
  @Roles('alumni', 'admin')
  @ApiOperation({ summary: 'Get opportunities posted by you' })
  @ApiResponse({ status: 200, type: [MyOpportunityPostResponseDto] })
  findMyPosts(@GetUser('sub') userId: string) {
    return this.opportunityService.findMyPosts(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific opportunity' })
  @ApiResponse({ status: 200, type: OpportunityDetailResponseDto })
  findOne(@Param('id') id: string) {
    return this.opportunityService.findOne(id);
  }

  @Put(':id')
  @Roles('alumni', 'admin')
  @ApiOperation({ summary: 'Update an opportunity' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  update(
    @GetUser('sub') userId: string,
    @GetUser('role') role: string,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    return this.opportunityService.update(userId, role, id, dto);
  }

  @Delete(':id')
  @Roles('alumni', 'admin')
  @ApiOperation({ summary: 'Delete an opportunity' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  remove(
    @GetUser('sub') userId: string,
    @GetUser('role') role: string,
    @Param('id') id: string,
  ) {
    return this.opportunityService.remove(userId, role, id);
  }
}
