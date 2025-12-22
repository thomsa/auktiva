import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  i18n: {
    locales: ["en", "pl", "hu", "de", "es"],
    defaultLocale: "en",
  },
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      "next-intl",
      "@iconify/tailwind4",
      "lucide-react",
      "framer-motion",
    ],
  },
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Disable x-powered-by header
  poweredByHeader: false,
};

export default withBundleAnalyzer(withNextIntl(nextConfig));
