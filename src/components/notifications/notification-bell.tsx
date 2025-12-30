import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import {
  useNotifications,
  type Notification,
} from "@/contexts/NotificationContext";

export function NotificationBell() {
  const t = useTranslations("notifications");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "read">("new");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    markAsRead: contextMarkAsRead,
    markAllAsRead: contextMarkAllAsRead,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    try {
      await contextMarkAsRead(id);
    } catch (err) {
      console.error(tErrors("generic"), err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await contextMarkAllAsRead();
    } catch (err) {
      console.error(tErrors("generic"), err);
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.itemId && notification.auctionId) {
      return `/auctions/${notification.auctionId}/items/${notification.itemId}`;
    }
    if (notification.auctionId) {
      return `/auctions/${notification.auctionId}`;
    }
    return null;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t("justNow");
    if (minutes < 60) return t("minutesAgo", { count: minutes });
    if (hours < 24) return t("hoursAgo", { count: hours });
    return t("daysAgo", { count: days });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="btn btn-ghost btn-circle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t("title")}
      >
        <div className="indicator">
          <span className="icon-[tabler--bell] size-5"></span>
          {unreadCount > 0 && (
            <span className="indicator-item badge badge-primary badge-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-base-100 rounded-box z-50 w-80 shadow-lg border border-base-300">
          {/* Header */}
          <div className="p-3 border-b border-base-300 flex justify-between items-center">
            <h3 className="font-semibold">{t("title")}</h3>
            {activeTab === "new" && unreadCount > 0 && (
              <button onClick={markAllAsRead} className="btn btn-ghost btn-xs">
                {t("markAllRead")}
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="tabs tabs-boxed bg-base-200 m-2 p-1">
            <button
              className={`tab flex-1 ${activeTab === "new" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("new")}
            >
              {t("new")}
              {unreadCount > 0 && (
                <span className="badge badge-primary badge-xs ml-1">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              className={`tab flex-1 ${activeTab === "read" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("read")}
            >
              {t("read")}
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {(() => {
              const filteredNotifications = notifications.filter((n) =>
                activeTab === "new" ? !n.read : n.read,
              );

              if (filteredNotifications.length === 0) {
                return (
                  <div className="p-6 text-center text-base-content/60">
                    <span className="icon-[tabler--bell-off] size-8 mb-2 block mx-auto"></span>
                    <p>{activeTab === "new" ? t("noNew") : t("noRead")}</p>
                  </div>
                );
              }

              return filteredNotifications.map((notification) => {
                const link = getNotificationLink(notification);

                const handleClick = () => {
                  if (!notification.read) markAsRead(notification.id);
                  setIsOpen(false);
                  if (link) {
                    router.push(link);
                  }
                };

                return (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-base-200 cursor-pointer border-b border-base-200 last:border-0 ${
                      !notification.read ? "bg-primary/5" : ""
                    }`}
                    onClick={handleClick}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0">
                        {notification.type === "NEW_ITEM" &&
                        notification.imageUrl ? (
                          <img
                            src={notification.imageUrl}
                            alt=""
                            className="size-10 rounded object-cover"
                          />
                        ) : notification.type === "NEW_ITEM" ? (
                          <div className="size-10 rounded bg-base-200 flex items-center justify-center">
                            <span className="icon-[tabler--package] size-5 text-primary"></span>
                          </div>
                        ) : notification.type === "OUTBID" ? (
                          <span className="icon-[tabler--arrow-up] size-5 text-warning"></span>
                        ) : notification.type === "AUCTION_WON" ? (
                          <span className="icon-[tabler--trophy] size-5 text-success"></span>
                        ) : notification.type === "MEMBER_JOINED" ? (
                          <span className="icon-[tabler--user-plus] size-5 text-info"></span>
                        ) : notification.type === "AUCTION_ENDED" ? (
                          <span className="icon-[tabler--clock-off] size-5 text-error"></span>
                        ) : notification.type === "INVITE_RECEIVED" ? (
                          <span className="icon-[tabler--mail] size-5 text-primary"></span>
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-base-content/60 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-base-content/40 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="shrink-0">
                          <span className="badge badge-primary badge-xs"></span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
