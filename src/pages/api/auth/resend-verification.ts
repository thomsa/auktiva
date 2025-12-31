import { createHandler, withAuthRateLimit } from "@/lib/api";
import { resendVerification } from "@/lib/api/handlers/auth.handlers";

export default createHandler({
  POST: [[withAuthRateLimit], resendVerification],
});
