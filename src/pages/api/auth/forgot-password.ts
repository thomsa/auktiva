import { createHandler } from "@/lib/api";
import { forgotPassword } from "@/lib/api/handlers/auth.handlers";

export default createHandler({
  POST: forgotPassword,
});
