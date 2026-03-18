import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAlumniProfileDto {
  @ApiPropertyOptional({ description: 'A short bio of the alumni' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'LinkedIn profile URL' })
  @IsOptional()
  @IsString()
  linkedin_url?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  @IsOptional()
  @IsString()
  profile_picture?: string;
}

export class CreateWorkExperienceDto {
  @ApiProperty({ description: 'Name of the company' })
  @IsNotEmpty()
  @IsString()
  company_name: string;

  @ApiProperty({ description: 'Job role or title' })
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

  @ApiProperty({ description: 'Whether this is the current job' })
  @IsNotEmpty()
  @IsBoolean()
  is_current: boolean;

  @ApiProperty({ description: 'Employment type', enum: ['full-time', 'part-time', 'freelance'] })
  @IsNotEmpty()
  @IsEnum(['full-time', 'part-time', 'freelance'])
  employment_type: string;
}

export class UpdateWorkExperienceDto {
  @ApiPropertyOptional({ description: 'Updated job role or title' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Updated end date', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Whether this is now the current job' })
  @IsOptional()
  @IsBoolean()
  is_current?: boolean;
}

export class AddSkillDto {
  @ApiProperty({ description: 'Name of the skill' })
  @IsNotEmpty()
  @IsString()
  skill_name: string;

  @ApiProperty({ description: 'Skill category (e.g. Programming, Soft Skills)' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiProperty({ description: 'Proficiency level', enum: ['beginner', 'intermediate', 'expert'] })
  @IsNotEmpty()
  @IsEnum(['beginner', 'intermediate', 'expert'])
  proficiency_level: string;

  @ApiPropertyOptional({ description: 'Years of experience in this skill' })
  @IsOptional()
  @IsInt()
  years_experience?: number;
}

export class ConnectDto {
  @ApiProperty({ description: 'Type of connection', enum: ['batchmate', 'colleague', 'mentor'] })
  @IsNotEmpty()

  @IsEnum(['batchmate', 'colleague', 'mentor'])
  connection_type: string;
}
