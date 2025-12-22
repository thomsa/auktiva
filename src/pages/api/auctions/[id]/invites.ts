import {
  createHandler,
  withAuth,
  requireMembership,
  withValidation,
} from "@/lib/api";
import { inviteHandlers, createInviteSchema } from "@/lib/api/handlers";

export default createHandler({
  GET: [[withAuth, requireMembership], inviteHandlers.listAuctionInvites],
  POST: [
    [withAuth, requireMembership, withValidation(createInviteSchema)],
    inviteHandlers.createAuctionInvite,
  ],
});
