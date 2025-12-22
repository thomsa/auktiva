import { createHandler, withAuth, withValidation } from "@/lib/api";
import { userHandlers, updateProfileSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth], userHandlers.getProfile],
  PATCH: [
    [withAuth, withValidation(updateProfileSchema)],
    userHandlers.updateProfile,
  ],
});
