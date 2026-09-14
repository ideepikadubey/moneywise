import nodemailer from "nodemailer";

interface SendOtpOptions {
  to: string;
  otp: string;
  name?: string;
}

/**
 * Creates a Nodemailer transporter based on environment variables.
 * Supports Gmail service and standard SMTP.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, ""); // remove accidental spaces in app passwords

  if (!user || !pass) {
    return null;
  }

  // For Gmail, using service: 'gmail' or port 465 is the most reliable
  if (host.includes("gmail") || user.endsWith("@gmail.com")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
}

/**
 * Sends a 6-digit OTP email for verification or password reset.
 */
export async function sendOtpEmail({ to, otp, name }: SendOtpOptions): Promise<boolean> {
  const userGreeting = name ? `Hello ${name},` : "Hello,";
  let fromAddress = process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || "MoneyWise <no-reply@moneywise.app>";

  // Ensure fromAddress has valid format
  if (fromAddress && !fromAddress.includes("<") && fromAddress.includes("@")) {
    fromAddress = `MoneyWise <${fromAddress}>`;
  }

  console.log(`[OTP DISPATCH] Destination: ${to} | Code: ${otp}`);

  const transporter = createTransporter();

  if (!transporter) {
    console.warn(
      "[EMAIL SERVICE] SMTP_USER or SMTP_PASS not configured. OTP logged to console only."
    );
    return false;
  }

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">MoneyWise</h2>
        <p style="color: #64748b; margin: 4px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Multi-Firm Billing &amp; GST SaaS</p>
      </div>

      <div style="padding: 24px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9;">
        <p style="color: #1e293b; font-size: 15px; margin-top: 0;">${userGreeting}</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Use the 6-digit verification code below to complete your account verification.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-size: 32px; font-weight: 800; letter-spacing: 8px; font-family: monospace;">
            ${otp}
          </div>
        </div>

        <p style="color: #64748b; font-size: 13px; margin-bottom: 0; text-align: center;">
          This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
      </div>

      <div style="margin-top: 24px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          If you did not request this verification code, you can safely ignore this email.
        </p>
        <p style="color: #cbd5e1; font-size: 11px; margin: 8px 0 0 0;">
          &copy; ${new Date().getFullYear()} MoneyWise &bull; The Dynamite Technologies
        </p>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `Your MoneyWise Verification Code: ${otp}`,
      text: `${userGreeting}\n\nYour 6-digit verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this code, please ignore this email.`,
      html: htmlContent,
    });

    console.log(`[EMAIL SERVICE] OTP successfully sent to ${to} (MessageId: ${info.messageId})`);
    return true;
  } catch (error: any) {
    console.error(`[EMAIL SERVICE ERROR] Failed to send email to ${to}:`, error.message);
    return false;
  }
}
