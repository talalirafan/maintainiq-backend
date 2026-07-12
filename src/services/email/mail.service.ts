import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../../config/env.js';

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Nodemailer adapter — reuses one transporter when SMTP is configured.
 * Without SMTP, logs to console (dev-safe).
 */
export class MailService {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    if (!env.smtp.host || !env.smtp.user) return null;
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.secure,
        auth: { user: env.smtp.user, pass: env.smtp.pass },
      });
    }
    return this.transporter;
  }

  async send(input: SendMailInput): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      console.info('[mail:dev]', { to: input.to, subject: input.subject, text: input.text });
      return;
    }

    await transporter.sendMail({
      from: env.smtp.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }
}

export const mailService = new MailService();
