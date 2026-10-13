import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../lib/logger';

export interface OtpSender {
  sendOtp(email: string, code: string): Promise<void>;
}

export class ConsoleOtpSender implements OtpSender {
  async sendOtp(email: string, code: string): Promise<void> {
    console.log(`[OTP] ${email} ${code}`);
  }
}

export class SmtpOtpSender implements OtpSender {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      if (!env.SMTP_URL) {
        throw new Error('SMTP_URL is not configured');
      }
      this.transporter = nodemailer.createTransport(env.SMTP_URL);
    }
    return this.transporter;
  }

  async sendOtp(email: string, code: string): Promise<void> {
    try {
      const transporter = this.getTransporter();
      await transporter.sendMail({
        from: env.MAIL_FROM,
        to: email,
        subject: 'Your Pocket Canteen Verification Code',
        text: `Your verification code is: ${code}\nThis code will expire in 5 minutes.`,
      });
    } catch (err) {
      logger.error({ err, email }, 'Failed to send OTP via SMTP');
      throw err;
    }
  }
}

export function getOtpSender(): OtpSender {
  if (env.OTP_PROVIDER === 'smtp') {
    return new SmtpOtpSender();
  }
  return new ConsoleOtpSender();
}
