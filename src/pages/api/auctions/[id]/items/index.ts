import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
} from "@/lib/api";
import { itemHandlers, createItemSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth, requireMembership], itemHandlers.listItems],
  POST: [
    [withAuth, requireMembership, withValidation(createItemSchema)],
    itemHandlers.createItem,
  ],
});
