import { StudentService } from './student.service';
import { UpdateStudentProfileDto, AddStudentSkillDto } from './dto/student.dto';
export declare class StudentController {
    private readonly studentService;
    constructor(studentService: StudentService);
    getMe(userId: string): Promise<{
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
    updateMe(userId: string, dto: UpdateStudentProfileDto): Promise<{
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
