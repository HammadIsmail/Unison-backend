import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
    Inject,
    forwardRef,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { Neo4jService } from '../neo4j/neo4j.service';
import { MailService } from '../common/mail/mail.service';
import { ActivityService, ActivityType } from '../common/activity/activity.service';
import {
    LoginDto,
    RegisterDto,
    ResetPasswordDto,
    SendOtpDto,
    VerifyOtpDto,
} from './dto/auth.dto';
import { NotificationService } from '../notification/notification.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UserAuth } from './schemas/user-auth.schema';
import { OTPRecord } from './schemas/otp.schema';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly neo4j: Neo4jService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        private readonly mail: MailService,
        private readonly activity: ActivityService,
        @Inject(forwardRef(() => NotificationService))
        private readonly notification: NotificationService,
        private readonly cloudinary: CloudinaryService,
        @InjectModel(UserAuth.name)
        private readonly userAuthModel: Model<UserAuth>,
        @InjectModel(OTPRecord.name)
        private readonly otpModel: Model<OTPRecord>,
    ) { }

    // ─── Send OTP ────────────────────────────────────────────────────────────────
    async sendOtp(dto: SendOtpDto) {
        // Check for existing OTP to enforce rate limit (1 min)
        const existing = await this.otpModel.findOne({ email: dto.email, type: dto.type });

        if (existing) {
            const diff = Date.now() - existing.last_sent_at.getTime();
            if (diff < 60000) {
                throw new HttpException(
                    'Please wait 1 minute before requesting another OTP.',
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        await this.otpModel.findOneAndUpdate(
            { email: dto.email, type: dto.type },
            { otp, expires_at: expiresAt, verified: false },
            { upsert: true, new: true }
        );

        await this.mail.sendOtp(dto.email, otp);
        return { message: 'OTP sent to your email.', otp_expires_in: '10 minutes' };
    }

    // ─── Verify OTP ──────────────────────────────────────────────────────────────
    async verifyOtp(dto: VerifyOtpDto) {
        const record = await this.otpModel.findOne({ email: dto.email, type: dto.type });

        if (!record) {
            throw new NotFoundException('No OTP was sent to this email for this purpose.');
        }

        if (record.expires_at < new Date()) {
            throw new BadRequestException('OTP has expired. Please request a new one.');
        }
        if (record.otp !== dto.otp) {
            throw new BadRequestException('Invalid OTP.');
        }

        // Mark as verified
        record.verified = true;
        await record.save();

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
    async register(dto: RegisterDto, file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Student card picture is required.');
        }

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

        // Check duplicate email — only block if a non-deleted account already holds this email
        const existingEmail = await this.userAuthModel.findOne({
            email: dto.email,
            is_deleted: { $ne: true },
        });
        if (existingEmail) {
            throw new ConflictException('An account with this email already exists.');
        }

        // Check duplicate username in Neo4j
        const existingUsername = await this.neo4j.run(
            'MATCH (u:User {username: $username}) RETURN u',
            { username: dto.username },
        );
        if (existingUsername.records.length) {
            throw new ConflictException('Username is already taken.');
        }

        // Upload student card to Cloudinary
        const uploadResult = await this.cloudinary.uploadFile(file);
        const studentCardUrl = uploadResult.secure_url;

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const userId = uuidv4();
        const now = new Date().toISOString();

        // 1. Save Credentials to MongoDB
        await this.userAuthModel.create({
            userId,
            email: dto.email,
            password: hashedPassword,
            role: dto.role,
            account_status: 'pending'
        });

        // 2. Save Profile to Neo4j
        const extraProps =
            dto.role === 'alumni'
                ? `graduation_year: $graduation_year, batch: coalesce($batch, toString($graduation_year - 4) + '-' + toString($graduation_year)),`
                : `semester: $semester, batch: $batch,`;

        await this.neo4j.run(
            `CREATE (u:User {
          id: $id,
          username: $username,
          display_name: $display_name,
          email: $email,
          role: $role,
          roll_number: $roll_number,
          degree: $degree,
          student_card_url: $studentCardUrl,
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
                role: dto.role,
                roll_number: dto.roll_number,
                degree: dto.degree,
                studentCardUrl: studentCardUrl,
                graduation_year: dto.graduation_year ?? null,
                semester: dto.semester ?? null,
                batch: dto.batch ?? null,
                now,
            },
        );

        // Clean up OTP record in MongoDB
        await this.otpModel.deleteOne({ email: dto.email, type: 'email_verification' });

        // 3. Log Activity
        await this.activity.logActivity(
            ActivityType.USER_REGISTERED,
            `New ${dto.role} registered: ${dto.display_name}`,
            userId
        );

        // 4. Notify Admins
        const adminResult = await this.neo4j.run(`MATCH (a:User {role: 'admin'}) RETURN a.id AS id`);
        const notificationPromises = adminResult.records.map(r =>
            this.notification.createNotification(
                r.get('id'),
                `New ${dto.role} account pending approval: ${dto.display_name} (${dto.username})`,
                'user_registered',
                {
                    sender_username: dto.username,
                    sender_display_name: dto.display_name,
                    sender_profile_picture: undefined,
                    reference_link: '/admin/pending-accounts'
                }
            )
        );
        await Promise.allSettled(notificationPromises);

        return { message: 'Account created successfully. Pending admin approval.' };
    }

    // ─── Login ───────────────────────────────────────────────────────────────────
    async login(dto: LoginDto) {
        const email = dto.email.trim().toLowerCase();
        this.logger.log(`Attempting login for: ${email}`);
        
        const auth = await this.userAuthModel.findOne({ email });
        
        if (!auth || auth.is_deleted) {
            this.logger.warn(`Login failed: ${!auth ? 'Email not found' : 'Account soft-deleted'} - ${email}`);
            throw new UnauthorizedException('Invalid email or password.');
        }

        const passwordMatch = await bcrypt.compare(dto.password, auth.password);
        if (!passwordMatch) {
            this.logger.warn(`Login failed: Password mismatch for ${email}`);
            throw new UnauthorizedException('Invalid email or password.');
        }

        if (auth.account_status === 'pending') {
            this.logger.warn(`Login failed: Account pending for ${email}`);
            throw new UnauthorizedException('Your account is pending admin approval.');
        }
        if (auth.account_status === 'rejected') {
            this.logger.warn(`Login failed: Account rejected for ${email}`);
            throw new UnauthorizedException('Your account registration was rejected.');
        }

        // Fetch profile from Neo4j
        const result = await this.neo4j.run(
            'MATCH (u:User {id: $userId}) RETURN u',
            { userId: auth.userId },
        );
        
        const user = result.records[0]?.get('u')?.properties;
        
        // Build response profile
        const profile: any = {
            id: auth.userId,
            email: auth.email,
            role: auth.role,
        };

        if (user) {
            profile.username = user.username;
            profile.display_name = user.display_name || user.name;
            profile.profile_picture = user.profile_picture || null;
            profile.bio = user.bio || null;
            profile.account_status = user.account_status;
            
            if (auth.role !== 'admin') {
                profile.degree = user.degree;
                profile.roll_number = user.roll_number;
                profile.graduation_year = user.graduation_year ?? undefined;
                profile.semester = user.semester ?? undefined;
                profile.phone = user.phone;
                profile.batch = user.batch ?? undefined;
            }
        }

        const token = this.jwt.sign(
            { sub: auth.userId, email: auth.email, role: auth.role },
            {
                secret: this.config.get<string>('JWT_SECRET')!,
                expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') || '7d') as any,
            },
        );

        return { token, role: auth.role, account_status: auth.account_status, profile };
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

        const auth = await this.userAuthModel.findOne({ email: payload.email });
        if (!auth) {
            throw new NotFoundException('No account found for this email.');
        }

        const hashed = await bcrypt.hash(dto.new_password, 10);
        auth.password = hashed;
        await auth.save();

        // Clean up OTP record in MongoDB
        await this.otpModel.deleteOne({ email: payload.email, type: 'forgot_password' });

        return { message: 'Password reset successfully.' };
    }
}
