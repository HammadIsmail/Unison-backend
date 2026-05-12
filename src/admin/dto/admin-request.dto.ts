import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

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
