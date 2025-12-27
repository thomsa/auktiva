import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { useRouter } from "next/router";
import { UpdateBanner } from "@/components/common";
import { NotificationProvider } from "@/contexts/NotificationContext";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  const router = useRouter();

  return (
    <NextIntlClientProvider
      locale={router.locale}
      timeZone="Europe/Budapest"
      messages={pageProps.messages}
    >
      <SessionProvider session={session}>
        <NotificationProvider>
          <ThemeProvider>
            <ToastProvider>
              <UpdateBanner />
              <Component {...pageProps} />
              <Analytics />
            </ToastProvider>
          </ThemeProvider>
        </NotificationProvider>
      </SessionProvider>
    </NextIntlClientProvider>
  );
}
