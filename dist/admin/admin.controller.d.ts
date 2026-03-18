import { AdminService } from './admin.service';
import { RejectAccountDto } from './dto/admin.dto';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
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
    getAllAlumni(page?: string, limit?: string, search?: string): Promise<{
        total: any;
        page: number;
        data: {
            id: any;
            name: any;
            company: any;
            role: any;
        }[];
    }>;
    getAllStudents(page?: string, limit?: string, search?: string): Promise<{
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
