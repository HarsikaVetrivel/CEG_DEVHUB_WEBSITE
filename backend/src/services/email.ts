import nodemailer from 'nodemailer';

const FROM_ADDRESS = process.env.SMTP_FROM ?? 'CEG DEV HUB <noreply@cegdevhub.local>';
const APP_URL = process.env.APP_URL ?? 'http://localhost:5173';

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
  const resetUrl = `${APP_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;

  // ── Real SMTP delivery ─────────────────────────────────────────────
  if (process.env.SMTP_HOST) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transport.sendMail({
      from: FROM_ADDRESS,
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
