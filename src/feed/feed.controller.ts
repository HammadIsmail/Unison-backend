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
  @ApiOperation({ summary: 'Get unified discovery feed (Announcements, Opportunities, Events)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, type: FeedResponseDto })
  async getFeed(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.feedService.getFeed(parseInt(page, 10), parseInt(limit, 10));
  }
}
