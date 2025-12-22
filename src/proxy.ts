import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOCALES = ["en", "pl", "hu", "de", "es"];

export default function proxy(request: NextRequest) {
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === "true";
  const { pathname } = request.nextUrl;

  // Check if path is the maintenance page (with or without locale prefix)
  const isMaintenancePage =
    pathname === "/maintenance" ||
    LOCALES.some((locale) => pathname === `/${locale}/maintenance`);

  // Skip maintenance check for:
  // - The maintenance page itself (any locale)
  // - Static files and assets
  // - API routes
  // - Next.js internals
  const isExcludedPath =
    isMaintenancePage ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") || // Static files (images, fonts, etc.)
    pathname === "/favicon.ico";

  if (isMaintenanceMode && !isExcludedPath) {
    const url = request.nextUrl.clone();
    // Preserve the locale prefix if present
    const localeMatch = pathname.match(/^\/(en|pl|hu|de|es)(\/|$)/);
    if (localeMatch) {
      url.pathname = `/${localeMatch[1]}/maintenance`;
    } else {
      url.pathname = "/maintenance";
    }
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
