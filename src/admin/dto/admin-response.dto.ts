import { ApiProperty } from '@nestjs/swagger';

export class PendingAccountResponseDto {
    @ApiProperty({ example: 'uuid-user-123' })
    id: string;

    @ApiProperty({ example: 'Zainab Ahmed' })
    name: string;

    @ApiProperty({ example: 'zainab@uet.edu.pk' })
    email: string;

    @ApiProperty({ example: 'student' })
    role: string;

    @ApiProperty({ example: '2024-03-23T10:00:00Z' })
    registered_at: string;

    @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v123456789/profile.jpg', nullable: true })
    profile_picture: string | null;
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

    @ApiProperty({ example: 'Hammad Ismail' })
    name: string;

    @ApiProperty({ example: 'Google' })
    company: string;

    @ApiProperty({ example: 'Software Engineer' })
    role: string;

    @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v123456789/profile.jpg', nullable: true })
    profile_picture: string | null;
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

    @ApiProperty({ example: 'Ali Khan' })
    name: string;

    @ApiProperty({ example: '2021-CS-110' })
    roll_number: string;

    @ApiProperty({ example: 6 })
    semester: number;

    @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/v123456789/profile.jpg', nullable: true })
    profile_picture: string | null;
}

export class AdminStudentPaginationResponseDto {
    @ApiProperty({ example: 450 })
    total: number;

    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ type: [AdminStudentListResponseDto] })
    data: AdminStudentListResponseDto[];
}
