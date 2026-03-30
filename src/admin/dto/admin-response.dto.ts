import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PendingAccountResponseDto {
    @ApiProperty({ example: 'uuid-user-123' })
    id: string;

    @ApiProperty({ example: 'zain_a' })
    username: string;

    @ApiProperty({ example: 'Zainab Ahmed' })
    display_name: string;

    @ApiProperty({ example: 'zainab@uet.edu.pk' })
    email: string;

    @ApiProperty({ example: 'student' })
    role: string;

    @ApiProperty({ example: '2024-03-23T10:00:00Z' })
    registered_at: string;

    @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v123456789/profile.jpg', nullable: true })
    profile_picture: string | null;

    @ApiProperty({ example: 'https://cloudinary.com/student_card.jpg' })
    student_card_url: string;
}

export class DashboardStatsResponseDto {
    @ApiProperty({ example: 120 })
    total_alumni: number;

    @ApiProperty({ example: 450 })
    total_students: number;

    @ApiProperty({ example: 15 })
    pending_accounts: number;

    @ApiProperty({ example: 35 })
    total_opportunities: number;

    @ApiProperty({ example: 45 })
    total_companies: number;

    @ApiProperty({ type: [String], example: ['Node.js', 'React', 'Python'] })
    most_common_skills: string[];
}

export class AdminAlumniListResponseDto {
    @ApiProperty({ example: 'uuid-alumni-123' })
    id: string;

    @ApiProperty({ example: 'hammad_i' })
    username: string;

    @ApiProperty({ example: 'Hammad Ismail' })
    display_name: string;

    @ApiProperty({ example: 'hammad@example.com' })
    email: string;

    @ApiPropertyOptional({ example: '+923001234567' })
    phone?: string;

    @ApiPropertyOptional({ example: 'Software engineer with 5 years of experience.' })
    bio?: string;

    @ApiProperty({ example: 'Google' })
    company: string;

    @ApiProperty({ example: 'Software Engineer' })
    role: string;

    @ApiProperty({ example: 2020 })
    graduation_year: number;

    @ApiProperty({ example: 'BS Computer Science' })
    degree: string;

    @ApiProperty({ example: '2016-2020' })
    batch: string;

    @ApiPropertyOptional({ example: 'https://linkedin.com/in/hammad' })
    linkedin_url?: string;

    @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v123456789/profile.jpg', nullable: true })
    profile_picture: string | null;

    @ApiProperty({ example: '2024-03-23T10:00:00Z' })
    created_at: string;
}

export class AdminAlumniPaginationResponseDto {
    @ApiProperty({ example: 120 })
    total: number;

    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ type: [AdminAlumniListResponseDto] })
    data: AdminAlumniListResponseDto[];
}

export class AdminStudentListResponseDto {
    @ApiProperty({ example: 'uuid-student-123' })
    id: string;

    @ApiProperty({ example: 'ali_k' })
    username: string;

    @ApiProperty({ example: 'Ali Khan' })
    display_name: string;

    @ApiProperty({ example: 'ali@example.com' })
    email: string;

    @ApiPropertyOptional({ example: '+923451234567' })
    phone?: string;

    @ApiPropertyOptional({ example: 'Passionate about web development.' })
    bio?: string;

    @ApiProperty({ example: '2021-CS-110' })
    roll_number: string;

    @ApiProperty({ example: 6 })
    semester: number;

    @ApiProperty({ example: 'BS Computer Science' })
    degree: string;

    @ApiProperty({ example: '2021-2025' })
    batch: string;

    @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v123456789/profile.jpg', nullable: true })
    profile_picture: string | null;

    @ApiProperty({ example: '2024-03-23T10:00:00Z' })
    created_at: string;
}

export class AdminStudentPaginationResponseDto {
    @ApiProperty({ example: 450 })
    total: number;

    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ type: [AdminStudentListResponseDto] })
    data: AdminStudentListResponseDto[];
}
