import { IsString, IsNotEmpty, IsBoolean, IsDateString, IsArray, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OpportunityType {
  JOB = 'job',
  INTERNSHIP = 'internship',
  FREELANCE = 'freelance',
}

export enum OpportunityStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export class CreateOpportunityDto {
  @ApiProperty({ description: 'Title of the opportunity' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Type of opportunity', enum: OpportunityType })
  @IsEnum(OpportunityType)
  @IsNotEmpty()
  type: OpportunityType;

  @ApiProperty({ description: 'Detailed description of the opportunity' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Requirements for the opportunity' })
  @IsString()
  @IsNotEmpty()
  requirements: string;

  @ApiProperty({ description: 'Location (e.g. Faisalabad, Remote)' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ description: 'Whether the opportunity is remote' })
  @IsBoolean()
  @IsNotEmpty()
  is_remote: boolean;

  @ApiProperty({ description: 'Deadline for applications', example: '2023-12-31' })
  @IsDateString()
  @IsNotEmpty()
  deadline: string;

  @ApiProperty({ description: 'Name of the posting company' })
  @IsString()
  @IsNotEmpty()
  company_name: string;

  @ApiProperty({ description: 'Direct link to apply' })
  @IsUrl()
  @IsNotEmpty()
  apply_link: string;

  @ApiProperty({ description: 'List of required skills', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  required_skills: string[];
}

export class UpdateOpportunityDto {
  @ApiPropertyOptional({ description: 'Updated title' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({ description: 'Updated application link' })
  @IsOptional()
  @IsUrl()
  @IsNotEmpty()
  apply_link?: string;

  @ApiPropertyOptional({ description: 'Updated deadline', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  @IsNotEmpty()
  deadline?: string;

  @ApiPropertyOptional({ description: 'Updated status', enum: OpportunityStatus })
  @IsOptional()
  @IsEnum(OpportunityStatus)
  @IsNotEmpty()
  status?: OpportunityStatus;
}
