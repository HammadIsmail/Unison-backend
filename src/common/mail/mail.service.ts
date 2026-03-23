import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
    private resend: Resend;
    private fromEmail: string;

    constructor(private config: ConfigService) {
        this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
this.fromEmail = 'no-reply@shareride.site';
    }

    async sendOtp(to: string, otp: string): Promise<void> {
        await this.resend.emails.send({
            from: `UNISON Alumni Network <${this.fromEmail}>`,
            to,
            subject: 'Your UNISON OTP Code',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4F46E5; text-align: center;">UNISON Alumni Network</h2>
          <p>Your One-Time Password (OTP) is:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center;">
            <h1 style="letter-spacing: 8px; color: #111827; margin: 0;">${otp}</h1>
          </div>
          <p style="margin-top: 20px;">This OTP is valid for <strong>10 minutes</strong>.</p>
          <p style="color: #6b7280; font-size: 14px;">If you did not request this, please ignore this email.</p>
        </div>
      `,
        });
    }

    async sendApprovalEmail(to: string, name: string): Promise<void> {
        await this.resend.emails.send({
            from: `UNISON Alumni Network <${this.fromEmail}>`,
            to,
            subject: 'Your UNISON Account Has Been Approved!',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #10b981;">Welcome to UNISON, ${name}!</h2>
          <p>Your account has been <strong>approved</strong> by the admin.</p>
          <p>You can now log in and explore the alumni network, discover opportunities, and connect with fellow graduates.</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="#" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Login Now</a>
          </div>
        </div>
      `,
        });
    }

    async sendRejectionEmail(to: string, name: string, reason: string): Promise<void> {
        await this.resend.emails.send({
            from: `UNISON Alumni Network <${this.fromEmail}>`,
            to,
            subject: 'UNISON Account Registration Update',
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #ef4444;">Hello ${name},</h2>
          <p>Unfortunately, your account registration has been <strong>rejected</strong>.</p>
          <p style="background: #fff1f2; padding: 15px; border-radius: 6px; border-left: 4px solid #ef4444;">
            <strong>Reason:</strong> ${reason}
          </p>
          <p style="margin-top: 20px;">Please contact the department if you believe this is an error or try registering again with the correct details.</p>
        </div>
      `,
        });
    }
}
