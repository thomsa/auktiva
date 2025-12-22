import { createHandler } from "@/lib/api";
import { verifyRecaptcha } from "@/lib/api/handlers/auth.handlers";

export default createHandler({
  POST: verifyRecaptcha,
});
