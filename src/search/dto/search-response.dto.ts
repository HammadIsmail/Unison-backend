import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OpportunityPosterResponseDto } from '../../opportunity/dto/opportunity-response.dto';

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

    @ApiPropertyOptional({ example: 'https://cloudinary.com/ahmed_profile.jpg' })
    profile_picture?: string;
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

    @ApiProperty({ example: true })
    is_remote: boolean;

    @ApiProperty({ type: OpportunityPosterResponseDto })
    posted_by: OpportunityPosterResponseDto;

    @ApiProperty({ example: '2024-03-23' })
    posted_at: string;

    @ApiProperty({ example: '2024-04-01' })
    deadline: string;

    @ApiPropertyOptional({ type: [String], example: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'] })
    media?: string[];
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

    @ApiPropertyOptional({ example: 'https://cloudinary.com/ahmed_profile.jpg' })
    profile_picture?: string;

    @ApiPropertyOptional({ example: 'Passionate software engineer from UET Faisalabad.' })
    bio?: string;

    @ApiPropertyOptional({ example: 'https://linkedin.com/in/ahmed' })
    linkedin_url?: string;
}
