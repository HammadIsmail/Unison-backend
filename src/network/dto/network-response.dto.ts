import { ApiProperty } from '@nestjs/swagger';

export class CentralityResponseDto {
    @ApiProperty({ example: 'uuid-alumni-123' })
    alumni_id: string;

    @ApiProperty({ example: 'Hammad Ismail' })
    name: string;

    @ApiProperty({ example: 50 })
    connections: number;

    @ApiProperty({ example: 0.5 })
    centrality_score: number;
}

export class ShortestPathResponseDto {
    @ApiProperty({ example: ['Hammad Ismail', 'Ahmed Hassan', 'Ali Khan'] })
    path: string[];

    @ApiProperty({ example: 2 })
    hops: number;
}

export class TopCompanyResponseDto {
    @ApiProperty({ example: 'Google' })
    company: string;

    @ApiProperty({ example: 25 })
    alumni_count: number;
}

export class SkillTrendResponseDto {
    @ApiProperty({ example: ['TypeScript', 'Node.js', 'Python', 'NestJS', 'Neo4j'] })
    most_required_in_opportunities: string[];

    @ApiProperty({ example: ['Python', 'Java', 'C++', 'SQL', 'JavaScript'] })
    most_common_among_alumni: string[];

    @ApiProperty({ example: ['Rust', 'Go', 'Kubernetes'] })
    gap: string[];
}

export class BatchAnalysisResponseDto {
    @ApiProperty({ example: '2021-2025' })
    batch: string;

    @ApiProperty({ example: 100 })
    total_alumni: number;

    @ApiProperty({ example: ['Google', 'Microsoft'] })
    top_companies: string[];

    @ApiProperty({ example: ['Software Engineer', 'Product Manager'] })
    top_roles: string[];

    @ApiProperty({ example: 15 })
    avg_connections: number;
}
