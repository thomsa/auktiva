import * as brevo from "@getbrevo/brevo";
import mjml2html from "mjml";
import { prisma } from "@/lib/prisma";
import { EmailType, EmailStatus } from "@/generated/prisma/client";
import { createLogger } from "@/lib/logger";

const emailLogger = createLogger("email");

const api = new brevo.TransactionalEmailsApi();
api.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY!,
);

const MAIL_FROM = process.env.MAIL_FROM || "noreply@auktiva.org";
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || "Auktiva.org";
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

  try {
    emailLogger.debug(
      {
        emailLogId,
        to: emailLog.toEmail,
        subject: emailLog.subject,
        sender: MAIL_FROM,
      },
      "Calling Brevo API to send email",
    );

    const response = await api.sendTransacEmail({
      sender: { email: MAIL_FROM, name: MAIL_FROM_NAME },
      to: [{ email: emailLog.toEmail, name: emailLog.toName || undefined }],
      subject: emailLog.subject,
      htmlContent: emailLog.htmlContent,
    });

    emailLogger.debug(
      { emailLogId, response: JSON.stringify(response) },
      "Brevo API response received",
    );

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
      },
      "Email sent successfully",
    );
    return true;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const errorStack = err instanceof Error ? err.stack : undefined;
    const newRetryCount = emailLog.retryCount + 1;
    const newStatus: EmailStatus =
      newRetryCount >= MAX_RETRIES ? "ABANDONED" : "FAILED";

    // Try to extract more error details from Brevo API errors
    let errorDetails: Record<string, unknown> = {};
    if (err && typeof err === "object") {
      const apiError = err as { response?: { body?: unknown }; body?: unknown };
      if (apiError.response?.body) {
        errorDetails = { apiResponseBody: apiError.response.body };
      } else if (apiError.body) {
        errorDetails = { apiBody: apiError.body };
      }
    }

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
        ...errorDetails,
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
