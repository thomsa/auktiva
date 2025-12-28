"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import {
  useNotifications,
  type Notification,
} from "@/contexts/NotificationContext";

interface MobileNotificationSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNotificationSheet({
  isOpen,
  onClose,
}: MobileNotificationSheetProps) {
  const t = useTranslations("notifications");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"new" | "read">("new");

  const {
    notifications,
    unreadCount,
    markAsRead: contextMarkAsRead,
    markAllAsRead: contextMarkAllAsRead,
  } = useNotifications();

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
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

  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case "NEW_ITEM":
        if (notification.imageUrl) {
          return (
            <img
              src={notification.imageUrl}
              alt=""
              className="size-12 rounded-xl object-cover"
            />
          );
        }
        return (
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="icon-[tabler--package] size-6 text-primary" />
          </div>
        );
      case "OUTBID":
        return (
          <div className="size-12 rounded-xl bg-warning/10 flex items-center justify-center">
            <span className="icon-[tabler--arrow-up] size-6 text-warning" />
          </div>
        );
      case "AUCTION_WON":
        return (
          <div className="size-12 rounded-xl bg-success/10 flex items-center justify-center">
            <span className="icon-[tabler--trophy] size-6 text-success" />
          </div>
        );
      case "MEMBER_JOINED":
        return (
          <div className="size-12 rounded-xl bg-info/10 flex items-center justify-center">
            <span className="icon-[tabler--user-plus] size-6 text-info" />
          </div>
        );
      case "AUCTION_ENDED":
        return (
          <div className="size-12 rounded-xl bg-error/10 flex items-center justify-center">
            <span className="icon-[tabler--clock-off] size-6 text-error" />
          </div>
        );
      case "INVITE_RECEIVED":
        return (
          <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="icon-[tabler--mail] size-6 text-primary" />
          </div>
        );
      default:
        return (
          <div className="size-12 rounded-xl bg-base-200 flex items-center justify-center">
            <span className="icon-[tabler--bell] size-6 text-base-content/60" />
          </div>
        );
    }
  };

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) =>
    activeTab === "new" ? !n.read : n.read,
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 md:hidden"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden animate-in slide-in-from-bottom duration-300">
        <div className="bg-base-100 rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-base-content/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-4 pb-3 flex items-center justify-between border-b border-base-content/10">
            <h2 className="text-lg font-bold">{t("title")}</h2>
            <div className="flex items-center gap-2">
              {activeTab === "new" && unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="btn btn-ghost btn-sm text-primary"
                >
                  {t("markAllRead")}
                </button>
              )}
              <button
                onClick={onClose}
                className="btn btn-ghost btn-sm btn-circle"
              >
                <span className="icon-[tabler--x] size-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 py-3">
            <div className="tabs tabs-boxed bg-base-200 p-1">
              <button
                className={`tab flex-1 ${activeTab === "new" ? "tab-active" : ""}`}
                onClick={() => setActiveTab("new")}
              >
                {t("new")}
                {unreadCount > 0 && (
                  <span className="badge badge-primary badge-sm ml-2">
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
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto px-4 pb-safe">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-base-content/60">
                <span className="icon-[tabler--bell-off] size-12 mb-3 block mx-auto opacity-50" />
                <p className="text-sm">
                  {activeTab === "new" ? t("noNew") : t("noRead")}
                </p>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {filteredNotifications.map((notification) => {
                  const link = getNotificationLink(notification);

                  const handleClick = () => {
                    if (!notification.read) markAsRead(notification.id);
                    onClose();
                    if (link) {
                      router.push(link);
                    }
                  };

                  return (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-2xl cursor-pointer transition-colors ${
                        !notification.read
                          ? "bg-primary/5 border border-primary/10"
                          : "bg-base-200/50 hover:bg-base-200"
                      }`}
                      onClick={handleClick}
                    >
                      <div className="flex gap-3">
                        <div className="shrink-0">
                          {getNotificationIcon(notification)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="badge badge-primary badge-xs mt-1" />
                            )}
                          </div>
                          <p className="text-sm text-base-content/70 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-base-content/50 mt-1.5">
                            {formatTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
