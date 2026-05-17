import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FeedAuthorDto {
  @ApiProperty({ description: 'Author UUID' })
  id: string;

  @ApiProperty({ description: 'Author display name' })
  display_name: string;

  @ApiPropertyOptional({ description: 'Author @username' })
  username?: string;

  @ApiPropertyOptional({ description: 'Author profile picture URL' })
  profile_picture?: string;

  @ApiProperty({ description: 'Author role', enum: ['admin', 'alumni', 'student', 'moderator'] })
  role: string;
}

export class FeedItemDto {
  @ApiProperty({
    enum: ['announcement', 'opportunity', 'event'],
    description: 'Content type of this feed item',
  })
  type: 'announcement' | 'opportunity' | 'event';

  @ApiProperty({ description: 'Item UUID (MongoDB ObjectId for announcements, Neo4j UUID for others)' })
  id: string;

  @ApiProperty({ description: 'Item title' })
  title: string;

  @ApiProperty({ description: 'Item description (may contain sanitized HTML)' })
  description: string;

  @ApiProperty({ description: 'ISO 8601 creation timestamp' })
  created_at: string;

  @ApiProperty({ type: FeedAuthorDto, description: 'Author profile info' })
  author: FeedAuthorDto;

  // ─── Shared ───────────────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Primary media URL (announcement media, opportunity media[0], event banner)' })
  media_url?: string;

  // ─── Announcement-specific ────────────────────────────────────────────────
  @ApiPropertyOptional({ description: '[announcement] Media type', enum: ['image', 'video'] })
  media_type?: string;

  // ─── Opportunity-specific ─────────────────────────────────────────────────
  @ApiPropertyOptional({ description: '[opportunity] Company name' })
  company_name?: string;

  @ApiPropertyOptional({ description: '[opportunity] Opportunity type', enum: ['job', 'internship', 'freelance', 'other'] })
  opportunity_type?: string;

  @ApiPropertyOptional({ description: '[opportunity | event] Location or venue' })
  location?: string;

  @ApiPropertyOptional({ description: '[opportunity] Whether the role is remote' })
  is_remote?: boolean;

  @ApiPropertyOptional({ description: '[opportunity] Application link URL' })
  apply_link?: string;

  @ApiPropertyOptional({ description: '[opportunity] Application deadline (ISO 8601)' })
  deadline?: string;

  @ApiPropertyOptional({ type: [String], description: '[opportunity] Additional media URLs' })
  media?: string[];

  // ─── Event-specific ───────────────────────────────────────────────────────
  @ApiPropertyOptional({ description: '[event] Event date (ISO 8601)' })
  event_date?: string;

  @ApiPropertyOptional({ description: '[event] Whether the event is online' })
  is_online?: boolean;

  @ApiPropertyOptional({ description: '[event] Meeting/stream link for online events' })
  meeting_link?: string;

  @ApiPropertyOptional({ description: '[event] Maximum attendee capacity' })
  max_attendees?: number;

  @ApiPropertyOptional({ description: '[event] Event type', enum: ['reunion', 'webinar', 'workshop', 'networking', 'other'] })
  event_type?: string;

  @ApiPropertyOptional({ description: '[event] Number of users who RSVP\'d as attending' })
  attendee_count?: number;
}

export class FeedResponseDto {
  @ApiProperty({ description: 'Total items matching the query (respects type filter)', example: 150 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ type: [FeedItemDto], description: 'Feed items sorted newest first, sliced to the requested limit' })
  data: FeedItemDto[];
}
