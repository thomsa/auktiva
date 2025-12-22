import Head from "next/head";
import Link from "next/link";
import { GetStaticProps } from "next";
import { useTranslations } from "next-intl";
import { SITE_NAME } from "@/components/common";
import { getMessages, Locale } from "@/i18n";

export default function MaintenancePage() {
  const t = useTranslations("maintenance");

  return (
    <>
      <Head>
        <title>{t("meta.title", { siteName: SITE_NAME })}</title>
        <meta name="description" content={t("meta.description")} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-base-100 text-base-content selection:bg-primary/20 flex items-center justify-center relative overflow-hidden">
        {/* Background Elements - matching Hero style */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[128px] animate-pulse"></div>
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]"></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-2xl mx-auto">
            {/* Animated Icon */}
            <div className="mb-8 relative">
              <div className="w-32 h-32 mx-auto relative">
                {/* Middle ring */}
                <div className="absolute inset-2 rounded-full border-4 border-secondary/30 "></div>
                {/* Inner circle with icon */}
                <div className="absolute inset-4 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/30">
                  <span className="icon-[tabler--tool] size-12 text-primary-content"></span>
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-base-200/50 border border-base-content/10 backdrop-blur-sm mb-8">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-warning"></span>
              </span>
              <span className="text-sm font-medium text-base-content/80">
                {t("badge")}
              </span>
            </div>

            {/* Main Content */}
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              {t("title")}{" "}
              <span className="bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                {t("titleHighlight")}
              </span>
            </h1>

            <p className="text-xl text-base-content/60 mb-8 leading-relaxed">
              {t("description")}
            </p>

            {/* Progress indicator */}
            <div className="max-w-md mx-auto mb-12">
              <div className="flex justify-between text-sm text-base-content/50 mb-2">
                <span>{t("progressLabel")}</span>
                <span className="flex items-center gap-1">
                  <span className="loading loading-dots loading-xs"></span>
                </span>
              </div>
              <div className="h-2 bg-base-200 rounded-full overflow-hidden">
                <div className="h-full bg-linear-to-r from-primary to-secondary rounded-full animate-pulse w-3/4"></div>
              </div>
            </div>

            {/* Info Cards */}
            <div className="flex items-center justify-center mb-12">
              <div className="p-6 rounded-2xl bg-base-200/30 border border-base-content/5 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="icon-[tabler--clock] size-6 text-primary"></span>
                </div>
                <h3 className="font-semibold mb-2">{t("duration.title")}</h3>
                <p className="text-base-content/60 text-sm">
                  {t("duration.text")}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary btn-lg h-14 px-8 rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
              >
                <span className="icon-[tabler--refresh] size-6"></span>
                {t("tryAgain")}
              </button>
              <Link
                href="https://github.com/thomsa/auktiva"
                target="_blank"
                className="btn btn-ghost btn-lg h-14 px-8 rounded-full border border-base-content/10 hover:bg-base-200 hover:border-base-content/20 transition-all duration-300"
              >
                <span className="icon-[tabler--brand-github] size-6"></span>
                {t("viewStatus")}
              </Link>
            </div>

            {/* Footer note */}
            <p className="mt-12 text-sm text-base-content/40">
              {t("thankYou")}
            </p>
          </div>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-primary/5 rounded-2xl rotate-12 animate-bounce hidden lg:block"></div>
        <div className="absolute bottom-20 right-10 w-16 h-16 bg-secondary/5 rounded-full animate-pulse hidden lg:block"></div>
        <div className="absolute top-1/3 right-20 w-12 h-12 bg-accent/5 rounded-lg -rotate-12 animate-bounce hidden lg:block"></div>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async (context) => {
  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      messages,
    },
  };
};
