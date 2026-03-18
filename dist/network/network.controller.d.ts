import { NetworkService } from './network.service';
export declare class NetworkController {
    private readonly networkService;
    constructor(networkService: NetworkService);
    getCentrality(): Promise<{
        alumni_id: any;
        name: any;
        connections: any;
        centrality_score: any;
    }[]>;
    getShortestPath(fromId: string, toId: string): Promise<{
        path: any;
        hops: any;
    }>;
    getTopCompanies(): Promise<{
        company: any;
        alumni_count: any;
    }[]>;
    getSkillTrends(): Promise<{
        most_required_in_opportunities: any;
        most_common_among_alumni: any;
        gap: any;
    }>;
    getBatchAnalysis(): Promise<{
        batch: any;
        total_alumni: any;
        top_companies: any;
        top_roles: any;
        avg_connections: any;
    }[]>;
}
