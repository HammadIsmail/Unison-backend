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

    const isGmail = host === 'smtp.gmail.com';

    this.transporter = nodemailer.createTransport({
      ...(isGmail
        ? { service: 'gmail' }
        : { host, port, secure: isSecure }),
      auth: {
        user,
        pass,
      },
      family: 4, // Force IPv4 to prevent IPv6 routing timeouts
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    } as any);

    this.logger.log(`MailProcessor worker initialized with SMTP: ${host}:${port} (family: 4)`);
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

  /**
   * Dispatches email via Vercel HTTPS mail endpoint (to bypass cloud SMTP blocks on Render),
   * falling back to direct SMTP transporter when VERCEL_MAIL_URL is not set.
   */
  private async dispatchMail(to: string, subject: string, html: string): Promise<void> {
    const vercelMailUrl = this.config.get<string>('VERCEL_MAIL_URL');
    const internalSecret = this.config.get<string>(
      'INTERNAL_MAIL_SECRET',
      'unison_internal_mail_secret_2026'
    );

    if (vercelMailUrl) {
      const endpoint = `${vercelMailUrl.replace(/\/+$/, '')}/api/send-email`;
      this.logger.log(`Sending email via Vercel HTTPS endpoint: ${endpoint}`);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': internalSecret,
        },
        body: JSON.stringify({
          to,
          subject,
          html,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`Vercel mail endpoint failed with status ${res.status}: ${errorText}`);
        throw new Error(`Vercel mail failed (${res.status}): ${errorText}`);
      }

      const result = await res.json();
      this.logger.log(`Email successfully delivered via Vercel endpoint (messageId: ${result.messageId})`);
      return;
    }

    // Fallback: direct SMTP transporter
    await this.transporter.sendMail({
      from: `UNISON Alumni Network <${this.fromEmail}>`,
      to,
      subject,
      html,
    });
  }

  private getFrontendUrl(): string {
    const raw =
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('VERCEL_MAIL_URL') ||
      'https://unison-lovat.vercel.app';
    return raw.replace(/\/+$/, '');
  }

  private async handleSendOtp(to: string, otp: string): Promise<void> {
    await this.dispatchMail(
      to,
      'Your UNISON OTP Code',
      `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #4F46E5; text-align: center; margin-top: 0;">UNISON Alumni Network</h2>
          <p style="color: #374151; font-size: 15px;">Your One-Time Password (OTP) is:</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="letter-spacing: 8px; color: #111827; margin: 0; font-size: 32px;">${otp}</h1>
          </div>
          <p style="margin-top: 20px; color: #374151; font-size: 14px;">This OTP is valid for <strong>10 minutes</strong>.</p>
          <p style="color: #6b7280; font-size: 13px; margin-bottom: 0;">If you did not request this, please ignore this email.</p>
        </div>
      `
    );
  }

  private async handleSendApproval(to: string, name: string): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const loginUrl = `${frontendUrl}/login`;

    await this.dispatchMail(
      to,
      'Your UNISON Account Has Been Approved!',
      `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #10b981; margin-top: 0;">Welcome to UNISON, ${name}!</h2>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">Your account has been <strong>approved</strong> by the admin.</p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">You can now log in and explore the alumni network, discover opportunities, and connect with fellow graduates.</p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${loginUrl}" target="_blank" style="background-color: #4F46E5; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Login Now</a>
          </div>
          <p style="margin-top: 24px; font-size: 13px; color: #6b7280; text-align: center; line-height: 1.4;">
            If the button above does not open, copy and paste this URL into your browser:<br/>
            <a href="${loginUrl}" target="_blank" style="color: #4F46E5; word-break: break-all;">${loginUrl}</a>
          </p>
        </div>
      `
    );
  }

  private async handleSendRejection(to: string, name: string, reason: string): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const registerUrl = `${frontendUrl}/register`;

    await this.dispatchMail(
      to,
      'UNISON Account Registration Update',
      `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #ef4444; margin-top: 0;">Hello ${name},</h2>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">Unfortunately, your account registration has been <strong>rejected</strong>.</p>
          <p style="background: #fff1f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444; color: #991b1b; font-size: 14px;">
            <strong>Reason:</strong> ${reason}
          </p>
          <p style="margin-top: 20px; color: #374151; font-size: 14px; line-height: 1.6;">Please contact the department if you believe this is an error or try registering again with the correct details.</p>
          <div style="margin-top: 24px; text-align: center;">
            <a href="${registerUrl}" target="_blank" style="background-color: #4F46E5; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">Register Again</a>
          </div>
        </div>
      `
    );
  }

  private async handleSendUpgradeApproval(to: string, name: string): Promise<void> {
    const frontendUrl = this.getFrontendUrl();
    const feedUrl = `${frontendUrl}/feed`;

    await this.dispatchMail(
      to,
      'Your UNISON Profile Has Been Upgraded!',
      `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #10b981; margin-top: 0;">Congratulations, ${name}!</h2>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">Your request to upgrade your profile to <strong>Alumni</strong> has been approved by the admin.</p>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">You now have full access to all alumni features on the platform.</p>
          <div style="margin: 32px 0; text-align: center;">
            <a href="${feedUrl}" target="_blank" style="background-color: #4F46E5; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Explore Alumni Features</a>
          </div>
          <p style="margin-top: 24px; font-size: 13px; color: #6b7280; text-align: center; line-height: 1.4;">
            If the button above does not open, copy and paste this URL into your browser:<br/>
            <a href="${feedUrl}" target="_blank" style="color: #4F46E5; word-break: break-all;">${feedUrl}</a>
          </p>
        </div>
      `
    );
  }

  private async handleSendUpgradeRejection(to: string, name: string, reason: string): Promise<void> {
    await this.dispatchMail(
      to,
      'UNISON Profile Upgrade Update',
      `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #ef4444; margin-top: 0;">Hello ${name},</h2>
          <p style="color: #374151; font-size: 15px; line-height: 1.6;">Unfortunately, your request to upgrade your profile to Alumni has been <strong>rejected</strong>.</p>
          <p style="background: #fff1f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444; color: #991b1b; font-size: 14px;">
            <strong>Reason:</strong> ${reason}
          </p>
          <p style="margin-top: 20px; color: #374151; font-size: 14px; line-height: 1.6;">Please contact the administration if you have any questions or need further clarification.</p>
        </div>
      `
    );
  }
}
