import { createHandler, withAuth, withValidation } from "@/lib/api";
import { userHandlers, updateSettingsSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth], userHandlers.getSettings],
  PATCH: [
    [withAuth, withValidation(updateSettingsSchema)],
    userHandlers.updateSettings,
  ],
});
