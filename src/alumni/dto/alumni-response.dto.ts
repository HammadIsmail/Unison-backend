import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkExperienceResponseDto {
    @ApiProperty({ example: 'uuid-exp-123' })
    id: string;

    @ApiProperty({ example: 'Google' })
    company_name: string;

    @ApiProperty({ example: 'Senior Software Engineer' })
    role: string;

    @ApiProperty({ example: '2020-01-01' })
    start_date: string;

    @ApiPropertyOptional({ example: '2023-12-31' })
    end_date?: string;

    @ApiProperty({ example: true })
    is_current: boolean;

    @ApiProperty({ example: 'full-time' })
    employment_type: string;
}

export class SkillDetailResponseDto {
    @ApiProperty({ example: 'uuid-skill-123' })
    id: string;

    @ApiProperty({ example: 'TypeScript' })
    name: string;

    @ApiProperty({ example: 'Programming' })
    category: string;

    @ApiProperty({ example: 'expert' })
    proficiency_level: string;
}

export class AlumniProfileResponseDto {
    @ApiProperty({ example: 'Ahmed Hassan' })
    name: string;

    @ApiProperty({ example: 'ahmed@uet.edu.pk' })
    email: string;

    @ApiPropertyOptional({ example: 'Experienced software engineer.' })
    bio?: string;

    @ApiProperty({ example: 2025 })
    graduation_year: number;

    @ApiProperty({ example: 'BS Computer Science' })
    degree: string;

    @ApiPropertyOptional({ example: 'Google' })
    current_company?: string;

    @ApiPropertyOptional({ example: 'Senior Engineer' })
    role?: string;

    @ApiProperty({ type: [String], example: ['TypeScript', 'NestJS'] })
    skills: string[];

    @ApiProperty({ example: '2021-2025' })
    batch: string;

    @ApiProperty({ example: 45 })
    connections_count: number;

    @ApiPropertyOptional({ example: 'https://linkedin.com/in/ahmed' })
    linkedin_url?: string;

    @ApiPropertyOptional({ example: '+923001234567' })
    phone?: string;

    @ApiPropertyOptional({ example: 'https://cloudinary.com/ahmed_profile.jpg' })
    profile_picture?: string;

    @ApiProperty({ type: [WorkExperienceResponseDto] })
    work_experiences: WorkExperienceResponseDto[];

    @ApiProperty({ type: [SkillDetailResponseDto] })
    detailed_skills: SkillDetailResponseDto[];
}

export class NetworkUserResponseDto {
    @ApiProperty({ example: 'uuid-123' })
    id: string;

    @ApiProperty({ example: 'Ali Khan' })
    name: string;

    @ApiPropertyOptional({ example: 'Microsoft' })
    company?: string;

    @ApiPropertyOptional({ example: 'Product Manager' })
    role?: string;

    @ApiPropertyOptional({ example: 'colleague' })
    connection_type?: string;
}

export class ConnectionRequestResponseDto {
    @ApiProperty({ example: 'uuid-sender-123' })
    sender_id: string;

    @ApiProperty({ example: 'Zainab Ahmed' })
    sender_name: string;

    @ApiProperty({ example: 'mentor' })
    connection_type: string;

    @ApiProperty({ example: '2024-03-23T10:00:00Z' })
    requested_at: string;
}
