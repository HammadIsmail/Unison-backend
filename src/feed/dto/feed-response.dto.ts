import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FeedAuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  display_name: string;

  @ApiPropertyOptional()
  username?: string;

  @ApiPropertyOptional()
  profile_picture?: string;

  @ApiProperty()
  role: string;
}

export class FeedItemDto {
  @ApiProperty({ enum: ['announcement', 'opportunity', 'event'] })
  type: 'announcement' | 'opportunity' | 'event';

  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty({ type: FeedAuthorDto })
  author: FeedAuthorDto;

  // Shared Media (Announcement, Opportunity media[0], Event banner_url)
  @ApiPropertyOptional()
  media_url?: string;

  // Announcement specific
  @ApiPropertyOptional()
  media_type?: string;

  // Opportunity specific
  @ApiPropertyOptional()
  company_name?: string;

  @ApiPropertyOptional()
  opportunity_type?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  is_remote?: boolean;

  @ApiPropertyOptional()
  apply_link?: string;

  @ApiPropertyOptional()
  deadline?: string;

  @ApiPropertyOptional({ type: [String] })
  media?: string[];

  // Event specific
  @ApiPropertyOptional()
  event_date?: string;

  @ApiPropertyOptional()
  is_online?: boolean;

  @ApiPropertyOptional()
  meeting_link?: string;

  @ApiPropertyOptional()
  max_attendees?: number;

  @ApiPropertyOptional()
  event_type?: string;

  @ApiPropertyOptional()
  attendee_count?: number;
}

export class FeedResponseDto {
  @ApiProperty({ type: [FeedItemDto] })
  data: FeedItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;
}
