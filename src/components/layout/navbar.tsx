import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme } from "@/components/providers/theme-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import packageJson from "../../../package.json";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface NavbarProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
  };
}

export function Navbar({ user }: NavbarProps) {
  const t = useTranslations("nav");
  const { setTheme, resolvedTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
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
              Auktiva
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="btn btn-ghost btn-sm font-medium text-base-content/70 hover:text-primary hover:bg-primary/10"
            >
              {t("dashboard")}
            </Link>
            <Link
              href="/auctions/create"
              className="btn btn-ghost btn-sm font-medium text-base-content/70 hover:text-primary hover:bg-primary/10"
            >
              {t("createAuction")}
            </Link>
            <Link
              href="/history"
              className="btn btn-ghost btn-sm font-medium text-base-content/70 hover:text-primary hover:bg-primary/10"
            >
              {t("myBids")}
            </Link>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden btn btn-ghost btn-sm btn-circle"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <span className="icon-[tabler--x] size-6"></span>
          ) : (
            <span className="icon-[tabler--menu-2] size-6"></span>
          )}
        </button>

        <div className="hidden md:flex items-center gap-3">
          {/* Language Switcher */}
          <LanguageSwitcher compact />

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
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-primary to-secondary p-[2px]">
                <div className="w-full h-full rounded-full bg-base-100 flex items-center justify-center">
                  <span className="font-bold text-xs bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {(() => {
                      const name = user.name?.trim();
                      if (name) {
                        const parts = name.split(/\s+/);
                        if (parts.length >= 2) {
                          return (
                            parts[0].charAt(0) +
                            parts[parts.length - 1].charAt(0)
                          ).toUpperCase();
                        }
                        return name.substring(0, 2).toUpperCase();
                      }
                      return user.email?.charAt(0).toUpperCase() || "U";
                    })()}
                  </span>
                </div>
              </div>
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-base-100/95 backdrop-blur-lg border-b border-base-content/10 shadow-lg z-40">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-ghost justify-start"
            >
              <span className="icon-[tabler--layout-dashboard] size-5"></span>
              {t("dashboard")}
            </Link>
            <Link
              href="/auctions/create"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-ghost justify-start"
            >
              <span className="icon-[tabler--plus] size-5"></span>
              {t("createAuction")}
            </Link>
            <Link
              href="/history"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-ghost justify-start"
            >
              <span className="icon-[tabler--history] size-5"></span>
              {t("myBids")}
            </Link>
            <Link
              href="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-ghost justify-start"
            >
              <span className="icon-[tabler--settings] size-5"></span>
              {t("settings")}
            </Link>
            <div className="divider my-1"></div>
            <div className="flex items-center justify-between px-4 py-2">
              <LanguageSwitcher />
              {mounted && (
                <button
                  onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
                  className="btn btn-ghost btn-sm btn-circle"
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === "light" ? (
                    <span className="icon-[tabler--moon] size-5"></span>
                  ) : (
                    <span className="icon-[tabler--sun] size-5"></span>
                  )}
                </button>
              )}
            </div>
            <div className="divider my-1"></div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="btn btn-ghost justify-start text-error"
            >
              <span className="icon-[tabler--logout] size-5"></span>
              {t("signOut")}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
