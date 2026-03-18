import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Neo4jService } from '../neo4j/neo4j.service';
import { MailService } from '../common/mail/mail.service';
import { LoginDto, RegisterDto, ResetPasswordDto, SendOtpDto, VerifyOtpDto } from './dto/auth.dto';
export declare class AuthService {
    private neo4j;
    private jwt;
    private config;
    private mail;
    constructor(neo4j: Neo4jService, jwt: JwtService, config: ConfigService, mail: MailService);
    sendOtp(dto: SendOtpDto): Promise<{
        message: string;
        otp_expires_in: string;
    }>;
    verifyOtp(dto: VerifyOtpDto): Promise<{
        message: string;
        verified_token: string;
    }>;
    register(dto: RegisterDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        token: string;
        role: any;
        account_status: any;
        profile: {
            id: any;
            name: any;
            email: any;
            role: any;
            degree: any;
            roll_number: any;
            graduation_year: any;
            semester: any;
            bio: any;
            phone: any;
            profile_picture: any;
            batch: any;
        };
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
