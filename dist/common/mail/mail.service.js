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
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let MailService = class MailService {
    config;
    transporter;
    constructor(config) {
        this.config = config;
        this.transporter = nodemailer.createTransport({
            host: this.config.get('MAIL_HOST'),
            port: this.config.get('MAIL_PORT'),
            secure: false,
            auth: {
                user: this.config.get('MAIL_USER'),
                pass: this.config.get('MAIL_PASS'),
            },
        });
    }
    async sendOtp(to, otp) {
        await this.transporter.sendMail({
            from: `"UNISON Alumni Network" <${this.config.get('MAIL_USER')}>`,
            to,
            subject: 'Your UNISON OTP Code',
            html: `
        <h2>UNISON Alumni Network</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <h1 style="letter-spacing: 6px; color: #4F46E5;">${otp}</h1>
        <p>This OTP is valid for <strong>10 minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
      `,
        });
    }
    async sendApprovalEmail(to, name) {
        await this.transporter.sendMail({
            from: `"UNISON Alumni Network" <${this.config.get('MAIL_USER')}>`,
            to,
            subject: 'Your UNISON Account Has Been Approved!',
            html: `
        <h2>Welcome to UNISON, ${name}!</h2>
        <p>Your account has been <strong>approved</strong> by the admin.</p>
        <p>You can now log in and explore the alumni network.</p>
      `,
        });
    }
    async sendRejectionEmail(to, name, reason) {
        await this.transporter.sendMail({
            from: `"UNISON Alumni Network" <${this.config.get('MAIL_USER')}>`,
            to,
            subject: 'UNISON Account Registration Update',
            html: `
        <h2>Hello ${name},</h2>
        <p>Unfortunately, your account registration has been <strong>rejected</strong>.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please contact the department if you believe this is an error.</p>
      `,
        });
    }
};
exports.MailService = MailService;
exports.MailService = MailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map