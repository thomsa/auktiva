import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
} from "@/lib/api";
import { discussionHandlers, updateDiscussionSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth, requireMembership], discussionHandlers.getDiscussion],
  PATCH: [
    [withAuth, requireMembership, withValidation(updateDiscussionSchema)],
    discussionHandlers.updateDiscussion,
  ],
  DELETE: [[withAuth, requireMembership], discussionHandlers.deleteDiscussion],
});
