import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey?: string;
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('RESEND_API_KEY')?.trim();
    this.fromEmail =
      this.config.get<string>('RESEND_FROM_EMAIL')?.trim() ||
      '29 AI Workspace <onboarding@resend.dev>';
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    if (!this.isConfigured) {
      this.logger.log(
        '[Resend Email Mock] Sending to: ' + recipients.join(', ') + ' | Subject: ' + options.subject,
      );
      return { success: true, id: 'mock-' + Date.now() };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: recipients,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error('Resend API failed (' + response.status + '): ' + errText);
        return { success: false, error: errText };
      }

      const data = (await response.json()) as { id: string };
      this.logger.log('Email dispatched via Resend: ' + data.id);
      return { success: true, id: data.id };
    } catch (err: any) {
      this.logger.error('Resend email dispatch error: ' + err.message, err.stack);
      return { success: false, error: err.message };
    }
  }

  async sendVerificationEmail(to: string, verificationUrl: string) {
    const subject = 'Verify your email — 29 AI Workspace';
    const html =
      '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b;">' +
      '<h2 style="color: #0f172a; margin-bottom: 16px;">Welcome to 29 AI Workspace!</h2>' +
      '<p style="font-size: 15px; line-height: 1.6;">Click the button below to verify your email address and activate your AI workspace:</p>' +
      '<div style="margin: 28px 0;">' +
      '<a href="' + verificationUrl + '" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-block;">Verify Email Address</a>' +
      '</div>' +
      '<p style="font-size: 13px; color: #64748b;">If you did not sign up for 29 AI Workspace, you can safely ignore this email.</p>' +
      '</div>';
    return this.sendEmail({ to, subject, html });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    const subject = 'Reset your password — 29 AI Workspace';
    const html =
      '<div style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1e293b;">' +
      '<h2 style="color: #0f172a; margin-bottom: 16px;">Password Reset Request</h2>' +
      '<p style="font-size: 15px; line-height: 1.6;">You requested a password reset for your 29 AI Workspace account. Click the button below to choose a new password:</p>' +
      '<div style="margin: 28px 0;">' +
      '<a href="' + resetUrl + '" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-block;">Reset Password</a>' +
      '</div>' +
      '<p style="font-size: 13px; color: #64748b;">This link will expire in 1 hour. If you did not request this, please disregard.</p>' +
      '</div>';
    return this.sendEmail({ to, subject, html });
  }
}
