import { Neo4jService } from '../neo4j/neo4j.service';
import { CreateOpportunityDto, UpdateOpportunityDto } from './dto/opportunity.dto';
export declare class OpportunityService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    create(userId: string, dto: CreateOpportunityDto): Promise<{
        message: string;
        opportunity_id: string;
    }>;
    findAll(page?: number, limit?: number, type?: string, skill?: string, is_remote?: string): Promise<{
        total: any;
        page: number;
        data: {
            id: any;
            title: any;
            type: any;
            company: any;
            location: any;
            is_remote: any;
            apply_link: any;
            posted_by: any;
            posted_at: any;
            deadline: any;
        }[];
    }>;
    findOne(id: string): Promise<{
        id: any;
        title: any;
        type: any;
        description: any;
        requirements: any;
        location: any;
        is_remote: any;
        apply_link: any;
        deadline: any;
        company: {
            name: any;
        };
        required_skills: any;
        posted_by: {
            id: any;
            name: any;
            role: any;
        };
    }>;
    findMyPosts(userId: string): Promise<{
        id: any;
        title: any;
        company: any;
        status: any;
        posted_at: any;
        deadline: any;
    }[]>;
    update(userId: string, userRole: string, id: string, dto: UpdateOpportunityDto): Promise<{
        message: string;
    }>;
    remove(userId: string, userRole: string, id: string): Promise<{
        message: string;
    }>;
}
