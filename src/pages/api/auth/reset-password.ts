import { createHandler } from "@/lib/api";
import { resetPassword } from "@/lib/api/handlers/auth.handlers";

export default createHandler({
  POST: resetPassword,
});
