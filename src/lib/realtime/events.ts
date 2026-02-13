/**
 * Realtime event type definitions
 *
 * Channel naming conventions:
 * All channels are private (require authentication):
 * - private-user-{userId}: Personal notifications
 * - private-auction-{auctionId}: Auction-wide events (new items)
 * - private-item-{itemId}: Item events (bids, discussions)
 */

// =============================================================================
// Channel Types (Type-safe channel names)
// =============================================================================

/** Branded type for item channel names */
export type ItemChannel = `private-item-${string}`;

/** Branded type for user channel names */
export type UserChannel = `private-user-${string}`;

/** Branded type for auction channel names */
export type AuctionChannel = `private-auction-${string}`;

/** Union of all valid channel types */
export type ChannelName = ItemChannel | UserChannel | AuctionChannel;

// =============================================================================
// Channel Factories (Create type-safe channel names)
// =============================================================================

export const Channels = {
  /** Private item channel - for bid updates and discussions (members only) */
  item: (itemId: string): ItemChannel => `private-item-${itemId}`,

  /** Private user channel - for personal notifications (outbid, etc.) */
  privateUser: (userId: string): UserChannel => `private-user-${userId}`,

  /** Private auction channel - for auction events (new items, member changes) */
  privateAuction: (auctionId: string): AuctionChannel =>
    `private-auction-${auctionId}`,
} as const;

// =============================================================================
// Event Names
// =============================================================================

export const Events = {
  // Bid events
  BID_NEW: "bid:new",
  BID_OUTBID: "bid:outbid",

  // Item events
  ITEM_CREATED: "item:created",
  ITEM_UPDATED: "item:updated",
  ITEM_ENDED: "item:ended",
  ITEM_DELETED: "item:deleted",

  // Discussion events
  DISCUSSION_NEW: "discussion:new",
  DISCUSSION_DELETED: "discussion:deleted",

  // Notification events
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_COUNT: "notification:count",

  // Auction events
  AUCTION_UPDATED: "auction:updated",
  AUCTION_CLOSED: "auction:closed",
  MEMBER_JOINED: "member:joined",
} as const;

// =============================================================================
// Event Payloads
// =============================================================================

/** New bid placed on an item */
export interface BidNewEvent {
  itemId: string;
  auctionId: string;
  bidId: string;
  amount: number;
  currencyCode: string;
  bidderId: string;
  bidderName: string | null; // null if anonymous
  isAnonymous: boolean;
  timestamp: string;
  highestBid: number;
  newEndDate?: string; // Set when anti-snipe extends the end time
}

/** User was outbid (private channel) */
export interface BidOutbidEvent {
  itemId: string;
  itemName: string;
  auctionId: string;
  auctionName: string;
  newHighestBid: number;
  currencyCode: string;
  yourBid: number;
}

/** New item created in auction (private channel - members only) */
export interface ItemCreatedEvent {
  itemId: string;
  auctionId: string;
  name: string;
  creatorId: string;
  creatorName: string;
  thumbnailUrl: string | null;
  startingBid: number | null;
  currencyCode: string;
}

/** Item updated */
export interface ItemUpdatedEvent {
  itemId: string;
  auctionId: string;
  changes: {
    name?: string;
    description?: string;
    endDate?: string | null;
    isPublished?: boolean;
  };
}

/** Item ended (bidding closed) */
export interface ItemEndedEvent {
  itemId: string;
  auctionId: string;
  itemName: string;
  winnerId: string | null;
  winnerName: string | null;
  winningBid: number | null;
  currencyCode: string;
}

/** New discussion/comment on item */
export interface DiscussionNewEvent {
  discussionId: string;
  itemId: string;
  auctionId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  parentId: string | null;
}

/** Discussion deleted */
export interface DiscussionDeletedEvent {
  discussionId: string;
  itemId: string;
}

/** New notification for user (private channel) */
export interface NotificationNewEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  imageUrl: string | null;
  auctionId: string | null;
  itemId: string | null;
  createdAt: string;
}

/** Notification count update (private channel) */
export interface NotificationCountEvent {
  unreadCount: number;
}

/** Auction updated */
export interface AuctionUpdatedEvent {
  auctionId: string;
  changes: {
    name?: string;
    description?: string;
    endDate?: string | null;
    status?: string;
  };
}

/** Auction closed */
export interface AuctionClosedEvent {
  auctionId: string;
  name: string;
}

/** New member joined auction (private channel) */
export interface MemberJoinedEvent {
  auctionId: string;
  userId: string;
  userName: string;
  role: string;
}

// =============================================================================
// Type Map for Event Payloads
// =============================================================================

export interface EventPayloadMap {
  [Events.BID_NEW]: BidNewEvent;
  [Events.BID_OUTBID]: BidOutbidEvent;
  [Events.ITEM_CREATED]: ItemCreatedEvent;
  [Events.ITEM_UPDATED]: ItemUpdatedEvent;
  [Events.ITEM_ENDED]: ItemEndedEvent;
  [Events.ITEM_DELETED]: { itemId: string; auctionId: string };
  [Events.DISCUSSION_NEW]: DiscussionNewEvent;
  [Events.DISCUSSION_DELETED]: DiscussionDeletedEvent;
  [Events.NOTIFICATION_NEW]: NotificationNewEvent;
  [Events.NOTIFICATION_COUNT]: NotificationCountEvent;
  [Events.AUCTION_UPDATED]: AuctionUpdatedEvent;
  [Events.AUCTION_CLOSED]: AuctionClosedEvent;
  [Events.MEMBER_JOINED]: MemberJoinedEvent;
}
