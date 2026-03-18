import { OpportunityService } from './opportunity.service';
import { CreateOpportunityDto, UpdateOpportunityDto } from './dto/opportunity.dto';
export declare class OpportunityController {
    private readonly opportunityService;
    constructor(opportunityService: OpportunityService);
    create(userId: string, dto: CreateOpportunityDto): Promise<{
        message: string;
        opportunity_id: string;
    }>;
    findAll(page?: string, limit?: string, type?: string, skill?: string, is_remote?: string): Promise<{
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
    findMyPosts(userId: string): Promise<{
        id: any;
        title: any;
        company: any;
        status: any;
        posted_at: any;
        deadline: any;
    }[]>;
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
    update(userId: string, role: string, id: string, dto: UpdateOpportunityDto): Promise<{
        message: string;
    }>;
    remove(userId: string, role: string, id: string): Promise<{
        message: string;
    }>;
}
