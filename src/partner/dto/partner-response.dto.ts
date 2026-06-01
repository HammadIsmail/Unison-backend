import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PartnerProfileResponseDto {
  @ApiProperty({ example: 'google_hr' })
  username: string;

  @ApiProperty({ example: 'John Smith' })
  display_name: string;

  @ApiProperty({ example: 'john@google.com' })
  email: string;

  @ApiPropertyOptional({ example: 'Connecting talent with opportunity.' })
  bio?: string;

  @ApiPropertyOptional({ example: 'Google' })
  affiliation?: string;

  @ApiPropertyOptional({ example: 'Talent Acquisition Manager' })
  job_title?: string;

  @ApiPropertyOptional({ example: '+923001234567' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johnsmith' })
  linkedin_url?: string;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/profile.jpg' })
  profile_picture?: string;

  @ApiPropertyOptional({ example: 'https://cloudinary.com/backdrop.jpg' })
  backDropImage?: string;

  @ApiProperty({ example: 12 })
  connections_count: number;

  @ApiProperty({ example: 3 })
  posts_count: number;
}
