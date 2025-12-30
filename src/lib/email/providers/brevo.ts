/**
 * Brevo Email Provider
 *
 * Sends emails using the Brevo (formerly Sendinblue) API
 */

import * as brevo from "@getbrevo/brevo";
import { createLogger } from "@/lib/logger";
import type { EmailProvider, EmailMessage, EmailSendResult } from "./types";

const logger = createLogger("email:brevo");

const MAIL_FROM = process.env.MAIL_FROM || "noreply@auktiva.org";
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "Auktiva.org";

export class BrevoProvider implements EmailProvider {
  private api: brevo.TransactionalEmailsApi;

  constructor() {
    if (!process.env.BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY environment variable is required");
    }

    this.api = new brevo.TransactionalEmailsApi();
    this.api.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY,
    );

    logger.info("Brevo provider initialized");
  }

  getName(): string {
    return "brevo";
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const { to, toName, subject, htmlContent } = message;

    logger.debug({ to, subject }, "Sending email via Brevo");

    try {
      const response = await this.api.sendTransacEmail({
        sender: { email: MAIL_FROM, name: MAIL_FROM_NAME },
        to: [{ email: to, name: toName || undefined }],
        subject,
        htmlContent,
      });

      logger.debug(
        { to, response: JSON.stringify(response) },
        "Brevo API response",
      );

      return {
        success: true,
        messageId: (response.body as { messageId?: string })?.messageId,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      // Try to extract more error details from Brevo API errors
      let errorDetails = errorMessage;
      if (err && typeof err === "object") {
        const apiError = err as {
          response?: { body?: unknown };
          body?: unknown;
        };
        if (apiError.response?.body) {
          errorDetails = JSON.stringify(apiError.response.body);
        } else if (apiError.body) {
          errorDetails = JSON.stringify(apiError.body);
        }
      }

      logger.error({ to, error: errorDetails }, "Brevo send failed");

      return {
        success: false,
        error: errorDetails,
      };
    }
  }
}
