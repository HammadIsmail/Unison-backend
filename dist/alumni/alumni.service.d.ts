import { Neo4jService } from '../neo4j/neo4j.service';
import { UpdateAlumniProfileDto, CreateWorkExperienceDto, UpdateWorkExperienceDto, AddSkillDto, ConnectDto } from './dto/alumni.dto';
export declare class AlumniService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    getProfile(id: string): Promise<{
        name: any;
        email: any;
        bio: any;
        graduation_year: any;
        degree: any;
        current_company: any;
        role: any;
        skills: any;
        batch: any;
        connections_count: any;
        linkedin_url: any;
        work_experiences: any;
        detailed_skills: any;
    }>;
    updateProfile(userId: string, dto: UpdateAlumniProfileDto): Promise<{
        message: string;
    }>;
    addWorkExperience(userId: string, dto: CreateWorkExperienceDto): Promise<{
        message: string;
    }>;
    updateWorkExperience(userId: string, expId: string, dto: UpdateWorkExperienceDto): Promise<{
        message: string;
    }>;
    deleteWorkExperience(userId: string, expId: string): Promise<{
        message: string;
    }>;
    addSkill(userId: string, dto: AddSkillDto): Promise<{
        message: string;
    }>;
    deleteSkill(userId: string, skillId: string): Promise<{
        message: string;
    }>;
    getNetwork(userId: string): Promise<{
        id: any;
        name: any;
        company: any;
        role: any;
        connection_type: any;
    }[]>;
    connectWith(userId: string, targetId: string, dto: ConnectDto): Promise<{
        message: string;
    }>;
    getPendingRequests(userId: string): Promise<{
        sender_id: any;
        sender_name: any;
        connection_type: any;
        requested_at: any;
    }[]>;
    respondToRequest(userId: string, senderId: string, action: 'accept' | 'reject'): Promise<{
        message: string;
    }>;
    getBatchMates(userId: string): Promise<{
        id: any;
        name: any;
        company: any;
        role: any;
    }[]>;
}
