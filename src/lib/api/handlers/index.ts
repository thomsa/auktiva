// Handler exports
// These handlers use the service layer for business logic

export * as auctionHandlers from "./auction.handlers";
export * as itemHandlers from "./item.handlers";
export * as bidHandlers from "./bid.handlers";
export * as memberHandlers from "./member.handlers";
export * as inviteHandlers from "./invite.handlers";
export * as userHandlers from "./user.handlers";
export * as notificationHandlers from "./notification.handlers";
export * as systemHandlers from "./system.handlers";

// Re-export schemas for convenience
export {
  createAuctionSchema,
  updateAuctionSchema,
  type CreateAuctionBody,
  type UpdateAuctionBody,
} from "./auction.handlers";

export {
  createItemSchema,
  updateItemSchema,
  type CreateItemBody,
  type UpdateItemBody,
} from "./item.handlers";

export { createBidSchema, type CreateBidBody } from "./bid.handlers";

export { updateRoleSchema, type UpdateRoleBody } from "./member.handlers";

export { createInviteSchema, type CreateInviteBody } from "./invite.handlers";

export {
  updateProfileSchema,
  updatePasswordSchema,
  updateSettingsSchema,
  deleteAccountSchema,
  type UpdateProfileBody,
  type UpdatePasswordBody,
  type UpdateSettingsBody,
  type DeleteAccountBody,
} from "./user.handlers";

export {
  updateSystemSettingsSchema,
  type UpdateSystemSettingsBody,
} from "./system.handlers";
