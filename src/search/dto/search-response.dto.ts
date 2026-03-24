import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchAlumniResponseDto {
    @ApiProperty({ example: 'uuid-alumni-123' })
    id: string;

    @ApiProperty({ example: 'ahmed_h' })
    username: string;

    @ApiProperty({ example: 'Ahmed The Dev' })
    display_name: string;

    @ApiPropertyOptional({ example: 'Google' })
    company?: string;

    @ApiPropertyOptional({ example: 'Software Engineer' })
    role?: string;

    @ApiProperty({ type: [String], example: ['Node.js', 'Neo4j'] })
    skills: string[];
}

export class SearchOpportunityResponseDto {
    @ApiProperty({ example: 'uuid-opp-123' })
    id: string;

    @ApiProperty({ example: 'Backend Developer' })
    title: string;

    @ApiProperty({ example: 'job' })
    type: string;

    @ApiProperty({ example: 'Startup X' })
    company: string;

    @ApiProperty({ example: 'Lahore, Pakistan' })
    location: string;

    @ApiProperty({ example: 'https://startupx.com/apply' })
    apply_link: string;
}

export class UserDetailResponseDto {
    @ApiProperty({ example: 'uuid-user-123' })
    id: string;


    @ApiProperty({ example: 'ahmed_h' })
    username: string;

    @ApiProperty({ example: 'Ahmed The Dev' })
    display_name: string;

    @ApiProperty({ example: 'alumni' })
    role: string;

    @ApiProperty({ example: 'BSCS' })
    degree: string;

    @ApiProperty({ example: 2024 })
    graduation_year: number;

    @ApiPropertyOptional({ example: 'Google' })
    company?: string;

    @ApiPropertyOptional({ example: 'Software Engineer' })
    job_role?: string;

    @ApiProperty({ type: [String], example: ['Node.js', 'Neo4j'] })
    skills: string[];
}
