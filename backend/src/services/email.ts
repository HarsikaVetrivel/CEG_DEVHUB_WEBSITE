import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

/**
 * Sends a password reset email.
 *
 * - If SMTP_HOST is set: uses real SMTP (configure SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).
 * - Otherwise (dev mode): prints the reset URL directly to the console — no network call needed.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string,
  rawToken: string,
): Promise<void> {
  const resetUrl = `${env.APP_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;

  // ── Real SMTP delivery ─────────────────────────────────────────────
  if (env.SMTP_HOST) {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

    await transport.sendMail({
      from: env.SMTP_FROM,
      to: `${toName} <${toEmail}>`,
      subject: 'Reset your CEG DEV HUB password',
      text: `
Hi ${toName},

You requested a password reset for your CEG DEV HUB account.

Click the link below (valid for 1 hour):
${resetUrl}

If you did not request this, you can safely ignore this email.

– CEG DEV HUB Team
      `.trim(),
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#0f0f14;color:#e2e8f0;padding:32px;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#1a1a2e;border:1px solid #2d2d44;border-radius:16px;padding:32px">
    <h1 style="margin:0 0 8px;font-size:20px;color:#fff">&lt;/&gt; CEG DEV HUB</h1>
    <p style="color:#94a3b8;margin:0 0 24px;font-size:13px">Password Reset Request</p>
    <p style="margin:0 0 16px">Hi ${toName},</p>
    <p style="margin:0 0 24px;color:#94a3b8">
      You requested a password reset. Click the button below — this link is valid for <strong style="color:#e2e8f0">1 hour</strong>.
    </p>
    <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:14px">
      Reset my password
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#64748b">
      If you did not request this, you can safely ignore this email.<br>
      This link expires in 1 hour and can only be used once.
    </p>
  </div>
</body>
</html>
      `.trim(),
    });

    return;
  }

  // ── Dev fallback: no network call — just log the link ─────────────
  console.log('\n┌─────────────────────────────────────────────────────┐');
  console.log('│         PASSWORD RESET (dev mode — no SMTP)         │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│  To  : ${toEmail}`);
  console.log(`│  Name: ${toName}`);
  console.log('│');
  console.log('│  Copy this link into your browser:');
  console.log(`│  ${resetUrl}`);
  console.log('│');
  console.log('│  Link expires in 1 hour.');
  console.log('└─────────────────────────────────────────────────────┘\n');
}

/**
 * Sends a hackathon deadline reminder email.
 *
 * - If SMTP_HOST is set: delivers via real SMTP.
 * - Otherwise (dev mode): logs reminder details to console.
 */
export async function sendReminderEmail(
  toEmail: string,
  toName: string,
  hackathonName: string,
  daysBefore: number,
  registrationUrl: string,
): Promise<void> {
  const daysLabel = daysBefore === 1 ? '1 day' : `${daysBefore} days`;
  const subject = `⏰ Reminder: ${hackathonName} registration closes in ${daysLabel}`;

  const textBody = `
Hi ${toName},

This is a reminder that the registration deadline for ${hackathonName} is coming up in ${daysLabel}.

Register here: ${registrationUrl}

You received this because you bookmarked this hackathon on CEG DEV HUB.
To manage your reminder preferences, visit your profile settings.

– CEG DEV HUB Team
  `.trim();

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#0f0f14;color:#e2e8f0;padding:32px;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#1a1a2e;border:1px solid #2d2d44;border-radius:16px;padding:32px">
    <h1 style="margin:0 0 4px;font-size:20px;color:#fff">&lt;/&gt; CEG DEV HUB</h1>
    <p style="color:#94a3b8;margin:0 0 24px;font-size:13px">Deadline Reminder</p>
    <p style="margin:0 0 12px">Hi ${toName},</p>
    <p style="margin:0 0 24px;color:#94a3b8">
      The registration deadline for <strong style="color:#e2e8f0">${hackathonName}</strong>
      is coming up in <strong style="color:#a78bfa">${daysLabel}</strong>.
      Don't miss your chance to participate!
    </p>
    <a href="${registrationUrl}"
       style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:600;font-size:14px">
      Register now →
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#64748b">
      You received this because you bookmarked this hackathon.<br>
      Manage reminders in your CEG DEV HUB profile settings.
    </p>
  </div>
</body>
</html>
  `.trim();

  // ── Real SMTP delivery ─────────────────────────────────────────────
  if (env.SMTP_HOST) {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: `${toName} <${toEmail}>`,
      subject,
      text: textBody,
      html: htmlBody,
    });
    return;
  }

  // ── Dev fallback ───────────────────────────────────────────────────
  console.log('\n┌─────────────────────────────────────────────────────┐');
  console.log('│       REMINDER EMAIL (dev mode — no SMTP)           │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│  To      : ${toEmail}`);
  console.log(`│  Name    : ${toName}`);
  console.log(`│  Hackathon: ${hackathonName}`);
  console.log(`│  Days left: ${daysLabel}`);
  console.log(`│  Register : ${registrationUrl}`);
  console.log('└─────────────────────────────────────────────────────┘\n');
}
