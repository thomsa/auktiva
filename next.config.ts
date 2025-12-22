import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  i18n: {
    locales: ["en", "pl", "hu", "de", "es"],
    defaultLocale: "en",
  },
  experimental: {
    // Target modern browsers to reduce polyfills
    optimizePackageImports: ["next-intl", "@iconify/tailwind"],
  },
};

export default withNextIntl(nextConfig);
