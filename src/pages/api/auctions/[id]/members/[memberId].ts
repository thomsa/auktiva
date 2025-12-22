import {
  createHandler,
  withAuth,
  requireAdmin,
  withValidation,
} from "@/lib/api";
import { memberHandlers, updateRoleSchema } from "@/lib/api/handlers";

export default createHandler({
  PATCH: [
    [withAuth, requireAdmin, withValidation(updateRoleSchema)],
    memberHandlers.updateMemberRole,
  ],
  DELETE: [[withAuth, requireAdmin], memberHandlers.removeMember],
});
