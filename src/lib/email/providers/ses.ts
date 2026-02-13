/**
 * Amazon SES Email Provider
 *
 * Sends emails using the AWS SDK v3 SES client.
 * Supports both IAM credentials (access key/secret) and IAM roles (EC2/Lambda).
 */

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { createLogger } from "@/lib/logger";
import type { EmailProvider, EmailMessage, EmailSendResult } from "./types";

const logger = createLogger("email:ses");

const MAIL_FROM = process.env.MAIL_FROM || "noreply@auktiva.org";
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "Auktiva.org";

export class SesProvider implements EmailProvider {
  private client: SESClient;

  constructor() {
    const region = process.env.AWS_SES_REGION;

    if (!region) {
      throw new Error("AWS_SES_REGION environment variable is required");
    }

    // Build client configuration
    // If access key/secret are provided, use them; otherwise rely on IAM role
    const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;

    const clientConfig: ConstructorParameters<typeof SESClient>[0] = {
      region,
    };

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
      logger.info(
        { region },
        "SES provider initialized with explicit credentials",
      );
    } else {
      // Will use default credential provider chain (IAM role, env vars, etc.)
      logger.info(
        { region },
        "SES provider initialized with default credential chain (IAM role)",
      );
    }

    this.client = new SESClient(clientConfig);
  }

  getName(): string {
    return "ses";
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const { to, toName, subject, htmlContent } = message;

    logger.debug({ to, subject }, "Sending email via Amazon SES");

    try {
      const command = new SendEmailCommand({
        Source: `${MAIL_FROM_NAME} <${MAIL_FROM}>`,
        Destination: {
          ToAddresses: [toName ? `${toName} <${to}>` : to],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: htmlContent,
              Charset: "UTF-8",
            },
          },
        },
        // Optional: Configuration set for tracking
        ...(process.env.AWS_SES_CONFIGURATION_SET && {
          ConfigurationSetName: process.env.AWS_SES_CONFIGURATION_SET,
        }),
      });

      const response = await this.client.send(command);

      logger.debug(
        { to, messageId: response.MessageId },
        "SES send successful",
      );

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const errorName = err instanceof Error ? err.name : "UnknownError";

      logger.error({ to, error: errorMessage, errorName }, "SES send failed");

      return {
        success: false,
        error: `${errorName}: ${errorMessage}`,
      };
    }
  }
}

/**
 * Test SES connection by sending a test email
 * Used by setup wizard to validate settings before saving
 */
export async function testSesConnection(config: {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  testEmail: string;
}): Promise<{ success: boolean; error?: string }> {
  const { region, accessKeyId, secretAccessKey, testEmail } = config;

  const clientConfig: ConstructorParameters<typeof SESClient>[0] = {
    region,
  };

  if (accessKeyId && secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId,
      secretAccessKey,
    };
  }

  const client = new SESClient(clientConfig);

  try {
    const command = new SendEmailCommand({
      Source: `Test <${testEmail}>`,
      Destination: {
        ToAddresses: [testEmail],
      },
      Message: {
        Subject: {
          Data: "Auktiva SES Test",
          Charset: "UTF-8",
        },
        Body: {
          Text: {
            Data: "This is a test email from Auktiva to verify SES configuration.",
            Charset: "UTF-8",
          },
        },
      },
    });

    await client.send(command);
    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: errorMessage };
  } finally {
    client.destroy();
  }
}
