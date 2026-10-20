import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MailJobData } from './mail.processor';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @InjectQueue('mail')
    private readonly mailQueue: Queue<MailJobData>,
  ) {}

  async sendOtp(to: string, otp: string): Promise<void> {
    await this.mailQueue.add(
      'send-otp',
      { type: 'otp', to, otp },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Enqueued OTP email job for "${to}"`);
  }

  async sendApprovalEmail(to: string, name: string): Promise<void> {
    await this.mailQueue.add(
      'send-approval',
      { type: 'approval', to, name },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Enqueued account approval email job for "${to}"`);
  }

  async sendRejectionEmail(to: string, name: string, reason: string): Promise<void> {
    await this.mailQueue.add(
      'send-rejection',
      { type: 'rejection', to, name, reason },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Enqueued account rejection email job for "${to}"`);
  }

  async sendUpgradeApprovalEmail(to: string, name: string): Promise<void> {
    await this.mailQueue.add(
      'send-upgrade-approval',
      { type: 'upgrade_approval', to, name },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Enqueued profile upgrade approval email job for "${to}"`);
  }

  async sendUpgradeRejectionEmail(to: string, name: string, reason: string): Promise<void> {
    await this.mailQueue.add(
      'send-upgrade-rejection',
      { type: 'upgrade_rejection', to, name, reason },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
    this.logger.log(`Enqueued profile upgrade rejection email job for "${to}"`);
  }
}
