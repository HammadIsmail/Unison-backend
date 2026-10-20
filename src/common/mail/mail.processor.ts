import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailJobData {
  type: 'otp' | 'approval' | 'rejection' | 'upgrade_approval' | 'upgrade_rejection';
  to: string;
  otp?: string;
  name?: string;
  reason?: string;
}

@Processor('mail', {
  concurrency: 3,
  limiter: {
    max: 5,
    duration: 1000,
  },
})
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor(private readonly config: ConfigService) {
    super();
    const host = this.config.get<string>('MAIL_SERVER', 'smtp.gmail.com');
    const port = Number(this.config.get<number>('MAIL_PORT', 587));
    const user = this.config.get<string>('MAIL_USERNAME');
    let pass = this.config.get<string>('MAIL_PASSWORD') || '';
    pass = pass.replace(/^["']|["']$/g, '').trim();

    const sslTls = this.config.get<string>('MAIL_SSL_TLS');
    const isSecure = sslTls === 'True' || sslTls === 'true' || port === 465;

    this.fromEmail = this.config.get<string>('MAIL_FROM', user || 'ranahammadismail@gmail.com');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: {
        user,
        pass,
      },
    });

    this.logger.log(`MailProcessor worker initialized with SMTP: ${host}:${port}`);
  }

  async process(job: Job<MailJobData>): Promise<void> {
    const { type, to, otp, name, reason } = job.data;
    this.logger.log(`Processing email job #${job.id} of type "${type}" for "${to}" (Attempt ${job.attemptsMade + 1})`);

    switch (type) {
      case 'otp':
        await this.handleSendOtp(to, otp!);
        break;
      case 'approval':
        await this.handleSendApproval(to, name!);
        break;
      case 'rejection':
        await this.handleSendRejection(to, name!, reason!);
        break;
      case 'upgrade_approval':
        await this.handleSendUpgradeApproval(to, name!);
        break;
      case 'upgrade_rejection':
        await this.handleSendUpgradeRejection(to, name!, reason!);
        break;
      default:
        this.logger.warn(`Unknown mail job type: ${type}`);
    }

    this.logger.log(`Successfully dispatched email job #${job.id} ("${type}") to "${to}"`);
  }

  private async handleSendOtp(to: string, otp: string): Promise<void> {
    await this.transporter.sendMail({
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

  private async handleSendApproval(to: string, name: string): Promise<void> {
    await this.transporter.sendMail({
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

  private async handleSendRejection(to: string, name: string, reason: string): Promise<void> {
    await this.transporter.sendMail({
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

  private async handleSendUpgradeApproval(to: string, name: string): Promise<void> {
    await this.transporter.sendMail({
      from: `UNISON Alumni Network <${this.fromEmail}>`,
      to,
      subject: 'Your UNISON Profile Has Been Upgraded!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #10b981;">Congratulations, ${name}!</h2>
          <p>Your request to upgrade your profile to <strong>Alumni</strong> has been approved by the admin.</p>
          <p>You now have full access to all alumni features on the platform.</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="#" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Explore Alumni Features</a>
          </div>
        </div>
      `,
    });
  }

  private async handleSendUpgradeRejection(to: string, name: string, reason: string): Promise<void> {
    await this.transporter.sendMail({
      from: `UNISON Alumni Network <${this.fromEmail}>`,
      to,
      subject: 'UNISON Profile Upgrade Update',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #ef4444;">Hello ${name},</h2>
          <p>Unfortunately, your request to upgrade your profile to Alumni has been <strong>rejected</strong>.</p>
          <p style="background: #fff1f2; padding: 15px; border-radius: 6px; border-left: 4px solid #ef4444;">
            <strong>Reason:</strong> ${reason}
          </p>
          <p style="margin-top: 20px;">Please contact the administration if you have any questions or need further clarification.</p>
        </div>
      `,
    });
  }
}
