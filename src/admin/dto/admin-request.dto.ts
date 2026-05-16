import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty, IsOptional, IsDateString, IsEmail, IsEnum, MinLength } from 'class-validator';

export class BulkActionDto {
  @ApiProperty({ type: [String], example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];
}

export class BulkRejectDto extends BulkActionDto {
  @ApiProperty({ example: 'Invalid documentation provided.' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class AdminActivityFilterDto {
  @ApiPropertyOptional({ example: 'ACCOUNT_APPROVED' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: 'uuid-user-123' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  limit?: number;
}

export class AnalyticsFilterDto {
  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2024-03-31' })
  @IsString()
  @IsOptional()
  to?: string;
}

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Annual Convocation 2025' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Join us for the Annual Convocation ceremony at UET Faisalabad.' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: '2025-06-15T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  event_date?: string;
}

export class UpdateAdminProfileDto {
  @ApiPropertyOptional({ example: 'admin_user' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'Admin Name' })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  profile_picture?: any;
}

export class CreateStaffDto {
  @ApiProperty({ example: 'mod@unison.pk' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'mod_ahmed' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'Ahmed Moderator' })
  @IsString()
  @IsNotEmpty()
  display_name: string;

  @ApiProperty({ enum: ['admin', 'moderator'], example: 'moderator' })
  @IsEnum(['admin', 'moderator'])
  role: 'admin' | 'moderator';
}
