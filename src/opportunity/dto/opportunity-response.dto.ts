import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OpportunityListResponseDto {
    @ApiProperty({ example: 'uuid-opp-123' })
    id: string;

    @ApiProperty({ example: 'Software Engineer' })
    title: string;

    @ApiProperty({ example: 'full-time' })
    type: string;

    @ApiProperty({ example: 'Google' })
    company: string;

    @ApiProperty({ example: 'Mountain View, CA' })
    location: string;

    @ApiProperty({ example: true })
    is_remote: boolean;

    @ApiProperty({ example: 'https://google.com/careers' })
    apply_link: string;

    @ApiProperty({ example: 'Hammad Ismail' })
    posted_by: string;

    @ApiProperty({ example: '2024-03-23' })
    posted_at: string;

    @ApiProperty({ example: '2024-04-01' })
    deadline: string;
}

export class OpportunityPaginationResponseDto {
    @ApiProperty({ example: 100 })
    total: number;

    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ type: [OpportunityListResponseDto] })
    data: OpportunityListResponseDto[];
}

export class OpportunityCompanyResponseDto {
    @ApiProperty({ example: 'Google' })
    name: string;
}

export class OpportunityPosterResponseDto {
    @ApiProperty({ example: 'uuid-user-123' })
    id: string;

    @ApiProperty({ example: 'Hammad Ismail' })
    name: string;

    @ApiProperty({ example: 'alumni' })
    role: string;
}

export class OpportunityDetailResponseDto {
    @ApiProperty({ example: 'uuid-opp-123' })
    id: string;

    @ApiProperty({ example: 'Software Engineer' })
    title: string;

    @ApiProperty({ example: 'full-time' })
    type: string;

    @ApiProperty({ example: 'Deep dive into NestJS and Neo4j.' })
    description: string;

    @ApiProperty({ example: '3+ years of experience in Node.js.' })
    requirements: string;

    @ApiProperty({ example: 'Mountain View, CA' })
    location: string;

    @ApiProperty({ example: true })
    is_remote: boolean;

    @ApiProperty({ example: 'https://google.com/careers' })
    apply_link: string;

    @ApiProperty({ example: '2024-04-01' })
    deadline: string;

    @ApiProperty({ type: OpportunityCompanyResponseDto })
    company: OpportunityCompanyResponseDto;

    @ApiProperty({ type: [String], example: ['Node.js', 'NestJS'] })
    required_skills: string[];

    @ApiProperty({ type: OpportunityPosterResponseDto })
    posted_by: OpportunityPosterResponseDto;
}

export class MyOpportunityPostResponseDto {
    @ApiProperty({ example: 'uuid-opp-123' })
    id: string;

    @ApiProperty({ example: 'Software Engineer' })
    title: string;

    @ApiProperty({ example: 'Google' })
    company: string;

    @ApiProperty({ example: 'open' })
    status: string;

    @ApiProperty({ example: '2024-03-23' })
    posted_at: string;

    @ApiProperty({ example: '2024-04-01' })
    deadline: string;
}

export class CreateOpportunityResponseDto {
    @ApiProperty({ example: 'Opportunity broadcasted to network successfully.' })
    message: string;

    @ApiProperty({ example: 'uuid-opp-123' })
    opportunity_id: string;
}
