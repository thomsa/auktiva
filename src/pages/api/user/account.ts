import { createHandler, withAuth, withValidation } from "@/lib/api";
import { userHandlers, deleteAccountSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth], userHandlers.getAccountInfo],
  DELETE: [
    [withAuth, withValidation(deleteAccountSchema)],
    userHandlers.deleteAccount,
  ],
});
