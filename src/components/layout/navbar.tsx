import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme } from "@/components/providers/theme-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MobileNotificationSheet } from "@/components/notifications/mobile-notification-sheet";
import { UserAvatar } from "@/components/ui/user-avatar";
import packageJson from "../../../package.json";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAppContext } from "@/contexts/AppContext";

interface NavbarProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
  };
}

export function Navbar({ user }: NavbarProps) {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const { setTheme, resolvedTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileNotificationsOpen, setMobileNotificationsOpen] = useState(false);

  const { unreadCount } = useNotifications();
  const { isUserAuctionAdmin } = useAppContext();

  useEffect(() => {
    // This is an intentional hydration pattern to prevent SSR mismatch
    setMounted(true); // eslint-disable-line
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-base-100/80 backdrop-blur-lg border-b border-base-content/5 py-2 shadow-sm"
          : "bg-base-100/0 border-b border-transparent py-4"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 text-xl font-bold tracking-tight"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <span className="icon-[tabler--gavel] size-6 text-primary transition-transform group-hover:-rotate-12 duration-300"></span>
            </div>
            <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              {tCommon("appName")}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="btn btn-ghost btn-sm font-medium text-base-content/70 hover:text-primary hover:bg-primary/10 gap-1.5"
            >
              <span className="icon-[tabler--layout-dashboard] size-4"></span>
              {t("dashboard")}
            </Link>
            <Link
              href="/listings"
              className="btn btn-ghost btn-sm font-medium text-base-content/70 hover:text-primary hover:bg-primary/10 gap-1.5"
            >
              <span className="icon-[tabler--tag] size-4"></span>
              {t("myListings")}
            </Link>
            <Link
              href="/history"
              className="btn btn-ghost btn-sm font-medium text-base-content/70 hover:text-primary hover:bg-primary/10 gap-1.5"
            >
              <span className="icon-[tabler--gavel] size-4"></span>
              {t("myBids")}
            </Link>
            {isUserAuctionAdmin && (
              <Link
                href="/auctions/admin"
                className="btn btn-ghost btn-sm font-medium text-warning hover:text-warning hover:bg-warning/10 gap-1.5"
              >
                <span className="icon-[tabler--shield-check] size-4"></span>
                {t("adminPanel")}
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Notification Bell */}
        <button
          onClick={() => setMobileNotificationsOpen(true)}
          className="md:hidden btn btn-ghost btn-sm btn-circle"
          aria-label={t("notifications")}
        >
          <div className="indicator">
            <span className="icon-[tabler--bell] size-6"></span>
            {unreadCount > 0 && (
              <span className="indicator-item badge badge-primary badge-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        </button>

        <div className="hidden md:flex items-center gap-3">
          {/* Notifications */}
          <div className="btn btn-ghost btn-circle btn-sm hover:bg-base-content/5">
            <NotificationBell />
          </div>

          {/* Theme Toggle */}
          {mounted && (
            <button
              className="btn btn-ghost btn-circle btn-sm hover:bg-base-content/5 transition-transform hover:rotate-12"
              onClick={() =>
                setTheme(resolvedTheme === "light" ? "dark" : "light")
              }
              aria-label="Toggle theme"
            >
              {resolvedTheme === "light" ? (
                <span className="icon-[tabler--moon] size-5"></span>
              ) : (
                <span className="icon-[tabler--sun] size-5"></span>
              )}
            </button>
          )}

          {/* User Menu */}
          <div className="dropdown dropdown-end ml-2">
            <button
              tabIndex={0}
              className="group flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-base-content/5 transition-all cursor-pointer ring-offset-2 focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <UserAvatar name={user.name} email={user.email} size="sm" />
              <span className="icon-[tabler--chevron-down] size-4 text-base-content/40 group-hover:text-base-content/60 transition-colors"></span>
            </button>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100/90 backdrop-blur-xl rounded-2xl z-50 mt-4 w-60 p-2 shadow-2xl shadow-primary/5 border border-base-content/5 transform origin-top-right transition-all"
            >
              <li className="menu-title px-4 py-3 border-b border-base-content/5 mb-2">
                <span className="text-xs font-semibold text-primary block mb-0.5">
                  {t("signedInAs")}
                </span>
                <span className="text-sm font-normal text-base-content/80 truncate block">
                  {user.email}
                </span>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="active:bg-primary/10 active:text-primary"
                >
                  <span className="icon-[tabler--layout-dashboard] size-4 opacity-70"></span>
                  {t("dashboard")}
                </Link>
              </li>
              <li>
                <Link
                  href="/history"
                  className="active:bg-primary/10 active:text-primary"
                >
                  <span className="icon-[tabler--history] size-4 opacity-70"></span>
                  {t("bidHistory")}
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  className="active:bg-primary/10 active:text-primary"
                >
                  <span className="icon-[tabler--settings] size-4 opacity-70"></span>
                  {t("settings")}
                </Link>
              </li>
              {isUserAuctionAdmin && (
                <li>
                  <Link
                    href="/auctions/admin"
                    className="text-warning active:bg-warning/10 active:text-warning"
                  >
                    <span className="icon-[tabler--shield-check] size-4"></span>
                    {t("adminPanel")}
                  </Link>
                </li>
              )}
              <div className="divider my-1 opacity-50"></div>
              <li>
                <a
                  href="https://docs.auktiva.org/users"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="active:bg-primary/10 active:text-primary"
                >
                  <span className="icon-[tabler--book] size-4 opacity-70"></span>
                  {t("documentation")}
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/thomsa/auktiva/issues/new/choose"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="active:bg-primary/10 active:text-primary"
                >
                  <span className="icon-[tabler--message-report] size-4 opacity-70"></span>
                  {t("feedback")}
                </a>
              </li>
              <div className="divider my-1 opacity-50"></div>
              <li>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-error hover:bg-error/10 hover:text-error active:bg-error/20"
                >
                  <span className="icon-[tabler--logout] size-4"></span>
                  {t("signOut")}
                </button>
              </li>
              <li className="menu-title mt-1 text-center">
                <span className="text-[10px] text-base-content/30 font-mono">
                  v{packageJson.version}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mobile Notification Sheet */}
      <MobileNotificationSheet
        isOpen={mobileNotificationsOpen}
        onClose={() => setMobileNotificationsOpen(false)}
      />
    </nav>
  );
}
