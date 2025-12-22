import { createHandler, withAuth, withValidation } from "@/lib/api";
import { userHandlers, updatePasswordSchema } from "@/lib/api/handlers";

export default createHandler({
  PATCH: [
    [withAuth, withValidation(updatePasswordSchema)],
    userHandlers.updatePassword,
  ],
});
