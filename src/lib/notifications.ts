// Re-export from notification service for backward compatibility
// New code should import from @/lib/services/notification.service directly
export {
  createNotification,
  notifyOutbid,
  notifyAuctionWon,
  notifyMemberJoined,
  notifyNewItem,
} from "@/lib/services/notification.service";
