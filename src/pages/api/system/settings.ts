import { createHandler, withAuth, withValidation } from "@/lib/api";
import { systemHandlers, updateSystemSettingsSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth], systemHandlers.getSettings],
  PATCH: [
    [withAuth, withValidation(updateSystemSettingsSchema)],
    systemHandlers.updateSettings,
  ],
});
