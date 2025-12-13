type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

interface EventMap {
  "user.registered": { userId: string; email: string; name: string };
  "invite.created": {
    inviteId: string;
    email: string;
    auctionId: string;
    auctionName: string;
    senderName: string;
    token: string;
    role: string;
  };
  "item.created": {
    itemId: string;
    itemName: string;
    itemDescription: string | null;
    itemImageUrl: string | null;
    auctionId: string;
    auctionName: string;
    creatorId: string;
  };
  "bid.outbid": {
    previousBidderId: string;
    previousBidderEmail: string;
    previousBidderName: string;
    itemId: string;
    itemName: string;
    auctionId: string;
    auctionName: string;
    newAmount: number;
    currencySymbol: string;
  };
}

type EventName = keyof EventMap;

class EventBus {
  private handlers: Map<EventName, Set<EventHandler<unknown>>> = new Map();

  on<E extends EventName>(event: E, handler: EventHandler<EventMap[E]>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);
  }

  off<E extends EventName>(event: E, handler: EventHandler<EventMap[E]>): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler as EventHandler<unknown>);
    }
  }

  emit<E extends EventName>(event: E, payload: EventMap[E]): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      for (const handler of eventHandlers) {
        // Fire and forget - don't await, don't block
        Promise.resolve(handler(payload)).catch((err) => {
          console.error(`[EventBus] Error in handler for "${event}":`, err);
        });
      }
    }
  }
}

// Singleton instance
const globalForEventBus = globalThis as unknown as { eventBus: EventBus };

export const eventBus = globalForEventBus.eventBus ?? new EventBus();

if (process.env.NODE_ENV !== "production") {
  globalForEventBus.eventBus = eventBus;
}

export type { EventMap, EventName };
