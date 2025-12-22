import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
} from "@/lib/api";
import { itemHandlers, updateItemSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth, requireMembership], itemHandlers.getItem],
  PATCH: [
    [withAuth, requireMembership, withValidation(updateItemSchema)],
    itemHandlers.updateItem,
  ],
  DELETE: [[withAuth, requireMembership], itemHandlers.deleteItem],
});
