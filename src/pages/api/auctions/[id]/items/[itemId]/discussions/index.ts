import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
  withAuthRateLimit,
} from "@/lib/api";
import { discussionHandlers, createDiscussionSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth, requireMembership], discussionHandlers.listDiscussions],
  POST: [
    [
      withAuth,
      withAuthRateLimit,
      requireMembership,
      withValidation(createDiscussionSchema),
    ],
    discussionHandlers.createDiscussion,
  ],
});
