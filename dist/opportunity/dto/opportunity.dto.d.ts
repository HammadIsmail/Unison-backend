export declare enum OpportunityType {
    JOB = "job",
    INTERNSHIP = "internship",
    FREELANCE = "freelance"
}
export declare enum OpportunityStatus {
    OPEN = "open",
    CLOSED = "closed"
}
export declare class CreateOpportunityDto {
    title: string;
    type: OpportunityType;
    description: string;
    requirements: string;
    location: string;
    is_remote: boolean;
    deadline: string;
    company_name: string;
    apply_link: string;
    required_skills: string[];
}
export declare class UpdateOpportunityDto {
    title?: string;
    description?: string;
    apply_link?: string;
    deadline?: string;
    status?: OpportunityStatus;
}
