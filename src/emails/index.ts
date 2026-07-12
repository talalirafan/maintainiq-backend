/**
 * Transactional email via Nodemailer (SMTP).
 * Falls back to console logging when SMTP is not configured.
 */
export { mailService } from '../services/email/mail.service.js';

export const emailModule = {
  name: 'emails',
  status: 'active' as const,
  provider: 'nodemailer',
};
