/**
 * Email Sender
 *
 * Handles email sending with database logging, retries, and provider abstraction.
 * Supports multiple providers (Brevo, SMTP) based on EMAIL_PROVIDER env var.
 */

import mjml2html from "mjml";
import { prisma } from "@/lib/prisma";
import { EmailType, EmailStatus } from "@/generated/prisma/client";
import { createLogger } from "@/lib/logger";
import { getEmailProvider, isEmailEnabled } from "./providers";

const emailLogger = createLogger("email");

const MAX_RETRIES = 5;

interface SendEmailParams {
  to: string;
  toName?: string;
  subject: string;
  mjmlTemplate: string;
  replacements: Record<string, string>;
  type: EmailType;
  metadata?: Record<string, unknown>;
}

function renderTemplate(
  mjmlTemplate: string,
  replacements: Record<string, string>,
): string {
  emailLogger.debug(
    { replacementKeys: Object.keys(replacements) },
    "Rendering MJML template",
  );

  let rendered = mjmlTemplate;
  for (const [key, value] of Object.entries(replacements)) {
    rendered = rendered.replace(new RegExp(key, "g"), value);
  }
  const { html, errors } = mjml2html(rendered);
  if (errors.length > 0) {
    emailLogger.warn({ errors }, "MJML rendering warnings");
  }
  return html;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { to, toName, subject, mjmlTemplate, replacements, type, metadata } =
    params;

  // Check if email is enabled
  if (!isEmailEnabled()) {
    emailLogger.debug({ to, type }, "Email not configured, skipping send");
    return false;
  }

  emailLogger.info({ to, type, subject, metadata }, "Preparing to send email");

  try {
    // Render the HTML content
    const htmlContent = renderTemplate(mjmlTemplate, replacements);
    emailLogger.debug(
      { to, type, htmlLength: htmlContent.length },
      "Template rendered successfully",
    );

    // Create email log entry first
    const emailLog = await prisma.emailLog.create({
      data: {
        toEmail: to,
        toName: toName || null,
        type,
        subject,
        htmlContent,
        status: "PENDING",
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    emailLogger.debug(
      { emailLogId: emailLog.id, to, type },
      "Email log entry created",
    );

    // Try to send
    return sendEmailFromLog(emailLog.id);
  } catch (err) {
    emailLogger.error(
      { err, to, type, subject },
      "Failed to prepare email for sending",
    );
    return false;
  }
}

export async function sendEmailFromLog(emailLogId: string): Promise<boolean> {
  emailLogger.debug({ emailLogId }, "Attempting to send email from log");

  const emailLog = await prisma.emailLog.findUnique({
    where: { id: emailLogId },
  });

  if (!emailLog) {
    emailLogger.error({ emailLogId }, "Email log not found");
    return false;
  }

  emailLogger.debug(
    {
      emailLogId,
      to: emailLog.toEmail,
      type: emailLog.type,
      status: emailLog.status,
      retryCount: emailLog.retryCount,
    },
    "Email log retrieved",
  );

  if (emailLog.status === "SENT") {
    emailLogger.debug({ emailLogId }, "Email already sent, skipping");
    return true;
  }

  if (emailLog.status === "ABANDONED") {
    emailLogger.warn(
      { emailLogId, to: emailLog.toEmail, lastError: emailLog.lastError },
      "Email was abandoned after max retries",
    );
    return false;
  }

  // Get the email provider
  const provider = getEmailProvider();
  if (!provider) {
    emailLogger.error({ emailLogId }, "No email provider available");
    return false;
  }

  try {
    emailLogger.debug(
      {
        emailLogId,
        to: emailLog.toEmail,
        subject: emailLog.subject,
        provider: provider.getName(),
      },
      "Calling email provider to send",
    );

    const result = await provider.send({
      to: emailLog.toEmail,
      toName: emailLog.toName || undefined,
      subject: emailLog.subject,
      htmlContent: emailLog.htmlContent,
    });

    if (result.success) {
      // Mark as sent
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          lastError: null,
        },
      });

      emailLogger.info(
        {
          emailLogId,
          to: emailLog.toEmail,
          type: emailLog.type,
          subject: emailLog.subject,
          messageId: result.messageId,
        },
        "Email sent successfully",
      );
      return true;
    } else {
      // Handle failure
      const newRetryCount = emailLog.retryCount + 1;
      const newStatus: EmailStatus =
        newRetryCount >= MAX_RETRIES ? "ABANDONED" : "FAILED";

      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          status: newStatus,
          retryCount: newRetryCount,
          lastError: result.error || "Unknown error",
        },
      });

      emailLogger.error(
        {
          emailLogId,
          to: emailLog.toEmail,
          type: emailLog.type,
          subject: emailLog.subject,
          attempt: newRetryCount,
          maxRetries: MAX_RETRIES,
          newStatus,
          error: result.error,
        },
        `Failed to send email (attempt ${newRetryCount}/${MAX_RETRIES})`,
      );

      return false;
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorStack = err instanceof Error ? err.stack : undefined;
    const newRetryCount = emailLog.retryCount + 1;
    const newStatus: EmailStatus =
      newRetryCount >= MAX_RETRIES ? "ABANDONED" : "FAILED";

    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        status: newStatus,
        retryCount: newRetryCount,
        lastError: errorMessage,
      },
    });

    emailLogger.error(
      {
        emailLogId,
        to: emailLog.toEmail,
        type: emailLog.type,
        subject: emailLog.subject,
        attempt: newRetryCount,
        maxRetries: MAX_RETRIES,
        newStatus,
        error: errorMessage,
        errorStack,
      },
      `Failed to send email (attempt ${newRetryCount}/${MAX_RETRIES})`,
    );

    return false;
  }
}

export async function retryFailedEmails(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  emailLogger.info("Starting retry of failed emails");

  // Check if email is enabled
  if (!isEmailEnabled()) {
    emailLogger.debug("Email not configured, skipping retry");
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  const failedEmails = await prisma.emailLog.findMany({
    where: {
      status: "FAILED",
      retryCount: { lt: MAX_RETRIES },
    },
    orderBy: { createdAt: "asc" },
    take: 50, // Process in batches
  });

  emailLogger.debug(
    {
      count: failedEmails.length,
      emails: failedEmails.map((e) => ({
        id: e.id,
        to: e.toEmail,
        type: e.type,
        retryCount: e.retryCount,
      })),
    },
    "Found failed emails to retry",
  );

  let succeeded = 0;
  let failed = 0;

  for (const email of failedEmails) {
    const result = await sendEmailFromLog(email.id);
    if (result) {
      succeeded++;
    } else {
      failed++;
    }
  }

  emailLogger.info(
    { processed: failedEmails.length, succeeded, failed },
    "Completed retry of failed emails",
  );

  return {
    processed: failedEmails.length,
    succeeded,
    failed,
  };
}

export async function processPendingEmails(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  emailLogger.info("Starting processing of pending emails");

  // Check if email is enabled
  if (!isEmailEnabled()) {
    emailLogger.debug("Email not configured, skipping pending processing");
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  const pendingEmails = await prisma.emailLog.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  emailLogger.debug(
    {
      count: pendingEmails.length,
      emails: pendingEmails.map((e) => ({
        id: e.id,
        to: e.toEmail,
        type: e.type,
      })),
    },
    "Found pending emails to process",
  );

  let succeeded = 0;
  let failed = 0;

  for (const email of pendingEmails) {
    const result = await sendEmailFromLog(email.id);
    if (result) {
      succeeded++;
    } else {
      failed++;
    }
  }

  emailLogger.info(
    { processed: pendingEmails.length, succeeded, failed },
    "Completed processing of pending emails",
  );

  return {
    processed: pendingEmails.length,
    succeeded,
    failed,
  };
}
