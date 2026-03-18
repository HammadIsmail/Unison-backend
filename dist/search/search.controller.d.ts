import { SearchService } from './search.service';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
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
