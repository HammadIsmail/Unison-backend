import { IsString, IsOptional, IsInt, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UnifiedUpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Applicable to alumni & student' })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiPropertyOptional({ description: 'A short bio', example: 'Passionate tech professional.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+923001234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'LinkedIn profile URL (Applicable to alumni & partner)', example: 'https://linkedin.com/in/johndoe', maxLength: 2048 })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  linkedin_url?: string;

  @ApiPropertyOptional({ example: 'Google', description: 'Applicable to partner only', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  affiliation?: string;

  @ApiPropertyOptional({ example: 'Talent Acquisition Manager', description: 'Applicable to partner only', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  job_title?: string;

  @ApiPropertyOptional({ description: 'Current semester of the student (Applicable to student only)', example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semester?: number;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Profile picture file' })
  @IsOptional()
  profile_picture?: any;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Backdrop image file' })
  @IsOptional()
  backDropImage?: any;
}
