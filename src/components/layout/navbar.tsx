import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme } from "@/components/providers/theme-provider";
import { NotificationBell } from "@/components/notifications/notification-bell";
import packageJson from "../../../package.json";

interface NavbarProps {
  user: {
    id?: string;
    name?: string | null;
    email?: string | null;
  };
}

export function Navbar({ user }: NavbarProps) {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <nav className="navbar bg-base-100 shadow-sm sticky top-0 z-50 px-4">
      <div className="navbar-start">
        <Link
          href="/dashboard"
          className="btn btn-ghost text-xl font-bold gap-2"
        >
          <span className="icon-[tabler--gavel] size-6 text-primary"></span>
          Auktiva
        </Link>
      </div>

      <div className="navbar-end gap-2">
        {/* Notifications */}
        <NotificationBell />

        {/* Theme Toggle */}
        <button
          className="btn btn-ghost btn-circle"
          onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
          aria-label="Toggle theme"
        >
          {resolvedTheme === "light" ? (
            <span className="icon-[tabler--moon] size-5"></span>
          ) : (
            <span className="icon-[tabler--sun] size-5"></span>
          )}
        </button>

        {/* User Menu */}
        <div className="dropdown dropdown-end">
          <button
            tabIndex={0}
            className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
          >
            {(() => {
              const name = user.name?.trim();
              if (name) {
                const parts = name.split(/\s+/);
                if (parts.length >= 2) {
                  return (
                    parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
                  ).toUpperCase();
                }
                return name.substring(0, 2).toUpperCase();
              }
              return user.email?.charAt(0).toUpperCase() || "U";
            })()}
          </button>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-52 p-2 shadow-lg border border-base-300"
          >
            <li className="menu-title">
              <span className="text-xs text-base-content/60 truncate max-w-[180px]">
                {user.email}
              </span>
            </li>
            <li>
              <Link href="/dashboard">
                <span className="icon-[tabler--layout-dashboard] size-4"></span>
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/history">
                <span className="icon-[tabler--history] size-4"></span>
                Bid History
              </Link>
            </li>
            <li>
              <Link href="/settings">
                <span className="icon-[tabler--settings] size-4"></span>
                Settings
              </Link>
            </li>
            <div className="divider my-1"></div>
            <li>
              <a
                href="https://docs.auktiva.org/users"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="icon-[tabler--book] size-4"></span>
                Documentation
              </a>
            </li>
            <li>
              <a
                href="https://github.com/thomsa/auktiva/issues/new/choose"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="icon-[tabler--message-report] size-4"></span>
                Feedback
              </a>
            </li>
            <div className="divider my-1"></div>
            <li>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-error"
              >
                <span className="icon-[tabler--logout] size-4"></span>
                Sign out
              </button>
            </li>
            <li className="menu-title mt-1">
              <span className="text-xs text-base-content/40 font-mono">
                v{packageJson.version}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
