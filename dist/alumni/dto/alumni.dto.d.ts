export declare class UpdateAlumniProfileDto {
    bio?: string;
    linkedin_url?: string;
    phone?: string;
    profile_picture?: string;
}
export declare class CreateWorkExperienceDto {
    company_name: string;
    role: string;
    start_date: string;
    end_date?: string;
    is_current: boolean;
    employment_type: string;
}
export declare class UpdateWorkExperienceDto {
    role?: string;
    end_date?: string;
    is_current?: boolean;
}
export declare class AddSkillDto {
    skill_name: string;
    category: string;
    proficiency_level: string;
    years_experience?: number;
}
export declare class ConnectDto {
    connection_type: string;
}
