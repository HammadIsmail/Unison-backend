import { IsString, IsOptional, IsEnum, IsNotEmpty, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStudentProfileDto {
  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'A short bio of the student' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  @IsOptional()
  @IsString()
  profile_picture?: string;
}

export class AddStudentSkillDto {
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
}
