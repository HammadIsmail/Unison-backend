import { AlumniService } from './alumni.service';
import { UpdateAlumniProfileDto, CreateWorkExperienceDto, UpdateWorkExperienceDto, AddSkillDto, ConnectDto } from './dto/alumni.dto';
import { RespondToConnectionDto } from './dto/connection.dto';
export declare class AlumniController {
    private readonly alumniService;
    constructor(alumniService: AlumniService);
    getMe(userId: string): Promise<{
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
    updateMe(userId: string, dto: UpdateAlumniProfileDto): Promise<{
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
    respondToRequest(userId: string, senderId: string, dto: RespondToConnectionDto): Promise<{
        message: string;
    }>;
    getBatchMates(userId: string): Promise<{
        id: any;
        name: any;
        company: any;
        role: any;
    }[]>;
}
