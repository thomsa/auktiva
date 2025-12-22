import { createHandler } from "@/lib/api";
import { withCronSecret, retryEmails } from "@/lib/api/handlers/cron.handlers";

export default createHandler({
  GET: [[withCronSecret], retryEmails],
  POST: [[withCronSecret], retryEmails],
});
