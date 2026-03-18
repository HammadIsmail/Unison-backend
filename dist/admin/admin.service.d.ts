import { Neo4jService } from '../neo4j/neo4j.service';
import { MailService } from '../common/mail/mail.service';
import { RejectAccountDto } from './dto/admin.dto';
export declare class AdminService {
    private readonly neo4j;
    private readonly mail;
    constructor(neo4j: Neo4jService, mail: MailService);
    getPendingAccounts(): Promise<{
        id: any;
        name: any;
        email: any;
        role: any;
        registered_at: any;
    }[]>;
    approveAccount(id: string): Promise<{
        message: string;
    }>;
    rejectAccount(id: string, dto: RejectAccountDto): Promise<{
        message: string;
    }>;
    getDashboardStats(): Promise<{
        total_alumni: any;
        total_students: any;
        pending_accounts: any;
        total_opportunities: any;
        total_companies: any;
        most_common_skills: any[];
    }>;
    getAllAlumni(page: number, limit: number, search: string): Promise<{
        total: any;
        page: number;
        data: {
            id: any;
            name: any;
            company: any;
            role: any;
        }[];
    }>;
    getAllStudents(page: number, limit: number, search: string): Promise<{
        total: any;
        page: number;
        data: {
            id: any;
            name: any;
            roll_number: any;
            semester: any;
        }[];
    }>;
    removeAccount(id: string): Promise<{
        message: string;
    }>;
}
