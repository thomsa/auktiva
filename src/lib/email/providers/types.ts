/**
 * Email Provider Types
 *
 * Common interfaces for email providers (Brevo, SMTP, etc.)
 */

export interface EmailMessage {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProvider {
  /**
   * Send an email
   */
  send(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Get the provider name for logging
   */
  getName(): string;
}

export type EmailProviderType = "brevo" | "smtp" | "ses";
