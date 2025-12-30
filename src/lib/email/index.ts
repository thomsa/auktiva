// Re-export email functionality
export { sendEmail, retryFailedEmails, processPendingEmails } from "./sender";
export {
  queueWelcomeEmail,
  queueInviteEmail,
  queueNewItemEmails,
  queueOutbidEmail,
  queueItemWonEmail,
} from "./service";
export {
  getEmailProvider,
  getEmailProviderType,
  isEmailEnabled,
  testSmtpConnection,
} from "./providers";
