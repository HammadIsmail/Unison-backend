import { Neo4jService } from '../neo4j/neo4j.service';
import { UpdateStudentProfileDto, AddStudentSkillDto } from './dto/student.dto';
export declare class StudentService {
    private readonly neo4j;
    constructor(neo4j: Neo4jService);
    getProfile(id: string): Promise<{
        name: any;
        email: any;
        roll_number: any;
        semester: any;
        degree: any;
        skills: any;
        detailed_skills: any;
        batch: any;
        bio: any;
        phone: any;
        profile_picture: any;
    }>;
    updateProfile(userId: string, dto: UpdateStudentProfileDto): Promise<{
        message: string;
    }>;
    addSkill(userId: string, dto: AddStudentSkillDto): Promise<{
        message: string;
    }>;
    getMentors(userId: string): Promise<{
        alumni_id: any;
        name: any;
        domain: any;
        company: any;
    }[]>;
}
