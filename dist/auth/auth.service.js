"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const uuid_1 = require("uuid");
const bcrypt = __importStar(require("bcrypt"));
const neo4j_service_1 = require("../neo4j/neo4j.service");
const mail_service_1 = require("../common/mail/mail.service");
let AuthService = class AuthService {
    neo4j;
    jwt;
    config;
    mail;
    constructor(neo4j, jwt, config, mail) {
        this.neo4j = neo4j;
        this.jwt = jwt;
        this.config = config;
        this.mail = mail;
    }
    async sendOtp(dto) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await this.neo4j.run(`MERGE (o:OTPRecord {email: $email, type: $type})
       SET o.otp = $otp, o.expires_at = $expiresAt, o.verified = false`, { email: dto.email, type: dto.type, otp, expiresAt });
        await this.mail.sendOtp(dto.email, otp);
        return { message: 'OTP sent to your email.', otp_expires_in: '10 minutes' };
    }
    async verifyOtp(dto) {
        const result = await this.neo4j.run(`MATCH (o:OTPRecord {email: $email, type: $type})
       RETURN o`, { email: dto.email, type: dto.type });
        if (!result.records.length) {
            throw new common_1.NotFoundException('No OTP was sent to this email for this purpose.');
        }
        const record = result.records[0].get('o').properties;
        if (new Date(record.expires_at) < new Date()) {
            throw new common_1.BadRequestException('OTP has expired. Please request a new one.');
        }
        if (record.otp !== dto.otp) {
            throw new common_1.BadRequestException('Invalid OTP.');
        }
        await this.neo4j.run(`MATCH (o:OTPRecord {email: $email, type: $type}) SET o.verified = true`, { email: dto.email, type: dto.type });
        const verifiedToken = this.jwt.sign({ email: dto.email, type: dto.type, purpose: 'verified' }, {
            secret: this.config.get('VERIFIED_TOKEN_SECRET'),
            expiresIn: (this.config.get('VERIFIED_TOKEN_EXPIRES_IN') || '15m'),
        });
        return { message: 'OTP verified successfully.', verified_token: verifiedToken };
    }
    async register(dto) {
        let payload;
        try {
            payload = this.jwt.verify(dto.verified_token, {
                secret: this.config.get('VERIFIED_TOKEN_SECRET'),
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired verified_token.');
        }
        if (payload.purpose !== 'verified' || payload.type !== 'email_verification') {
            throw new common_1.UnauthorizedException('verified_token is not for email verification.');
        }
        if (payload.email !== dto.email) {
            throw new common_1.BadRequestException('Email mismatch with verified_token.');
        }
        const existing = await this.neo4j.run('MATCH (u:User {email: $email}) RETURN u', { email: dto.email });
        if (existing.records.length) {
            throw new common_1.ConflictException('An account with this email already exists.');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const userId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const extraProps = dto.role === 'alumni'
            ? `graduation_year: $graduation_year, batch: toString($graduation_year - 4) + '-' + toString($graduation_year),`
            : `semester: $semester,`;
        await this.neo4j.run(`CREATE (u:User {
         id: $id,
         name: $name,
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
       })`, {
            id: userId,
            name: dto.name,
            email: dto.email,
            password: hashedPassword,
            role: dto.role,
            roll_number: dto.roll_number,
            degree: dto.degree,
            graduation_year: dto.graduation_year ?? null,
            semester: dto.semester ?? null,
            now,
        });
        await this.neo4j.run(`MATCH (o:OTPRecord {email: $email, type: 'email_verification'}) DELETE o`, { email: dto.email });
        return { message: 'Account created successfully. Pending admin approval.' };
    }
    async login(dto) {
        const result = await this.neo4j.run('MATCH (u:User {email: $email}) RETURN u', { email: dto.email });
        if (!result.records.length) {
            throw new common_1.UnauthorizedException('Invalid email or password.');
        }
        const user = result.records[0].get('u').properties;
        const passwordMatch = await bcrypt.compare(dto.password, user.password);
        if (!passwordMatch) {
            throw new common_1.UnauthorizedException('Invalid email or password.');
        }
        if (user.account_status === 'pending') {
            throw new common_1.UnauthorizedException('Your account is pending admin approval.');
        }
        if (user.account_status === 'rejected') {
            throw new common_1.UnauthorizedException('Your account registration was rejected.');
        }
        const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role }, {
            secret: this.config.get('JWT_SECRET'),
            expiresIn: (this.config.get('JWT_EXPIRES_IN') || '7d'),
        });
        const profile = {
            id: user.id,
            name: user.name,
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
    async resetPassword(dto) {
        let payload;
        try {
            payload = this.jwt.verify(dto.verified_token, {
                secret: this.config.get('VERIFIED_TOKEN_SECRET'),
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired verified_token.');
        }
        if (payload.purpose !== 'verified' || payload.type !== 'forgot_password') {
            throw new common_1.UnauthorizedException('verified_token is not for password reset.');
        }
        const result = await this.neo4j.run('MATCH (u:User {email: $email}) RETURN u', { email: payload.email });
        if (!result.records.length) {
            throw new common_1.NotFoundException('No account found for this email.');
        }
        const hashed = await bcrypt.hash(dto.new_password, 10);
        await this.neo4j.run('MATCH (u:User {email: $email}) SET u.password = $password', { email: payload.email, password: hashed });
        await this.neo4j.run(`MATCH (o:OTPRecord {email: $email, type: 'forgot_password'}) DELETE o`, { email: payload.email });
        return { message: 'Password reset successfully.' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [neo4j_service_1.Neo4jService,
        jwt_1.JwtService,
        config_1.ConfigService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map