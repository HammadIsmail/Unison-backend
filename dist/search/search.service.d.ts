import { Neo4jService } from '../neo4j/neo4j.service';
export declare class SearchService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    searchAlumni(name?: string, company?: string, skill?: string, batch_year?: string, degree?: string): Promise<{
        id: any;
        name: any;
        company: any;
        role: any;
        skills: any;
    }[]>;
    searchOpportunities(title?: string, type?: string, skill?: string, location?: string, is_remote?: string): Promise<{
        id: any;
        title: any;
        type: any;
        company: any;
        location: any;
        apply_link: any;
    }[]>;
}
