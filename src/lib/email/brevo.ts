import * as brevo from "@getbrevo/brevo";
import mjml2html from "mjml";
import { prisma } from "@/lib/prisma";
import { EmailType, EmailStatus } from "@/generated/prisma/client";

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
  let rendered = mjmlTemplate;
  for (const [key, value] of Object.entries(replacements)) {
    rendered = rendered.replace(new RegExp(key, "g"), value);
  }
  const { html, errors } = mjml2html(rendered);
  if (errors.length > 0) {
    console.warn("[Email] MJML rendering warnings:", errors);
  }
  return html;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const { to, toName, subject, mjmlTemplate, replacements, type, metadata } =
    params;

  // Render the HTML content
  const htmlContent = renderTemplate(mjmlTemplate, replacements);

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

  // Try to send
  return sendEmailFromLog(emailLog.id);
}

export async function sendEmailFromLog(emailLogId: string): Promise<boolean> {
  const emailLog = await prisma.emailLog.findUnique({
    where: { id: emailLogId },
  });

  if (!emailLog) {
    console.error(`[Email] Log not found: ${emailLogId}`);
    return false;
  }

  if (emailLog.status === "SENT") {
    return true;
  }

  if (emailLog.status === "ABANDONED") {
    return false;
  }

  try {
    await api.sendTransacEmail({
      sender: { email: MAIL_FROM, name: MAIL_FROM_NAME },
      to: [{ email: emailLog.toEmail, name: emailLog.toName || undefined }],
      subject: emailLog.subject,
      htmlContent: emailLog.htmlContent,
    });

    // Mark as sent
    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        lastError: null,
      },
    });

    console.log(`[Email] Sent successfully to ${emailLog.toEmail}`);
    return true;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
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

    console.error(
      `[Email] Failed to send to ${emailLog.toEmail} (attempt ${newRetryCount}/${MAX_RETRIES}):`,
      errorMessage,
    );

    return false;
  }
}

export async function retryFailedEmails(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const failedEmails = await prisma.emailLog.findMany({
    where: {
      status: "FAILED",
      retryCount: { lt: MAX_RETRIES },
    },
    orderBy: { createdAt: "asc" },
    take: 50, // Process in batches
  });

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
  const pendingEmails = await prisma.emailLog.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

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

  return {
    processed: pendingEmails.length,
    succeeded,
    failed,
  };
}
