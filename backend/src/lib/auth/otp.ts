import { createTransport } from 'nodemailer';
import { smtpHost, smtpPort, smtpUser, smtpPass, frontendUrl } from '../env/index.ts';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateOTP(): string {
  let otp = '';
  for (let i = 0; i < 6; i++) {
    otp += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return otp;
}

const transporter = createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: false, // true for 465, false for other ports (587)
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function sendOTP(email: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: `"Orbit" <${smtpUser}>`,
    to: email,
    subject: 'Your OTP Code',
    text: `Your one-time password is: ${otp}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Orbit</h2>
        <p>Your one-time password is:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes.</p>
      </div>
    `,
  });
}

export async function sendForgetUserEmail(email: string, sessionId: string): Promise<void> {
  const resetUrl = `${frontendUrl}/insider/forget-password/${sessionId}`;
  await transporter.sendMail({
    from: `"Orbit" <${smtpUser}>`,
    to: email,
    subject: 'Reset Your Password',
    text: `Click this link to reset your password: ${resetUrl}\n\nThis link expires in 10 minutes.`,
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Orbit</h2>
        <p>You requested a password reset. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This link expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}
