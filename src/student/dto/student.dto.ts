import { IsString, IsOptional, IsEnum, IsNotEmpty, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStudentProfileDto {
  @ApiPropertyOptional({ example: 'Ali The Student' })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+923451234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'A short bio of the student', example: 'Fascinated by AI and machine learning. Looking for internships.' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'Profile picture file' })
  @IsOptional()
  profile_picture?: any;

  @ApiPropertyOptional({ description: 'Current semester of the student', example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semester?: number;
}

export class AddStudentSkillDto {
  @ApiProperty({ description: 'Name of the skill', example: 'Python' })
  @IsNotEmpty()
  @IsString()
  skill_name: string;

  @ApiProperty({ description: 'Skill category (e.g. Programming, Soft Skills)', example: 'Data Science' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiProperty({ description: 'Proficiency level', enum: ['beginner', 'intermediate', 'expert'], example: 'beginner' })
  @IsNotEmpty()
  @IsEnum(['beginner', 'intermediate', 'expert'])
  proficiency_level: string;
}

export class ConnectToMentorDto {
  @ApiProperty({ description: 'Type of connection', enum: ['mentor'], example: 'mentor' })
  @IsNotEmpty()
  @IsEnum(['mentor'])
  connection_type: string;
}
