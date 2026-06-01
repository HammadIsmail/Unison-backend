import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsOptional, IsNumber, Min, IsDateString, IsUrl, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export enum EventType {
  REUNION = 'reunion',
  WEBINAR = 'webinar',
  WORKSHOP = 'workshop',
  NETWORKING = 'networking',
  OTHER = 'other',
}

export class CreateEventDto {
  @ApiProperty({ example: 'Alumni Tech Meetup 2024', maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiProperty({ example: 'A great place to meet and talk tech.', maxLength: 40000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40000)
  description: string;

  @ApiProperty({ enum: EventType })
  @IsEnum(EventType)
  type: EventType;

  @ApiProperty({ example: '2024-12-01T18:00:00Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: true })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    return value === 'true' || value === true;
  })
  @IsBoolean()
  is_online: boolean;

  @ApiPropertyOptional({ example: 'Google Meet' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij', maxLength: 2048 })
  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  meeting_link?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(1)
  max_attendees?: number;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ example: 'Alumni Tech Meetup 2024 (Updated)', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional({ example: 'A great place to meet and talk tech.', maxLength: 40000 })
  @IsOptional()
  @IsString()
  @MaxLength(40000)
  description?: string;

  @ApiPropertyOptional({ enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiPropertyOptional({ example: '2024-12-01T18:00:00Z' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    return value === 'true' || value === true;
  })
  @IsBoolean()
  is_online?: boolean;

  @ApiPropertyOptional({ example: 'Google Meet' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij', maxLength: 2048 })
  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  meeting_link?: string;

  @ApiPropertyOptional({ example: 150 })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(1)
  max_attendees?: number;
}

export class RsvpDto {
  @ApiProperty({ enum: ['attending', 'maybe'] })
  @IsEnum(['attending', 'maybe'])
  status: 'attending' | 'maybe';
}
