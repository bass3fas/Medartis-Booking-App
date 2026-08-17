import nodemailer from 'nodemailer';
import { EmailPayload } from '../types/interfaces';

const smtpPort = Number(process.env.SMTP_PORT || '587');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendNotificationEmail({ to, subject, html }: EmailPayload) {
  const recipient = String(to || '').trim();
  if (!recipient) {
    console.warn('Email notification skipped: no recipient configured.');
    return { success: false, error: 'No recipient configured.' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Medartis Engine" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject,
      html,
    });
    console.log('Email notification sent successfully:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Email relay failure error:', error);
    return { success: false, error };
  }
}
