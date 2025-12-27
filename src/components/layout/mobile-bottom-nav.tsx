"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";

export function MobileBottomNav() {
  const t = useTranslations("nav");
  const router = useRouter();
  const currentPath = router.pathname;

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return (
        currentPath === "/dashboard" || currentPath.startsWith("/auctions")
      );
    }
    if (path === "/history") {
      return currentPath === "/history";
    }
    if (path === "/settings") {
      return currentPath === "/settings";
    }
    return false;
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-base-100/95 backdrop-blur-lg border-t border-base-content/10 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
            isActive("/dashboard")
              ? "text-primary"
              : "text-base-content/60 hover:text-base-content"
          }`}
        >
          <span
            className={`icon-[tabler--layout-dashboard] size-6 ${
              isActive("/dashboard") ? "text-primary" : ""
            }`}
          />
          <span className="text-xs font-medium">{t("dashboard")}</span>
        </Link>

        <Link
          href="/history"
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
            isActive("/history")
              ? "text-primary"
              : "text-base-content/60 hover:text-base-content"
          }`}
        >
          <span
            className={`icon-[tabler--gavel] size-6 ${
              isActive("/history") ? "text-primary" : ""
            }`}
          />
          <span className="text-xs font-medium">{t("myBids")}</span>
        </Link>

        <Link
          href="/settings"
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
            isActive("/settings")
              ? "text-primary"
              : "text-base-content/60 hover:text-base-content"
          }`}
        >
          <span
            className={`icon-[tabler--user] size-6 ${
              isActive("/settings") ? "text-primary" : ""
            }`}
          />
          <span className="text-xs font-medium">{t("profile")}</span>
        </Link>
      </div>
    </nav>
  );
}
