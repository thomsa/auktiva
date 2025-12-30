/**
 * Email Provider Factory
 *
 * Creates the appropriate email provider based on configuration
 */

import { createLogger } from "@/lib/logger";
import type { EmailProvider, EmailProviderType } from "./types";
import { BrevoProvider } from "./brevo";
import { SmtpProvider } from "./smtp";

export type {
  EmailProvider,
  EmailMessage,
  EmailSendResult,
  EmailProviderType,
} from "./types";
export { testSmtpConnection } from "./smtp";

const logger = createLogger("email:provider");

let providerInstance: EmailProvider | null = null;

/**
 * Get the configured email provider type
 */
export function getEmailProviderType(): EmailProviderType | null {
  const provider = process.env.EMAIL_PROVIDER as EmailProviderType | undefined;

  if (provider) {
    if (provider !== "brevo" && provider !== "smtp") {
      logger.warn({ provider }, "Unknown EMAIL_PROVIDER value, email disabled");
      return null;
    }
    return provider;
  }

  // Backward compatibility: if BREVO_API_KEY is set but EMAIL_PROVIDER is not,
  // default to brevo (this was the only option before the SMTP feature)
  if (process.env.BREVO_API_KEY) {
    logger.debug(
      "EMAIL_PROVIDER not set, defaulting to brevo (BREVO_API_KEY found)",
    );
    return "brevo";
  }

  return null;
}

/**
 * Check if email is configured and enabled
 */
export function isEmailEnabled(): boolean {
  const providerType = getEmailProviderType();

  if (!providerType) {
    return false;
  }

  // Check provider-specific requirements
  if (providerType === "brevo" && !process.env.BREVO_API_KEY) {
    return false;
  }

  if (providerType === "smtp" && !process.env.SMTP_HOST) {
    return false;
  }

  return true;
}

/**
 * Get or create the email provider instance
 * Returns null if email is not configured
 */
export function getEmailProvider(): EmailProvider | null {
  if (providerInstance) {
    return providerInstance;
  }

  const providerType = getEmailProviderType();

  if (!providerType) {
    logger.debug("No email provider configured (EMAIL_PROVIDER not set)");
    return null;
  }

  try {
    switch (providerType) {
      case "brevo":
        providerInstance = new BrevoProvider();
        break;
      case "smtp":
        providerInstance = new SmtpProvider();
        break;
      default:
        logger.error({ providerType }, "Unknown email provider type");
        return null;
    }

    logger.info({ provider: providerType }, "Email provider initialized");
    return providerInstance;
  } catch (err) {
    logger.error({ err, providerType }, "Failed to initialize email provider");
    return null;
  }
}

/**
 * Reset the provider instance (useful for testing)
 */
export function resetEmailProvider(): void {
  providerInstance = null;
}
