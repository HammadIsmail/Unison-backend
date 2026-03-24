import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { Neo4jService } from '../neo4j/neo4j.service';
import { MailService } from '../common/mail/mail.service';
import {
    LoginDto,
    RegisterDto,
    ResetPasswordDto,
    SendOtpDto,
    VerifyOtpDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        private neo4j: Neo4jService,
        private jwt: JwtService,
        private config: ConfigService,
        private mail: MailService,
    ) { }

    // ─── Send OTP ────────────────────────────────────────────────────────────────
    async sendOtp(dto: SendOtpDto) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

        // Upsert OTPRecord node
        await this.neo4j.run(
            `MERGE (o:OTPRecord {email: $email, type: $type})
       SET o.otp = $otp, o.expires_at = $expiresAt, o.verified = false`,
            { email: dto.email, type: dto.type, otp, expiresAt },
        );

        await this.mail.sendOtp(dto.email, otp);
        return { message: 'OTP sent to your email.', otp_expires_in: '10 minutes' };
    }

    // ─── Verify OTP ──────────────────────────────────────────────────────────────
    async verifyOtp(dto: VerifyOtpDto) {
        const result = await this.neo4j.run(
            `MATCH (o:OTPRecord {email: $email, type: $type})
       RETURN o`,
            { email: dto.email, type: dto.type },
        );

        if (!result.records.length) {
            throw new NotFoundException('No OTP was sent to this email for this purpose.');
        }

        const record = result.records[0].get('o').properties;

        if (new Date(record.expires_at) < new Date()) {
            throw new BadRequestException('OTP has expired. Please request a new one.');
        }
        if (record.otp !== dto.otp) {
            throw new BadRequestException('Invalid OTP.');
        }

        // Mark as verified
        await this.neo4j.run(
            `MATCH (o:OTPRecord {email: $email, type: $type}) SET o.verified = true`,
            { email: dto.email, type: dto.type },
        );

        // Issue short-lived verified_token
        const verifiedToken = this.jwt.sign(
            { email: dto.email, type: dto.type, purpose: 'verified' },
            {
                secret: this.config.get<string>('VERIFIED_TOKEN_SECRET')!,
                expiresIn: (this.config.get<string>('VERIFIED_TOKEN_EXPIRES_IN') || '15m') as any,
            },
        );

        return { message: 'OTP verified successfully.', verified_token: verifiedToken };
    }

    // ─── Register ────────────────────────────────────────────────────────────────
    async register(dto: RegisterDto) {
        // Validate verified_token
        let payload: { email: string; type: string; purpose: string };
        try {
            payload = this.jwt.verify(dto.verified_token, {
                secret: this.config.get<string>('VERIFIED_TOKEN_SECRET')!,
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired verified_token.');
        }

        if (payload.purpose !== 'verified' || payload.type !== 'email_verification') {
            throw new UnauthorizedException('verified_token is not for email verification.');
        }
        if (payload.email !== dto.email) {
            throw new BadRequestException('Email mismatch with verified_token.');
        }

        // Check duplicate email
        const existingEmail = await this.neo4j.run(
            'MATCH (u:User {email: $email}) RETURN u',
            { email: dto.email },
        );
        if (existingEmail.records.length) {
            throw new ConflictException('An account with this email already exists.');
        }

        // Check duplicate username
        const existingUsername = await this.neo4j.run(
            'MATCH (u:User {username: $username}) RETURN u',
            { username: dto.username },
        );
        if (existingUsername.records.length) {
            throw new ConflictException('Username is already taken.');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const userId = uuidv4();
        const now = new Date().toISOString();

        // Build role-specific props
        const extraProps =
            dto.role === 'alumni'
                ? `graduation_year: $graduation_year, batch: toString($graduation_year - 4) + '-' + toString($graduation_year),`
                : `semester: $semester,`;

        await this.neo4j.run(
            `CREATE (u:User {
          id: $id,
          username: $username,
          display_name: $display_name,
          email: $email,
          password: $password,
          role: $role,
          roll_number: $roll_number,
          degree: $degree,
          account_status: 'pending',
          created_at: $now,
         ${extraProps}
         profile_picture: null,
         bio: null,
         phone: null
       })`,
            {
                id: userId,
                username: dto.username,
                display_name: dto.display_name,
                email: dto.email,
                password: hashedPassword,
                role: dto.role,
                roll_number: dto.roll_number,
                degree: dto.degree,
                graduation_year: dto.graduation_year ?? null,
                semester: dto.semester ?? null,
                now,
            },
        );

        // Clean up OTP record
        await this.neo4j.run(
            `MATCH (o:OTPRecord {email: $email, type: 'email_verification'}) DELETE o`,
            { email: dto.email },
        );

        return { message: 'Account created successfully. Pending admin approval.' };
    }

    // ─── Login ───────────────────────────────────────────────────────────────────
    async login(dto: LoginDto) {
        const result = await this.neo4j.run(
            'MATCH (u:User {email: $email}) RETURN u',
            { email: dto.email },
        );

        if (!result.records.length) {
            throw new UnauthorizedException('Invalid email or password.');
        }

        const user = result.records[0].get('u').properties;

        const passwordMatch = await bcrypt.compare(dto.password, user.password);
        if (!passwordMatch) {
            throw new UnauthorizedException('Invalid email or password.');
        }

        if (user.account_status === 'pending') {
            throw new UnauthorizedException('Your account is pending admin approval.');
        }
        if (user.account_status === 'rejected') {
            throw new UnauthorizedException('Your account registration was rejected.');
        }

        const token = this.jwt.sign(
            { sub: user.id, email: user.email, role: user.role },
            {
                secret: this.config.get<string>('JWT_SECRET')!,
                expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') || '7d') as any,
            },
        );

        // Build profile (omit password)
        const profile = {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            email: user.email,
            role: user.role,
            degree: user.degree,
            roll_number: user.roll_number,
            graduation_year: user.graduation_year ?? undefined,
            semester: user.semester ?? undefined,
            bio: user.bio,
            phone: user.phone,
            profile_picture: user.profile_picture,
            batch: user.batch ?? undefined,
        };

        return { token, role: user.role, account_status: user.account_status, profile };
    }

    // ─── Reset Password ──────────────────────────────────────────────────────────
    async resetPassword(dto: ResetPasswordDto) {
        let payload: { email: string; type: string; purpose: string };
        try {
            payload = this.jwt.verify(dto.verified_token, {
                secret: this.config.get<string>('VERIFIED_TOKEN_SECRET')!,
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired verified_token.');
        }

        if (payload.purpose !== 'verified' || payload.type !== 'forgot_password') {
            throw new UnauthorizedException('verified_token is not for password reset.');
        }

        const result = await this.neo4j.run(
            'MATCH (u:User {email: $email}) RETURN u',
            { email: payload.email },
        );
        if (!result.records.length) {
            throw new NotFoundException('No account found for this email.');
        }

        const hashed = await bcrypt.hash(dto.new_password, 10);
        await this.neo4j.run(
            'MATCH (u:User {email: $email}) SET u.password = $password',
            { email: payload.email, password: hashed },
        );

        // Clean up OTP record
        await this.neo4j.run(
            `MATCH (o:OTPRecord {email: $email, type: 'forgot_password'}) DELETE o`,
            { email: payload.email },
        );

        return { message: 'Password reset successfully.' };
    }
}
