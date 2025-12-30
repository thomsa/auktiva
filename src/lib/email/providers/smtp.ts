/**
 * SMTP Email Provider
 *
 * Sends emails using Nodemailer with any SMTP server
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { createLogger } from "@/lib/logger";
import type { EmailProvider, EmailMessage, EmailSendResult } from "./types";

const logger = createLogger("email:smtp");

const MAIL_FROM = process.env.MAIL_FROM || "noreply@auktiva.org";
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "Auktiva.org";

export class SmtpProvider implements EmailProvider {
  private transporter: Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const secure = process.env.SMTP_SECURE === "true";
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (!host) {
      throw new Error("SMTP_HOST environment variable is required");
    }

    // Build auth config only if credentials are provided
    const auth = user ? { user, pass: pass || "" } : undefined;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
      // Connection timeout settings
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    });

    logger.info(
      {
        host,
        port,
        secure,
        hasAuth: !!auth,
      },
      "SMTP provider initialized",
    );
  }

  getName(): string {
    return "smtp";
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const { to, toName, subject, htmlContent } = message;

    logger.debug({ to, subject }, "Sending email via SMTP");

    try {
      const info = await this.transporter.sendMail({
        from: `"${MAIL_FROM_NAME}" <${MAIL_FROM}>`,
        to: toName ? `"${toName}" <${to}>` : to,
        subject,
        html: htmlContent,
      });

      logger.debug(
        { to, messageId: info.messageId, response: info.response },
        "SMTP send successful",
      );

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      logger.error({ to, error: errorMessage }, "SMTP send failed");

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Verify SMTP connection
   * Useful for testing configuration during setup
   */
  async verify(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.verify();
      logger.info("SMTP connection verified successfully");
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logger.error(
        { error: errorMessage },
        "SMTP connection verification failed",
      );
      return { success: false, error: errorMessage };
    }
  }
}

/**
 * Test SMTP connection with given configuration
 * Used by setup wizard to validate settings before saving
 */
export async function testSmtpConnection(config: {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { host, port, secure, user, password } = config;

  const auth = user ? { user, pass: password || "" } : undefined;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });

  try {
    await transporter.verify();
    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: errorMessage };
  } finally {
    transporter.close();
  }
}
