import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { FeedService } from './feed.service';
import { FeedResponseDto } from './dto/feed-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Feed')
@Controller('feed')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({
    summary: 'Get unified discovery feed',
    description:
      'Returns a merged, chronologically sorted list of announcements (MongoDB), opportunities, and events (Neo4j). ' +
      'Use the optional `type` filter to scope results to a single content type — filtered requests skip the unneeded ' +
      'data source entirely, making them faster and returning a `total` count accurate for that type.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number (1-indexed)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Number of items per page' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['announcement', 'opportunity', 'event'],
    description:
      'Filter by content type. Omit to receive all types merged. ' +
      'When set, only the relevant database is queried and `total` reflects that type only.',
    example: 'event',
  })
  @ApiResponse({ status: 200, type: FeedResponseDto, description: 'Paginated feed items sorted newest first' })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid Bearer token' })
  async getFeed(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('type') type?: 'announcement' | 'opportunity' | 'event',
  ) {
    return this.feedService.getFeed(parseInt(page, 10), parseInt(limit, 10), type);
  }
}
