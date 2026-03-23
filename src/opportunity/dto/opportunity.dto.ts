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
  @ApiProperty({ description: 'Title of the opportunity', example: 'Full Stack Developer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Type of opportunity', enum: OpportunityType, example: OpportunityType.JOB })
  @IsEnum(OpportunityType)
  @IsNotEmpty()
  type: OpportunityType;

  @ApiProperty({ description: 'Detailed description of the opportunity', example: 'We are looking for a skilled developer to join our team...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Requirements for the opportunity', example: '3+ years of experience in Node.js, React, and MongoDB.' })
  @IsString()
  @IsNotEmpty()
  requirements: string;

  @ApiProperty({ description: 'Location (e.g. Faisalabad, Remote)', example: 'Faisalabad' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ description: 'Whether the opportunity is remote', example: true })
  @IsBoolean()
  @IsNotEmpty()
  is_remote: boolean;

  @ApiProperty({ description: 'Deadline for applications', example: '2023-12-31' })
  @IsDateString()
  @IsNotEmpty()
  deadline: string;

  @ApiProperty({ description: 'Name of the posting company', example: 'Arfa Software Technology Park' })
  @IsString()
  @IsNotEmpty()
  company_name: string;

  @ApiProperty({ description: 'Direct link to apply', example: 'https://careers.google.com' })
  @IsUrl()
  @IsNotEmpty()
  apply_link: string;

  @ApiProperty({ description: 'List of required skills', type: [String], example: ['Node.js', 'React'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  required_skills: string[];
}

export class UpdateOpportunityDto {
  @ApiPropertyOptional({ description: 'Updated title', example: 'Senior Full Stack Developer' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional({ description: 'Updated description', example: 'We have updated the job description...' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional({ description: 'Updated application link', example: 'https://careers.new.com' })
  @IsOptional()
  @IsUrl()
  @IsNotEmpty()
  apply_link?: string;

  @ApiPropertyOptional({ description: 'Updated deadline', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  @IsNotEmpty()
  deadline?: string;

  @ApiPropertyOptional({ description: 'Updated status', enum: OpportunityStatus, example: OpportunityStatus.OPEN })
  @IsOptional()
  @IsEnum(OpportunityStatus)
  @IsNotEmpty()
  status?: OpportunityStatus;
}
