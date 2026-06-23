import nodemailer from 'nodemailer';
import { EmailPayload } from '../types/interfaces';


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // e.g., smtp.gmail.com
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASSWORD, 
  },
});



export async function sendNotificationEmail({ to, subject, html }: EmailPayload) {
  try {
    const info = await transporter.sendMail({
      from: `"Medartis Engine" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Email tracking confirmation sent successfully:", info.messageId);
    return { success: true };
  } catch (error) {
    console.error("Email relay failure error:", error);
    return { success: false, error };
  }
}