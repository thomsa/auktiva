import { createHandler, withRegistrationRateLimit } from "@/lib/api";
import { register } from "@/lib/api/handlers/auth.handlers";

export default createHandler({
  POST: [[withRegistrationRateLimit], register],
});
