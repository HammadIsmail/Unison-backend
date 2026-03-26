import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAlumniProfileDto {
  @ApiPropertyOptional({ example: 'Ahmed The Dev' })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiPropertyOptional({ description: 'A short bio of the alumni', example: 'Experienced software engineer specialized in NestJS and Neo4j.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'LinkedIn profile URL', example: 'https://linkedin.com/in/ahmedhassan' })
  @IsOptional()
  @IsString()
  linkedin_url?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+923001234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Profile picture file' })
  @IsOptional()
  profile_picture?: any;
}

export class CreateWorkExperienceDto {
  @ApiProperty({ description: 'Name of the company', example: 'Google' })
  @IsNotEmpty()
  @IsString()
  company_name: string;

  @ApiProperty({ description: 'Job role or title', example: 'Senior Software Engineer' })
  @IsNotEmpty()
  @IsString()
  role: string;

  @ApiProperty({ description: 'Start date of the work experience', example: '2023-01-01' })
  @IsNotEmpty()
  @IsDateString()
  start_date: string;

  @ApiPropertyOptional({ description: 'End date of the work experience', example: '2023-12-31' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({ description: 'Whether this is the current job', example: true })
  @IsNotEmpty()
  @IsBoolean()
  is_current: boolean;

  @ApiProperty({ description: 'Employment type', enum: ['full-time', 'part-time', 'freelance'] })
  @IsNotEmpty()
  @IsEnum(['full-time', 'part-time', 'freelance'])
  employment_type: string;
}

export class UpdateWorkExperienceDto {
  @ApiPropertyOptional({ description: 'Updated job role or title', example: 'Tech Lead' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Updated end date', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Whether this is now the current job', example: false })
  @IsOptional()
  @IsBoolean()
  is_current?: boolean;
}

export class AddSkillDto {
  @ApiProperty({ description: 'Name of the skill', example: 'TypeScript' })
  @IsNotEmpty()
  @IsString()
  skill_name: string;

  @ApiProperty({ description: 'Skill category (e.g. Programming, Soft Skills)', example: 'Programming' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiProperty({ description: 'Proficiency level', enum: ['beginner', 'intermediate', 'expert'] })
  @IsNotEmpty()
  @IsEnum(['beginner', 'intermediate', 'expert'])
  proficiency_level: string;

  @ApiPropertyOptional({ description: 'Years of experience in this skill', example: 3 })
  @IsOptional()
  @IsInt()
  years_experience?: number;
}

export class ConnectDto {
  @ApiProperty({ description: 'Type of connection', enum: ['batchmate', 'colleague', 'mentor'], example: 'mentor' })
  @IsNotEmpty()
  @IsEnum(['batchmate', 'colleague', 'mentor'])
  connection_type: string;
}
