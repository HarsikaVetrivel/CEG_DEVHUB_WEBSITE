
import { env } from '../config/env.js';

interface BrevoEmailOptions {
  toEmail: string;
  toName: string;
  subject: string;
  textContent: string;
  htmlContent: string;
}

/**
 * Common function to send emails through Brevo API.
 */
async function sendBrevoEmail({
  toEmail,
  toName,
  subject,
  textContent,
  htmlContent,
}: BrevoEmailOptions): Promise<void> {
  if (!env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not configured');
  }

  if (!env.EMAIL_FROM) {
    throw new Error('EMAIL_FROM is not configured');
  }

  const response = await fetch(
    'https://api.brevo.com/v3/smtp/email',
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'CEG DEV HUB',
          email: env.EMAIL_FROM,
        },
        to: [
          {
            email: toEmail,
            name: toName,
          },
        ],
        subject,
        textContent,
        htmlContent,
      }),
    },
  );

  if (!response.ok) {
    const errorDetails = await response.text();

    // Never log API keys, reset tokens, or email credentials.
    console.error(
      '[Brevo Email Error]',
      response.status,
      errorDetails,
    );

    throw new Error(
      `Brevo email request failed with status ${response.status}`,
    );
  }
}

/**
 * Sends a password-reset email.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string,
  rawToken: string,
): Promise<void> {
  const appUrl = env.APP_URL.replace(/\/+$/, '');

  const resetUrl =
    `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

  const textContent = `
Hello ${toName},

We received a request to reset your CEG DEV HUB password.

Click the link below to reset your password:

${resetUrl}

This link expires in 1 hour.

If you did not request this, you can ignore this email.

Regards,
CEG DEV HUB Team
`;

  const htmlContent = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>CEG DEV HUB - Password Reset</h2>

    <p>Hello ${toName},</p>

    <p>
      We received a request to reset your CEG DEV HUB password.
    </p>

    <p>
      Click the button below to reset your password:
    </p>

    <p>
      <a
        href="${resetUrl}"
        style="
          display: inline-block;
          padding: 12px 20px;
          background-color: #2563eb;
          color: white;
          text-decoration: none;
          border-radius: 6px;
        "
      >
        Reset Password
      </a>
    </p>

    <p>This link expires in 1 hour.</p>

    <p>
      If you did not request this, you can safely ignore this email.
    </p>

    <p>Regards,<br />CEG DEV HUB Team</p>
  </body>
</html>
`;

  await sendBrevoEmail({
    toEmail,
    toName,
    subject: 'Reset your CEG DEV HUB password',
    textContent,
    htmlContent,
  });
}

/**
 * Sends a reminder email.
 *
 * Parameters:
 * toEmail  - Recipient email address
 * toName   - Recipient name
 * subject  - Reminder email subject
 * message  - Reminder message
 */
export async function sendReminderEmail(
  toEmail: string,
  toName: string,
  subject: string,
  message: string,
): Promise<void> {
  const textContent = `
Hello ${toName},

${message}

Regards,
CEG DEV HUB Team
`;

  const htmlContent = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>CEG DEV HUB - Reminder</h2>

    <p>Hello ${toName},</p>

    <p>${message}</p>

    <p>Regards,<br />CEG DEV HUB Team</p>
  </body>
</html>
`;

  await sendBrevoEmail({
    toEmail,
    toName,
    subject,
    textContent,
    htmlContent,
  });
}
