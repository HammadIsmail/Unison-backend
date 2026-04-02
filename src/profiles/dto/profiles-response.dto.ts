import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProfileWorkExperienceDto {
  @ApiProperty({ example: 'uuid-exp-123' })
  id: string;

  @ApiProperty({ example: 'Google' })
  company_name: string;

  @ApiProperty({ example: 'Senior Software Engineer' })
  role: string;

  @ApiProperty({ example: '2023-01-01' })
  start_date: string;

  @ApiPropertyOptional({ example: '2023-12-31' })
  end_date?: string;

  @ApiProperty({ example: true })
  is_current: boolean;

  @ApiProperty({ example: 'full-time' })
  employment_type: string;
}

export class ProfileSkillDto {
  @ApiProperty({ example: 'TypeScript' })
  name: string;

  @ApiProperty({ example: 'Programming' })
  category: string;

  @ApiProperty({ example: 'expert' })
  proficiency: string;
}

export class ProfileOpportunityDto {
  @ApiProperty({ example: 'uuid-opp-123' })
  id: string;

  @ApiProperty({ example: 'Backend Developer' })
  title: string;

  @ApiProperty({ example: 'job' })
  type: string;

  @ApiProperty({ example: 'Startup X' })
  company: string;

  @ApiProperty({ example: '2024-03-23' })
  posted_at: string;

  @ApiProperty({ example: '2024-04-01' })
  deadline: string;
}

export class PublicProfileResponseDto {
  @ApiProperty({ example: 'uuid-user-123' })
  id: string;

  @ApiProperty({ example: 'hammad_i' })
  username: string;

  @ApiProperty({ example: 'Hammad Ismail' })
  display_name: string;

  @ApiProperty({ example: 'alumni' })
  role: 'alumni' | 'student';

  @ApiPropertyOptional({ example: 'https://url.com/pic.jpg' })
  profile_picture?: string;

  @ApiPropertyOptional({ example: 'Software engineer at Google.' })
  bio?: string;

  @ApiProperty({ example: 'BS Computer Science' })
  degree: string;

  @ApiProperty({ example: '2016-2020' })
  batch: string;

  // Alumni Specific
  @ApiPropertyOptional({ example: 2020 })
  graduation_year?: number;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/hammad' })
  linkedin_url?: string;

  // Student Specific
  @ApiPropertyOptional({ example: 6 })
  semester?: number;

  @ApiPropertyOptional({ example: '2021-CS-101' })
  roll_number?: string;

  @ApiProperty({ type: [ProfileWorkExperienceDto] })
  work_experience: ProfileWorkExperienceDto[];

  @ApiProperty({ type: [ProfileSkillDto] })
  skills: ProfileSkillDto[];

  @ApiProperty({ type: [ProfileOpportunityDto] })
  opportunities_posted: ProfileOpportunityDto[];

  @ApiProperty({ example: 'connected', enum: ['connected', 'pending', 'none'] })
  connection_status: 'connected' | 'pending' | 'none';

  @ApiPropertyOptional({ example: true, description: 'True if the REQUESTING user initiated the pending connection' })
  is_connection_sender?: boolean;
}
