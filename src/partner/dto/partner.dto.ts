import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePartnerProfileDto {
  @ApiPropertyOptional({ example: 'A leading tech company recruiter.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'Google', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  affiliation?: string;

  @ApiPropertyOptional({ example: 'Talent Acquisition Manager', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  job_title?: string;

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/johnsmith', maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  linkedin_url?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Profile picture file' })
  @IsOptional()
  profile_picture?: any;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Backdrop image file' })
  @IsOptional()
  backDropImage?: any;
}
