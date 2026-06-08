// src/server/services/email.service.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Email send error:', error);
  }
}

export async function sendInvitationEmail(to: string, projectName: string, inviterName: string, token: string) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>You've been invited to join ${projectName}</h2>
      <p><strong>${inviterName}</strong> has invited you to join the project.</p>
      <a href="${inviteUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Accept Invitation</a>
      <p>This invitation expires in 7 days.</p>
    </div>
  `;
  await sendEmail({ to, subject: `Invitation to join ${projectName}`, html });
}