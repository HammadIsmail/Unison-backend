import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor(private config: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.config.get<string>('MAIL_HOST'),
            port: this.config.get<number>('MAIL_PORT'),
            secure: false,
            auth: {
                user: this.config.get<string>('MAIL_USER'),
                pass: this.config.get<string>('MAIL_PASS'),
            },
        });
    }

    async sendOtp(to: string, otp: string): Promise<void> {
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

    async sendApprovalEmail(to: string, name: string): Promise<void> {
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

    async sendRejectionEmail(to: string, name: string, reason: string): Promise<void> {
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
}
