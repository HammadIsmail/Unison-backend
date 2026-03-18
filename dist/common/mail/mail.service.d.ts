import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private config;
    private transporter;
    constructor(config: ConfigService);
    sendOtp(to: string, otp: string): Promise<void>;
    sendApprovalEmail(to: string, name: string): Promise<void>;
    sendRejectionEmail(to: string, name: string, reason: string): Promise<void>;
}
