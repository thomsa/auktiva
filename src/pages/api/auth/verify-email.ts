import { createHandler } from "@/lib/api";
import { verifyEmail } from "@/lib/api/handlers/auth.handlers";

export default createHandler({
  POST: [[], verifyEmail],
});
