import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
    ForbiddenException,
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
import { ClsService } from 'nestjs-cls';
import { Neo4jService } from '../neo4j/neo4j.service';
import { TenantNeo4jService } from '../neo4j/tenant-neo4j.service';
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
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly neo4j: Neo4jService,
        private readonly tenantNeo4j: TenantNeo4jService,
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
        private readonly mail: MailService,
        private readonly activity: ActivityService,
        @Inject(forwardRef(() => NotificationService))
        private readonly notification: NotificationService,
        private readonly cloudinary: CloudinaryService,
        private readonly tenantsService: TenantsService,
        private readonly cls: ClsService,
        @InjectModel(UserAuth.name)
        private readonly userAuthModel: Model<UserAuth>,
        @InjectModel(OTPRecord.name)
        private readonly otpModel: Model<OTPRecord>,
    ) { }

    // ─── Send OTP ────────────────────────────────────────────────────────────────
    async sendOtp(dto: SendOtpDto) {
        const existing = await this.otpModel.findOne({ email: dto.email, type: dto.type });

        if (existing) {
            const diff = Date.now() - existing.last_sent_at.getTime();
            if (diff < 60000) {
                const secondsLeft = Math.ceil((60000 - diff) / 1000);
                throw new HttpException(
                    {
                        message: 'Please wait before requesting another OTP.',
                        retry_after_seconds: secondsLeft,
                    },
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

        if (record.locked_until && record.locked_until > new Date()) {
            const secondsLeft = Math.ceil((record.locked_until.getTime() - Date.now()) / 1000);
            throw new HttpException(
                {
                    message: 'Too many failed OTP attempts. Please try again later.',
                    retry_after_seconds: secondsLeft,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        if (record.expires_at < new Date()) {
            throw new BadRequestException('OTP has expired.');
        }

        if (record.otp !== dto.otp) {
            const attempts = (record.attempts || 0) + 1;
            if (attempts >= 3) {
                const lockUntil = new Date(Date.now() + 5 * 60 * 1000);
                record.attempts = 0;
                record.locked_until = lockUntil;
                await record.save();
                const secondsLeft = Math.ceil((lockUntil.getTime() - Date.now()) / 1000);
                throw new HttpException(
                    {
                        message: 'Too many failed OTP attempts. Please try again later.',
                        retry_after_seconds: secondsLeft,
                    },
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            record.attempts = attempts;
            await record.save();
            throw new BadRequestException('Invalid OTP.');
        }

        record.verified = true;
        record.attempts = 0;
        record.locked_until = null;
        await record.save();

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
    async register(dto: RegisterDto, file?: Express.Multer.File) {
        if (!file && dto.role !== 'partner') {

            throw new BadRequestException('Student card picture is required.');
        }

        // 1. Validate verified_token
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

        // 2. Validate tenant existence and status
        const tenant = await this.tenantsService.getTenantById(dto.tenant_id);
        if (!tenant || tenant.status !== 'active') {
            throw new BadRequestException('Invalid or inactive university.');
        }

        // 3. Validate email domain restriction (student & alumni)
        if (
            tenant.allowed_email_domains &&
            tenant.allowed_email_domains.length > 0 &&
            dto.role !== 'partner'
        ) {
            const emailDomain = dto.email.split('@')[1]?.toLowerCase().trim();
            const allowed = tenant.allowed_email_domains.map((d) => d.toLowerCase().trim());
            if (!allowed.includes(emailDomain)) {
                throw new BadRequestException('Email domain is not allowed for this university.');
            }
        }

        // 4. Check duplicate email globally (across all tenants)
        const existingEmail = await this.userAuthModel
            .findOne({
                email: dto.email.toLowerCase().trim(),
                is_deleted: { $ne: true },
            })
            .setOptions({ skipTenantScope: true })
            .exec();

        if (existingEmail) {
            throw new ConflictException('An account with this email already exists.');
        }

        // 5. Check duplicate username globally in Neo4j
        const existingUsername = await this.neo4j.run(
            'MATCH (u:User {username: $username}) RETURN u.id AS id',
            { username: dto.username },
        );
        if (existingUsername.records.length > 0) {
            throw new ConflictException('Username is already taken.');
        }

        // 6. Upload student card to Cloudinary (if provided)
        let studentCardUrl: string | null = null;
        if (file) {
            try {
                const uploadResult = await this.cloudinary.uploadFile(file);
                studentCardUrl = uploadResult?.secure_url || null;
            } catch (err: any) {
                this.logger.warn(`Cloudinary student card upload failed: ${err?.message || err}`);
            }
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const userId = uuidv4();
        const now = new Date().toISOString();

        // 7. Execute within tenant CLS context
        return this.cls.run(async () => {
            this.cls.set('tenantId', tenant.id);

            // A. Save Credentials to MongoDB with tenantId
            await this.userAuthModel.create({
                userId,
                email: dto.email.toLowerCase().trim(),
                password: hashedPassword,
                role: dto.role,
                account_status: 'pending',
                tenantId: tenant.id,
            });

            // B. Save Profile to Neo4j with tenantId
            let extraProps = '';
            if (dto.role === 'alumni') {
                extraProps = `graduation_year: $graduation_year, batch: coalesce($batch, toString($graduation_year - 4) + '-' + toString($graduation_year)),`;
            } else if (dto.role === 'student') {
                extraProps = `semester: $semester, batch: $batch,`;
            } else if (dto.role === 'partner') {
                extraProps = `affiliation: $affiliation, job_title: $job_title,`;
            }

            try {
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
                        tenantId: $tenantId,
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
                        email: dto.email.toLowerCase().trim(),
                        role: dto.role,
                        tenantId: tenant.id,
                        roll_number: dto.roll_number ?? null,
                        degree: dto.degree ?? null,
                        studentCardUrl: studentCardUrl,
                        graduation_year: dto.graduation_year ?? null,
                        semester: dto.semester ?? null,
                        batch: dto.batch ?? null,
                        affiliation: dto.affiliation ?? null,
                        job_title: dto.job_title ?? null,
                        now,
                    },
                );
            } catch (err: any) {
                this.logger.warn(`Neo4j user creation skipped: ${err?.message || err}`);
            }

            // Clean up OTP record
            await this.otpModel.deleteOne({ email: dto.email, type: 'email_verification' });

            // C. Log Activity in tenant context
            try {
                await this.activity.logActivity(
                    ActivityType.USER_REGISTERED,
                    `New ${dto.role} registered: ${dto.display_name}`,
                    userId,
                    tenant.id,
                );
            } catch (err: any) {
                this.logger.warn(`Activity logging failed: ${err?.message || err}`);
            }

            // D. Notify only this tenant's Admins
            try {
                const adminResult = await this.neo4j.run(
                    `MATCH (a:User {role: 'admin', tenantId: $tenantId})
                     WHERE a.is_deleted IS NULL OR a.is_deleted = false
                     RETURN a.id AS id`,
                    { tenantId: tenant.id },
                );

                const notificationPromises = (adminResult.records || []).map((r) =>
                    this.notification.createNotification(
                        r.get('id'),
                        `New ${dto.role} account pending approval: ${dto.display_name} (${dto.username})`,
                        'user_registered',
                        {
                            sender_username: dto.username,
                            sender_display_name: dto.display_name,
                            sender_profile_picture: undefined,
                            reference_link: '/admin/pending-accounts',
                        },
                        tenant.id,
                    ),
                );
                await Promise.allSettled(notificationPromises);
            } catch (err: any) {
                this.logger.warn(`Admin notification failed: ${err?.message || err}`);
            }

            return { message: 'Account created successfully. Pending admin approval.' };
        });
    }

    // ─── Login ───────────────────────────────────────────────────────────────────
    async login(dto: LoginDto) {
        const email = dto.email.trim().toLowerCase();
        this.logger.log(`Attempting login for: ${email}`);

        // Email lookup before tenant context exists -> explicit skipTenantScope
        const auth = await this.userAuthModel
            .findOne({ email })
            .setOptions({ skipTenantScope: true })
            .exec();

        if (!auth || auth.is_deleted) {
            this.logger.warn(`Login failed: ${!auth ? 'Email not found' : 'Account soft-deleted'} - ${email}`);
            throw new UnauthorizedException('Invalid email or password.');
        }

        // Check lockout
        if (auth.login_locked_until && auth.login_locked_until > new Date()) {
            const secondsLeft = Math.ceil((auth.login_locked_until.getTime() - Date.now()) / 1000);
            this.logger.warn(`Login blocked (locked) for ${email}, ${secondsLeft}s remaining`);
            throw new HttpException(
                {
                    message: 'Too many failed login attempts. Please try again later.',
                    retry_after_seconds: secondsLeft,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        const passwordMatch = await bcrypt.compare(dto.password, auth.password);
        if (!passwordMatch) {
            this.logger.warn(`Login failed: Password mismatch for ${email}`);

            const attempts = (auth.login_attempts || 0) + 1;
            if (attempts >= 3) {
                const lockUntil = new Date(Date.now() + 5 * 60 * 1000);
                await this.userAuthModel
                    .updateOne({ email }, { login_attempts: 0, login_locked_until: lockUntil })
                    .setOptions({ skipTenantScope: true });
                const secondsLeft = Math.ceil((lockUntil.getTime() - Date.now()) / 1000);
                throw new HttpException(
                    {
                        message: 'Too many failed login attempts. Please try again later.',
                        retry_after_seconds: secondsLeft,
                    },
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }

            await this.userAuthModel
                .updateOne({ email }, { login_attempts: attempts })
                .setOptions({ skipTenantScope: true });
            throw new UnauthorizedException('Invalid email or password.');
        }

        // Password correct — reset counters
        if ((auth.login_attempts ?? 0) > 0 || auth.login_locked_until) {
            await this.userAuthModel
                .updateOne({ email }, { login_attempts: 0, login_locked_until: null })
                .setOptions({ skipTenantScope: true });
        }

        if (auth.account_status === 'pending') {
            this.logger.warn(`Login failed: Account pending for ${email}`);
            throw new UnauthorizedException('Your account is pending admin approval.');
        }
        if (auth.account_status === 'rejected') {
            this.logger.warn(`Login failed: Account rejected for ${email}`);
            throw new UnauthorizedException('Your account registration was rejected.');
        }

        // ── Case A: Super Admin ────────────────────────────────────────────────
        if (auth.role === 'super_admin') {
            const token = this.jwt.sign(
                { sub: auth.userId, email: auth.email, role: 'super_admin' },
                {
                    secret: this.config.get<string>('JWT_SECRET')!,
                    expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') || '7d') as any,
                },
            );

            return {
                token,
                role: 'super_admin',
                account_status: auth.account_status,
                profile: {
                    id: auth.userId,
                    email: auth.email,
                    role: 'super_admin',
                },
                tenant: null,
            };
        }

        // ── Case B: Tenant User (alumni, student, partner, admin) ──────────────
        if (!auth.tenantId) {
            throw new UnauthorizedException('Session outdated. Please log in again.');
        }

        // Check if tenant is suspended
        const tenant = await this.tenantsService.getTenantById(auth.tenantId);
        if (!tenant) {
            throw new UnauthorizedException('University not found.');
        }
        if (tenant.status === 'suspended') {
            throw new ForbiddenException("This university's access has been suspended.");
        }

        // Fetch profile from Neo4j (filtered by tenantId, with graceful fallback if Neo4j is offline)
        let user: any = null;
        let posts_count = 0;
        try {
            const result = await this.neo4j.run(
                `MATCH (u:User {id: $userId, tenantId: $tenantId})
                 OPTIONAL MATCH (u)-[:POSTED]->(o:Opportunity {tenantId: $tenantId})
                 WHERE o.is_deleted IS NULL OR o.is_deleted = false
                 RETURN u, count(DISTINCT o) AS posts_count`,
                { userId: auth.userId, tenantId: auth.tenantId },
            );
            user = result.records[0]?.get('u')?.properties;
            posts_count = result.records[0]?.get('posts_count')?.toNumber?.() || 0;
        } catch (neoErr: any) {
            this.logger.warn(`Could not fetch Neo4j profile on login for ${auth.email}: ${neoErr?.message || neoErr}`);
        }

        const profile: any = {
            id: auth.userId,
            tenant_id: auth.tenantId,
            email: auth.email,
            role: auth.role,
            username: user?.username || auth.email.split('@')[0],
            display_name: user?.display_name || user?.name || (auth.role === 'admin' ? 'University Admin' : auth.email.split('@')[0]),
            profile_picture: user?.profile_picture || null,
            bio: user?.bio || null,
            account_status: user?.account_status || auth.account_status,
            posts_count: posts_count,
        };

        if (user) {

            if (auth.role !== 'admin') {
                profile.degree = user.degree;
                profile.roll_number = user.roll_number;
                profile.graduation_year = user.graduation_year ?? undefined;
                profile.semester = user.semester ?? undefined;
                profile.phone = user.phone;
                profile.batch = user.batch ?? undefined;
            }
        }

        // Issue token carrying tenantId
        const token = this.jwt.sign(
            { sub: auth.userId, email: auth.email, role: auth.role, tenantId: auth.tenantId },
            {
                secret: this.config.get<string>('JWT_SECRET')!,
                expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') || '7d') as any,
            },
        );

        return {
            token,
            role: auth.role,
            account_status: auth.account_status,
            profile,
            tenant: {
                id: tenant.id,
                slug: tenant.slug,
                name: tenant.name,
                logo_url: tenant.logo_url || null,
            },
        };
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

        const auth = await this.userAuthModel
            .findOne({ email: payload.email })
            .setOptions({ skipTenantScope: true })
            .exec();

        if (!auth) {
            throw new NotFoundException('No account found for this email.');
        }

        const hashed = await bcrypt.hash(dto.new_password, 10);
        auth.password = hashed;
        await auth.save();

        await this.otpModel.deleteOne({ email: payload.email, type: 'forgot_password' });

        return { message: 'Password reset successfully.' };
    }
}
